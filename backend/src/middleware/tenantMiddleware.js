const { getTenantPrisma } = require("../lib/tenantPrisma");

function tenantMiddleware(req, res, next) {
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "No company context" },
    });
  }

  req.tenantPrisma = getTenantPrisma(req.user.companyId);
  next();
}

module.exports = { tenantMiddleware };
