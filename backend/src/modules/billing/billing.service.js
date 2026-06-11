const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");
const { normalisePlanCode } = require("../../lib/planLimits");
const planService = require("../plan/plan.service");
const {
  getRazorpay,
  planIdFor,
  verifyPaymentSignature,
} = require("./razorpay.client");
const { createInvoiceFromSubscription } = require("./invoice.service");

async function getOrCreateRazorpayPlanId({ rzp, planRow, plan, billingCycle }) {
  const storedId =
    billingCycle === "annual"
      ? planRow?.razorpayPlanIdAnnual
      : planRow?.razorpayPlanIdMonthly;
  if (storedId) return storedId;

  const fallbackId = planIdFor(plan, billingCycle);
  if (fallbackId) return fallbackId;

  const amount =
    billingCycle === "annual" ? planRow.priceAnnual * 12 : planRow.priceMonthly;

  try {
    const created = await rzp.plans.create({
      period: billingCycle === "annual" ? "yearly" : "monthly",
      interval: 1,
      item: {
        name: `${planRow.name} (${billingCycle === "annual" ? "Annual" : "Monthly"})`,
        amount,
        currency: "INR",
        description: planRow.tagline || undefined,
      },
      notes: { code: plan, billingCycle },
    });

    await prisma.plan.update({
      where: { code: plan },
      data:
        billingCycle === "annual"
          ? { razorpayPlanIdAnnual: created.id }
          : { razorpayPlanIdMonthly: created.id },
    });
    planService.invalidateCache();

    return created.id;
  } catch (err) {
    logger.error(
      { err: err?.error || err?.message, plan, billingCycle },
      "Razorpay plan auto-create failed",
    );
    throw new ApiError(
      502,
      err?.error?.description || `Failed to create Razorpay plan for ${plan}/${billingCycle}`,
    );
  }
}

// Step 1 of the upgrade flow. FE calls this with { plan, billingCycle }.
// We create a Razorpay subscription, persist a CREATED row, and return the
// subscription ID + key so the FE can hand both to Razorpay Checkout.
// The plan only flips to PRO/ENTERPRISE once Razorpay tells us the
// subscription is ACTIVE via webhook — we never trust the client.
async function createSubscription({ companyId, plan, billingCycle }) {
  const rzp = getRazorpay();
  if (!rzp) {
    throw new ApiError(
      503,
      "Razorpay is not configured on this environment. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to enable upgrades.",
      { code: "BILLING_NOT_CONFIGURED" },
    );
  }
  const normalisedPlan = normalisePlanCode(plan);
  if (!["BASIC", "PRO", "ENTERPRISE"].includes(normalisedPlan)) {
    throw new ApiError(400, "Unknown plan");
  }
  if (billingCycle !== "monthly" && billingCycle !== "annual") {
    throw new ApiError(400, "billingCycle must be 'monthly' or 'annual'");
  }

  // Read Razorpay plan ID from the DB Plan row first (set by the
  // SuperAdmin Plans UI when a price is changed). Fall back to env vars
  // for legacy installations that haven't moved to DB-managed plans yet.
  const planRow = await planService.getPlanByCode(normalisedPlan);
  if (!planRow) throw new ApiError(404, `Plan ${normalisedPlan} not found`);
  const razorpayPlanId = await getOrCreateRazorpayPlanId({
    rzp,
    planRow,
    plan: normalisedPlan,
    billingCycle,
  });

  // Razorpay total_count = number of billing cycles. 12 for monthly = 1
  // year of monthly charges; 5 for annual = 5 years of annual charges
  // (renewals continue past total_count if customer doesn't cancel — this
  // is an "expiry hint", not a hard stop).
  const totalCount = billingCycle === "monthly" ? 12 : 5;

  let rzpSub;
  try {
    rzpSub = await rzp.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: totalCount,
      customer_notify: 1,
      notes: { companyId, plan: normalisedPlan, billingCycle },
    });
  } catch (err) {
    logger.error({ err: err?.error || err?.message }, "Razorpay subscription create failed");
    throw new ApiError(502, err?.error?.description || "Razorpay subscription creation failed");
  }

  // Amount stored in the Subscription row mirrors the per-month price
  // (matches what we show on the billing card). Comes straight from the
  // DB Plan row in paise — no rupee/paise dance.
  const amount =
    billingCycle === "annual" ? planRow.priceAnnual : planRow.priceMonthly;

  // Cancel any prior CREATED rows for this tenant — the user just kicked
  // off a fresh upgrade, the old half-finished one is dead.
  await prisma.subscription.updateMany({
    where: { companyId, status: "CREATED" },
    data: { status: "EXPIRED" },
  });

  const row = await prisma.subscription.create({
    data: {
      companyId,
      plan: normalisedPlan,
      billingCycle,
      status: "CREATED",
      razorpayPlanId,
      razorpaySubscriptionId: rzpSub.id,
      amount,
    },
  });

  return {
    subscription: row,
    razorpaySubscriptionId: rzpSub.id,
    shortUrl: rzpSub.short_url || null,
  };
}

// Verify the Razorpay Checkout response signature client-side. If the
// signature matches and the subscription belongs to this company, we
// flip it ACTIVE locally instead of waiting for the webhook — which is
// what unblocks the trial badge on localhost / non-public deployments.
// The webhook stays the source of truth in production; this is just an
// optimistic shortcut, safely gated by signature verification.
async function verifyAndActivateSubscription({
  companyId,
  paymentId,
  subscriptionId,
  signature,
}) {
  if (!verifyPaymentSignature({ paymentId, subscriptionId, signature })) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const row = await prisma.subscription.findFirst({
    where: { companyId, razorpaySubscriptionId: subscriptionId },
  });
  if (!row) throw new ApiError(404, "Subscription not found for this company");

  // Pull the live subscription state from Razorpay so we copy the actual
  // period boundaries (current_start/current_end) onto the row, instead
  // of guessing dates from `now`.
  const rzp = getRazorpay();
  let rzpSub = null;
  if (rzp) {
    try {
      rzpSub = await rzp.subscriptions.fetch(subscriptionId);
    } catch (err) {
      logger.warn(
        { err: err?.error || err?.message },
        "razorpay subscription fetch failed during verify",
      );
    }
  }

  const currentPeriodStart = rzpSub?.current_start
    ? new Date(rzpSub.current_start * 1000)
    : new Date();
  const currentPeriodEnd = rzpSub?.current_end
    ? new Date(rzpSub.current_end * 1000)
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: row.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
        razorpayCustomerId: rzpSub?.customer_id || row.razorpayCustomerId,
      },
    });
    // Once a paid plan is active, the trial window is moot — null it out
    // so the FE banner/pill stop showing immediately. Plan flips here too;
    // the webhook will idempotently re-set the same values if it lands later.
    await tx.company.update({
      where: { id: companyId },
      data: {
        subscriptionPlan: row.plan,
        trialEndsAt: null,
        pendingPlan: null,
        pendingBillingCycle: null,
      },
    });

    // Auto-generate invoice for the first payment
    await createInvoiceFromSubscription({
      subscription: row,
      payment: { razorpayPaymentId: paymentId },
      tenantPrisma: tx,
    });
  });

  return { activated: true, subscriptionId: row.id };
}

// Reconcile any non-terminal subscription rows against Razorpay's current
// state. Recovers from the case where Razorpay charged the customer but
// the webhook never reached us (localhost / private tunnels expired /
// brief outage). The user clicks "Refresh status" on Billing and we
// straighten things out without making them re-pay.
async function reconcileSubscriptions({ companyId }) {
  const rzp = getRazorpay();
  if (!rzp) {
    throw new ApiError(503, "Razorpay isn't configured");
  }

  const rows = await prisma.subscription.findMany({
    where: {
      companyId,
      status: { in: ["CREATED", "PENDING", "HALTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  let activated = 0;
  let cancelled = 0;
  let unchanged = 0;

  for (const row of rows) {
    let rzpSub;
    try {
      rzpSub = await rzp.subscriptions.fetch(row.razorpaySubscriptionId);
    } catch (err) {
      logger.warn(
        { err: err?.error || err?.message, subId: row.razorpaySubscriptionId },
        "reconcile: razorpay fetch failed",
      );
      unchanged++;
      continue;
    }

    // Razorpay subscription states: created, authenticated, active,
    // pending, halted, cancelled, completed, expired. "active" and
    // "authenticated" both mean payment has been collected at least once
    // and the subscription is good.
    const rzpStatus = String(rzpSub.status || "").toLowerCase();
    const isLive = rzpStatus === "active" || rzpStatus === "authenticated";
    const isDead =
      rzpStatus === "cancelled" ||
      rzpStatus === "expired" ||
      rzpStatus === "completed";

    if (isLive && row.status !== "ACTIVE") {
      const currentPeriodStart = rzpSub.current_start
        ? new Date(rzpSub.current_start * 1000)
        : new Date();
      const currentPeriodEnd = rzpSub.current_end
        ? new Date(rzpSub.current_end * 1000)
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: row.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart,
            currentPeriodEnd,
            razorpayCustomerId: rzpSub.customer_id || row.razorpayCustomerId,
          },
        });
        await tx.company.update({
          where: { id: companyId },
          data: {
            subscriptionPlan: row.plan,
            trialEndsAt: null,
            pendingPlan: null,
            pendingBillingCycle: null,
          },
        });
      });
      activated++;
    } else if (isDead) {
      await prisma.subscription.update({
        where: { id: row.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      cancelled++;
    } else {
      unchanged++;
    }
  }

  return { checked: rows.length, activated, cancelled, unchanged };
}

async function cancelSubscription({ companyId, subscriptionId, cancelAtCycleEnd = true }) {
  const sub = await prisma.subscription.findFirst({
    where: { id: subscriptionId, companyId },
  });
  if (!sub) throw new ApiError(404, "Subscription not found");
  if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
    return sub;
  }

  const rzp = getRazorpay();
  if (rzp && sub.razorpaySubscriptionId) {
    try {
      await rzp.subscriptions.cancel(sub.razorpaySubscriptionId, cancelAtCycleEnd);
    } catch (err) {
      logger.error(
        { err: err?.error || err?.message, subId: sub.razorpaySubscriptionId },
        "Razorpay subscription cancel failed",
      );
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  // Drop the company back to BASIC immediately; the webhook would do the
  // same on the cancellation event, but we don't want to wait for it.
  await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionPlan: "BASIC" },
  });

  // Notify admins about the plan change
  prisma.user
    .findMany({
      where: { companyId, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    })
    .then((users) => {
      for (const u of users) {
        prisma.notification
          .create({
            data: {
              userId: u.id,
              companyId,
              type: "PLAN_CHANGED",
              title: "Plan cancelled",
              body: "Your subscription has been cancelled. You've been moved to the Basic plan.",
              link: "/subscription",
              metadata: { kind: "PLAN_CHANGED", plan: "BASIC" },
            },
          })
          .catch(() => {});
      }
    });

  return updated;
}

async function listSubscriptions(companyId) {
  return prisma.subscription.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

async function listPayments(companyId, limit = 20) {
  return prisma.payment.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
}

// Razorpay webhook handler. The signature is verified at the route layer
// (raw body required) — this function only runs after a valid event lands.
// We handle the lifecycle events that matter for plan flipping + invoice
// history; everything else is acknowledged and ignored.
async function handleWebhookEvent(event) {
  const type = event.event;
  const payload = event.payload || {};

  switch (type) {
    case "subscription.activated":
    case "subscription.charged": {
      const sub = payload.subscription?.entity;
      const payment = payload.payment?.entity;
      if (sub) {
        await activateOrChargeSubscription(sub, payment);
      }
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.expired": {
      const sub = payload.subscription?.entity;
      if (sub) {
        await markSubscriptionEnded(sub, type);
      }
      break;
    }
    case "subscription.halted":
    case "subscription.paused": {
      const sub = payload.subscription?.entity;
      if (sub) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: sub.id },
          data: { status: "HALTED" },
        });
      }
      break;
    }
    case "payment.captured": {
      // Subscription-attached payments arrive via subscription.charged;
      // payment.captured fires for one-off orders too. Persist anyway —
      // useful for any future ad-hoc charges (e.g. one-time add-ons).
      const payment = payload.payment?.entity;
      if (payment) {
        await recordPaymentRow(payment);
      }
      break;
    }
    case "payment.failed": {
      const pf = payload.payment?.entity;
      if (pf) {
        await recordPaymentRow(pf);
        let cid = pf.notes?.companyId || null;
        if (!cid && payload.subscription?.entity?.id) {
          const subRow = await prisma.subscription.findFirst({
            where: { razorpaySubscriptionId: payload.subscription.entity.id },
            select: { companyId: true },
          });
          cid = subRow?.companyId || null;
        }
        if (cid) {
          const admins = await prisma.user.findMany({
            where: { companyId: cid, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
            select: { id: true },
          });
          for (const u of admins) {
            prisma.notification
              .create({
                data: {
                  userId: u.id,
                  companyId: cid,
                  type: "PAYMENT_FAILED",
                  title: "Payment failed",
                  body: `A payment of \u20B9${(pf.amount / 100).toFixed(2)} failed. Please check your billing details.`,
                  link: "/subscription",
                  metadata: { kind: "PAYMENT_FAILED", razorpayPaymentId: pf.id },
                },
              })
              .catch(() => {});
          }
        }
      }
      break;
    }
    default:
      logger.info({ type }, "billing webhook: unhandled event");
  }
}

async function activateOrChargeSubscription(rzpSub, rzpPayment) {
  const row = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: rzpSub.id },
  });
  if (!row) {
    logger.warn({ rzpSubId: rzpSub.id }, "webhook: subscription row not found");
    return;
  }

  const currentPeriodStart = rzpSub.current_start
    ? new Date(rzpSub.current_start * 1000)
    : null;
  const currentPeriodEnd = rzpSub.current_end
    ? new Date(rzpSub.current_end * 1000)
    : null;

  await prisma.subscription.update({
    where: { id: row.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      razorpayCustomerId: rzpSub.customer_id || row.razorpayCustomerId,
    },
  });

  // Plan flip: company moves onto the paid plan as soon as Razorpay
  // confirms ACTIVE. Trial is irrelevant after this point.
  const planLabel = { PRO: "Pro", ENTERPRISE: "Enterprise", BASIC: "Basic" }[row.plan] || row.plan;
  await prisma.company.update({
    where: { id: row.companyId },
    data: {
      subscriptionPlan: row.plan,
      pendingPlan: null,
      pendingBillingCycle: null,
    },
  });

  // Notify admins about the plan upgrade
  prisma.user
    .findMany({
      where: { companyId: row.companyId, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    })
    .then((users) => {
      for (const u of users) {
        prisma.notification
          .create({
            data: {
              userId: u.id,
              companyId: row.companyId,
              type: "PLAN_CHANGED",
              title: "Plan upgraded!",
              body: `Your plan has been upgraded to ${planLabel}.`,
              link: "/subscription",
              metadata: { kind: "PLAN_CHANGED", plan: row.plan },
            },
          })
          .catch(() => {});
      }
    });

  if (rzpPayment) {
    await recordPaymentRow(rzpPayment, row.id, row.companyId);
  }

  // Auto-generate invoice for this charge event (first payment or renewal)
  await createInvoiceFromSubscription({
    subscription: row,
    payment: rzpPayment
      ? {
          razorpayPaymentId: rzpPayment.id,
          razorpayOrderId: rzpPayment.order_id || null,
          paidAt: rzpPayment.created_at ? new Date(rzpPayment.created_at * 1000) : new Date(),
        }
      : undefined,
  });
}

async function markSubscriptionEnded(rzpSub, eventType) {
  const row = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: rzpSub.id },
  });
  if (!row) return;

  const status =
    eventType === "subscription.cancelled"
      ? "CANCELLED"
      : eventType === "subscription.expired"
        ? "EXPIRED"
        : "EXPIRED";

  await prisma.subscription.update({
    where: { id: row.id },
    data: { status, cancelledAt: new Date() },
  });

  // If this was the company's currently-billing subscription, drop them to
  // BASIC. Skip if a newer ACTIVE subscription already exists — the user
  // may have upgraded PRO → ENTERPRISE, and we don't want the cancel of
  // the old PRO row to demote them.
  const otherActive = await prisma.subscription.findFirst({
    where: { companyId: row.companyId, status: "ACTIVE" },
  });
  if (!otherActive) {
    await prisma.company.update({
      where: { id: row.companyId },
      data: { subscriptionPlan: "BASIC" },
    });
  }
}

async function recordPaymentRow(rzpPayment, subscriptionId = null, companyId = null) {
  // Resolve companyId from the linked subscription if not passed.
  let resolvedCompanyId = companyId;
  let resolvedSubId = subscriptionId;
  if (!resolvedCompanyId && rzpPayment.invoice_id) {
    // payment.captured doesn't always carry our subscription ID directly;
    // try to find the row via the customer or order if linked.
  }
  if (!resolvedCompanyId && rzpPayment.notes?.companyId) {
    resolvedCompanyId = rzpPayment.notes.companyId;
  }
  if (!resolvedCompanyId) {
    logger.warn(
      { paymentId: rzpPayment.id },
      "billing webhook: payment with no resolvable companyId, skipping",
    );
    return;
  }

  try {
    await prisma.payment.upsert({
      where: { razorpayPaymentId: rzpPayment.id },
      create: {
        companyId: resolvedCompanyId,
        subscriptionId: resolvedSubId,
        razorpayPaymentId: rzpPayment.id,
        razorpayOrderId: rzpPayment.order_id || null,
        razorpayInvoiceId: rzpPayment.invoice_id || null,
        amount: rzpPayment.amount,
        currency: rzpPayment.currency || "INR",
        status: rzpPayment.status,
        method: rzpPayment.method || null,
        description: rzpPayment.description || null,
        paidAt: rzpPayment.created_at ? new Date(rzpPayment.created_at * 1000) : null,
      },
      update: {
        status: rzpPayment.status,
        method: rzpPayment.method || null,
        paidAt: rzpPayment.created_at ? new Date(rzpPayment.created_at * 1000) : null,
      },
    });
  } catch (err) {
    logger.error({ err: err?.message, paymentId: rzpPayment.id }, "payment upsert failed");
  }
}

module.exports = {
  createSubscription,
  verifyAndActivateSubscription,
  reconcileSubscriptions,
  cancelSubscription,
  listSubscriptions,
  listPayments,
  handleWebhookEvent,
};
