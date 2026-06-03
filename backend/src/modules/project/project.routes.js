const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole, requireModule } = require("../../middleware/rbacMiddleware");
const {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require("./project.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);
router.use(requireModule("Projects"));

router.get("/", listProjects);
router.get("/:id", getProjectById);
router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), createProject);
router.patch("/:id", requireRole("OWNER", "ADMIN", "MANAGER"), updateProject);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteProject);

module.exports = router;
