const { ApiError } = require("../../lib/ApiError");

const listProjectsService = async (tenantPrisma, query) => {
  const { search, type, page, pageSize, sort, createdFrom, createdTo } = query;
  const where = {};

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

  const [items, total] = await Promise.all([
    tenantPrisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    tenantPrisma.project.count({ where }),
  ]);

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
