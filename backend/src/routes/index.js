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

const notificationRoutes = require("../modules/notification/notification.routes");

router.use("/notifications", notificationRoutes);

const adminRoutes = require("../modules/admin/admin.routes");

router.use("/admin", adminRoutes);

const noteRoutes = require("../modules/note/note.routes");

router.use("/notes", noteRoutes);

const fileRoutes = require("../modules/file/file.routes");

router.use("/files", fileRoutes);

const brokerRoutes = require("../modules/broker/broker.routes");

router.use("/broker", brokerRoutes);

const leadIntakeRoutes = require("../modules/leadIntake/leadIntake.routes");

router.use("/intake", leadIntakeRoutes);

const integrationsRoutes = require("../modules/integrations/integrations.routes");
const webhooksRoutes = require("../modules/integrations/webhooks/webhooks.routes");

router.use("/integrations", integrationsRoutes);
router.use("/webhooks", webhooksRoutes);

module.exports = router;
