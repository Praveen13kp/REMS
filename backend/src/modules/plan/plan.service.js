// DB-backed plan catalogue service. All BE plan reads (planGate,
// billing, /api/billing/plan) now go through this instead of importing
// constants from lib/planLimits.js.
//
// 60-second in-memory cache so per-request plan reads (which happen on
// every gated write via planGate) don't hammer the DB. Cache is
// invalidated whenever a plan is updated.
//
// planLimits.js still exists as a fallback skeleton + shape definition,
// and houses pure helpers like normalisePlanCode / formatStorage.

const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");
const { normalisePlanCode } = require("../../lib/planLimits");
const { getRazorpay } = require("../billing/razorpay.client");

const CACHE_TTL_MS = 60 * 1000;
let _cache = null; // { expiresAt, byCode: { BASIC, PRO, ENTERPRISE }, list }

function nowMs() {
  return Date.now();
}

function invalidateCache() {
  _cache = null;
}

async function _loadAll() {
  const rows = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
  _cache = { expiresAt: nowMs() + CACHE_TTL_MS, byCode, list: rows };
  return _cache;
}

async function listPlans() {
  if (!_cache || _cache.expiresAt < nowMs()) await _loadAll();
  return _cache.list;
}

async function getPlanByCode(rawCode) {
  const code = normalisePlanCode(rawCode);
  if (!_cache || _cache.expiresAt < nowMs()) await _loadAll();
  return _cache.byCode[code] || _cache.byCode.BASIC || null;
}

// Smart-sync update. Rules:
//   - If priceMonthly or priceAnnual changes AND code !== BASIC:
//       create a NEW Razorpay plan (Razorpay forbids editing price on
//       an existing plan). Archive the old plan ID so existing
//       subscriptions tied to it keep renewing at the old price.
//   - All other field changes (name, limits, features, bullets) hit
//       the DB only — no Razorpay round trip.
//   - BASIC has no Razorpay plan, so price changes only update the DB.
async function updatePlan(code, data, actorId) {
  const normalisedCode = normalisePlanCode(code);
  const existing = await prisma.plan.findUnique({ where: { code: normalisedCode } });
  if (!existing) throw new ApiError(404, `Plan ${normalisedCode} not found`);

  const priceMonthlyChanged =
    data.priceMonthly !== undefined && data.priceMonthly !== existing.priceMonthly;
  const priceAnnualChanged =
    data.priceAnnual !== undefined && data.priceAnnual !== existing.priceAnnual;

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.tagline !== undefined) updates.tagline = data.tagline;
  if (data.featured !== undefined) updates.featured = data.featured;
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
  if (data.priceMonthly !== undefined) updates.priceMonthly = Number(data.priceMonthly);
  if (data.priceAnnual !== undefined) updates.priceAnnual = Number(data.priceAnnual);
  if (data.trialDays !== undefined) updates.trialDays = Number(data.trialDays);
  if (data.limits !== undefined) updates.limits = data.limits;
  if (data.features !== undefined) updates.features = data.features;
  if (data.bullets !== undefined) updates.bullets = data.bullets;
  if (data.support !== undefined) updates.support = data.support;
  if (data.onboarding !== undefined) updates.onboarding = data.onboarding;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  const archived = Array.isArray(existing.archivedRazorpayPlanIds)
    ? [...existing.archivedRazorpayPlanIds]
    : [];

  // Skip Razorpay churn for BASIC — it has no associated subscription.
  // STRICT RULE: a new Razorpay plan is created ONLY when the price
  // value changes. Other field edits (name, limits, features, bullets)
  // stay DB-only. This keeps Razorpay clean and avoids accidentally
  // creating duplicate plans when admins are tweaking copy.
  const needsRazorpaySync = normalisedCode !== "BASIC";
  let createdRazorpayPlans = [];

  if (needsRazorpaySync && (priceMonthlyChanged || priceAnnualChanged)) {
    const rzp = getRazorpay();
    if (!rzp) {
      logger.warn(
        { code: normalisedCode },
        "Razorpay not configured — price changed but no RZP plan created. Set RAZORPAY_KEY_* env vars to enable.",
      );
    } else {
      // MONTHLY plan refresh.
      if (priceMonthlyChanged) {
        try {
          const created = await rzp.plans.create({
            period: "monthly",
            interval: 1,
            item: {
              name: `${updates.name || existing.name} (Monthly)`,
              amount: updates.priceMonthly,
              currency: "INR",
              description: updates.tagline || existing.tagline,
            },
            notes: { code: normalisedCode, billingCycle: "monthly" },
          });
          if (existing.razorpayPlanIdMonthly) {
            archived.push({
              id: existing.razorpayPlanIdMonthly,
              billingCycle: "monthly",
              archivedAt: new Date().toISOString(),
              replacedBy: created.id,
            });
          }
          updates.razorpayPlanIdMonthly = created.id;
          createdRazorpayPlans.push({ cycle: "monthly", id: created.id });
        } catch (err) {
          logger.error(
            { err: err?.error || err?.message, code: normalisedCode },
            "Razorpay plan create (monthly) failed",
          );
          throw new ApiError(502, "Failed to create new Razorpay monthly plan");
        }
      }

      // ANNUAL plan refresh. Razorpay's billing period is yearly; we store
      // the per-month equivalent in DB but charge yearly × 12 in Razorpay.
      if (priceAnnualChanged) {
        const yearlyAmount = (updates.priceAnnual ?? existing.priceAnnual) * 12;
        try {
          const created = await rzp.plans.create({
            period: "yearly",
            interval: 1,
            item: {
              name: `${updates.name || existing.name} (Annual)`,
              amount: yearlyAmount,
              currency: "INR",
              description: updates.tagline || existing.tagline,
            },
            notes: { code: normalisedCode, billingCycle: "annual" },
          });
          if (existing.razorpayPlanIdAnnual) {
            archived.push({
              id: existing.razorpayPlanIdAnnual,
              billingCycle: "annual",
              archivedAt: new Date().toISOString(),
              replacedBy: created.id,
            });
          }
          updates.razorpayPlanIdAnnual = created.id;
          createdRazorpayPlans.push({ cycle: "annual", id: created.id });
        } catch (err) {
          logger.error(
            { err: err?.error || err?.message, code: normalisedCode },
            "Razorpay plan create (annual) failed",
          );
          throw new ApiError(502, "Failed to create new Razorpay annual plan");
        }
      }

      updates.archivedRazorpayPlanIds = archived;
    }
  }

  const updated = await prisma.plan.update({
    where: { code: normalisedCode },
    data: updates,
  });

  // Audit: surface the price change in PlatformAudit so it shows up in
  // /admin/audit-log alongside org/user mutations.
  if (priceMonthlyChanged || priceAnnualChanged || Object.keys(updates).length > 0) {
    try {
      await prisma.platformAudit.create({
        data: {
          actorId: actorId || null,
          action: "PLAN_UPDATED",
          targetId: updated.id,
          metadata: {
            code: normalisedCode,
            priceMonthlyChanged,
            priceAnnualChanged,
            newRazorpayPlans: createdRazorpayPlans,
            changedFields: Object.keys(updates),
          },
        },
      });
    } catch (auditErr) {
      logger.warn({ err: auditErr?.message }, "PlatformAudit insert for PLAN_UPDATED failed");
    }
  }

  invalidateCache();
  return updated;
}

// Helpers that mirror lib/planLimits.js' shape so planGate can swap
// imports cleanly. All take a planCode and resolve via cache.
async function getLimit(planCode, resource) {
  const plan = await getPlanByCode(planCode);
  return plan?.limits?.[resource] ?? null;
}

async function hasFeature(planCode, feature) {
  const plan = await getPlanByCode(planCode);
  return Boolean(plan?.features?.[feature]);
}

// For the public pricing card / billing page: returns the FE-friendly
// shape (rupees, not paise) so existing FE code doesn't need rewriting.
function toPublicShape(row) {
  if (!row) return null;
  return {
    code: row.code,
    name: row.name,
    tagline: row.tagline,
    featured: row.featured,
    price: {
      monthly: row.priceMonthly / 100,
      annual: row.priceAnnual / 100,
    },
    limits: row.limits,
    features: row.features,
    bullets: row.bullets,
    support: row.support,
    onboarding: row.onboarding,
    trialDays: row.trialDays,
  };
}

module.exports = {
  listPlans,
  getPlanByCode,
  updatePlan,
  getLimit,
  hasFeature,
  toPublicShape,
  invalidateCache,
};
