const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { ApiError } = require("../../lib/ApiError");
const { logger } = require("../../lib/logger");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

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

// Resolve the session row from a raw `better-auth.session_token` cookie
// value. The cookie is URL-encoded and looks like `token.signature` —
// we split on the LAST "." (signature is fixed-length base64 SHA-256),
// take everything before as the token, and look up by that token.
//
// Used by:
//   1. authMiddleware (gates every protected route)
//   2. GET /api/auth/session (FE fetchSession on app boot)
//
// Returns the Session row with .user populated, or null if anything's
// off (missing/expired/tampered cookie, no DB row).
async function getSessionByToken(rawCookieValue) {
  if (!rawCookieValue || typeof rawCookieValue !== "string") return null;

  let decoded;
  try {
    decoded = decodeURIComponent(rawCookieValue);
  } catch {
    return null;
  }

  const sep = decoded.lastIndexOf(".");
  const token = sep === -1 ? decoded : decoded.slice(0, sep);
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt && session.expiresAt < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

// --- Google OAuth (custom, lightweight) ---------------------------------
// We don't use better-auth's social flow here because we need a single
// GET endpoint (/api/auth/google) that the FE can window.location.href
// into. Better-auth's social sign-in is POST-based and designed around
// the client SDK. Implementing the OAuth dance directly is ~40 lines and
// keeps the FE simple.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ApiError(503, "Google sign-in is not configured", {
      code: "GOOGLE_NOT_CONFIGURED",
    });
  }
  return { clientId, clientSecret, redirectUri };
}

function buildGoogleAuthUrl({ state }) {
  const { clientId, redirectUri } = getGoogleConfig();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function signInWithGoogleCode(code) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")[0]
    .trim();

  // 1. Exchange the auth code for tokens.
  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenResp.ok) {
    const detail = await tokenResp.text().catch(() => "");
    logger.warn({ status: tokenResp.status, detail }, "Google token exchange failed");
    throw new ApiError(401, "Google sign-in failed");
  }
  const tokens = await tokenResp.json();

  // 2. Fetch the user's profile.
  const profileResp = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResp.ok) throw new ApiError(401, "Could not read Google profile");
  const profile = await profileResp.json();
  const email = (profile.email || "").toLowerCase();
  if (!email) throw new ApiError(401, "Google profile is missing an email");

  // 3. Invite-only: the email MUST exist as an active tenant user.
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      isActive: true,
      role: { notIn: ["SUPER_ADMIN", "PLATFORM_ADMIN"] },
    },
    include: { company: { select: { id: true, status: true } } },
  });
  if (!user) throw new ApiError(404, "No LeadPro account exists for this Google email");

  const companyStatus = user.company?.status;
  if (companyStatus === "SUSPENDED" || companyStatus === "DELETED") {
    throw new ApiError(
      403,
      companyStatus === "DELETED"
        ? "This account has been removed. Contact support."
        : "This account is suspended. Contact support to reactivate.",
      { code: companyStatus === "DELETED" ? "COMPANY_DELETED" : "COMPANY_SUSPENDED" },
    );
  }

  // 4. Mint a session in the same shape as tenantLogin so the rest of the
  // app (authMiddleware, FE auth store) treats this exactly like a normal
  // email/password sign-in.
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, token: sessionToken, expiresAt },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const signature = crypto
    .createHmac("sha256", BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
  const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);
  const maxAge = 7 * 24 * 60 * 60;
  const cookie = `better-auth.session_token=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

  return { cookie, redirectTo: `${frontendBase}/dashboard` };
}

module.exports = {
  superadminLogin,
  tenantLogin,
  getSessionByToken,
  buildGoogleAuthUrl,
  signInWithGoogleCode,
};
