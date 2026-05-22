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

    // Self-heal: a BASIC tenant should always have a trialEndsAt. If the
    // backfill migration missed this row (e.g. company created during a
    // partial deploy), set the 7-day window now so the FE banner + pill
    // render correctly on the first call.
    if (planCode === "BASIC" && !company.trialEndsAt) {
      const newTrialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.company.update({
        where: { id: req.user.companyId },
        data: { trialEndsAt: newTrialEnd },
      });
      company = { ...company, trialEndsAt: newTrialEnd };
    }

    // Derive trial state for the FE banner. Only BASIC has a meaningful
    // trial; paid plans expose trialEndsAt as null so the banner stays hidden.
    const trialEndsAt = planCode === "BASIC" ? company.trialEndsAt : null;
    const now = Date.now();
    const trialActive = trialEndsAt ? trialEndsAt.getTime() > now : false;
    const trialDaysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (24 * 60 * 60 * 1000)))
      : 0;

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
            role: { not: "BROKER" },
          },
        }),
        prisma.lead.count({ where: { companyId: req.user.companyId } }),
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
  cancelSubscription,
  listMySubscriptions,
  listMyPayments,
  razorpayWebhook,
};
