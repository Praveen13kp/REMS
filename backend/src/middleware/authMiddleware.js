const prisma = require("../config/prisma");
const { ApiError } = require("../lib/ApiError");

async function authMiddleware(req, res, next) {
  try {
    const raw = req.cookies?.["better-auth.session_token"];
    if (!raw) {
      throw new ApiError(401, "Not authenticated");
    }

    const decoded = decodeURIComponent(raw);
    const sep = decoded.indexOf(".");
    const token = sep === -1 ? decoded : decoded.slice(0, sep);

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { company: { select: { id: true, status: true, moduleRestrictions: true } } } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, "Not authenticated");
    }

    // Block tenant users whose company has been suspended or deleted by
    // a platform admin. Super admin (companyId=null) is unaffected.
    const companyStatus = session.user.company?.status;
    if (companyStatus === "SUSPENDED" || companyStatus === "DELETED") {
      return res.status(403).json({
        ok: false,
        error: {
          code: companyStatus === "DELETED" ? "COMPANY_DELETED" : "COMPANY_SUSPENDED",
          message:
            companyStatus === "DELETED"
              ? "This account has been removed. Contact support."
              : "This account is suspended. Contact support to reactivate.",
        },
      });
    }

    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: err.message },
      });
    }
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Invalid session" },
    });
  }
}

module.exports = { authMiddleware };
