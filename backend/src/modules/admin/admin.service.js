// All admin queries use the raw prisma client — cross-tenant access is intentional.

const prisma = require("../../config/prisma");

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

async function getStats() {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const thirtyDaysAgo = addDays(now, -30);

  const [totalCompanies, activeCompanies, totalUsers, newSignups7d, newSignups30d] =
    await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.company.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

  const mrr = activeCompanies * 0; // TODO(prod): real pricing
  return { totalCompanies, activeCompanies, totalUsers, newSignups7d, newSignups30d, mrr };
}

async function getCompanies(query) {
  const { status, plan, search, page = "1", pageSize = "20" } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (status) where.status = status;
  if (plan) where.subscriptionPlan = plan;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: pageSizeNum,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, leads: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  const items = companies.map((c) => ({
    id: c.id,
    name: c.name,
    timezone: c.timezone,
    plan: c.subscriptionPlan,
    status: c.status,
    industry: c.type,
    userCount: c._count.users,
    leadCount: c._count.leads,
    createdAt: c.createdAt,
  }));

  return { items, total, page: pageNum, pageSize: pageSizeNum };
}

async function getCompanyById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, leads: true, projects: true } },
      users: {
        where: { role: "OWNER" },
        select: { id: true, name: true, email: true, phone: true },
        take: 1,
      },
    },
  });

  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    timezone: company.timezone,
    plan: company.subscriptionPlan,
    status: company.status,
    industry: company.type,
    city: company.city,
    onboardingCompleted: company.onboardingCompleted,
    userCount: company._count.users,
    leadCount: company._count.leads,
    projectCount: company._count.projects,
    owner: company.users[0] || null,
    createdAt: company.createdAt,
  };
}

async function updateCompany(id, data, actorId) {
  const updates = {};
  if (data.status !== undefined) updates.status = data.status;
  if (data.plan !== undefined) updates.subscriptionPlan = data.plan;
  if (data.notes !== undefined) updates.notes = data.notes;

  const company = await prisma.company.update({
    where: { id },
    data: updates,
  });

  if (data.status) {
    await prisma.platformAudit.create({
      data: {
        actorId,
        action: data.status === "SUSPENDED" ? "COMPANY_SUSPENDED" : "COMPANY_ACTIVATED",
        targetId: id,
        metadata: { previousStatus: company.status, newStatus: data.status },
      },
    });
  }

  return company;
}

async function deleteCompany(id, actorId) {
  const company = await prisma.company.update({
    where: { id },
    data: { status: "DELETED" },
  });

  await prisma.platformAudit.create({
    data: {
      actorId,
      action: "COMPANY_DELETED",
      targetId: id,
      metadata: { previousStatus: company.status },
    },
  });

  return company;
}

async function getRecentSignups(limit = 20) {
  return prisma.company.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      subscriptionPlan: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
}

async function getWeeklySignups(weeks = 12) {
  const endDate = startOfDay(new Date());
  const startDate = addDays(endDate, -(weeks * 7));

  const signups = await prisma.company.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
  });

  const buckets = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(startDate, i * 7);
    const weekEnd = addDays(weekStart, 7);
    const count = signups.filter(
      (s) => s.createdAt >= weekStart && s.createdAt < weekEnd,
    ).length;
    buckets.push({
      week: weekStart.toISOString().slice(0, 10),
      count,
    });
  }

  return buckets;
}

async function getHealth() {
  return {
    apiUptime: "99.98%",
    database: "healthy",
    emailService: "healthy",
    jobs: { queued: 3 },
    storage: { usedPct: 78 },
  };
}

async function getActivity(limit = 10) {
  return prisma.platformAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}

module.exports = {
  getStats,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getRecentSignups,
  getWeeklySignups,
  getHealth,
  getActivity,
};
