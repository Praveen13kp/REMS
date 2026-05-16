const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");

// Returns the company IDs this broker is ACTIVE on. Used to scope every
// broker-facing query — a broker can never see a company they're not linked to.
async function activeCompanyIds(brokerUserId) {
  const rows = await prisma.brokerCompany.findMany({
    where: { brokerUserId, status: "ACTIVE" },
    select: { companyId: true },
  });
  return rows.map((r) => r.companyId);
}

async function listCompanies(brokerUserId) {
  const rows = await prisma.brokerCompany.findMany({
    where: { brokerUserId, status: { in: ["ACTIVE", "INVITED"] } },
    select: {
      status: true,
      acceptedAt: true,
      invitedAt: true,
      company: { select: { id: true, name: true, city: true, logoUrl: true } },
    },
    orderBy: { invitedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.company.id,
    name: r.company.name,
    city: r.company.city,
    logoUrl: r.company.logoUrl,
    status: r.status,
    invitedAt: r.invitedAt,
    acceptedAt: r.acceptedAt,
  }));
}

// Resolve which company IDs a broker query targets. If the caller passes
// `companyId`, it must be one of the broker's ACTIVE links; otherwise we
// scope to the full union. Returns null if the broker has no links.
async function resolveScope(brokerUserId, companyId) {
  const active = await activeCompanyIds(brokerUserId);
  if (active.length === 0) return [];
  if (!companyId) return active;
  if (!active.includes(companyId)) {
    throw new ApiError(404, "Company not found");
  }
  return [companyId];
}

async function dashboard(brokerUserId, companyId) {
  const scope = await resolveScope(brokerUserId, companyId);
  if (scope.length === 0) {
    return { totalLeads: 0, hotLeads: 0, tasksToday: 0, recentActivity: [] };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [totalLeads, hotLeads, tasksToday, recentActivity] = await Promise.all([
    prisma.lead.count({
      where: { companyId: { in: scope }, assignedToId: brokerUserId },
    }),
    prisma.lead.count({
      where: {
        companyId: { in: scope },
        assignedToId: brokerUserId,
        priority: "HOT",
      },
    }),
    prisma.task.count({
      where: {
        companyId: { in: scope },
        assignedToId: brokerUserId,
        dueAt: { gte: startOfDay, lt: endOfDay },
        status: { not: "COMPLETED" },
      },
    }),
    prisma.activity.findMany({
      where: { companyId: { in: scope }, userId: brokerUserId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        content: true,
        createdAt: true,
        leadId: true,
        companyId: true,
      },
    }),
  ]);

  return { totalLeads, hotLeads, tasksToday, recentActivity };
}

async function listLeads(brokerUserId, { companyId, scope }) {
  const scopedCompanies = await resolveScope(brokerUserId, companyId);
  if (scopedCompanies.length === 0) return [];

  const where = { companyId: { in: scopedCompanies } };
  if (scope === "own") {
    where.createdById = brokerUserId;
  } else {
    where.assignedToId = brokerUserId;
  }

  return prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      priority: true,
      source: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      updatedAt: true,
      createdAt: true,
    },
  });
}

async function getLead(brokerUserId, leadId) {
  const scope = await activeCompanyIds(brokerUserId);
  if (scope.length === 0) {
    throw new ApiError(404, "Lead not found");
  }
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: { in: scope } },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      company: { select: { id: true, name: true } },
    },
  });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }
  return lead;
}

module.exports = { listCompanies, dashboard, listLeads, getLead, activeCompanyIds };
