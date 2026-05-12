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
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};