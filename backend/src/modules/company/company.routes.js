const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  register,
  getCompanyMe,
  updateCompanyMe,
  completeOnboardingMe,
  getSmtpMe,
  updateSmtpMe,
  testSmtpMe,
  getModuleRestrictions,
  updateModuleRestrictions,
} = require("./company.controller");

const router = express.Router();

router.post("/register", register);
router.get("/me", authMiddleware, getCompanyMe);
router.patch("/me", authMiddleware, requireRole("OWNER", "ADMIN"), updateCompanyMe);
router.post("/me/complete-onboarding", authMiddleware, requireRole("OWNER", "ADMIN"), completeOnboardingMe);

// Per-tenant SMTP — OWNER/ADMIN only. Password is encrypted at rest and
// never returned by GET; the FE shows a "Password is saved" placeholder.
router.get("/me/smtp", authMiddleware, requireRole("OWNER", "ADMIN"), getSmtpMe);
router.patch("/me/smtp", authMiddleware, requireRole("OWNER", "ADMIN"), updateSmtpMe);
router.post("/me/smtp/test", authMiddleware, requireRole("OWNER", "ADMIN"), testSmtpMe);

// Module restrictions: any authenticated company member may READ their own
// company's restrictions (the FE needs them to hide modules for the current
// user — MANAGER/AGENT included). Only OWNER may change them.
router.get("/me/module-restrictions", authMiddleware, getModuleRestrictions);
router.patch("/me/module-restrictions", authMiddleware, requireRole("OWNER"), updateModuleRestrictions);

module.exports = router;