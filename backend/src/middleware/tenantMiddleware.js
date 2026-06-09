const prisma = require("../config/prisma");
const { getTenantPrisma } = require("../lib/tenantPrisma");

// Resolves the tenant context for the current request.
//
// Regular tenant users (OWNER/ADMIN/MANAGER/AGENT): `req.user.companyId`
// is set at signup and used directly.
//
// Channel partners have companyId=null in the User row by design — they
// collaborate across multiple companies. For shared endpoints that need
// a tenant scope (pipeline/board, leads list, lead activities, calendar),
// the FE passes `?companyId=…`; we verify the CP has an ACTIVE link to
// that company before letting the request through.
async function tenantMiddleware(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "No company context" },
      });
    }

    // Standard tenant user — their own company.
    if (req.user.companyId) {
      req.tenantPrisma = getTenantPrisma(req.user.companyId);
      return next();
    }

    // Channel partner: pick from explicit ?companyId= or x-company-id header.
    if (req.user.role === "CHANNEL_PARTNER" || req.user.role === "BROKER") {
      const target =
        req.query.companyId ||
        req.body?.companyId ||
        req.headers["x-company-id"] ||
        null;
      if (!target) {
        return res.status(400).json({
          ok: false,
          error: { code: "COMPANY_REQUIRED", message: "companyId is required for channel partner requests" },
        });
      }
      const link = await prisma.companyChannelPartner.findUnique({
        where: {
          channelPartnerId_companyId: { channelPartnerId: req.user.id, companyId: target },
        },
        select: { status: true },
      });
      if (!link || link.status !== "ACTIVE") {
        return res.status(403).json({
          ok: false,
          error: { code: "FORBIDDEN_COMPANY", message: "Not an active partner of this company" },
        });
      }
      req.tenantPrisma = getTenantPrisma(target);
      // expose the resolved company so downstream handlers don't reparse
      req.resolvedCompanyId = target;
      return next();
    }

    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "No company context" },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { tenantMiddleware };
