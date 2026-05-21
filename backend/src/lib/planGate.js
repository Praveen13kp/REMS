// Plan enforcement helpers. Called from services right before a create/write
// that would push the tenant past its plan's caps. Throws ApiError(402,...)
// with a structured payload the frontend turns into an upgrade prompt.
//
// We intentionally do NOT cache the plan / counts per request — checks happen
// once per write, the queries are cheap (indexed counts), and the trade-off
// is far better than serving a stale "you're on FREE" after the owner just
// completed Razorpay checkout.

const prisma = require("../config/prisma");
const { ApiError } = require("./ApiError");
const { normalisePlanCode } = require("./planLimits");
// Lazy-required to avoid a require cycle: plan.service imports billing
// (razorpay client) which imports env which… is fine in practice but the
// late require also lets planGate work in scripts that don't wire planService.
let _planService = null;
function planService() {
  if (!_planService) _planService = require("../modules/plan/plan.service");
  return _planService;
}

const UPGRADE_URL = "/admin/billing";

// 402 Payment Required is the conventional code for plan-cap violations.
// Stripe/Linear/Cal.com all use it the same way. The error body carries
// enough structure for the FE to render a contextual upgrade modal.
async function planLimitError({ resource, limit, current, plan, feature }) {
  const planRow = await planService().getPlanByCode(plan);
  const planName = planRow?.name || plan;
  const message = feature
    ? `${planName} plan doesn't include ${feature}. Upgrade to enable it.`
    : `${planName} plan is limited to ${limit.toLocaleString("en-IN")} ${resource}. You're at ${current}.`;

  return new ApiError(402, message, {
    code: feature ? "PLAN_FEATURE_LOCKED" : "PLAN_LIMIT_EXCEEDED",
    details: { resource, limit, current, plan, feature, upgradeUrl: UPGRADE_URL },
  });
}

async function getCompanyPlan(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionPlan: true },
  });
  return normalisePlanCode(company?.subscriptionPlan);
}

// Trial gate. Throws 402 TRIAL_EXPIRED when a BASIC company's trialEndsAt
// has passed. Called before every gated write so an expired trial blocks
// the same surface a plan-cap violation would. Companies on PRO/ENTERPRISE
// (paid) are exempt — trialEndsAt is irrelevant once they've paid.
async function assertTrialActive(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionPlan: true, trialEndsAt: true },
  });
  const planCode = normalisePlanCode(company?.subscriptionPlan);
  if (planCode !== "BASIC") return;
  if (!company.trialEndsAt) return; // not enrolled in trial (legacy row); allow
  if (company.trialEndsAt.getTime() > Date.now()) return; // still in trial

  throw new ApiError(402, "Your 7-day Basic trial has ended. Upgrade to continue using LeadPro.", {
    code: "TRIAL_EXPIRED",
    details: {
      plan: planCode,
      trialEndsAt: company.trialEndsAt.toISOString(),
      upgradeUrl: UPGRADE_URL,
    },
  });
}

// Live count of "users" against the user cap. We count both real Users in
// the tenant (excluding soft-deleted) AND pending invites — otherwise an
// owner on FREE could mass-invite 30 people and only hit the cap once they
// accepted, which is too late.
async function countUsers(companyId) {
  const [users, pendingInvites] = await Promise.all([
    prisma.user.count({ where: { companyId, deletedAt: null } }),
    prisma.invite.count({
      where: {
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        role: { not: "BROKER" }, // brokers don't consume a tenant seat
      },
    }),
  ]);
  return users + pendingInvites;
}

async function countLeads(companyId) {
  return prisma.lead.count({ where: { companyId } });
}

async function countProjects(companyId) {
  return prisma.project.count({ where: { companyId } });
}

async function countIntegrations(companyId) {
  return prisma.integrationCredential.count({ where: { companyId } });
}

async function sumStorageBytes(companyId) {
  const agg = await prisma.file.aggregate({
    where: { companyId },
    _sum: { sizeBytes: true },
  });
  return agg._sum.sizeBytes ?? 0;
}

const COUNTERS = {
  users: countUsers,
  leads: countLeads,
  projects: countProjects,
  integrations: countIntegrations,
  storageBytes: sumStorageBytes,
};

// Throws if creating `increment` more of `resource` would push the tenant
// past their plan cap. increment=1 for normal create paths, increment=N for
// bulk operations like CSV import.
async function assertWithinLimit(companyId, resource, increment = 1) {
  // Always check the trial first — an expired trial blocks the same write
  // surface as a real cap, with the more specific TRIAL_EXPIRED message.
  await assertTrialActive(companyId);
  const plan = await getCompanyPlan(companyId);
  const limit = await planService().getLimit(plan, resource);
  if (limit == null) return; // unlimited on this plan
  const counter = COUNTERS[resource];
  if (!counter) {
    throw new Error(`planGate: no counter wired for resource "${resource}"`);
  }
  const current = await counter(companyId);
  if (current + increment > limit) {
    throw await planLimitError({ resource, limit, current, plan });
  }
}

// For CSV import + similar bulk paths: tells the caller how many rows it
// can still accept. Returns Infinity when the plan has no cap, 0 when the
// tenant is already at or over the cap.
async function remainingCapacity(companyId, resource) {
  const plan = await getCompanyPlan(companyId);
  const limit = await planService().getLimit(plan, resource);
  if (limit == null) return Infinity;
  const counter = COUNTERS[resource];
  const current = await counter(companyId);
  return Math.max(0, limit - current);
}

// Feature-flag gate (no count involved). Throws 402 with a feature-locked
// payload if the company's plan doesn't include this feature.
async function assertFeatureEnabled(companyId, feature) {
  await assertTrialActive(companyId);
  const plan = await getCompanyPlan(companyId);
  if (!(await planService().hasFeature(plan, feature))) {
    throw await planLimitError({ plan, feature });
  }
}

module.exports = {
  assertWithinLimit,
  assertFeatureEnabled,
  assertTrialActive,
  remainingCapacity,
  getCompanyPlan,
};
