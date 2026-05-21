const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");
const { assignDefaultSubscription } = require("../subscription/subscription.service");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROFILE_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
}

function getGoogleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || `${process.env.BETTER_AUTH_URL}/api/auth/google/callback`;
}

function createSignedSessionCookie(sessionToken) {
  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64")
    .replace(/=+$/, "");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  return `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

async function createSessionForUser(userId) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token: sessionToken, expiresAt } });
  return {
    token: sessionToken,
    cookie: createSignedSessionCookie(sessionToken),
  };
}

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

  const cookie = createSignedSessionCookie(sessionToken);

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

  const cookieValue = createSignedSessionCookie(sessionToken);

  return {
    token: sessionToken,
    user: { id: matched.id, name: matched.name, email: matched.email, role: matched.role, companyId: matched.companyId },
    cookie: cookieValue,
  };
}

async function getSessionByToken(rawCookie) {
  const decoded = decodeURIComponent(rawCookie);
  const sep = decoded.indexOf(".");
  const token = sep === -1 ? decoded : decoded.slice(0, sep);

  return prisma.session.findUnique({
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
}

function buildGoogleAuthUrl({ state }) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(503, "Google login is not configured");
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: "authorization_code",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn({ payload }, "Google token exchange failed");
    throw new ApiError(401, "Google sign-in failed");
  }
  return payload;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(GOOGLE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await response.json().catch(() => ({}));
  if (!response.ok || !profile.email) {
    logger.warn({ profile }, "Google profile fetch failed");
    throw new ApiError(401, "Could not read Google profile");
  }
  return profile;
}

async function signInWithGoogleCode(code) {
  const tokens = await exchangeGoogleCode(code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  const email = String(profile.email || "").toLowerCase();
  const name = profile.name || email.split("@")[0];
  const image = profile.picture || null;

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, companyId: true, isActive: true, deletedAt: true },
  });

  if (user && (!user.isActive || user.deletedAt)) {
    throw new ApiError(403, "This account is disabled");
  }

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: `${name}'s Realty`,
          email,
          subscriptionPlan: "BASIC",
          subscriptionStatus: "TRIALING",
          maxUsers: 1,
          maxLeads: 50,
          billingCycle: "MONTHLY",
          isTrialActive: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          image,
          emailVerified: !!profile.email_verified,
          role: "OWNER",
          companyId: company.id,
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true, companyId: true },
      });

      await tx.account.create({
        data: {
          id: `google_${createdUser.id}`,
          userId: createdUser.id,
          accountId: profile.sub || email,
          providerId: "google",
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          idToken: tokens.id_token || null,
          scope: tokens.scope || null,
          accessTokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((stage) => ({ ...stage, companyId: company.id })),
      });

      await assignDefaultSubscription(tx, company.id, { trial: true });

      return createdUser;
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: user.name || name, image: image || undefined, lastLoginAt: new Date() },
    });

    await prisma.account.upsert({
      where: { id: `google_${user.id}` },
      create: {
        id: `google_${user.id}`,
        userId: user.id,
        accountId: profile.sub || email,
        providerId: "google",
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        idToken: tokens.id_token || null,
        scope: tokens.scope || null,
        accessTokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
      update: {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || undefined,
        idToken: tokens.id_token || null,
        scope: tokens.scope || null,
        accessTokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
    });
  }

  const session = await createSessionForUser(user.id);
  return {
    user,
    token: session.token,
    cookie: session.cookie,
    redirectTo: `${getFrontendBaseUrl()}/dashboard`,
  };
}

module.exports = {
  superadminLogin,
  tenantLogin,
  getSessionByToken,
  buildGoogleAuthUrl,
  signInWithGoogleCode,
};
