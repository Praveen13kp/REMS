const express = require("express");
const multer = require("multer");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
// Lead-cap enforcement now lives inside the controller (assertWithinLimit
// in lead.controller.js) — see Phase 2 of the billing rework. The old
// planLimitMiddleware was replaced and deleted.
const {
  checkDuplicates,
  createLead,
  getAllLeads,
  getUnassignedLeads,
  getLeadById,
  updateLead,
  deleteLead,
  restoreLead,
  listDeletedLeads,
  exportLeadsCsv,
  assignLead,
  bulkAssignLeads,
  autoAssignLeads,
  transitionLead,
  importLeads,
  getAgingLeads,
  initiateCall,
  sendLeadEmail,
} = require("./lead.controller");

const router = express.Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB CSV cap
});

router.use(authMiddleware, tenantMiddleware);

router.post("/check-duplicates", checkDuplicates);
router.get("/unassigned", getUnassignedLeads);
router.get("/aging", getAgingLeads);
router.get("/trash", requireRole("OWNER", "ADMIN"), listDeletedLeads);
router.get("/export", exportLeadsCsv);
router.post("/:id/restore", requireRole("OWNER", "ADMIN"), restoreLead);
router.post("/auto-assign", requireRole("OWNER", "ADMIN", "MANAGER"), autoAssignLeads);
router.post("/bulk-assign", requireRole("OWNER", "ADMIN", "MANAGER"), bulkAssignLeads);
router.post(
  "/import",
  requireRole("OWNER", "ADMIN", "MANAGER"),
  csvUpload.single("file"),
  importLeads,
);

router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), createLead);
router.get("/", getAllLeads);
router.post("/:id/assign", requireRole("OWNER", "ADMIN", "MANAGER"), assignLead);
router.post("/:id/transition", transitionLead);
router.post("/:id/call", initiateCall);
router.post(
  "/:id/send-email",
  requireRole("OWNER", "ADMIN", "MANAGER"),
  sendLeadEmail,
);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteLead);

const activityRoutes = require("../activity/activity.routes");
router.use("/:leadId/activity", activityRoutes);

module.exports = router;
