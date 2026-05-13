const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

const listTasksService = async (tenantPrisma, query, userId, role) => {
  const { assignedToId, status, leadId, dueBefore, page = "1", pageSize = "20" } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (role === "AGENT" && !assignedToId) {
    where.assignedToId = userId;
  } else if (assignedToId === "null" || assignedToId === "unassigned") {
    where.assignedToId = null;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (status) where.status = status;
  if (leadId) where.leadId = leadId;
  if (dueBefore) where.dueAt = { lte: new Date(dueBefore) };

  const [items, total] = await Promise.all([
    tenantPrisma.task.findMany({
      where,
      orderBy: { dueAt: "asc" },
      skip,
      take: pageSizeNum,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    }),
    tenantPrisma.task.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getTaskByIdService = async (tenantPrisma, taskId) => {
  const task = await tenantPrisma.task.findFirst({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!task) throw new ApiError(404, "Task not found");
  return task;
};

const createTaskService = async (tenantPrisma, data, userId) => {
  const task = await tenantPrisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      assignedToId: data.assignedToId || userId,
      leadId: data.leadId || null,
      dueAt: data.dueAt || null,
      status: "PENDING",
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  return task;
};

const updateTaskService = async (tenantPrisma, taskId, data, userId) => {
  const task = await tenantPrisma.task.findFirst({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueAt !== undefined) updateData.dueAt = data.dueAt;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  const updated = await tenantPrisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  return updated;
};

const deleteTaskService = async (tenantPrisma, taskId) => {
  const task = await tenantPrisma.task.findFirst({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");

  await tenantPrisma.task.deleteMany({ where: { id: taskId } });
};

const completeTaskService = async (tenantPrisma, taskId, userId) => {
  const task = await tenantPrisma.task.findFirst({
    where: { id: taskId },
    include: {
      lead: { select: { id: true } },
    },
  });
  if (!task) throw new ApiError(404, "Task not found");

  if (task.status === "COMPLETED") {
    return task;
  }

  const updated = await tenantPrisma.task.update({
    where: { id: taskId },
    data: { status: "COMPLETED" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  if (task.leadId) {
    await logActivity(tenantPrisma, {
      leadId: task.leadId,
      userId,
      type: "SYSTEM",
      content: `Task completed: ${task.title}`,
    });
  }

  return updated;
};

module.exports = {
  listTasksService,
  getTaskByIdService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  completeTaskService,
};
