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

const listProjects = async (req, res, next) => {
  try {
    const validation = validateListQuery(req.query);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const result = await listProjectsService(req.tenantPrisma, validation.data);
const {
  getAllProjectsService,
  createProjectService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
} = require("./project.service");
const { createProjectSchema, updateProjectSchema } = require("./project.validation");

const getAllProjects = async (req, res, next) => {
  try {
    const { search, type, page, pageSize } = req.query;
    const result = await getAllProjectsService(req.tenantPrisma, {
      search,
      type,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
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
const createProject = async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await createProjectService(req.tenantPrisma, data);
    res.status(201).json({ ok: true, data: project });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.errors },
      });
    }
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const validation = validateCreateProject(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const project = await createProjectService(req.tenantPrisma, validation.data);
    res.status(201).json({ ok: true, data: project });
const getProjectById = async (req, res, next) => {
  try {
    const project = await getProjectByIdService(req.tenantPrisma, req.params.id);
    res.json({ ok: true, data: project });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const validation = validateUpdateProject(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const project = await updateProjectService(req.tenantPrisma, req.params.id, validation.data);
    res.json({ ok: true, data: project });
  } catch (err) {
    const data = updateProjectSchema.parse(req.body);
    const project = await updateProjectService(req.tenantPrisma, req.params.id, data);
    res.json({ ok: true, data: project });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.errors },
      });
    }
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
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};
