const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { getLeadActivity, createLeadActivity } = require("./activity.controller");

const router = express.Router({ mergeParams: true });

router.get("/", authMiddleware, tenantMiddleware, getLeadActivity);
router.post("/", authMiddleware, tenantMiddleware, createLeadActivity);

module.exports = router;
