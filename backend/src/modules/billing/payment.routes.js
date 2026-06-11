const express = require("express");
const {
  listPayments,
  getPaymentById,
} = require("./payment.controller");

const router = express.Router();

router.get("/", listPayments);
router.get("/:id", getPaymentById);

module.exports = router;
