const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  getStages,
  reorderStages,
  updateStage,
} = require("./pipeline.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/stages", getStages);
router.patch("/stages/reorder", requireRole("OWNER", "ADMIN"), reorderStages);
router.patch("/stages/:id", requireRole("OWNER", "ADMIN"), updateStage);

module.exports = router;