// Single source of truth for subscription plans, limits, and feature gates.
// Keep this file in sync with frontend/src/lib/planLimits.js — same shape,
// same numbers. The two are duplicated (not shared via a package) because
// the repo isn't a monorepo. Update both together.
//
// Plan codes are persisted in Company.subscriptionPlan as plain strings:
// "FREE" | "PRO" | "ENTERPRISE". Legacy values ("FREE_TRIAL", "STARTER",
// "PROFESSIONAL") are migrated to one of these three by the 20260521 migration.

const FEATURE_FLAGS = [
  "customPipelineStages",
  "leadAging",
  "webhookIntake",
  "byoIntegrations",
  "duplicateDetection",
  "agentPrivacy",
  "auditLog",
];

const PLANS = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    tagline: "Entry tier — every essential to start working leads",
    // Days the tenant gets the plan free after sign-up / Subscribe. Same
    // 7-day window applies to all three plans now — trialEndsAt is enforced
    // by planGate.assertTrialActive() regardless of which plan was picked.
    trialDays: 7,
    price: { monthly: 499, annual: 399 },
    limits: {
      users: 10,
      leads: 1500,
      projects: 10,
      storageBytes: 3 * 1024 * 1024 * 1024, // 3 GB
      integrations: 3,
    },
    features: {
      customPipelineStages: false,
      leadAging: true,
      webhookIntake: false,
      byoIntegrations: false,
      duplicateDetection: true,
      agentPrivacy: true,
      auditLog: false,
    },
    support: "Community",
    onboarding: "Self-serve",
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    tagline: "For growing sales teams",
    trialDays: 7,
    price: { monthly: 2499, annual: 1999 },
    featured: true,
    limits: {
      users: 50,
      leads: 25000,
      projects: 50,
      storageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
      integrations: null,                    // all six drivers
    },
    features: {
      customPipelineStages: true,
      leadAging: true,
      webhookIntake: true,
      byoIntegrations: true,
      duplicateDetection: true,
      agentPrivacy: true,
      auditLog: false,
    },
    support: "Email",
    onboarding: "Self-serve",
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For builders & large brokerages",
    trialDays: 7,
    price: { monthly: 8999, annual: 7199 },
    limits: {
      users: null,
      leads: null,
      projects: null,
      storageBytes: null,
      integrations: null,
    },
    features: {
      customPipelineStages: true,
      leadAging: true,
      webhookIntake: true,
      byoIntegrations: true,
      duplicateDetection: true,
      agentPrivacy: true,
      auditLog: true,
    },
    support: "Priority email + phone",
    onboarding: "Guided session",
  },
};

const PLAN_CODES = Object.keys(PLANS);
const DEFAULT_PLAN = "BASIC";

// Legacy values that may still be in the DB; map them on read.
const LEGACY_PLAN_MAP = {
  FREE_TRIAL: "BASIC",
  FREE: "BASIC",
  STARTER: "PRO",
  PROFESSIONAL: "PRO",
  BASIC: "BASIC",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

function normalisePlanCode(raw) {
  if (!raw) return DEFAULT_PLAN;
  const upper = String(raw).toUpperCase();
  return LEGACY_PLAN_MAP[upper] || DEFAULT_PLAN;
}

function getPlan(code) {
  return PLANS[normalisePlanCode(code)];
}

function getLimit(planCode, resource) {
  const plan = getPlan(planCode);
  return plan.limits[resource] ?? null;
}

function hasFeature(planCode, feature) {
  const plan = getPlan(planCode);
  return Boolean(plan.features[feature]);
}

function annualMonthlyEquivalent(planCode) {
  return getPlan(planCode).price.annual;
}

module.exports = {
  PLANS,
  PLAN_CODES,
  DEFAULT_PLAN,
  FEATURE_FLAGS,
  LEGACY_PLAN_MAP,
  normalisePlanCode,
  getPlan,
  getLimit,
  hasFeature,
  annualMonthlyEquivalent,
};
