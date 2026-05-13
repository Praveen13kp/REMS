const {
  getOwnerDashboard,
  getAgentDashboard,
} = require("./dashboard.service");

async function ownerDashboard(req, res, next) {
  try {
    const data = await getOwnerDashboard(req.tenantPrisma);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function agentDashboard(req, res, next) {
  try {
    const data = await getAgentDashboard(req.tenantPrisma, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { ownerDashboard, agentDashboard };
