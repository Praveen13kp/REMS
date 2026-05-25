const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");

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
  }

  // Mandatory final scope: AGENT and BROKER may only see tasks assigned to
  // themselves, regardless of bucket / assignedTo query params. This
  // overrides any client-supplied filter (so a crafted ?assignedTo=all in
  // DevTools can't bypass it) and also covers the bucket case, which
  // applyBucketFilter() above does not scope on its own.
  if (role === "AGENT" || role === "CHANNEL_PARTNER") {
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

const getTaskByIdService = async (tenantPrisma, taskId, userId, role) => {
  const task = await tenantPrisma.task.findFirst({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!task) throw new ApiError(404, "Task not found");
  // AGENT / BROKER can only read tasks assigned to them. 404 (not 403) to
  // avoid leaking task existence.
  if ((role === "AGENT" || role === "CHANNEL_PARTNER") && task.assignedToId !== userId) {
    throw new ApiError(404, "Task not found");
  }
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

const updateTaskService = async (tenantPrisma, taskId, data, userId, role) => {
  const task = await tenantPrisma.task.findFirst({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");

  // AGENT and BROKER may only mutate tasks assigned to them. 404 (not 403)
  // to avoid leaking existence of tasks they shouldn't see.
  const isFrontline = role === "AGENT" || role === "CHANNEL_PARTNER";
  if (isFrontline && task.assignedToId !== userId) {
    throw new ApiError(404, "Task not found");
  }

  // Frontline roles get status-only edits — they're recipients of work, not
  // authors. Title / description / due date / assignment are management
  // concerns. The fields are silently dropped (no 400) so a stray FE field
  // doesn't break the update; the BE is the single source of truth.
  const updateData = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (!isFrontline) {
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueAt !== undefined) updateData.dueAt = data.dueAt;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  }

  const updated = await tenantPrisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  // Status-change notification — fires whenever the new status differs from
  // the prior one. Goes to every OWNER + MANAGER in the tenant so the team
  // knows progress without polling. Notification failure is swallowed
  // (notify() logs internally) so the update stays successful.
  if (data.status !== undefined && data.status !== task.status) {
    try {
      const managers = await tenantPrisma.user.findMany({
        where: {
          role: { in: ["OWNER", "ADMIN", "MANAGER"] },
          isActive: true,
          deletedAt: null,
          // Skip notifying the person who made the change themselves
          NOT: { id: userId },
        },
        select: { id: true, name: true },
      });
      const actor = await tenantPrisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      const actorLabel = actor?.name || actor?.email || "A teammate";
      for (const m of managers) {
        await notify(tenantPrisma, {
          userId: m.id,
          type: "TASK_STATUS_CHANGED",
          title: `Task: ${updated.title}`,
          body: `${actorLabel} changed status to "${updated.status}"`,
          link: updated.leadId ? `/admin/leads/${updated.leadId}` : "/admin/tasks",
          metadata: {
            kind: "TASK_STATUS_CHANGED",
            taskId: updated.id,
            leadId: updated.leadId || null,
            fromStatus: task.status,
            toStatus: updated.status,
            byUserId: userId,
          },
        });
      }
    } catch (err) {
      // Don't let notification fan-out failure break the PATCH response.
      console.error("Task status notification fan-out failed:", err?.message);
    }
  }

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

const completeTaskService = async (tenantPrisma, taskId, userId, role) => {
  const task = await tenantPrisma.task.findFirst({
    where: { id: taskId },
    include: {
      lead: { select: { id: true } },
    },
  });
  if (!task) throw new ApiError(404, "Task not found");

  // Frontline ownership check — agents/brokers can only complete their own.
  if ((role === "AGENT" || role === "CHANNEL_PARTNER") && task.assignedToId !== userId) {
    throw new ApiError(404, "Task not found");
  }

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

  // Notify OWNER + MANAGER on completion — same fan-out as updateTaskService.
  try {
    const managers = await tenantPrisma.user.findMany({
      where: {
        role: { in: ["OWNER", "ADMIN", "MANAGER"] },
        isActive: true,
        deletedAt: null,
        NOT: { id: userId },
      },
      select: { id: true },
    });
    const actor = await tenantPrisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const actorLabel = actor?.name || actor?.email || "A teammate";
    for (const m of managers) {
      await notify(tenantPrisma, {
        userId: m.id,
        type: "TASK_STATUS_CHANGED",
        title: `Task completed: ${updated.title}`,
        body: `${actorLabel} marked the task as completed.`,
        link: updated.leadId ? `/admin/leads/${updated.leadId}` : "/admin/tasks",
        metadata: {
          kind: "TASK_STATUS_CHANGED",
          taskId: updated.id,
          leadId: updated.leadId || null,
          fromStatus: task.status,
          toStatus: "COMPLETED",
          byUserId: userId,
        },
      });
    }
  } catch (err) {
    console.error("Task completion notification fan-out failed:", err?.message);
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
