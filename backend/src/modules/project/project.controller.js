const { ApiError } = require("../../lib/ApiError");
const {
  validateCreateProject,
  validateUpdateProject,
  validateListQuery,
} = require("./project.validation");
const {
  listProjectsService,
  getProjectByIdService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
} = require("./project.service");
const { assertWithinLimit } = require("../../lib/planGate");

const listProjects = async (req, res, next) => {
  try {
    const validation = validateListQuery(req.query);
    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }
    const result = await listProjectsService(req.tenantPrisma, validation.data);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await getProjectByIdService(req.tenantPrisma, req.params.id);
    res.json({ ok: true, data: project });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const validation = validateCreateProject(req.body);
    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }
    await assertWithinLimit(req.user.companyId, "projects");
    const project = await createProjectService(req.tenantPrisma, validation.data);
    res.status(201).json({ ok: true, data: project });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const validation = validateUpdateProject(req.body);
    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }
    const project = await updateProjectService(
      req.tenantPrisma,
      req.params.id,
      validation.data,
    );
    res.json({ ok: true, data: project });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await deleteProjectService(req.tenantPrisma, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
