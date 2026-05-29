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
  restoreLeadService,
  listDeletedLeadsService,
  exportLeadsCsvService,
  assignLeadService,
  bulkAssignLeadsService,
  autoAssignLeadsService,
  transitionLeadService,
  initiateCallService,
  sendLeadEmailService,
} = require("./lead.service");
const { importLeadsService } = require("./lead.import.service");
const { getAgingLeadsService } = require("./leadAging.service");
const { assertWithinLimit, remainingCapacity } = require("../../lib/planGate");

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

    // Plan cap: refuse new leads once the tenant has hit their plan's
    // total-lead limit. Throws 402 with the structured upgrade payload.
    await assertWithinLimit(req.user.companyId, "leads");

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
    // ?mode=hard → permanent delete; default = soft (Trash, 30-day recovery)
    const mode = req.query.mode === "hard" ? "hard" : "soft";
    const result = await deleteLeadService(
      req.tenantPrisma,
      req.params.id,
      req.user.id,
      { mode },
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const restoreLead = async (req, res, next) => {
  try {
    await restoreLeadService(req.tenantPrisma, req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const exportLeadsCsv = async (req, res, next) => {
  try {
    const { csv, count } = await exportLeadsCsvService(
      req.tenantPrisma,
      req.query,
      req.user.role,
    );
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leads-${today}.csv"`,
    );
    res.setHeader("X-Lead-Export-Count", String(count));
    // BOM so Excel opens UTF-8 correctly (Indian rupee + names).
    res.send("﻿" + csv);
  } catch (err) {
    next(err);
  }
};

const listDeletedLeads = async (req, res, next) => {
  try {
    const leads = await listDeletedLeadsService(req.tenantPrisma);
    res.json({ ok: true, data: leads });
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
      closedById: validation.data.closedById,
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

const sendLeadEmail = async (req, res, next) => {
  try {
    const result = await sendLeadEmailService(
      req.tenantPrisma,
      req.params.id,
      {
        templateId: req.body?.templateId,
        subject: req.body?.subject,
        body: req.body?.body,
      },
      {
        actorId: req.user.id,
        actorRole: req.user.role,
        companyId: req.user.companyId,
      },
    );
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
    // Plan cap: how many more leads can this tenant create? CSV import
    // throws 402 if zero, otherwise the service truncates the upload at
    // the remaining capacity so the company never exceeds its limit.
    const remaining = await remainingCapacity(req.user.companyId, "leads");
    if (remaining === 0) {
      // Reuse the same 402 path createLead uses — single check produces
      // the structured upgrade payload.
      await assertWithinLimit(req.user.companyId, "leads");
    }
    const result = await importLeadsService(
      req.tenantPrisma,
      req.file.buffer,
      req.user.id,
      remaining,
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
  restoreLead,
  listDeletedLeads,
  exportLeadsCsv,
  assignLead,
  bulkAssignLeads,
  autoAssignLeads,
  transitionLead,
  importLeads,
  getAgingLeads,
  initiateCall,
  sendLeadEmail,
};
