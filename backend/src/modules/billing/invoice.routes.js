const express = require("express");
const {
  listInvoices,
  getInvoiceById,
} = require("./invoice.controller");

const router = express.Router();

router.get("/", listInvoices);
router.get("/:id", getInvoiceById);

module.exports = router;
