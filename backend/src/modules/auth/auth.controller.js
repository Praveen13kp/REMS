const { validateSuperadminLogin, validateTenantLogin } = require("./auth.validation");
const {
  superadminLogin,
  tenantLogin,
  getSessionByToken,
  buildGoogleAuthUrl,
  signInWithGoogleCode,
} = require("./auth.service");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");

const firstIssueMessage = (error) =>
  (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid input";

const loginSuperadmin = async (req, res, next) => {
  try {
    const validation = validateSuperadminLogin(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    const result = await superadminLogin({
      email: validation.data.email,
      password: validation.data.password,
      ip,
      userAgent,
    });

    res.setHeader("Set-Cookie", result.cookie);
    res.status(200).json(result.body);
  } catch (err) {
    next(err);
  }
};

const loginTenant = async (req, res, next) => {
  try {
    const validation = validateTenantLogin(req.body);
    if (!validation.success) throw new ApiError(400, firstIssueMessage(validation.error));

    const result = await tenantLogin(validation.data);

    res.setHeader("Set-Cookie", result.cookie);
    res.status(200).json({ user: result.user, token: result.token });
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const raw = req.cookies?.["better-auth.session_token"];
    if (!raw) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const session = await getSessionByToken(raw);

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    res.json({ user: session.user, session: { id: session.id, expiresAt: session.expiresAt } });
  } catch (err) {
    next(err);
  }
};

const googleStart = async (req, res, next) => {
  try {
    const state = Buffer.from(
      JSON.stringify({
        ts: Date.now(),
        from: typeof req.query.from === "string" ? req.query.from : "/dashboard",
      }),
    ).toString("base64url");
    res.redirect(await buildGoogleAuthUrl({ state }));
  } catch (err) {
    const base = process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";
    if (err?.statusCode === 503) {
      return res.redirect(`${base}/login?error=google_config`);
    }
    next(err);
  }
};

const googleCallback = async (req, res, next) => {
  try {
    if (req.query.error) {
      return res.redirect(`${process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173"}/login?error=google`);
    }
    const code = req.query.code;
    if (!code) throw new ApiError(400, "Missing Google authorization code");

    const result = await signInWithGoogleCode(code, req.query.state);
    res.setHeader("Set-Cookie", result.cookie);
    res.redirect(result.redirectTo);
  } catch (err) {
    const base = process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";
    logger.warn({ err: err?.message, code: err?.code }, "Google sign-in callback failed");
    res.redirect(`${base}/login?error=google`);
  }
};

module.exports = { loginSuperadmin, loginTenant, getSession, googleStart, googleCallback };
