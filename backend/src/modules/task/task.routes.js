const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} = require("./task.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", listTasks);
router.post("/", createTask);
router.post("/:id/complete", completeTask);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteTask);

module.exports = router;
