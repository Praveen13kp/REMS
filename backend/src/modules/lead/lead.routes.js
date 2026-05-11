const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
} = require("./lead.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.post("/", createLead);
router.get("/", getAllLeads);
router.get("/:id", getLeadById);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

module.exports = router;
