const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  getStats,
  getEvents,
} = require("./integrations.controller");

const router = express.Router();

// CRUD on integration credentials is OWNER + ADMIN only. ADMIN can view +
// edit; only OWNER can delete or rotate creds in production. For now both
// roles have the same surface; we can split later if needed.
router.use(authMiddleware);
router.use(requireRole("OWNER", "ADMIN"));

router.get("/", listIntegrations);
router.get("/stats", getStats);
router.post("/", createIntegration);
router.patch("/:id", updateIntegration);
router.delete("/:id", deleteIntegration);
router.post("/:id/test", testIntegration);
router.get("/:id/events", getEvents);

module.exports = router;
