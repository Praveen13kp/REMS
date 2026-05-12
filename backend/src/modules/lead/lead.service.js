const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

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

const updateLeadService = async (tenantPrisma, id, data, userId) => {
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

module.exports = {
  findDuplicates,
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
};
