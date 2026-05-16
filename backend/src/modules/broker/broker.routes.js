const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const { getCompanies, getDashboard, getLeads, getLeadById } = require("./broker.controller");

const router = express.Router();

router.use(authMiddleware, requireRole("BROKER"));

router.get("/companies", getCompanies);
router.get("/dashboard", getDashboard);
router.get("/leads", getLeads);
router.get("/leads/:id", getLeadById);

module.exports = router;
