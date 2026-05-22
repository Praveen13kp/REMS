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
  subscriptions,
  listUsers,
  getUser,
  patchUser,
  auditLog,
  companyAuditLog,
  invoices,
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
router.get("/subscriptions", subscriptions);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id", patchUser);
router.get("/audit-log", auditLog);

// Plan CRUD endpoints. updatePlan triggers a Razorpay plan re-create
// when priceMonthly/priceAnnual changes; all other fields are DB-only.
const planAdminController = require("../plan/plan.controller");
router.get("/plans", planAdminController.listAllForAdmin);
router.patch("/plans/:code", planAdminController.updatePlan);
router.get("/companies/:id/audit-log", companyAuditLog);
router.get("/invoices", invoices);

module.exports = router;
