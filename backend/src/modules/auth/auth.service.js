const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

async function superadminLogin({ email, password, ip, userAgent }) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), role: "SUPER_ADMIN", companyId: null },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    await prisma.platformAudit.create({
      data: {
        actorId: user?.id ?? "unknown",
        action: "SUPER_ADMIN_LOGIN_FAILED",
        targetId: "",
        metadata: { email, ip, userAgent },
      },
    }).catch(() => {});
    throw new ApiError(401, "Invalid credentials");
  }

  const { auth } = await initAuth();
  const signIn = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  }).catch(() => null);

  if (!signIn || !signIn.response) {
    await prisma.platformAudit.create({
      data: {
        actorId: user.id,
        action: "SUPER_ADMIN_LOGIN_FAILED",
        targetId: "",
        metadata: { email, ip, userAgent, reason: "wrong_password" },
      },
    }).catch(() => {});
    throw new ApiError(401, "Invalid credentials");
  }

  await prisma.platformAudit.create({
    data: {
      actorId: user.id,
      action: "SUPER_ADMIN_LOGIN",
      targetId: "",
      metadata: { email, ip, userAgent },
    },
  }).catch(() => {});

  return signIn;
}

async function tenantLogin({ email, password, companySlug }) {
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), companyId: company.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials for this company");
  }

  if (!user.isActive) {
    throw new ApiError(401, "Account is deactivated");
  }

  if (user.role === "SUPER_ADMIN" || user.role === "PLATFORM_ADMIN") {
    throw new ApiError(401, "Use the admin portal");
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { password: true },
  });

  if (!account?.password) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { verifyPassword } = await import("@better-auth/utils/password");
  const valid = await verifyPassword({ hash: account.password, password });
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { symmetricEncrypt } = await import("better-auth/dist/crypto/index.mjs");
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  const encryptedToken = await symmetricEncrypt({ key: BETTER_AUTH_SECRET, data: sessionToken });
  const maxAge = 7 * 24 * 60 * 60;
  const cookieValue = `better-auth.session_token=${encryptedToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  return {
    token: sessionToken,
    user: { id: user.id, email: email, role: user.role },
    cookie: cookieValue,
  };
}

module.exports = { superadminLogin, tenantLogin };
