const { ApiError } = require("../../lib/ApiError");
const {
  validateCreate,
  validateReschedule,
  validateComplete,
  validateListQuery,
} = require("./followUp.validation");
const {
  listFollowUps,
  createFollowUp,
  rescheduleFollowUp,
  completeFollowUp,
  deleteFollowUp,
} = require("./followUp.service");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

async function list(req, res, next) {
  try {
    const v = validateListQuery(req.query);
    if (!v.success) throw new ApiError(400, firstIssueMessage(v.error));
    const data = await listFollowUps(req.tenantPrisma, v.data, req.user);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const v = validateCreate(req.body);
    if (!v.success) throw new ApiError(400, firstIssueMessage(v.error));
    const data = await createFollowUp(req.tenantPrisma, v.data, req.user.id);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function reschedule(req, res, next) {
  try {
    const v = validateReschedule(req.body);
    if (!v.success) throw new ApiError(400, firstIssueMessage(v.error));
    const data = await rescheduleFollowUp(
      req.tenantPrisma,
      req.params.id,
      v.data,
      req.user.id,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function complete(req, res, next) {
  try {
    const v = validateComplete(req.body || {});
    if (!v.success) throw new ApiError(400, firstIssueMessage(v.error));
    const data = await completeFollowUp(
      req.tenantPrisma,
      req.params.id,
      v.data,
      req.user.id,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await deleteFollowUp(
      req.tenantPrisma,
      req.params.id,
      req.user.id,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, reschedule, complete, remove };
