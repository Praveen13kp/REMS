const express = require("express");

const router = express.Router();

// /api/auth/* is owned by the better-auth handler (mounted in server.js).
// Feature routers live here.
const leadRoutes = require("../modules/lead/lead.routes");

router.use("/leads", leadRoutes);

// Future modules (uncomment as their routes land)
// const companyRoutes = require("../modules/company/company.routes");
// const userRoutes = require("../modules/user/user.routes");
const projectRoutes = require("../modules/project/project.routes");
router.use("/projects", projectRoutes);
// const pipelineRoutes = require("../modules/pipeline/pipeline.routes");
// const activityRoutes = require("../modules/activity/activity.routes");
// const taskRoutes = require("../modules/task/task.routes");
// const noteRoutes = require("../modules/note/note.routes");

module.exports = router;
