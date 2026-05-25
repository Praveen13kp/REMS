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

module.exports = router;