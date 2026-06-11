const express = require("express");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  revenueReport,
  outstandingReport,
  agingReport,
  paymentCollectionReport,
  customerPaymentHistory,
  projectRevenueReport,
} = require("./reports.controller");

const router = express.Router();

router.get("/revenue", requireRole("OWNER", "ADMIN", "MANAGER"), revenueReport);
router.get("/outstanding", requireRole("OWNER", "ADMIN", "MANAGER"), outstandingReport);
router.get("/aging", requireRole("OWNER", "ADMIN", "MANAGER"), agingReport);
router.get("/payment-collection", requireRole("OWNER", "ADMIN", "MANAGER"), paymentCollectionReport);
router.get("/customer-payment-history", requireRole("OWNER", "ADMIN", "MANAGER"), customerPaymentHistory);
router.get("/project-revenue", requireRole("OWNER", "ADMIN", "MANAGER"), projectRevenueReport);

module.exports = router;
