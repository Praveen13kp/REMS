const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { rbacMiddleware } = require("../../middleware/rbacMiddleware");
const {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} = require("./project.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", getAllProjects);
router.get("/:id", getProjectById);
router.post("/", rbacMiddleware("OWNER", "ADMIN", "MANAGER"), createProject);
router.patch("/:id", rbacMiddleware("OWNER", "ADMIN", "MANAGER"), updateProject);
router.delete("/:id", rbacMiddleware("OWNER", "ADMIN"), deleteProject);

module.exports = router;