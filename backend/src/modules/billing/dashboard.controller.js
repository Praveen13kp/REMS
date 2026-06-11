const { getBillingDashboardService } = require("./dashboard.service");

const getBillingDashboard = async (req, res, next) => {
  try {
    const dashboard = await getBillingDashboardService(req.tenantPrisma);
    res.json({ ok: true, data: dashboard });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBillingDashboard };
