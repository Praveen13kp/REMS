const NOTIFICATION_TYPES = ["LEAD_ASSIGNED", "LEAD_STATUS_CHANGED", "NOTE_MENTION", "SYSTEM"];

async function listNotificationsService(tenantPrisma, query, userId) {
  const { filter = "all", page = "1", pageSize = "20", search = "" } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(1000, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = { userId };

  if (filter === "unread") where.readAt = null;
  else if (filter === "read") where.readAt = { not: null };
  else if (filter === "mentions") where.type = "NOTE_MENTION";
  else if (filter === "system") where.type = "SYSTEM";

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    tenantPrisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSizeNum,
    }),
    tenantPrisma.notification.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
}

async function getUnreadCountService(tenantPrisma, userId) {
  const count = await tenantPrisma.notification.count({
    where: { userId, readAt: null },
  });
  return { count };
}

async function getCountsService(tenantPrisma, userId) {
  const [all, unread, read] = await Promise.all([
    tenantPrisma.notification.count({ where: { userId } }),
    tenantPrisma.notification.count({ where: { userId, readAt: null } }),
    tenantPrisma.notification.count({ where: { userId, readAt: { not: null } } }),
  ]);
  return { all, unread, read };
}

async function markReadService(tenantPrisma, id, userId) {
  const result = await tenantPrisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

async function markAllReadService(tenantPrisma, userId) {
  await tenantPrisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

async function deleteNotificationService(tenantPrisma, id, userId) {
  const result = await tenantPrisma.notification.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

async function deleteMultipleNotificationsService(tenantPrisma, ids, userId) {
  const result = await tenantPrisma.notification.deleteMany({
    where: {
      id: { in: ids },
      userId,
    },
  });
  return result.count;
}

async function clearAllNotificationsService(tenantPrisma, userId) {
  await tenantPrisma.notification.deleteMany({
    where: { userId },
  });
}

module.exports = {
  listNotificationsService,
  getUnreadCountService,
  getCountsService,
  markReadService,
  markAllReadService,
  deleteNotificationService,
  deleteMultipleNotificationsService,
  clearAllNotificationsService,
};
