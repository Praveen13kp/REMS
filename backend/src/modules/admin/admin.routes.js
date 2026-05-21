const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requirePlatformAdmin } = require("../../middleware/requirePlatformAdmin");
const {
  stats,
  listCompanies,
  getCompany,
  patchCompany,
  removeCompany,
  recentSignups,
  weeklySignups,
  health,
  activity,
  createCompany,
} = require("./admin.controller");

const router = express.Router();

router.use(authMiddleware, requirePlatformAdmin);

router.get("/stats", stats);
router.get("/companies", listCompanies);
router.post("/companies", createCompany);
router.get("/companies/:id", getCompany);
router.patch("/companies/:id", patchCompany);
router.delete("/companies/:id", removeCompany);
router.get("/signups/recent", recentSignups);
router.get("/signups/weekly", weeklySignups);
router.get("/health", health);
router.get("/activity", activity);

module.exports = router;
