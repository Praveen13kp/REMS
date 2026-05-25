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
  deleteMultipleNotifications,
  clearAllNotifications,
} = require("./notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/counts", getCounts);
router.patch("/read-all", markAllRead);
router.post("/read-all", markAllRead);
router.post("/delete-multiple", deleteMultipleNotifications);
router.patch("/:id/read", markRead);
router.patch("/:id", markRead);
router.delete("/", clearAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
