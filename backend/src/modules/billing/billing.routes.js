const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireModule } = require("../../middleware/rbacMiddleware");
const {
  getMyPlan,
  listPlansPublic,
  getBillingConfig,
  createSubscription,
  verifySubscription,
  reconcileSubscriptionsCtrl,
  cancelSubscription,
  listMySubscriptions,
  listMyPayments,
  razorpayWebhook,
  startTrial,
  seedTestData,
} = require("./billing.controller");

const invoiceRoutes = require("./invoice.routes");
const paymentRoutes = require("./payment.routes");

const router = express.Router();

// Webhook is unauthenticated — verified by HMAC signature instead. Must
// be defined before the auth middleware mount below.
router.post("/webhooks/razorpay", razorpayWebhook);

// Public — the marketing pricing page reads this. No auth on purpose so
// /pricing renders even for signed-out visitors.
router.get("/plans", listPlansPublic);

// Config check needs auth but NOT tenant scope — SuperAdmin (who has no
// companyId) must be able to read this for the Plans admin banner.
router.get("/config", authMiddleware, getBillingConfig);

router.use(authMiddleware, tenantMiddleware);
router.use(requireModule("Billing"));

router.get("/plan", getMyPlan);
router.post("/start-trial", startTrial);
router.get("/subscriptions", listMySubscriptions);
router.post("/subscriptions", createSubscription);
router.post("/subscriptions/verify", verifySubscription);
router.post("/subscriptions/reconcile", reconcileSubscriptionsCtrl);
router.post("/subscriptions/:id/cancel", cancelSubscription);
router.get("/payments", listMyPayments);

// Dev-only: seed test invoice + payment data
router.post("/seed-test-data", seedTestData);

router.use("/invoices", invoiceRoutes);
router.use("/invoice-payments", paymentRoutes);

module.exports = router;
