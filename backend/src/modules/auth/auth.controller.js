const prisma = require("../../config/prisma");
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

    const decoded = decodeURIComponent(raw);
    const sep = decoded.indexOf(".");
    const token = sep === -1 ? decoded : decoded.slice(0, sep);

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            isActive: true,
            companyId: true,
            image: true,
          },
        },
      },
    });

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

module.exports = { loginSuperadmin, loginTenant, getSession };
