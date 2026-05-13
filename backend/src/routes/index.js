const express = require("express");

const router = express.Router();

const contactRoutes = require("../modules/contact/contact.routes");
const leadRoutes = require("../modules/lead/lead.routes");
const companyRoutes = require("../modules/company/company.routes");
const userRoutes = require("../modules/user/user.routes");
const projectRoutes = require("../modules/project/project.routes");
const pipelineRoutes = require("../modules/pipeline/pipeline.routes");

router.use("/public", contactRoutes);
router.use("/leads", leadRoutes);
router.use("/company", companyRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/pipeline", pipelineRoutes);

const taskRoutes = require("../modules/task/task.routes");

router.use("/tasks", taskRoutes);

const dashboardRoutes = require("../modules/dashboard/dashboard.routes");

router.use("/dashboard", dashboardRoutes);

// Future modules (uncomment as their routes land)
// const noteRoutes = require("../modules/note/note.routes");

module.exports = router;
