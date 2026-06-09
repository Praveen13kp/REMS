const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");

const VALID_BUCKETS = ["today", "overdue", "upcoming", "completed"];

// Recipients for a task status change: every OWNER/ADMIN/MANAGER in the
// tenant PLUS the agent the task is assigned to — minus the person who
// actually made the change. That way:
//   • agent completes → owner + manager notified
//   • manager completes someone else's task → owner + assigned agent notified
//   • owner completes someone else's task → manager + assigned agent notified
// Returns a deduped array of { id }.
async function resolveTaskNotificationRecipients(tenantPrisma, { assignedToId, actorUserId }) {
  const managers = await tenantPrisma.user.findMany({
    where: {
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  const ids = new Set(managers.map((m) => m.id));
  if (assignedToId) ids.add(assignedToId);
  ids.delete(actorUserId);
  return [...ids];
}

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
  if (role === "AGENT" || (role === "CHANNEL_PARTNER" || role === "BROKER")) {
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
        project: { select: { id: true, name: true } },
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
  if ((role === "AGENT" || (role === "CHANNEL_PARTNER" || role === "BROKER")) && task.assignedToId !== userId) {
    throw new ApiError(404, "Task not found");
  }
  return task;
};

const createTaskService = async (tenantPrisma, data, userId) => {
  // Atomic: if the activity insert fails for any reason, the task row is
  // rolled back too. Without the transaction, a half-finished insert
  // (task saved + activity 500) leaves an orphan row that the FE retry
  // turns into a duplicate — which is exactly the bug we just hit.
  return tenantPrisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        assignedToId: data.assignedToId || userId,
        leadId: data.leadId || null,
        projectId: data.projectId || null,
        dueAt: data.dueAt || null,
        status: "PENDING",
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (data.leadId) {
      // ActivityType enum has no TASK value — SYSTEM is the catch-all bucket
      // for in-app events like this, matching what completeTaskService uses.
      await logActivity(tx, {
        leadId: data.leadId,
        userId,
        type: "SYSTEM",
        content: `Task created: ${task.title}`,
        metadata: { kind: "TASK_CREATED", taskId: task.id },
      });
    }

    return task;
  });
};

const updateTaskService = async (tenantPrisma, taskId, data, userId, role) => {
  const task = await tenantPrisma.task.findFirst({ where: { id: taskId } });
  if (!task) throw new ApiError(404, "Task not found");

  // AGENT and BROKER may only mutate tasks assigned to them. 404 (not 403)
  // to avoid leaking existence of tasks they shouldn't see.
  const isFrontline = role === "AGENT" || (role === "CHANNEL_PARTNER" || role === "BROKER");
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
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
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
  // the prior one. Always includes the assigned agent so they're told when
  // a manager/owner closes their task on their behalf. Notification failure
  // is swallowed so the update itself stays successful.
  if (data.status !== undefined && data.status !== task.status) {
    try {
      const recipientIds = await resolveTaskNotificationRecipients(tenantPrisma, {
        assignedToId: updated.assignedToId,
        actorUserId: userId,
      });
      const actor = await tenantPrisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      const actorLabel = actor?.name || actor?.email || "A teammate";
      for (const id of recipientIds) {
        await notify(tenantPrisma, {
          userId: id,
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
      type: "SYSTEM",
      content: `Task deleted: ${task.title}`,
      metadata: { kind: "TASK_DELETED", taskId },
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
  if ((role === "AGENT" || (role === "CHANNEL_PARTNER" || role === "BROKER")) && task.assignedToId !== userId) {
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

  // Completion fan-out: owner + manager + the assigned agent — minus the
  // person who actually clicked Complete. Same helper as updateTaskService
  // so the three-way matrix (agent / manager / owner closing) behaves
  // consistently no matter which entry point fires.
  try {
    const recipientIds = await resolveTaskNotificationRecipients(tenantPrisma, {
      assignedToId: updated.assignedToId,
      actorUserId: userId,
    });
    const actor = await tenantPrisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const actorLabel = actor?.name || actor?.email || "A teammate";
    // Tailor the body so the agent reading it understands it was closed
    // on their behalf vs. by themselves (they wouldn't be a recipient).
    const assigneeIsRecipient = updated.assignedToId && updated.assignedToId !== userId;
    for (const id of recipientIds) {
      const isAssignee = id === updated.assignedToId && assigneeIsRecipient;
      await notify(tenantPrisma, {
        userId: id,
        type: "TASK_STATUS_CHANGED",
        title: `Task completed: ${updated.title}`,
        body: isAssignee
          ? `${actorLabel} marked your task as completed.`
          : `${actorLabel} marked the task as completed.`,
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
