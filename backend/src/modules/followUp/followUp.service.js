const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

const OUTCOME_TO_ACTIVITY_TYPE = {
  CALLED: "CALL",
  NO_ANSWER: "CALL",
  WHATSAPP: "WHATSAPP",
  EMAILED: "EMAIL",
  MET: "SYSTEM",
  OTHER: "SYSTEM",
};

const FOLLOWUP_INCLUDE = {
  lead: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      priority: true,
      source: true,
      assignedToId: true,
      city: true,
      interestedProject: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      lastContactedAt: true,
      updatedAt: true,
    },
  },
  createdBy: { select: { id: true, name: true, image: true } },
  completedBy: { select: { id: true, name: true, image: true } },
};

function shape(fu) {
  return {
    id: fu.id,
    leadId: fu.leadId,
    scheduledAt: fu.scheduledAt,
    completedAt: fu.completedAt,
    outcome: fu.outcome,
    notes: fu.notes,
    createdAt: fu.createdAt,
    updatedAt: fu.updatedAt,
    lead: fu.lead || null,
    createdBy: fu.createdBy || null,
    completedBy: fu.completedBy || null,
  };
}

// Keep Lead.nextFollowUpAt in sync with the earliest pending FollowUp.
async function syncLeadNextFollowUp(tenantPrisma, leadId) {
  const next = await tenantPrisma.followUp.findFirst({
    where: { leadId, completedAt: null },
    orderBy: { scheduledAt: "asc" },
    select: { scheduledAt: true },
  });
  await tenantPrisma.lead.update({
    where: { id: leadId },
    data: { nextFollowUpAt: next?.scheduledAt ?? null },
  });
}

async function listFollowUps(tenantPrisma, query, requestingUser) {
  const where = {};
  const leadWhere = {};

  if (query.leadId) where.leadId = query.leadId;

  if (query.scope === "mine") {
    leadWhere.assignedToId = requestingUser.id;
  }

  // AGENTs can only see follow-ups for leads they own or created
  const agentLeadFilter =
    requestingUser.role === "AGENT"
      ? [
          { assignedToId: requestingUser.id },
          { createdById: requestingUser.id },
        ]
      : null;

  // Completed status
  if (query.completed === true) {
    where.completedAt = { not: null };
  } else if (query.completed === false) {
    where.completedAt = null;
  }

  // Bucket / time-based grouping
  if (query.bucket && query.bucket !== "all") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    where.completedAt = null;
    if (query.bucket === "today") {
      where.scheduledAt = { gte: start, lte: end };
    } else if (query.bucket === "missed") {
      where.scheduledAt = { lt: start };
    } else if (query.bucket === "upcoming") {
      where.scheduledAt = { gt: end };
    }

    leadWhere.status = { notIn: ["Booked", "Lost", "Won"] };
  }

  // Date range on scheduledAt
  if (query.scheduledFrom || query.scheduledTo) {
    where.scheduledAt = where.scheduledAt || {};
    if (query.scheduledFrom) where.scheduledAt.gte = new Date(query.scheduledFrom);
    if (query.scheduledTo) {
      const end = new Date(query.scheduledTo);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt.lte = end;
    }
  }

  // Search across lead fields (AND with agentLeadFilter if both active)
  if (query.search) {
    const searchOr = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
    ];
    if (agentLeadFilter) {
      leadWhere.AND = [{ OR: agentLeadFilter }, { OR: searchOr }];
    } else {
      leadWhere.OR = searchOr;
    }
  } else if (agentLeadFilter) {
    leadWhere.OR = agentLeadFilter;
  }

  // Lead field filters
  if (query.status) leadWhere.status = query.status;
  if (query.priority) leadWhere.priority = query.priority;
  if (query.source) leadWhere.source = { equals: query.source, mode: "insensitive" };
  if (query.assignedToId) leadWhere.assignedToId = query.assignedToId;
  if (query.projectId) leadWhere.interestedProjectId = query.projectId;

  if (Object.keys(leadWhere).length > 0) where.lead = leadWhere;

  // Sorting
  const LEAD_FIELDS = ["name", "status", "priority", "lastContactedAt"];
  let orderBy = { scheduledAt: "asc" };
  if (query.sort) {
    const [field, dir] = query.sort.split(":");
    const direction = dir === "asc" ? "asc" : "desc";
    if (LEAD_FIELDS.includes(field)) {
      orderBy = { lead: { [field]: direction } };
    } else if (["scheduledAt", "createdAt"].includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Bucket mode: return all matching items (up to 500) as an array
  if (query.bucket) {
    const rows = await tenantPrisma.followUp.findMany({
      where,
      orderBy,
      include: FOLLOWUP_INCLUDE,
      take: 500,
    });
    return rows.map(shape);
  }

  // List mode: return paginated results
  const page = query.page || 1;
  const pageSize = query.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    tenantPrisma.followUp.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: FOLLOWUP_INCLUDE,
    }),
    tenantPrisma.followUp.count({ where }),
  ]);

  return { items: items.map(shape), total, page, pageSize };
}

async function createFollowUp(tenantPrisma, data, userId) {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id: data.leadId },
    select: { id: true, companyId: true },
  });
  if (!lead) throw new ApiError(404, "Lead not found");

  const fu = await tenantPrisma.followUp.create({
    data: {
      companyId: lead.companyId,
      leadId: lead.id,
      scheduledAt: new Date(data.scheduledAt),
      notes: data.notes || null,
      createdById: userId,
    },
    include: FOLLOWUP_INCLUDE,
  });

  await syncLeadNextFollowUp(tenantPrisma, lead.id);

  await logActivity(tenantPrisma, {
    leadId: lead.id,
    userId,
    type: "SYSTEM",
    content: `Follow-up scheduled for ${new Date(data.scheduledAt).toLocaleString()}`,
    metadata: { followUpId: fu.id, kind: "FOLLOW_UP_SCHEDULED" },
  });

  return shape(fu);
}

async function rescheduleFollowUp(tenantPrisma, id, data, userId) {
  const existing = await tenantPrisma.followUp.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Follow-up not found");
  if (existing.completedAt) {
    throw new ApiError(400, "Cannot reschedule a completed follow-up");
  }

  const updated = await tenantPrisma.followUp.update({
    where: { id },
    data: {
      scheduledAt: new Date(data.scheduledAt),
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
    include: FOLLOWUP_INCLUDE,
  });

  await syncLeadNextFollowUp(tenantPrisma, existing.leadId);

  await logActivity(tenantPrisma, {
    leadId: existing.leadId,
    userId,
    type: "SYSTEM",
    content: `Follow-up rescheduled to ${new Date(data.scheduledAt).toLocaleString()}`,
    metadata: { followUpId: id, kind: "FOLLOW_UP_RESCHEDULED" },
  });

  return shape(updated);
}

async function completeFollowUp(tenantPrisma, id, data, userId) {
  const existing = await tenantPrisma.followUp.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Follow-up not found");
  if (existing.completedAt) {
    throw new ApiError(400, "Follow-up is already completed");
  }

  const now = new Date();
  const updated = await tenantPrisma.followUp.update({
    where: { id },
    data: {
      completedAt: now,
      completedById: userId,
      outcome: data.outcome || existing.outcome,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
    include: FOLLOWUP_INCLUDE,
  });

  await tenantPrisma.lead.update({
    where: { id: existing.leadId },
    data: { lastContactedAt: now },
  });
  await syncLeadNextFollowUp(tenantPrisma, existing.leadId);

  await logActivity(tenantPrisma, {
    leadId: existing.leadId,
    userId,
    type: OUTCOME_TO_ACTIVITY_TYPE[data.outcome] || "SYSTEM",
    content: data.outcome
      ? `Follow-up completed (${data.outcome})`
      : "Follow-up completed",
    metadata: { followUpId: id, outcome: data.outcome, notes: data.notes, kind: "FOLLOW_UP_COMPLETED" },
  });

  return shape(updated);
}

async function deleteFollowUp(tenantPrisma, id, userId) {
  const existing = await tenantPrisma.followUp.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Follow-up not found");

  await tenantPrisma.followUp.delete({ where: { id } });
  await syncLeadNextFollowUp(tenantPrisma, existing.leadId);

  await logActivity(tenantPrisma, {
    leadId: existing.leadId,
    userId,
    type: "SYSTEM",
    content: "Follow-up cancelled",
    metadata: { followUpId: id, kind: "FOLLOW_UP_CANCELLED" },
  });

  return { id };
}

module.exports = {
  listFollowUps,
  createFollowUp,
  rescheduleFollowUp,
  completeFollowUp,
  deleteFollowUp,
};
