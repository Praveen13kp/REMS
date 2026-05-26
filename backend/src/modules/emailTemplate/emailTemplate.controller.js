const { ApiError } = require("../../lib/ApiError");
const service = require("./emailTemplate.service");

async function list(req, res, next) {
  try {
    const data = await service.listTemplates(req.user.companyId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await service.getTemplate(req.user.companyId, req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (!["OWNER", "ADMIN", "MANAGER"].includes(req.user.role)) {
      throw new ApiError(403, "Only OWNER, ADMIN, or MANAGER can manage templates");
    }
    const data = await service.createTemplate(
      req.user.companyId,
      req.user.id,
      req.body || {},
    );
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!["OWNER", "ADMIN", "MANAGER"].includes(req.user.role)) {
      throw new ApiError(403, "Only OWNER, ADMIN, or MANAGER can manage templates");
    }
    const data = await service.updateTemplate(
      req.user.companyId,
      req.params.id,
      req.body || {},
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!["OWNER", "ADMIN", "MANAGER"].includes(req.user.role)) {
      throw new ApiError(403, "Only OWNER, ADMIN, or MANAGER can manage templates");
    }
    await service.deleteTemplate(req.user.companyId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
