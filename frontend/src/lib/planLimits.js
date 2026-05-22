// Mirror of backend/src/lib/planLimits.js. Keep both files in sync.
// Used by PricingSection, Signup, billing pages, and any UI that needs to
// know plan caps or feature availability without a network round-trip.

export const PLANS = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    tagline: "Try LeadPro free for 7 days",
    trialDays: 7,
    price: { monthly: 0, annual: 0 },
    limits: {
      users: 3,
      leads: 200,
      projects: 2,
      storageBytes: 500 * 1024 * 1024,
      integrations: 0,
    },
    features: {
      customPipelineStages: false,
      leadAging: false,
      webhookIntake: false,
      byoIntegrations: false,
      duplicateDetection: false,
      agentPrivacy: false,
      auditLog: false,
    },
    support: "Community",
    onboarding: "Self-serve",
    // What we show as bullets on the public pricing card.
    bullets: [
      "7-day free trial",
      "Up to 3 users",
      "200 leads",
      "2 projects",
      "500 MB file storage",
      "Kanban pipeline + contacts",
      "Tasks, notes, activity log",
      "CSV import",
      "Email notifications",
      "Community support",
    ],
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    tagline: "For growing sales teams",
    price: { monthly: 2499, annual: 1999 },
    featured: true,
    limits: {
      users: 10,
      leads: 10000,
      projects: 25,
      storageBytes: 5 * 1024 * 1024 * 1024,
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
      "Everything in Free",
      "Up to 10 users",
      "10,000 leads",
      "25 projects",
      "5 GB file storage",
      "BYO integrations: Facebook, Instagram, Google, IndiaMART, JustDial, Website",
      "Webhook lead intake",
      "Custom pipeline stages",
      "Lead aging alerts",
      "Duplicate-lead detection",
      "Agent privacy controls",
      "Email support",
    ],
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For builders & large brokerages",
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
