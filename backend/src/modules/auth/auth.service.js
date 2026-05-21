const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

async function superadminLogin({ email, password, ip, userAgent }) {
  const lower = email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: lower, role: "SUPER_ADMIN", companyId: null, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      isActive: true,
      accounts: {
        where: { providerId: "credential" },
        select: { password: true },
      },
    },
  });

  const audit = (action, extra) =>
    prisma.platformAudit
      .create({
        data: {
          // actorId + targetId are both nullable now. A failed-login audit
          // has no confirmed actor (the email didn't match) and no company
          // target (super-admin doesn't belong to a tenant).
          actorId: user?.id ?? null,
          action,
          targetId: null,
          metadata: { email, ip, userAgent, ...(extra || {}) },
        },
      })
      .catch((err) => {
        // Surface the failure in logs so we don't lose visibility into
        // audit-write bugs again. Stay non-blocking — auth must not fail
        // because of an audit problem.
        logger.warn({ err: err?.message, action }, "platformAudit insert failed");
      });

  if (!user || !user.isActive) {
    await audit("SUPER_ADMIN_LOGIN_FAILED");
    throw new ApiError(401, "Invalid credentials");
  }

  const hash = user.accounts[0]?.password;
  if (!hash) {
    await audit("SUPER_ADMIN_LOGIN_FAILED", { reason: "no_credential" });
    throw new ApiError(401, "Invalid credentials");
  }

  const { verifyPassword } = await import("@better-auth/utils/password");
  const ok = await verifyPassword(hash, password);
  if (!ok) {
    await audit("SUPER_ADMIN_LOGIN_FAILED", { reason: "wrong_password" });
    throw new ApiError(401, "Invalid credentials");
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token: sessionToken, expiresAt },
  });

  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64")
    .replace(/=+$/, "");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  const cookie = `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  await audit("SUPER_ADMIN_LOGIN");

  return {
    cookie,
    body: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId ?? null },
      token: sessionToken,
    },
  };
}

async function tenantLogin({ email, password, companyId }) {
  const lower = email.toLowerCase();

  // Resolve which company this sign-in is for. Each (companyId, email) row
  // has its own credential, so the password itself disambiguates: try every
  // user row for this email, pick the one whose password verifies.
  const { verifyPassword } = await import("@better-auth/utils/password");

  // BROKER users have companyId = null (their "home" is BrokerCompany rows),
  // so we can't blanket-filter companyId. The role exclusion already keeps
  // SUPER_ADMIN / PLATFORM_ADMIN out of this endpoint.
  const candidates = await prisma.user.findMany({
    where: {
      email: lower,
      ...(companyId ? { companyId } : {}),
      isActive: true,
      deletedAt: null,
      role: { notIn: ["SUPER_ADMIN", "PLATFORM_ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      accounts: {
        where: { providerId: "credential" },
        select: { password: true },
      },
    },
  });

  const verified = [];
  for (const c of candidates) {
    const hash = c.accounts[0]?.password;
    if (!hash) continue;
    if (await verifyPassword(hash, password)) {
      verified.push(c);
    }
  }

  if (verified.length === 0) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Same email + same password across multiple companies — ask the user
  // to pick which workspace to sign in to.
  if (verified.length > 1) {
    throw new ApiError(409, "Multiple companies match this email", {
      code: "COMPANY_PICK_REQUIRED",
      details: {
        companies: verified.map((c) => ({
          id: c.company.id,
          name: c.company.name,
        })),
      },
    });
  }

  const matched = verified[0];
  const user = { id: matched.id, role: matched.role };

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  // better-auth reads its session cookie as a Hono/better-call signed cookie:
  // urlEncoded(`<token>.<base64(HMAC-SHA256(token, secret))>`)
  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64")
    .replace(/=+$/, "");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  const cookieValue = `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  return {
    token: sessionToken,
    user: { id: matched.id, name: matched.name, email: matched.email, role: matched.role, companyId: matched.companyId },
    cookie: cookieValue,
  };
}

module.exports = { superadminLogin, tenantLogin };
