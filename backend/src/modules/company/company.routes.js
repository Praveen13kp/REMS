const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const { register, getCompanyMe, updateCompanyMe, completeOnboardingMe } = require("./company.controller");

const router = express.Router();

router.post("/register", register);
router.get("/me", authMiddleware, getCompanyMe);
router.patch("/me", authMiddleware, requireRole("OWNER", "ADMIN"), updateCompanyMe);
router.post("/me/complete-onboarding", authMiddleware, requireRole("OWNER", "ADMIN"), completeOnboardingMe);

module.exports = router;