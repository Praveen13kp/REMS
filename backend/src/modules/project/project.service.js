const { ApiError } = require("../../lib/ApiError");

const listProjectsService = async (tenantPrisma, query) => {
  const { search, type, page, pageSize, sort, createdFrom, createdTo, projectTab } = query;
  const where = {};

  const tabFilter = [];
  if (projectTab === "completed") {
    tabFilter.push({
      OR: [
        { completedAt: { not: null } },
        { possessionDate: { lt: new Date() } },
      ],
    });
  } else if (projectTab === "unassigned") {
    tabFilter.push({ leads: { none: {} } });
  }

  if (tabFilter.length > 0) {
    where.AND = tabFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = new Date(createdFrom);
    if (createdTo) {
      const end = new Date(createdTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const SORTABLE_FIELDS = ["createdAt", "updatedAt", "name", "location", "type", "possessionDate"];
  let orderBy = { createdAt: "desc" };
  if (sort) {
    const [field, dir] = sort.split(":");
    if (SORTABLE_FIELDS.includes(field)) {
      orderBy = { [field]: dir === "asc" ? "asc" : "desc" };
    }
  }

  const [rawItems, total] = await Promise.all([
    tenantPrisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { leads: true } } },
    }),
    tenantPrisma.project.count({ where }),
  ]);

  const now = new Date()
  const items = rawItems.map((item) => {
    let status
    if (item.completedAt) {
      status = "completed"
    } else if (item.possessionDate && item.possessionDate < now) {
      status = "completed"
    } else if (item._count.leads === 0) {
      status = "not_assigned"
    } else {
      status = "in_progress"
    }
    const { _count, ...rest } = item
    return { ...rest, status }
  })

  return { items, total, page, pageSize };
};

const getProjectByIdService = async (tenantPrisma, id) => {
  const project = await tenantPrisma.project.findFirst({ where: { id } });
  if (!project) throw new ApiError(404, "Project not found");
  return project;
};

const createProjectService = async (tenantPrisma, data) => {
  return tenantPrisma.project.create({ data });
};

const updateProjectService = async (tenantPrisma, id, data) => {
  const result = await tenantPrisma.project.updateMany({ where: { id }, data });
  if (result.count === 0) throw new ApiError(404, "Project not found");
  return getProjectByIdService(tenantPrisma, id);
};

const deleteProjectService = async (tenantPrisma, id) => {
  const leadCount = await tenantPrisma.lead.count({
    where: { interestedProjectId: id },
  });

  if (leadCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete project: ${leadCount} lead(s) still reference it`,
    );
  }

  const result = await tenantPrisma.project.deleteMany({ where: { id } });
  if (result.count === 0) throw new ApiError(404, "Project not found");
};

module.exports = {
  listProjectsService,
  getProjectByIdService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
};
