const express = require("express");
const multer = require("multer");
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
  transitionLead,
  importLeads,
} = require("./lead.controller");

const router = express.Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB CSV cap
});

router.use(authMiddleware, tenantMiddleware);

router.post("/check-duplicates", checkDuplicates);
router.get("/unassigned", getUnassignedLeads);
router.post("/auto-assign", requireRole("OWNER", "ADMIN", "MANAGER"), autoAssignLeads);
router.post("/bulk-assign", requireRole("OWNER", "ADMIN", "MANAGER"), bulkAssignLeads);
router.post(
  "/import",
  requireRole("OWNER", "ADMIN", "MANAGER"),
  csvUpload.single("file"),
  importLeads,
);

router.post("/", createLead);
router.get("/", getAllLeads);
router.post("/:id/assign", requireRole("OWNER", "ADMIN", "MANAGER"), assignLead);
router.post("/:id/transition", transitionLead);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteLead);

const activityRoutes = require("../activity/activity.routes");
router.use("/:leadId/activity", activityRoutes);

module.exports = router;
