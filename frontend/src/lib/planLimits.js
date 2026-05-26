// Mirror of backend/src/lib/planLimits.js. Keep both files in sync.
// Used by PricingSection, Signup, billing pages, and any UI that needs to
// know plan caps or feature availability without a network round-trip.

export const PLANS = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    tagline: "Entry tier — every essential to start working leads",
    trialDays: 7,
    price: { monthly: 499, annual: 399 },
    limits: {
      users: 10,
      leads: 1500,
      projects: 10,
      storageBytes: 3 * 1024 * 1024 * 1024,
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
    // What we show as bullets on the public pricing card.
    bullets: [
      "Up to 10 users",
      "1,500 leads",
      "10 projects",
      "3 GB file storage",
      "3 lead-source integrations",
      "Lead aging alerts",
      "Duplicate-lead detection",
      "Agent privacy controls",
      "Kanban pipeline, tasks, notes, files",
      "CSV import + email notifications",
      "Community support",
    ],
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
      storageBytes: 25 * 1024 * 1024 * 1024,
      integrations: null,
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
    bullets: [
      "Everything in Basic, plus:",
      "50 users · 25,000 leads · 50 projects",
      "25 GB file storage",
      "All 6 integrations (no 3-integration cap)",
      "Webhook lead intake",
      "Custom pipeline stages",
      "Email support",
    ],
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
    bullets: [
      "Everything in Pro",
      "Unlimited users",
      "Unlimited leads & projects",
      "Unlimited file storage",
      "Audit log (compliance-ready)",
      "Priority support (email + phone)",
      "Guided onboarding session",
    ],
  },
};

export const PLAN_CODES = Object.keys(PLANS);
export const DEFAULT_PLAN = "BASIC";

// Tier ordering used to label cross-plan CTAs (Upgrade / Downgrade / Current).
const PLAN_RANK = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };
export function planRank(code) {
  return PLAN_RANK[String(code || "").toUpperCase()] ?? 0;
}
export function planChangeKind(current, target) {
  if (!current) return "choose"; // trial user, no active plan
  if (current === target) return "current";
  return planRank(target) > planRank(current) ? "upgrade" : "downgrade";
}

const LEGACY_PLAN_MAP = {
  FREE_TRIAL: "BASIC",
  FREE: "BASIC",
  STARTER: "PRO",
  PROFESSIONAL: "PRO",
  BASIC: "BASIC",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

export function normalisePlanCode(raw) {
  if (!raw) return DEFAULT_PLAN;
  const upper = String(raw).toUpperCase();
  return LEGACY_PLAN_MAP[upper] || DEFAULT_PLAN;
}

export function getPlan(code) {
  return PLANS[normalisePlanCode(code)];
}

export function getLimit(planCode, resource) {
  return getPlan(planCode).limits[resource] ?? null;
}

export function hasFeature(planCode, feature) {
  return Boolean(getPlan(planCode).features[feature]);
}

export function formatLimit(value, suffix = "") {
  if (value == null) return "Unlimited";
  return value.toLocaleString("en-IN") + (suffix ? ` ${suffix}` : "");
}

export function formatStorage(bytes) {
  if (bytes == null) return "Unlimited";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(bytes % (1024 * 1024 * 1024) === 0 ? 0 : 1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
