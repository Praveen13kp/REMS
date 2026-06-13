const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  getPreferences,
  updatePreferences,
} = require("./notificationPreference.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("OWNER"));

router.get("/", getPreferences);
router.put("/", updatePreferences);

module.exports = router;
