const { listCompanies, dashboard, listLeads, getLead } = require("./broker.service");

async function getCompanies(req, res, next) {
  try {
    const data = await listCompanies(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const data = await dashboard(req.user.id, req.query.companyId || null);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLeads(req, res, next) {
  try {
    const data = await listLeads(req.user.id, {
      companyId: req.query.companyId || null,
      scope: req.query.scope === "own" ? "own" : "assigned",
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLeadById(req, res, next) {
  try {
    const lead = await getLead(req.user.id, req.params.id);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCompanies, getDashboard, getLeads, getLeadById };
