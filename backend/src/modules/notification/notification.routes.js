const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
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

router.use(authMiddleware, tenantMiddleware);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/counts", getCounts);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);
router.delete("/", clearAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
