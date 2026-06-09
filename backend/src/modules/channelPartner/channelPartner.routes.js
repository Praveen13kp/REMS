const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const c = require("./channelPartner.controller");

const router = express.Router();

// Every endpoint here requires a logged-in Channel Partner.
router.use(authMiddleware, requireRole("CHANNEL_PARTNER", "BROKER"));

// Company directory + switch
router.get("/companies", c.getCompanies);
router.patch("/default-company", c.setDefaultCompany);

// Dashboard + leads (scoped to a company via ?companyId=)
router.get("/dashboard", c.getDashboard);
router.get("/leads", c.getLeads);
router.get("/leads/:id", c.getLeadById);

// CP creates a lead under the currently-selected company
router.post("/leads", c.postLead);

// Share / unshare a private lead with one of the CP's companies
router.post("/leads/:id/share", c.postShare);
router.post("/leads/:id/unshare", c.postUnshare);

// Lead operations the CP can do directly
router.patch("/leads/:id/status", c.patchStatus);
router.patch("/leads/:id/visibility", c.patchVisibility);

module.exports = router;
