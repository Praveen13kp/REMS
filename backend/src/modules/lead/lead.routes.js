const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  checkDuplicates,
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
} = require("./lead.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.post("/check-duplicates", checkDuplicates);
router.post("/", createLead);
router.get("/", getAllLeads);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteLead);

const activityRoutes = require("../activity/activity.routes");
router.use("/:leadId/activity", activityRoutes);

module.exports = router;
