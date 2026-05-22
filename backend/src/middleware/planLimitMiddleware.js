const prisma = require("../config/prisma");
const { getPlanConfig, normalizePlan, ACTIVE_STATUSES } = require("../modules/subscription/plans");

function upgradeRequired(res, message, details) {
  return res.status(402).json({
    ok: false,
    error: {
      code: "PLAN_LIMIT_EXCEEDED",
      message,
      details,
    },
  });
}

async function requireLeadCapacity(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        maxLeads: true,
        subscriptionEndDate: true,
        _count: { select: { leads: true } },
      },
    });

    if (!company) {
      return upgradeRequired(res, "Company subscription could not be found.", {
        reason: "COMPANY_NOT_FOUND",
      });
    }

    const plan = getPlanConfig(company?.subscriptionPlan);
    const maxLeads = company?.maxLeads ?? plan.maxLeads;
    const status = company?.subscriptionStatus || "ACTIVE";
    const expired = company?.subscriptionEndDate && company.subscriptionEndDate < new Date();

    if (!ACTIVE_STATUSES.includes(status) || expired) {
      return upgradeRequired(res, "Your subscription is not active. Please upgrade to continue.", {
        reason: "SUBSCRIPTION_INACTIVE",
        plan: normalizePlan(company?.subscriptionPlan),
      });
    }

    if (maxLeads !== -1 && company._count.leads >= maxLeads) {
      return upgradeRequired(res, `Your ${plan.name} plan allows up to ${maxLeads} leads.`, {
        reason: "LEAD_LIMIT",
        plan: plan.key,
        limit: maxLeads,
        usage: company._count.leads,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

async function requireUserCapacity(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        maxUsers: true,
        subscriptionEndDate: true,
        _count: { select: { users: true } },
      },
    });

    if (!company) {
      return upgradeRequired(res, "Company subscription could not be found.", {
        reason: "COMPANY_NOT_FOUND",
      });
    }

    const plan = getPlanConfig(company?.subscriptionPlan);
    const maxUsers = company?.maxUsers ?? plan.maxUsers;
    const status = company?.subscriptionStatus || "ACTIVE";
    const expired = company?.subscriptionEndDate && company.subscriptionEndDate < new Date();

    if (!ACTIVE_STATUSES.includes(status) || expired) {
      return upgradeRequired(res, "Your subscription is not active. Please upgrade to invite users.", {
        reason: "SUBSCRIPTION_INACTIVE",
        plan: normalizePlan(company?.subscriptionPlan),
      });
    }

    if (maxUsers !== -1 && company._count.users >= maxUsers) {
      return upgradeRequired(res, `Your ${plan.name} plan allows up to ${maxUsers} user.`, {
        reason: "USER_LIMIT",
        plan: plan.key,
        limit: maxUsers,
        usage: company._count.users,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireLeadCapacity, requireUserCapacity };
