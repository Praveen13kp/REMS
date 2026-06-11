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

const followUpRoutes = require("../modules/followUp/followUp.routes");

router.use("/follow-ups", followUpRoutes);

const fileRoutes = require("../modules/file/file.routes");

router.use("/files", fileRoutes);

const emailTemplateRoutes = require("../modules/emailTemplate/emailTemplate.routes");
router.use("/email-templates", emailTemplateRoutes);

const channelPartnerRoutes = require("../modules/channelPartner/channelPartner.routes");
router.use("/channel-partner", channelPartnerRoutes);

const channelPartnerAdminRoutes = require("../modules/channelPartnerAdmin/channelPartnerAdmin.routes");
router.use("/channel-partners", channelPartnerAdminRoutes);

const leadIntakeRoutes = require("../modules/leadIntake/leadIntake.routes");

router.use("/intake", leadIntakeRoutes);

const integrationsRoutes = require("../modules/integrations/integrations.routes");
const webhooksRoutes = require("../modules/integrations/webhooks/webhooks.routes");
const landingRoutes = require("../modules/integrations/landing/landing.routes");

router.use("/integrations", integrationsRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/public/landing", landingRoutes);

const billingRoutes = require("../modules/billing/billing.routes");
router.use("/billing", billingRoutes);

const departmentRoutes = require("../modules/department/department.routes");
router.use("/departments", departmentRoutes);

const { auditLogRouter } = require("../modules/activity/activity.routes");
router.use("/audit-log", auditLogRouter);

const journalRoutes = require("../modules/journal/journal.routes");
router.use("/journal", journalRoutes);

module.exports = router;
