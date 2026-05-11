const authMiddleware = (req, res, next) => {

  // Better Auth session logic here later

  next();
};

module.exports = authMiddleware;
const { initAuth } = require("../lib/auth");
const { ApiError } = require("../lib/ApiError");

async function authMiddleware(req, res, next) {
  try {
    const { auth, fromNodeHeaders } = await initAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new ApiError(401, "Not authenticated");
    }

    req.user = session.user;
    req.session = session.session;
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
