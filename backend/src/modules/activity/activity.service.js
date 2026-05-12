async function logActivity(tenantPrisma, { leadId, userId, type, content, metadata }) {
  return tenantPrisma.activity.create({
    data: { leadId, userId, type, content, metadata: metadata || undefined },
  });
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

module.exports = { logActivity, getLeadActivityService };
