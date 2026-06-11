const { ApiError } = require("../../lib/ApiError");

async function noteCounts(tenantPrisma, companyId, fromStr, toStr) {
  const start = new Date(fromStr + "T00:00:00.000Z");
  const end = new Date(toStr + "T23:59:59.999Z");
  const rows = await tenantPrisma.journalEntry.groupBy({
    by: ["date"],
    where: { companyId, date: { gte: start, lte: end } },
    _count: { id: true },
  });
  const map = {};
  for (const r of rows) {
    const k = r.date.toISOString().split("T")[0];
    map[k] = r._count.id;
  }
  return map;
}

async function listByDate(tenantPrisma, companyId, dateStr) {
  const start = new Date(dateStr + "T00:00:00.000Z");
  const end = new Date(dateStr + "T23:59:59.999Z");
  return tenantPrisma.journalEntry.findMany({
    where: { companyId, date: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function create(tenantPrisma, { companyId, userId, date, title, description }) {
  const dateObj = new Date(date + "T00:00:00.000Z");
  const existing = await tenantPrisma.journalEntry.findUnique({
    where: { companyId_date_title: { companyId, date: dateObj, title } },
  });
  if (existing) throw new ApiError(409, "A journal entry with this title already exists on this date");
  return tenantPrisma.journalEntry.create({
    data: { companyId, userId, date: dateObj, title, description: description || null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function remove(tenantPrisma, entryId, companyId, userId) {
  const entry = await tenantPrisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
  });
  if (!entry) throw new ApiError(404, "Journal entry not found");
  if (entry.userId !== userId) throw new ApiError(403, "Only the author can delete");
  await tenantPrisma.journalEntry.delete({ where: { id: entryId } });
}

async function daySummary(tenantPrisma, companyId, dateStr) {
  const start = new Date(dateStr + "T00:00:00.000Z");
  const end = new Date(dateStr + "T23:59:59.999Z");
  const [leads, entries] = await Promise.all([
    tenantPrisma.lead.findMany({
      where: { companyId, createdAt: { gte: start, lte: end }, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    tenantPrisma.journalEntry.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  return { leads, journalEntries: entries, leadCount: leads.length };
}

module.exports = { listByDate, create, remove, daySummary, noteCounts };
