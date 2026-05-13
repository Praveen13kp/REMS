const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "name",
  "score",
  "priority",
  "nextFollowUpAt",
  "lastContactedAt",
]);

const DEFAULT_LEAD_INCLUDE = {
  assignedTo: { select: { id: true, name: true, email: true, dept: true } },
  interestedProject: { select: { id: true, name: true } },
  _count: { select: { activities: true } },
};

const ACTIVE_LEAD_FILTER = {
  status: { notIn: ["Booked", "Lost"] },
};

const parseSort = (sort) => {
  const [rawField, rawDir] = String(sort || "").split(":");
  const field = SORTABLE_FIELDS.has(rawField) ? rawField : "createdAt";
  const dir = rawDir === "asc" ? "asc" : "desc";
  return { [field]: dir };
};

const cleanLeadInput = (data) => {
  const out = {};
  const assignIf = (key) => {
    if (data[key] !== undefined) out[key] = data[key];
  };
  [
    "name",
    "phone",
    "email",
    "source",
    "requirementType",
    "budget",
    "city",
    "interestedProjectId",
    "notes",
    "tags",
    "assignedToId",
    "priority",
    "possessionTimeline",
    "nextFollowUpAt",
    "status",
  ].forEach(assignIf);
  return out;
};

const findDuplicates = async (tenantPrisma, { phone, email, name, city }) => {
  const hardConditions = [];
  if (phone) hardConditions.push({ phone });
  if (email) hardConditions.push({ email: { equals: email, mode: "insensitive" } });

  const hard = hardConditions.length > 0
    ? await tenantPrisma.lead.findMany({
        where: { OR: hardConditions },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
        },
      })
    : [];

  const soft = name && city
    ? await tenantPrisma.lead.findMany({
        where: {
          name: { contains: name, mode: "insensitive" },
          city: { equals: city, mode: "insensitive" },
          NOT: { id: { in: hard.map((h) => h.id) } },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
        },
      })
    : [];

  return { hard, soft };
};

const createLeadService = async (tenantPrisma, data, userId, force = false) => {
  const { hard } = await findDuplicates(tenantPrisma, {
    phone: data.phone,
    email: data.email,
    name: data.name,
    city: data.city,
  });

  if (hard.length > 0 && !force) {
    throw new ApiError(409, "Duplicate lead found", {
      code: "LEAD_DUPLICATE",
      details: { matches: hard },
    });
  }

  const created = await tenantPrisma.lead.create({
    data: {
      ...cleanLeadInput(data),
      tags: data.tags ?? [],
      status: data.status ?? "New",
      assignedToId: data.assignedToId || userId,
      createdById: userId,
    },
    include: DEFAULT_LEAD_INCLUDE,
  });

  return created;
};

const getAllLeadsService = async (tenantPrisma, query, userId, role) => {
  const {
    search,
    status,
    assignedToId,
    source,
    interestedProjectId,
    tag,
    city,
    priority,
    page = "1",
    pageSize = "20",
    sort = "createdAt:desc",
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId === "null" || assignedToId === "unassigned") {
    where.assignedToId = null;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }
  if (source) where.source = source;
  if (interestedProjectId) where.interestedProjectId = interestedProjectId;
  if (tag) where.tags = { has: tag };
  if (city) where.city = { contains: city, mode: "insensitive" };

  if (role === "AGENT") {
    where.assignedToId = userId;
  }

  const orderBy = parseSort(sort);

  const [items, total] = await Promise.all([
    tenantPrisma.lead.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: DEFAULT_LEAD_INCLUDE,
    }),
    tenantPrisma.lead.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getUnassignedLeadsService = async (tenantPrisma, query) => {
  const {
    page = "1",
    pageSize = "50",
    sort = "score:desc",
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 50));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = { assignedToId: null, ...ACTIVE_LEAD_FILTER };
  const orderBy = parseSort(sort);

  const [items, total] = await Promise.all([
    tenantPrisma.lead.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: DEFAULT_LEAD_INCLUDE,
    }),
    tenantPrisma.lead.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getLeadByIdService = async (tenantPrisma, id) => {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id },
    include: DEFAULT_LEAD_INCLUDE,
  });

  if (!lead) throw new ApiError(404, "Lead not found");
  return lead;
};

const updateLeadService = async (tenantPrisma, id, data, userId) => {
  const existing = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Lead not found");

  const updateData = cleanLeadInput(data);

  const result = await tenantPrisma.lead.updateMany({
    where: { id },
    data: updateData,
  });

  if (result.count === 0) throw new ApiError(404, "Lead not found");

  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    await logActivity(tenantPrisma, {
      leadId: id,
      userId,
      type: "ASSIGNMENT",
      content: existing.assignedToId
        ? `Lead reassigned from user ${existing.assignedToId} to user ${data.assignedToId}`
        : `Lead assigned to user ${data.assignedToId}`,
      metadata: { from: existing.assignedToId, to: data.assignedToId },
    });
  }

  return getLeadByIdService(tenantPrisma, id);
};

const deleteLeadService = async (tenantPrisma, id) => {
  const existing = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Lead not found");

  const result = await tenantPrisma.lead.deleteMany({ where: { id } });
  if (result.count === 0) throw new ApiError(404, "Lead not found");
};

const assignLeadService = async (tenantPrisma, { leadId, assignedToId, reason, actorId }) => {
  const target = await tenantPrisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) throw new ApiError(404, "User not found in this company");

  const before = await tenantPrisma.lead.findUnique({ where: { id: leadId } });
  if (!before) throw new ApiError(404, "Lead not found");

  return await tenantPrisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: leadId },
      data: { assignedToId },
    });

    await tx.activity.create({
      data: {
        leadId,
        companyId: before.companyId,
        userId: actorId,
        type: "ASSIGNMENT",
        content: `Reassigned from ${before.assignedToId ?? "unassigned"} to ${assignedToId}${reason ? ` — ${reason}` : ""}`,
        metadata: { from: before.assignedToId, to: assignedToId, reason },
      },
    });

    return lead;
  });
};

const bulkAssignLeadsService = async (tenantPrisma, { leadIds, assignedToId, reason, actorId }) => {
  const target = await tenantPrisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) throw new ApiError(404, "User not found in this company");

  const results = { successCount: 0, failures: [], assignments: [] };

  for (const leadId of leadIds) {
    try {
      await assignLeadService(tenantPrisma, { leadId, assignedToId, reason, actorId });
      results.successCount++;
      results.assignments.push({ leadId, assignedToId });
    } catch (err) {
      results.failures.push({ leadId, error: err.message });
    }
  }

  return results;
};

const autoAssignLeadsService = async (tenantPrisma, { leadIds, actorId }) => {
  const candidateAgents = await tenantPrisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["AGENT", "MANAGER"] },
    },
    select: { id: true },
  });

  if (candidateAgents.length === 0) {
    throw new ApiError(400, "No active agents available for assignment");
  }

  const workloads = await tenantPrisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      assignedToId: { in: candidateAgents.map((u) => u.id) },
      ...ACTIVE_LEAD_FILTER,
    },
    _count: { _all: true },
  });

  const loadByUser = new Map(candidateAgents.map((u) => [u.id, 0]));
  for (const w of workloads) {
    if (w.assignedToId) loadByUser.set(w.assignedToId, w._count._all);
  }

  const targetLeads = leadIds && leadIds.length > 0
    ? await tenantPrisma.lead.findMany({
        where: { id: { in: leadIds }, assignedToId: null, ...ACTIVE_LEAD_FILTER },
        select: { id: true, companyId: true },
      })
    : await tenantPrisma.lead.findMany({
        where: { assignedToId: null, ...ACTIVE_LEAD_FILTER },
        select: { id: true, companyId: true },
      });

  const results = { successCount: 0, failures: [], assignments: [] };

  for (const lead of targetLeads) {
    let nextAgentId = null;
    let nextLoad = Infinity;
    for (const [uid, load] of loadByUser.entries()) {
      if (load < nextLoad) {
        nextLoad = load;
        nextAgentId = uid;
      }
    }
    if (!nextAgentId) {
      results.failures.push({ leadId: lead.id, error: "No agent available" });
      continue;
    }

    try {
      await tenantPrisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: { assignedToId: nextAgentId },
        });
        await tx.activity.create({
          data: {
            leadId: lead.id,
            companyId: lead.companyId,
            userId: actorId,
            type: "ASSIGNMENT",
            content: `Auto-assigned to ${nextAgentId}`,
            metadata: { auto: true, to: nextAgentId },
          },
        });
      });
      loadByUser.set(nextAgentId, nextLoad + 1);
      results.assignments.push({ leadId: lead.id, assignedToId: nextAgentId });
      results.successCount++;
    } catch (err) {
      results.failures.push({ leadId: lead.id, error: err.message });
    }
  }

  return results;
};

const normalizeStageName = (name) =>
  name?.toLowerCase().replace(/[\s-_]/g, "").trim() || "";

const transitionLeadService = async (tenantPrisma, { leadId, toStatus, reason, actorId }) => {
  const lead = await tenantPrisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new ApiError(404, "Lead not found");

  if (lead.status === toStatus) {
    return lead;
  }

  const stages = await tenantPrisma.pipelineStage.findMany();
  const target = stages.find(
    (s) => normalizeStageName(s.name) === normalizeStageName(toStatus)
  );
  if (!target) {
    throw new ApiError(400, "Unknown stage");
  }

  if ((target.isLost || toStatus === "Lost") && !reason) {
    throw new ApiError(400, "Reason required for lost stage");
  }

  return tenantPrisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { status: toStatus, lastContactedAt: new Date() },
    });

    await tx.activity.create({
      data: {
        leadId,
        companyId: lead.companyId,
        userId: actorId,
        type: "STATUS_CHANGE",
        content: `${lead.status} → ${toStatus}${reason ? ` — ${reason}` : ""}`,
        metadata: { from: lead.status, to: toStatus, reason },
      },
    });

    // TODO(S4-BE-A-02): notify lead's assignedTo about status change
    // Fire-and-forget notification - don't let failures rollback the transition

    return updated;
  });
};

module.exports = {
  findDuplicates,
  createLeadService,
  getAllLeadsService,
  getUnassignedLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  assignLeadService,
  bulkAssignLeadsService,
  autoAssignLeadsService,
  transitionLeadService,
};
