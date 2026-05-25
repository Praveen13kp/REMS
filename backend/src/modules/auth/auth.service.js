const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { env } = require("../../lib/env");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

const getFrontendBase = () => env.FRONTEND_URL.split(",")[0].trim().replace(/\/$/, "");

const getGoogleCallbackUrl = () =>
  env.GOOGLE_CALLBACK_URL || `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/auth/google/callback`;

const createSessionCookie = (sessionToken) => {
  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  return `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
};

const createSessionForUser = async (userId) => {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token: sessionToken, expiresAt },
  });

  return {
    token: sessionToken,
    expiresAt,
    cookie: createSessionCookie(sessionToken),
  };
};

const getSessionTokenFromCookie = (raw) => {
  const decoded = decodeURIComponent(raw);
  const sep = decoded.indexOf(".");
  return sep === -1 ? decoded : decoded.slice(0, sep);
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
  const token = getSessionTokenFromCookie(rawToken);
  return prisma.session.findUnique({
    where: { token },
    include: { user: true },
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

  if (!user) {
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
  return {
    cookie: session.cookie,
    redirectTo: new URL(safeRelativePath(from), frontendBase).toString(),
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

  // Same signing rule as tenantLogin — DO NOT strip the trailing "="
  // padding. better-call's getSignedCookie validator requires signature
  // length === 44 with a trailing "=", and rejects the cookie otherwise.
  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  const cookie = `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  await audit("SUPER_ADMIN_LOGIN");

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
      role: true,
      company: { select: { id: true, name: true } },
      accounts: {
        select: { providerId: true, password: true },
      },
    },
  });

  const credentialCandidates = candidates
    .map((c) => ({
      ...c,
      credential: c.accounts.find((a) => a.providerId === "credential" && a.password),
    }))
    .filter((c) => c.credential);

  const verified = [];
  for (const c of credentialCandidates) {
    if (await verifyPassword(c.credential.password, password)) {
      verified.push(c);
    }
  }

  if (verified.length === 0) {
    if (candidates.length > 0 && credentialCandidates.length === 0) {
      throw new ApiError(
        401,
        "This account was created using Google Sign-In. Please continue with Google.",
        { code: "OAUTH_ACCOUNT_ONLY", provider: "GOOGLE" },
      );
    }
    throw new ApiError(401, "Invalid credentials");
  }

  // Block sign-in for users whose company has been suspended or deleted.
  // We check after password verification so a wrong password still returns
  // 401 (don't leak the suspension state to anyone who can't authenticate).
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

  const user = { id: verified[0].id, role: verified[0].role };

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // better-auth (via better-call) reads its session cookie as a signed
  // cookie: `<token>.<base64(HMAC-SHA256(token, secret))>`. The verifier
  // in better-call requires the signature to be exactly 44 chars AND end
  // with "=" — i.e. **keep** the base64 padding. We learned this the hard
  // way after a better-auth bump tightened the validation (signature.length
  // !== 44 || !signature.endsWith("=") → reject). Do NOT strip "=" here.
  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  const cookieValue = `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  return {
    token: sessionToken,
    user: { id: user.id, email: email, role: user.role },
    cookie: cookieValue,
  };
}

module.exports = { superadminLogin, tenantLogin, getSessionByToken, buildGoogleAuthUrl, signInWithGoogleCode };
