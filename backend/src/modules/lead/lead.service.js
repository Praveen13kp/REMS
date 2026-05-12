const { ApiError } = require("../../lib/ApiError");

const createLeadService = async (tenantPrisma, data, userId) => {
  return tenantPrisma.lead.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      source: data.source || null,
      requirementType: data.requirementType || null,
      budget: data.budget || null,
      city: data.city || null,
      interestedProjectId: data.interestedProjectId || null,
      notes: data.notes || null,
      tags: data.tags || [],
      status: "New",
      assignedToId: data.assignedToId || userId,
      createdById: userId,
    },
  });
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
  if (assignedToId) where.assignedToId = assignedToId;
  if (source) where.source = source;
  if (interestedProjectId) where.interestedProjectId = interestedProjectId;
  if (tag) where.tags = { has: tag };
  if (city) where.city = { contains: city, mode: "insensitive" };

  if (role === "AGENT") {
    where.assignedToId = userId;
  }

  const sortField = sort.split(":")[0] || "createdAt";
  const sortDir = sort.split(":")[1] === "asc" ? "asc" : "desc";

  const orderBy = {};
  orderBy[sortField] = sortDir;

  const [items, total] = await Promise.all([
    tenantPrisma.lead.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        interestedProject: {
          select: { id: true, name: true },
        },
        _count: { select: { activities: true } },
      },
    }),
    tenantPrisma.lead.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getLeadByIdService = async (tenantPrisma, id) => {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      interestedProject: {
        select: { id: true, name: true },
      },
      _count: { select: { activities: true } },
    },
  });

  if (!lead) throw new ApiError(404, "Lead not found");
  return lead;
};

const updateLeadService = async (tenantPrisma, id, data) => {
  const existing = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Lead not found");

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.requirementType !== undefined) updateData.requirementType = data.requirementType;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.interestedProjectId !== undefined) updateData.interestedProjectId = data.interestedProjectId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  const result = await tenantPrisma.lead.updateMany({
    where: { id },
    data: updateData,
  });

  if (result.count === 0) throw new ApiError(404, "Lead not found");

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

  const results = { successCount: 0, failures: [] };

  for (const leadId of leadIds) {
    try {
      await assignLeadService(tenantPrisma, { leadId, assignedToId, reason, actorId });
      results.successCount++;
    } catch (err) {
      results.failures.push({ leadId, error: err.message });
    }
  }

  return results;
};

module.exports = {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  assignLeadService,
  bulkAssignLeadsService,
};
