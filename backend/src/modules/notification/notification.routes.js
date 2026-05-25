const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const {
  listNotifications,
  getUnreadCount,
  getCounts,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
} = require("./notification.controller");

const router = express.Router();

// Notifications are user-scoped (every query filters by req.user.id), not
// tenant-scoped. We deliberately skip tenantMiddleware here so channel
// partners — who have companyId=null and can receive notifications from
// every company they collaborate with — get a unified inbox.
router.use(authMiddleware);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/counts", getCounts);
router.patch("/read-all", markAllRead);
router.post("/read-all", markAllRead);
router.patch("/:id/read", markRead);
router.patch("/:id", markRead);
router.delete("/", clearAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
