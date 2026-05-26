// Lightweight billing surface. For now only exposes the current tenant's
// plan + a usage summary so the FE can lock features visually before the
// user even tries the action. Razorpay-driven endpoints (create-subscription,
// webhook, cancel, invoices) will hang off this same module in Phase 3.

const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { logger } = require("../../lib/logger");
const { normalisePlanCode } = require("../../lib/planLimits");
const planService = require("../plan/plan.service");
const billingService = require("./billing.service");
const { getPublicKey, verifyWebhookSignature } = require("./razorpay.client");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getTrialDaysLeft(trialEndsAt, now, trialWindowDays) {
  if (!trialEndsAt) return 0;

  const rawDaysLeft = Math.ceil((trialEndsAt.getTime() - now) / MS_PER_DAY);
  return Math.min(trialWindowDays, Math.max(0, rawDaysLeft));
}

async function getMyPlan(req, res, next) {
  try {
    let company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        subscriptionPlan: true,
        pendingPlan: true,
        pendingBillingCycle: true,
        trialEndsAt: true,
      },
    });
    if (!company) throw new ApiError(404, "Company not found");

    const planCode = normalisePlanCode(company.subscriptionPlan);
    const planRow = await planService.getPlanByCode(planCode);
    const plan = planService.toPublicShape(planRow);

    // Self-heal: every newly-signed-up tenant should have a trialEndsAt
    // (all three plans now include a 7-day trial). If the row is missing
    // one — legacy data, partial deploy — set the 7-day window now so the
    // FE banner + pill render correctly on the first call.
    if (!company.trialEndsAt) {
      const newTrialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.company.update({
        where: { id: req.user.companyId },
        data: { trialEndsAt: newTrialEnd },
      });
      company = { ...company, trialEndsAt: newTrialEnd };
    }

    // Once the tenant has an ACTIVE Razorpay subscription the trial is
    // moot — hide it from the FE so the banner / trial pill don't keep
    // nagging a paid customer.
    const activeSub = await prisma.subscription.findFirst({
      where: { companyId: req.user.companyId, status: "ACTIVE" },
      select: { id: true },
    });
    const trialEndsAt = activeSub ? null : company.trialEndsAt;
    const now = Date.now();
    const trialActive = trialEndsAt ? trialEndsAt.getTime() > now : false;
    const trialWindowDays = Number(plan.trialDays) || 7;
    const trialDaysLeft = getTrialDaysLeft(trialEndsAt, now, trialWindowDays);

    // Current usage counts so the FE can render gauges + know how close
    // the tenant is to each cap without re-querying per-resource.
    const [users, pendingInvites, leads, projects, integrations, fileAgg] =
      await Promise.all([
        prisma.user.count({
          where: { companyId: req.user.companyId, deletedAt: null },
        }),
        prisma.invite.count({
          where: {
            companyId: req.user.companyId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
            role: { not: "CHANNEL_PARTNER" },
          },
        }),
        prisma.lead.count({
          where: { companyId: req.user.companyId, deletedAt: null },
        }),
        prisma.project.count({ where: { companyId: req.user.companyId } }),
        prisma.integrationCredential.count({
          where: { companyId: req.user.companyId },
        }),
        prisma.file.aggregate({
          where: { companyId: req.user.companyId },
          _sum: { sizeBytes: true },
        }),
      ]);

    res.json({
      ok: true,
      data: {
        plan: planCode,
        planName: plan.name,
        pendingPlan: company.pendingPlan || null,
        pendingBillingCycle: company.pendingBillingCycle || null,
        limits: plan.limits,
        features: plan.features,
        usage: {
          users: users + pendingInvites,
          leads,
          projects,
          integrations,
          storageBytes: fileAgg._sum.sizeBytes ?? 0,
        },
        trial: {
          endsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
          active: trialActive,
          daysLeft: trialDaysLeft,
          expired: trialEndsAt ? !trialActive : false,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// Public pricing endpoint — used by the marketing pricing page + billing
// page so they always reflect the live DB values, not stale FE constants.
async function listPlansPublic(req, res, next) {
  try {
    const rows = await planService.listPlans();
    res.json({
      ok: true,
      data: rows.map(planService.toPublicShape),
    });
  } catch (err) {
    next(err);
  }
}

// Returns the Razorpay public key + which plans are configured. The FE
// reads this to decide whether to render the Upgrade button or a
// "billing-not-configured" notice. Mode is derived from the key prefix
// ("rzp_test_*" = test mode, "rzp_live_*" = live mode) so we don't need
// a separate env flag — Razorpay's convention is the source of truth.
async function getBillingConfig(req, res, next) {
  try {
    const key = getPublicKey();
    let mode = null;
    if (key?.startsWith("rzp_test_")) mode = "test";
    else if (key?.startsWith("rzp_live_")) mode = "live";
    res.json({
      ok: true,
      data: {
        configured: !!key,
        razorpayKeyId: key,
        mode,
      },
    });
  } catch (err) {
    next(err);
  }
}

// FE calls this with { plan: 'PRO'|'ENTERPRISE', billingCycle: 'monthly'|'annual' }.
// We create a Razorpay subscription server-side and return the subscription ID
// so the FE can hand it to Razorpay Checkout. Plan only flips on webhook.
async function createSubscription(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "No company context");
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only OWNER or ADMIN can manage billing");
    }
    const { plan, billingCycle } = req.body || {};
    const result = await billingService.createSubscription({
      companyId: req.user.companyId,
      plan,
      billingCycle,
    });
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/billing/subscriptions/verify
// Called by the FE right after Razorpay Checkout's `handler` fires. The
// FE forwards { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
// and we verify + activate locally so the trial pill / banner clear out
// immediately, even when the webhook hasn't reached us yet (localhost).
async function verifySubscription(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "No company context");
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only OWNER or ADMIN can verify payments");
    }
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    } = req.body || {};
    const result = await billingService.verifyAndActivateSubscription({
      companyId: req.user.companyId,
      paymentId,
      subscriptionId,
      signature,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/billing/subscriptions/reconcile
// Fallback when the Razorpay webhook hasn't landed (e.g. on localhost).
// Walks every non-terminal subscription on the company, asks Razorpay
// for the live state, and writes that back. Used by the "Refresh status"
// button on the Billing page.
async function reconcileSubscriptionsCtrl(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "No company context");
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only OWNER or ADMIN can refresh billing status");
    }
    const result = await billingService.reconcileSubscriptions({
      companyId: req.user.companyId,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function cancelSubscription(req, res, next) {
  try {
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only OWNER or ADMIN can manage billing");
    }
    const updated = await billingService.cancelSubscription({
      companyId: req.user.companyId,
      subscriptionId: req.params.id,
    });
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function listMySubscriptions(req, res, next) {
  try {
    const subs = await billingService.listSubscriptions(req.user.companyId);
    res.json({ ok: true, data: subs });
  } catch (err) {
    next(err);
  }
}

async function listMyPayments(req, res, next) {
  try {
    const payments = await billingService.listPayments(
      req.user.companyId,
      parseInt(req.query.limit) || 20,
    );
    res.json({ ok: true, data: payments });
  } catch (err) {
    next(err);
  }
}

// POST /api/billing/start-trial { plan: "BASIC"|"PRO"|"ENTERPRISE" }
// Called from the post-signup Subscribe flow. Sets the company's chosen
// plan and (re)opens a 7-day trial window. No payment is collected — that
// happens later from the Billing page when the user upgrades. We protect
// against tenants resetting their own trial by only allowing this while
// onboarding is incomplete OR no plan has been picked yet.
async function startTrial(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "No company context");
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Only OWNER or ADMIN can pick a plan");
    }

    const requested = String(req.body?.plan || "").toUpperCase();
    if (!["BASIC", "PRO", "ENTERPRISE"].includes(requested)) {
      throw new ApiError(400, "plan must be BASIC, PRO, or ENTERPRISE");
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        id: true,
        onboardingCompleted: true,
        trialEndsAt: true,
        subscriptionPlan: true,
      },
    });
    if (!company) throw new ApiError(404, "Company not found");

    // Lock down trial re-use: once the tenant has finished onboarding we
    // require them to subscribe through Razorpay rather than restart the
    // trial by hitting this endpoint. Existing paid subs short-circuit too.
    const activeSub = await prisma.subscription.findFirst({
      where: { companyId: company.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (activeSub) {
      throw new ApiError(400, "You already have an active subscription");
    }
    const trialActive = company.trialEndsAt && company.trialEndsAt > new Date();
    if (company.onboardingCompleted && !trialActive) {
      throw new ApiError(400, "Trial already used. Subscribe from the Billing page.");
    }

    // 7-day window. If the trial is still live we keep its end date (don't
    // extend it past the original) — only push it out when there's no
    // trialEndsAt or the previous one already lapsed (e.g. between signup
    // and picking a plan, theoretically zero time).
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const trialEndsAt =
      trialActive && company.trialEndsAt > new Date()
        ? company.trialEndsAt
        : sevenDaysFromNow;

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        subscriptionPlan: requested,
        trialEndsAt,
      },
      select: { id: true, subscriptionPlan: true, trialEndsAt: true },
    });

    res.json({
      ok: true,
      data: {
        plan: updated.subscriptionPlan,
        trialEndsAt: updated.trialEndsAt.toISOString(),
        daysLeft: Math.max(
          0,
          Math.ceil(
            (updated.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        ),
      },
    });
  } catch (err) {
    next(err);
  }
}

// Razorpay webhook receiver. NO auth middleware — verified by HMAC over
// the raw body. The route layer mounts this without authMiddleware and
// app.js makes /api/billing/webhooks/razorpay raw-body-capturing.
async function razorpayWebhook(req, res, next) {
  try {
    const signature = req.get("X-Razorpay-Signature");
    const rawBody = req.rawBody;
    if (!signature || !rawBody) {
      return res.status(400).json({ ok: false, error: "Missing signature or body" });
    }
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn("Razorpay webhook: signature verification failed");
      return res.status(400).json({ ok: false, error: "Invalid signature" });
    }

    // Acknowledge fast; do the work after. Razorpay retries on >5s.
    res.status(200).json({ ok: true });

    try {
      await billingService.handleWebhookEvent(req.body);
    } catch (handlerErr) {
      logger.error(
        { err: handlerErr?.message, event: req.body?.event },
        "billing webhook handler error",
      );
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyPlan,
  listPlansPublic,
  getBillingConfig,
  createSubscription,
  verifySubscription,
  reconcileSubscriptionsCtrl,
  cancelSubscription,
  listMySubscriptions,
  listMyPayments,
  razorpayWebhook,
  startTrial,
};
