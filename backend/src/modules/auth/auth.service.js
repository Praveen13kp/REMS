const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { env } = require("../../lib/env");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

const SESSION_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  phone: true,
  image: true,
  dept: true,
  lastLoginAt: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
};

const getFrontendBase = () => env.FRONTEND_URL.split(",")[0].trim().replace(/\/$/, "");

const getGoogleCallbackUrl = () =>
  env.GOOGLE_CALLBACK_URL || `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/auth/google/callback`;

function extractSessionToken(raw) {
  const decoded = decodeURIComponent(raw);
  const sep = decoded.indexOf(".");
  return sep === -1 ? decoded : decoded.slice(0, sep);
}

function signSessionToken(sessionToken) {
  return crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
}

function buildSessionCookie(sessionToken, maxAge) {
  const signature = signSessionToken(sessionToken);
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  return `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

const createSessionForUser = async (userId) => {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token: sessionToken, expiresAt },
  });

  const maxAge = 7 * 24 * 60 * 60;
  return {
    token: sessionToken,
    expiresAt,
    cookie: buildSessionCookie(sessionToken, maxAge),
  };
};

const safeRelativePath = (value, fallback = "/dashboard") => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
};

function decodeGoogleState(state) {
  if (!state) return {};
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

async function getSessionByToken(rawToken) {
  const token = extractSessionToken(rawToken);
  return prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: SESSION_USER_SELECT,
      },
    },
  });
}

async function buildGoogleAuthUrl({ state } = {}) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(503, "Google login is not configured");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    ...(state ? { state } : {}),
  });

  return url.toString();
}

async function signInWithGoogleCode(code, state) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(503, "Google login is not configured");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new ApiError(401, "Google authorization failed");
  }

  const tokens = await tokenResponse.json();
  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new ApiError(401, "Failed to read Google profile");
  }

  const profile = await userInfoResponse.json();
  const email = profile.email?.toLowerCase();
  if (!email) {
    throw new ApiError(401, "Google account did not return an email");
  }

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && (!user.isActive || user.deletedAt)) {
    throw new ApiError(401, "This Google account is not active");
  }

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const ownerName = profile.name?.trim() || email.split("@")[0];
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: `${ownerName}'s Workspace`,
          type: "INDIVIDUAL",
          email,
          subscriptionPlan: "BASIC",
          trialEndsAt,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          name: ownerName,
          email,
          emailVerified: !!profile.verified_email,
          image: profile.picture || null,
          provider: "GOOGLE",
          providerId: String(profile.id),
          role: "OWNER",
          companyId: company.id,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((stage) => ({
          ...stage,
          companyId: company.id,
        })),
      });

      return createdUser;
    });
  }

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "google", accountId: String(profile.id) },
  });

  const accountData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    scope: tokens.scope,
    accessTokenExpiresAt: tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000)
      : null,
  };

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: accountData,
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "google",
        accountId: String(profile.id),
        ...accountData,
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      emailVerified: user.emailVerified || !!profile.verified_email,
      image: user.image || profile.picture || null,
      providerId: user.provider === "GOOGLE" ? String(profile.id) : user.providerId || user.id,
    },
  });

  const session = await createSessionForUser(user.id);
  const frontendBase = getFrontendBase();
  const { from } = decodeGoogleState(state);
  const targetPath = isNewUser ? "/signup/welcome" : safeRelativePath(from);
  return {
    cookie: session.cookie,
    redirectTo: new URL(targetPath, frontendBase).toString(),
  };
}

async function superadminLogin({ email, password, ip, userAgent }) {
  const lower = email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: lower, role: "SUPER_ADMIN", companyId: null, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
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
          actorId: user?.id ?? null,
          action,
          targetId: null,
          metadata: { email, ip, userAgent, ...(extra || {}) },
        },
      })
      .catch((err) => {
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

  const maxAge = 7 * 24 * 60 * 60;
  const cookie = buildSessionCookie(sessionToken, maxAge);

  await audit("SUPER_ADMIN_LOGIN");

  // Create login welcome notification for super admin
  prisma.notification
    .create({
      data: {
        userId: user.id,
        companyId: null,
        type: "SYSTEM",
        title: "Welcome back!",
        body: `Welcome back, Super Admin! System is ready.`,
        link: "/admin",
        metadata: { kind: "LOGIN_WELCOME" },
      },
    })
    .catch(() => {});

  return {
    cookie,
    body: {
      user: { id: user.id, email: user.email, role: user.role },
      token: sessionToken,
    },
  };
}

async function tenantLogin({ email, password, companyId }) {
  const lower = email.toLowerCase();
  const { verifyPassword } = await import("@better-auth/utils/password");

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
      isActive: true,
      phone: true,
      image: true,
      dept: true,
      lastLoginAt: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { id: true, name: true, status: true } },
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
    const hasCandidates = candidates.length > 0;
    if (hasCandidates && candidates.every(c => c.accounts.length === 0)) {
        throw new ApiError(
            401,
            "This account was created using Google Sign-In. Please continue with Google.",
            { code: "OAUTH_ACCOUNT_ONLY", provider: "GOOGLE" },
        );
    }
    throw new ApiError(401, "Invalid credentials");
  }

  const blocked = verified.find(
    (c) => c.company?.status === "SUSPENDED" || c.company?.status === "DELETED",
  );
  if (blocked) {
    const isDeleted = blocked.company.status === "DELETED";
    throw new ApiError(
      403,
      isDeleted
        ? "This account has been removed. Contact support."
        : "This account is suspended. Contact support to reactivate.",
      { code: isDeleted ? "COMPANY_DELETED" : "COMPANY_SUSPENDED" },
    );
  }

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

  const user = verified[0];
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token: sessionToken, expiresAt },
  });

  const maxAge = 7 * 24 * 60 * 60;
  const cookieValue = buildSessionCookie(sessionToken, maxAge);

  const lastLoginAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt },
  });

  // Create login welcome notification. Personalise with name if available.
  prisma.notification
    .create({
      data: {
        userId: user.id,
        companyId: user.companyId || null,
        type: "SYSTEM",
        title: "Welcome back!",
        body: `Welcome back, ${user.name || user.email}! We missed you.`,
        link: "/dashboard",
        metadata: { kind: "LOGIN_WELCOME" },
      },
    })
    .catch(() => {});

  return {
    token: sessionToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      image: user.image,
      dept: user.dept,
      lastLoginAt,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    cookie: cookieValue,
  };
}

module.exports = {
  superadminLogin,
  tenantLogin,
  getSessionByToken,
  buildGoogleAuthUrl,
  signInWithGoogleCode,
};
