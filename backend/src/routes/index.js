const express = require("express");

const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");

const leadRoutes = require("../modules/lead/lead.routes");

router.use("/auth", authRoutes);

router.use("/leads", leadRoutes);

module.exports = router;