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
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, "Not authenticated");
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
