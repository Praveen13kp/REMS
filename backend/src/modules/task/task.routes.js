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
// Task creation is a management action — agents/brokers receive tasks,
// they don't author them. OWNER, ADMIN, MANAGER only.
router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), createTask);
// Complete is a status update — open to everyone (agents need to mark
// their own tasks done). Ownership is enforced inside the service.
router.post("/:id/complete", completeTask);
router.get("/:id", getTaskById);
// Update is open to everyone — the service drops fields agents can't write
// and rejects access to tasks they don't own.
router.patch("/:id", updateTask);
router.delete("/:id", requireRole("OWNER", "ADMIN"), deleteTask);

module.exports = router;
