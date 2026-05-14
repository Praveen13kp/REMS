const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  ownerDashboard,
  agentDashboard,
  managerDashboard,
  reportsDashboard,
} = require("./dashboard.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/owner", requireRole("OWNER", "ADMIN"), ownerDashboard);
router.get(
  "/manager",
  requireRole("OWNER", "ADMIN", "MANAGER"),
  managerDashboard,
);
router.get("/agent", agentDashboard);
router.get(
  "/reports",
  requireRole("OWNER", "ADMIN", "MANAGER"),
  reportsDashboard,
);

module.exports = router;
