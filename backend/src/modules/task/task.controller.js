const { ApiError } = require("../../lib/ApiError");
const { validateCreateTask, validateUpdateTask } = require("./task.validation");
const {
  listTasksService,
  getTaskByIdService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  completeTaskService,
} = require("./task.service");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

const listTasks = async (req, res, next) => {
  try {
    const tz = req.headers["x-timezone"];
    const result = await listTasksService(
      req.tenantPrisma,
      req.query,
      req.user.id,
      req.user.role,
      tz,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await getTaskByIdService(req.tenantPrisma, req.params.id);
    res.json({ ok: true, data: task });
  } catch (err) {
    next(err);
  }
};

const createTask = async (req, res, next) => {
  try {
    const validation = validateCreateTask(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const task = await createTaskService(req.tenantPrisma, validation.data, req.user.id);
    res.status(201).json({ ok: true, data: task });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const validation = validateUpdateTask(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const task = await updateTaskService(req.tenantPrisma, req.params.id, validation.data, req.user.id);
    res.json({ ok: true, data: task });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await deleteTaskService(req.tenantPrisma, req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const task = await completeTaskService(req.tenantPrisma, req.params.id, req.user.id);
    res.json({ ok: true, data: task });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
};
