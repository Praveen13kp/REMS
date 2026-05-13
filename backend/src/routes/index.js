const express = require("express");

const router = express.Router();

const contactRoutes = require("../modules/contact/contact.routes");
router.use("/public", contactRoutes);

const leadRoutes = require("../modules/lead/lead.routes");
const companyRoutes = require("../modules/company/company.routes");
const userRoutes = require("../modules/user/user.routes");
const projectRoutes = require("../modules/project/project.routes");
const contactRoutes = require("../modules/contact/contact.routes");

router.use("/leads", leadRoutes);
router.use("/company", companyRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/public", contactRoutes);

// Future modules (uncomment as their routes land)
// const companyRoutes = require("../modules/company/company.routes");
// const userRoutes = require("../modules/user/user.routes");
// const projectRoutes = require("../modules/project/project.routes");
// const pipelineRoutes = require("../modules/pipeline/pipeline.routes");
// const activityRoutes = require("../modules/activity/activity.routes");
// const taskRoutes = require("../modules/task/task.routes");
// const noteRoutes = require("../modules/note/note.routes");

module.exports = router;
