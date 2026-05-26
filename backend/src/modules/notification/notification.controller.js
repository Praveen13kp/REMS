const prisma = require("../../config/prisma");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const {
  listNotificationsService,
  getUnreadCountService,
  getCountsService,
  markReadService,
  markAllReadService,
  deleteNotificationService,
  deleteMultipleNotificationsService,
  clearAllNotificationsService,
} = require("./notification.service");

/**
 * For notifications, we allow users without a primary companyId (Brokers,
 * Super Admins) to use the global prisma client filtered by their userId.
 * For regular tenant users (Owner, Admin, Manager, Agent), we use
 * getTenantPrisma to maintain strict isolation.
 */
function getPrismaClient(req) {
  if (req.user.companyId) {
    return getTenantPrisma(req.user.companyId);
  }
  return prisma;
}

const listNotifications = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    const result = await listNotificationsService(p, req.query, req.user.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    const data = await getUnreadCountService(p, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const getCounts = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    const data = await getCountsService(p, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    const ok = await markReadService(p, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    await markAllReadService(p, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    const ok = await deleteNotificationService(p, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const deleteMultipleNotifications = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ ok: false, error: { message: "No IDs provided" } });
    }
    const p = getPrismaClient(req);
    await deleteMultipleNotificationsService(p, ids, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    const p = getPrismaClient(req);
    await clearAllNotificationsService(p, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  getCounts,
  markRead,
  markAllRead,
  deleteNotification,
  deleteMultipleNotifications,
  clearAllNotifications,
};
