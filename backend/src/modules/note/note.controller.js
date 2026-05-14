const { ApiError } = require("../../lib/ApiError");
const {
  validateCreateNote,
  validateUpdateNote,
  validateListQuery,
} = require("./note.validation");
const {
  listNotesByLeadService,
  createNoteService,
  updateNoteService,
  deleteNoteService,
} = require("./note.service");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

async function listNotes(req, res, next) {
  try {
    const validation = validateListQuery(req.query);
    if (!validation.success) {
      throw new ApiError(400, firstIssueMessage(validation.error));
    }
    const notes = await listNotesByLeadService(
      req.tenantPrisma,
      validation.data.leadId,
    );
    res.json({ ok: true, data: notes });
  } catch (err) {
    next(err);
  }
}

async function createNote(req, res, next) {
  try {
    const validation = validateCreateNote(req.body);
    if (!validation.success) {
      throw new ApiError(400, firstIssueMessage(validation.error));
    }
    const note = await createNoteService(
      req.tenantPrisma,
      validation.data,
      req.user.id,
    );
    res.status(201).json({ ok: true, data: note });
  } catch (err) {
    next(err);
  }
}

async function updateNote(req, res, next) {
  try {
    const validation = validateUpdateNote(req.body);
    if (!validation.success) {
      throw new ApiError(400, firstIssueMessage(validation.error));
    }
    const note = await updateNoteService(
      req.tenantPrisma,
      req.params.id,
      validation.data.content,
      req.user,
    );
    res.json({ ok: true, data: note });
  } catch (err) {
    next(err);
  }
}

async function deleteNote(req, res, next) {
  try {
    const result = await deleteNoteService(
      req.tenantPrisma,
      req.params.id,
      req.user,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotes, createNote, updateNote, deleteNote };
