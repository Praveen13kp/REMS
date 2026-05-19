const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

const VALID_BUCKETS = ["today", "overdue", "upcoming", "completed"];

function getTodayBoundaries(tz) {
  const options = { timeZone: tz || "Asia/Kolkata" };
  const now = new Date();

  const todayStr = now.toLocaleDateString("en-CA", options);

  const start = new Date(`${todayStr}T00:00:00`);
  const end = new Date(`${todayStr}T23:59:59.999`);

  return { start, end };
}

function applyBucketFilter(where, bucket, tz, role, userId) {
  const { start, end } = getTodayBoundaries(tz);
  const weekAhead = new Date(end.getTime() + 7 * 86400000);

  switch (bucket) {
    case "today":
      where.dueAt = { gte: start, lte: end };
      where.status = { not: "COMPLETED" };
      break;
    case "overdue":
      where.dueAt = { lt: start };
      where.status = { not: "COMPLETED" };
      break;
    case "upcoming":
      where.dueAt = { gt: end, lte: weekAhead };
      where.status = { not: "COMPLETED" };
      break;
    case "completed":
      where.status = "COMPLETED";
      break;
  }
}

const listTasksService = async (tenantPrisma, query, userId, role, tz) => {
  const { assignedTo, assignedToId, status, leadId, dueBefore, bucket, page = "1", pageSize = "20" } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (bucket) {
    if (!VALID_BUCKETS.includes(bucket)) {
      throw new ApiError(400, `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(", ")}`);
    }
    applyBucketFilter(where, bucket, tz, role, userId);
  } else {
    if (status) where.status = status;
    if (dueBefore) where.dueAt = { lte: new Date(dueBefore) };
  }

  if (assignedTo) {
    if (assignedTo === "me") {
      where.assignedToId = userId;
    } else if (assignedTo === "all") {
      // no filter
    } else {
      where.assignedToId = assignedTo;
    }
  } else if (assignedToId === "null" || assignedToId === "unassigned") {
    where.assignedToId = null;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  } else if (role === "AGENT" && !bucket) {
    where.assignedToId = userId;
  }

  if (leadId) where.leadId = leadId;

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

  if (data.leadId) {
    await logActivity(tenantPrisma, {
      leadId: data.leadId,
      userId,
      type: "TASK",
      content: `Task created: ${task.title}`,
      metadata: { taskId: task.id },
    });
  }

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

const deleteTaskService = async (tenantPrisma, taskId, userId) => {
  const task = await tenantPrisma.task.findFirst({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");

  if (task.leadId) {
    await logActivity(tenantPrisma, {
      leadId: task.leadId,
      userId,
      type: "TASK",
      content: `Task deleted: ${task.title}`,
      metadata: { taskId },
    });
  }

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
