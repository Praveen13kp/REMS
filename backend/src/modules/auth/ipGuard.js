const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");

// Roles whose login is locked to a single registered IP address. OWNER (and
// ADMIN) are intentionally absent — they may sign in from anywhere. BROKER is
// the legacy alias for CHANNEL_PARTNER, kept so any stale rows are covered.
const IP_RESTRICTED_ROLES = ["MANAGER", "AGENT", "CHANNEL_PARTNER", "BROKER"];

const isIpRestrictedRole = (role) => IP_RESTRICTED_ROLES.includes(role);

// Normalise the client IP. With `trust proxy` set, req.ip already resolves
// the real client through X-Forwarded-For. We strip the IPv4-mapped IPv6
// prefix (::ffff:127.0.0.1 → 127.0.0.1) so a user isn't blocked just because
// the transport flipped between v4/v6 representations between two logins.
function getClientIp(req) {
  const raw = req.ip || req.connection?.remoteAddress || "";
  if (!raw) return "";
  return raw.replace(/^::ffff:/i, "").trim();
}

// Best-effort audit of a blocked login. Tenant users (companyId set) get a
// row in the company Audit Log (Activity) so the OWNER can see the attempt;
// everything is also written to the app logger. Channel partners have no
// company at login time, so they're logger-only. Never throws — logging must
// not turn a 403 into a 500.
async function logBlockedAttempt(user, ip) {
  logger.warn(
    {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      attemptedIp: ip,
      registeredIp: user.registeredIp,
    },
    "Login blocked: IP not registered",
  );

  if (!user.companyId) return;
  try {
    await prisma.activity.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        type: "SYSTEM",
        content: `Login blocked for ${user.name || user.email}: IP ${ip || "unknown"} is not the registered address`,
        metadata: {
          action: "LOGIN_BLOCKED_IP",
          attemptedIp: ip || null,
          registeredIp: user.registeredIp || null,
        },
      },
    });
  } catch (err) {
    logger.warn({ err: err?.message }, "Failed to write LOGIN_BLOCKED_IP activity");
  }
}

// Enforces IP-based login restriction for non-owner roles. Call AFTER the
// password has been verified and the single target user resolved, but BEFORE
// a session is issued. The `user` object must include id, role, companyId,
// registeredIp (and ideally name/email for nicer audit text).
//
//   - exempt role (OWNER / ADMIN / platform) → no-op
//   - no IP on file → first login: register this IP and allow
//   - IP matches the registered one → allow
//   - IP differs → audit the attempt and throw 403 (IP_NOT_ALLOWED)
async function enforceIpLogin(user, ip) {
  if (!isIpRestrictedRole(user.role)) return;

  // First successful login for this account — lock it to the current IP.
  if (!user.registeredIp) {
    await prisma.user.update({
      where: { id: user.id },
      data: { registeredIp: ip || "unknown" },
    });
    if (user.companyId) {
      prisma.activity
        .create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            type: "SYSTEM",
            content: `Login IP registered for ${user.name || user.email}: ${ip || "unknown"}`,
            metadata: { action: "LOGIN_IP_REGISTERED", registeredIp: ip || null },
          },
        })
        .catch(() => {});
    }
    return;
  }

  if (user.registeredIp === ip) return;

  await logBlockedAttempt(user, ip);
  throw new ApiError(
    403,
    "Login blocked: your account is locked to a registered IP address. Ask your company owner to reset it, then sign in again.",
    { code: "IP_NOT_ALLOWED" },
  );
}

module.exports = {
  IP_RESTRICTED_ROLES,
  isIpRestrictedRole,
  getClientIp,
  enforceIpLogin,
};
