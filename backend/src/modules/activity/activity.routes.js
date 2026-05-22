const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  getLeadActivity,
  createLeadActivity,
  getCompanyActivity,
} = require("./activity.controller");

const router = express.Router({ mergeParams: true });

router.get("/", authMiddleware, tenantMiddleware, getLeadActivity);
router.post("/", authMiddleware, tenantMiddleware, createLeadActivity);

// Tenant-wide audit log lives on its own top-level path (mounted in
// routes/index.js) so it's not lead-scoped. Exporting as a named router.
const auditLogRouter = express.Router();
auditLogRouter.use(authMiddleware, tenantMiddleware);
auditLogRouter.get("/", getCompanyActivity);

module.exports = router;
module.exports.auditLogRouter = auditLogRouter;
