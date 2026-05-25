const prisma = require("../../config/prisma");
const {
  listNotificationsService,
  getUnreadCountService,
  getCountsService,
  markReadService,
  markAllReadService,
  deleteNotificationService,
  clearAllNotificationsService,
} = require("./notification.service");

// Notifications are user-scoped — the service filters by userId on every
// query so we can safely pass the base prisma client instead of the
// tenant-scoped wrapper. This lets channel partners (who have no single
// companyId) receive notifications across every company they collaborate
// with in one unified inbox.

const listNotifications = async (req, res, next) => {
  try {
    const result = await listNotificationsService(prisma, req.query, req.user.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const data = await getUnreadCountService(prisma, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const getCounts = async (req, res, next) => {
  try {
    const data = await getCountsService(prisma, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const ok = await markReadService(prisma, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await markAllReadService(prisma, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const ok = await deleteNotificationService(prisma, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    await clearAllNotificationsService(prisma, req.user.id);
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
  clearAllNotifications,
};
