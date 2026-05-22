const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  getMyPlan,
  listPlansPublic,
  getBillingConfig,
  createSubscription,
  cancelSubscription,
  listMySubscriptions,
  listMyPayments,
  razorpayWebhook,
} = require("./billing.controller");

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

router.get("/plan", getMyPlan);
router.get("/subscriptions", listMySubscriptions);
router.post("/subscriptions", createSubscription);
router.post("/subscriptions/:id/cancel", cancelSubscription);
router.get("/payments", listMyPayments);

module.exports = router;
