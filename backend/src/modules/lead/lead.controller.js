const { ApiError } = require("../../lib/ApiError");
const {
  validateCreateLead,
  validateUpdateLead,
  validateAssignLead,
  validateBulkAssign,
  validateAutoAssign,
  validateCheckDuplicates,
} = require("./lead.validation");
const {
  findDuplicates,
  createLeadService,
  getAllLeadsService,
  getUnassignedLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  assignLeadService,
  bulkAssignLeadsService,
  autoAssignLeadsService,
} = require("./lead.service");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

const checkDuplicates = async (req, res, next) => {
  try {
    const validation = validateCheckDuplicates(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const result = await findDuplicates(req.tenantPrisma, validation.data);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createLead = async (req, res, next) => {
  try {
    const validation = validateCreateLead(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const force = req.query.force === "true";
    const lead = await createLeadService(req.tenantPrisma, validation.data, req.user.id, force);
    res.status(201).json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const assignLead = async (req, res, next) => {
  try {
    const validation = validateAssignLead(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const lead = await assignLeadService(req.tenantPrisma, {
      leadId: req.params.id,
      assignedToId: validation.data.assignedToId,
      reason: validation.data.reason,
      actorId: req.user.id,
    });

    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const bulkAssignLeads = async (req, res, next) => {
  try {
    const validation = validateBulkAssign(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const result = await bulkAssignLeadsService(req.tenantPrisma, {
      leadIds: validation.data.leadIds,
      assignedToId: validation.data.assignedToId,
      reason: validation.data.reason,
      actorId: req.user.id,
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const autoAssignLeads = async (req, res, next) => {
  try {
    const validation = validateAutoAssign(req.body || {});
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const result = await autoAssignLeadsService(req.tenantPrisma, {
      leadIds: validation.data.leadIds,
      actorId: req.user.id,
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getAllLeads = async (req, res, next) => {
  try {
    const result = await getAllLeadsService(
      req.tenantPrisma,
      req.query,
      req.user.id,
      req.user.role,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getUnassignedLeads = async (req, res, next) => {
  try {
    const result = await getUnassignedLeadsService(req.tenantPrisma, req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const lead = await getLeadByIdService(req.tenantPrisma, req.params.id);
    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const updateLead = async (req, res, next) => {
  try {
    if (req.body.status) {
      throw new ApiError(400, "Status changes must go through the /transition endpoint");
    }

    const validation = validateUpdateLead(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const lead = await updateLeadService(req.tenantPrisma, req.params.id, validation.data, req.user.id);
    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    await deleteLeadService(req.tenantPrisma, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkDuplicates,
  createLead,
  getAllLeads,
  getUnassignedLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  bulkAssignLeads,
  autoAssignLeads,
};
