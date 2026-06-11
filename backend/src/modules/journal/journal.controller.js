const journalService = require("./journal.service");
const { createJournalSchema } = require("./journal.validation");

async function noteCounts(req, res, next) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ ok: false, error: "from and to query params required (YYYY-MM-DD)" });
    const data = await journalService.noteCounts(req.tenantPrisma, req.user.companyId, from, to);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

async function listByDate(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ ok: false, error: "date query param required (YYYY-MM-DD)" });
    const entries = await journalService.listByDate(req.tenantPrisma, req.user.companyId, date);
    res.json({ ok: true, data: entries });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const body = createJournalSchema.parse(req.body);
    const entry = await journalService.create(req.tenantPrisma, {
      companyId: req.user.companyId,
      userId: req.user.id,
      ...body,
    });
    res.status(201).json({ ok: true, data: entry });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await journalService.remove(req.tenantPrisma, req.params.id, req.user.companyId, req.user.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (err) { next(err); }
}

async function daySummary(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ ok: false, error: "date query param required (YYYY-MM-DD)" });
    const summary = await journalService.daySummary(req.tenantPrisma, req.user.companyId, date);
    res.json({ ok: true, data: summary });
  } catch (err) { next(err); }
}

module.exports = { listByDate, create, remove, daySummary, noteCounts };
