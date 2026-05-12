const express = require("express");

const router = express.Router();

const contactRoutes = require("../modules/contact/contact.routes");
router.use("/public", contactRoutes);

const leadRoutes = require("../modules/lead/lead.routes");
const companyRoutes = require("../modules/company/company.routes");
const userRoutes = require("../modules/user/user.routes");

router.use("/leads", leadRoutes);
router.use("/company", companyRoutes);
router.use("/users", userRoutes);

const projectRoutes = require("../modules/project/project.routes");

router.use("/projects", projectRoutes);

module.exports = router;
