const { ApiError } = require("../../lib/ApiError");

const listProjectsService = async (tenantPrisma, query) => {
  const { search, type, page, pageSize } = query;
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

  const [items, total] = await Promise.all([
    tenantPrisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
