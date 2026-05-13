const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const { ownerDashboard, agentDashboard } = require("./dashboard.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/owner", requireRole("OWNER", "ADMIN"), ownerDashboard);
router.get("/agent", agentDashboard);

module.exports = router;
