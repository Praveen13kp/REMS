const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  bulkAssignLeads,
} = require("./lead.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.post("/", createLead);
router.get("/", getAllLeads);
router.post("/bulk-assign", requireRole("OWNER", "ADMIN", "MANAGER"), bulkAssignLeads);
router.post("/:id/assign", requireRole("OWNER", "ADMIN", "MANAGER"), assignLead);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteLead);

module.exports = router;
