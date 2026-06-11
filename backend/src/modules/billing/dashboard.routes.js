const express = require("express");
const { getBillingDashboard } = require("./dashboard.controller");

const router = express.Router();

router.get("/", getBillingDashboard);

module.exports = router;
