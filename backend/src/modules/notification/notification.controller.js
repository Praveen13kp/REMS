const {
  listNotificationsService,
  getUnreadCountService,
  getCountsService,
  markReadService,
  markAllReadService,
  deleteNotificationService,
  clearAllNotificationsService,
} = require("./notification.service");

const listNotifications = async (req, res, next) => {
  try {
    const result = await listNotificationsService(req.tenantPrisma, req.query, req.user.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const data = await getUnreadCountService(req.tenantPrisma, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const getCounts = async (req, res, next) => {
  try {
    const data = await getCountsService(req.tenantPrisma, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const ok = await markReadService(req.tenantPrisma, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await markAllReadService(req.tenantPrisma, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const ok = await deleteNotificationService(req.tenantPrisma, req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: { message: "Notification not found" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    await clearAllNotificationsService(req.tenantPrisma, req.user.id);
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
