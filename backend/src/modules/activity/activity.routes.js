const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { getLeadActivity } = require("./activity.controller");

const router = express.Router({ mergeParams: true });

router.get("/", authMiddleware, tenantMiddleware, getLeadActivity);

module.exports = router;
