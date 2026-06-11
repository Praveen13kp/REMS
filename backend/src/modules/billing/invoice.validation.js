const { z } = require("zod");

const INVOICE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

module.exports = {
  INVOICE_STATUSES,
};
