const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  checkDuplicates,
  createLead,
  getAllLeads,
  getUnassignedLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  bulkAssignLeads,
  autoAssignLeads,
} = require("./lead.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.post("/check-duplicates", checkDuplicates);
router.get("/unassigned", getUnassignedLeads);
router.post("/auto-assign", requireRole("OWNER", "ADMIN", "MANAGER"), autoAssignLeads);
router.post("/bulk-assign", requireRole("OWNER", "ADMIN", "MANAGER"), bulkAssignLeads);

router.post("/", createLead);
router.get("/", getAllLeads);
router.post("/:id/assign", requireRole("OWNER", "ADMIN", "MANAGER"), assignLead);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteLead);

const activityRoutes = require("../activity/activity.routes");
router.use("/:leadId/activity", activityRoutes);

module.exports = router;
