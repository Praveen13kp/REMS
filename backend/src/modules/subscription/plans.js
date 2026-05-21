const PLAN_LIMITS = {
  BASIC: {
    key: "BASIC",
    name: "Basic",
    amount: 500,
    maxLeads: 50,
    maxUsers: 1,
    features: ["Up to 50 leads", "1 user only", "Basic reports", "Email support"],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    amount: 1000,
    maxLeads: -1,
    maxUsers: 25,
    features: [
      "Unlimited leads",
      "Up to 25 users",
      "AI lead scoring",
      "Advanced analytics",
      "Lead assignment rules",
      "Priority support",
      "API access",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    amount: 1500,
    maxLeads: -1,
    maxUsers: -1,
    features: [
      "Unlimited everything",
      "Unlimited users",
      "Team analytics",
      "Integrations",
      "Webhooks",
      "Custom branding",
      "Dedicated support",
    ],
  },
};

const BILLING_CYCLE = "MONTHLY";
const ACTIVE_STATUSES = ["ACTIVE", "TRIALING"];

function normalizePlan(plan) {
  if (!plan) return "BASIC";
  if (plan === "FREE" || plan === "FREE_TRIAL" || plan === "STARTER") return "BASIC";
  if (plan === "PROFESSIONAL") return "PRO";
  return PLAN_LIMITS[plan] ? plan : "BASIC";
}

function getPlanConfig(plan) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

function nextBillingDate(from = new Date()) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + 1);
  return date;
}

module.exports = {
  PLAN_LIMITS,
  BILLING_CYCLE,
  ACTIVE_STATUSES,
  normalizePlan,
  getPlanConfig,
  nextBillingDate,
};
