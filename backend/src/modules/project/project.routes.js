const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { rbacMiddleware } = require("../../middleware/rbacMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  listProjects,
  getProjectById,
  createProject,
const rbacMiddleware = require("../../middleware/rbacMiddleware");
const {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} = require("./project.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", listProjects);
router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), createProject);
router.get("/:id", getProjectById);
router.patch("/:id", requireRole("OWNER", "ADMIN", "MANAGER"), updateProject);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteProject);

module.exports = router;
router.get("/", getAllProjects);
router.get("/:id", getProjectById);
router.post("/", rbacMiddleware("OWNER", "ADMIN", "MANAGER"), createProject);
router.patch("/:id", rbacMiddleware("OWNER", "ADMIN", "MANAGER"), updateProject);
router.delete("/:id", rbacMiddleware("OWNER", "ADMIN"), deleteProject);

module.exports = router;
