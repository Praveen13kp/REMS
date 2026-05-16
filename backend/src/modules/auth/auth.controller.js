const { validateSuperadminLogin, validateTenantLogin } = require("./auth.validation");
const { superadminLogin, tenantLogin } = require("./auth.service");
const { ApiError } = require("../../lib/ApiError");

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

    for (const [key, value] of result.headers.entries()) {
      res.setHeader(key, value);
    }
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

module.exports = { loginSuperadmin, loginTenant };
