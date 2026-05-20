const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  getStages,
  reorderStages,
  updateStage,
  createStage,
  deleteStage,
  getBoard,
} = require("./pipeline.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/stages", getStages);
router.get("/board", getBoard);
router.post("/stages", requireRole("OWNER", "ADMIN"), createStage);
router.patch("/stages/reorder", requireRole("OWNER", "ADMIN"), reorderStages);
router.patch("/stages/:id", requireRole("OWNER", "ADMIN"), updateStage);
router.delete("/stages/:id", requireRole("OWNER", "ADMIN"), deleteStage);

module.exports = router;