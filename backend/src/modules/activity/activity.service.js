async function logActivity(tenantPrisma, { leadId, userId, type, content, metadata }) {
  return tenantPrisma.activity.create({
    data: { leadId: leadId || null, userId, type, content, metadata: metadata || undefined },
  });
}

// Tenant-wide audit log for the company Audit Log page (OWNER/ADMIN).
// Joins user info + lead info so the UI can render "X did Y on lead Z"
// without extra round trips. Supports filtering by user, type, and date
// range. Pagination is server-side because activity tables grow fast.
async function getCompanyActivityService(tenantPrisma, query) {
  const {
    userId,
    type,
    dateFrom,
    dateTo,
    page = "1",
    pageSize = "30",
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 30));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }

  const [items, total] = await Promise.all([
    tenantPrisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSizeNum,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        lead: { select: { id: true, name: true } },
      },
    }),
    tenantPrisma.activity.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
}

async function getLeadActivityService(tenantPrisma, leadId, query) {
  const { page = "1", pageSize = "20" } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const [items, total] = await Promise.all([
    tenantPrisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSizeNum,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    tenantPrisma.activity.count({ where: { leadId } }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
}

module.exports = { logActivity, getLeadActivityService, getCompanyActivityService };
