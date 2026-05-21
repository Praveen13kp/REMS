const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { getPlanConfig, normalizePlan, nextBillingDate, BILLING_CYCLE } = require("./plans");

async function assignDefaultSubscription(tx, companyId, { trial = true } = {}) {
  const plan = getPlanConfig("BASIC");
  const startDate = new Date();
  const endDate = nextBillingDate(startDate);

  await tx.company.update({
    where: { id: companyId },
    data: {
      subscriptionPlan: plan.key,
      subscriptionStatus: trial ? "TRIALING" : "ACTIVE",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      maxUsers: plan.maxUsers,
      maxLeads: plan.maxLeads,
      billingCycle: BILLING_CYCLE,
      isTrialActive: trial,
    },
  });

  return tx.subscription.create({
    data: {
      companyId,
      plan: plan.key,
      amount: plan.amount,
      status: trial ? "TRIALING" : "ACTIVE",
      startDate,
      endDate,
      paymentProvider: trial ? "SYSTEM" : null,
      transactionId: trial ? `trial_${companyId}` : null,
    },
  });
}

async function getSubscription(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: { select: { users: true, leads: true } },
    },
  });
  if (!company) throw new ApiError(404, "Company not found");

  return {
    company: {
      id: company.id,
      name: company.name,
      subscriptionPlan: normalizePlan(company.subscriptionPlan),
      subscriptionStatus: company.subscriptionStatus,
      subscriptionStartDate: company.subscriptionStartDate,
      subscriptionEndDate: company.subscriptionEndDate,
      maxUsers: company.maxUsers,
      maxLeads: company.maxLeads,
      billingCycle: company.billingCycle,
      isTrialActive: company.isTrialActive,
      usage: {
        users: company._count.users,
        leads: company._count.leads,
      },
    },
    subscriptions: company.subscriptions,
  };
}

async function previewCheckout(companyId, planKey) {
  const plan = getPlanConfig(planKey);
  if (!plan) throw new ApiError(400, "Invalid subscription plan");

  return {
    provider: "MANUAL",
    plan: plan.key,
    amount: plan.amount,
    currency: "INR",
    checkoutId: `manual_${companyId}_${plan.key}_${Date.now()}`,
  };
}

async function activateSubscription(companyId, { plan: planKey, transactionId, paymentProvider = "MANUAL" }) {
  const plan = getPlanConfig(planKey);
  if (!plan) throw new ApiError(400, "Invalid subscription plan");

  const startDate = new Date();
  const endDate = nextBillingDate(startDate);

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        companyId,
        plan: plan.key,
        amount: plan.amount,
        status: "ACTIVE",
        startDate,
        endDate,
        paymentProvider,
        transactionId: transactionId || `manual_${Date.now()}`,
      },
    });

    const company = await tx.company.update({
      where: { id: companyId },
      data: {
        subscriptionPlan: plan.key,
        subscriptionStatus: "ACTIVE",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        maxUsers: plan.maxUsers,
        maxLeads: plan.maxLeads,
        billingCycle: BILLING_CYCLE,
        isTrialActive: false,
      },
    });

    return { company, subscription };
  });
}

module.exports = {
  assignDefaultSubscription,
  getSubscription,
  previewCheckout,
  activateSubscription,
};
