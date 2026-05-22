const { ApiError } = require("../../lib/ApiError");
const {
  validateCreateLead,
  validateUpdateLead,
  validateAssignLead,
  validateBulkAssign,
  validateAutoAssign,
  validateCheckDuplicates,
  validateTransitionLead,
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
  transitionLeadService,
  initiateCallService,
} = require("./lead.service");
const { importLeadsService } = require("./lead.import.service");
const { getAgingLeadsService } = require("./leadAging.service");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

const checkDuplicates = async (req, res, next) => {
  try {
    const validation = validateCheckDuplicates(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const result = await findDuplicates(req.tenantPrisma, validation.data, req.user.role);
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
    const lead = await createLeadService(
      req.tenantPrisma,
      validation.data,
      req.user.id,
      force,
      req.user.role,
    );
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
      actorRole: req.user.role,
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
    const result = await getUnassignedLeadsService(req.tenantPrisma, req.query, req.user.role);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const lead = await getLeadByIdService(req.tenantPrisma, req.params.id, {
      userId: req.user.id,
      role: req.user.role,
    });
    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const updateLead = async (req, res, next) => {
  try {
    // Status is owned by the /transition endpoint (writes Activity + fires
    // notifications). The Edit form posts the whole record including the
    // unchanged status, so drop it silently instead of rejecting the save.
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "status")) {
      delete req.body.status;
    }

    const validation = validateUpdateLead(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const lead = await updateLeadService(
      req.tenantPrisma,
      req.params.id,
      validation.data,
      req.user.id,
      req.user.role,
    );
    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    await deleteLeadService(req.tenantPrisma, req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const transitionLead = async (req, res, next) => {
  try {
    const validation = validateTransitionLead(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const lead = await transitionLeadService(req.tenantPrisma, {
      leadId: req.params.id,
      toStatus: validation.data.toStatus,
      reason: validation.data.reason,
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    res.json({ ok: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const getAgingLeads = async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(90, parseInt(req.query.days) || 7));
    const result = await getAgingLeadsService(req.tenantPrisma, { days, role: req.user.role });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const initiateCall = async (req, res, next) => {
  try {
    const result = await initiateCallService(req.tenantPrisma, {
      leadId: req.params.id,
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const importLeads = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, "CSV file is required (field name: 'file')");
    }
    const result = await importLeadsService(
      req.tenantPrisma,
      req.file.buffer,
      req.user.id,
      req.user.companyId,
    );
    res.json({ ok: true, data: result });
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
  transitionLead,
  importLeads,
  getAgingLeads,
  initiateCall,
};
