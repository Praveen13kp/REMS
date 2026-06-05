const departmentService = require("./department.service");

async function listDepartments(req, res, next) {
  try {
    const depts = await departmentService.getDepartments(req.user.companyId);
    res.json(depts);
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const dept = await departmentService.createDepartment(req.user.companyId, req.body.name);
    res.status(201).json(dept);
  } catch (err) {
    next(err);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const dept = await departmentService.updateDepartment(req.user.companyId, req.params.id, req.body.name);
    res.json(dept);
  } catch (err) {
    next(err);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const result = await departmentService.deleteDepartment(req.user.companyId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Owner-only: set departments for a specific user
async function setUserDepartments(req, res, next) {
  try {
    const result = await departmentService.setUserDepartments(
      req.user.companyId,
      req.params.userId,
      req.body.departmentIds,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Get departments for current user (used in profile)
async function getMyDepartments(req, res, next) {
  try {
    const depts = await departmentService.getUserDepartments(req.user.id);
    res.json(depts);
  } catch (err) {
    next(err);
  }
}

// Get departments for a specific user
async function getUserDepartments(req, res, next) {
  try {
    const depts = await departmentService.getUserDepartments(req.params.userId);
    res.json(depts);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setUserDepartments,
  getMyDepartments,
  getUserDepartments,
};
