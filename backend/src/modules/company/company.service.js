const nodemailer = require("nodemailer");
const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");
const { encrypt, decrypt } = require("../integrations/crypto");
const { logger } = require("../../lib/logger");

async function registerCompanyAndOwner(input) {
  const { companyName, companyType, ownerEmail, password } = input;
  const city = input.city || null;
  const ownerPhone = input.ownerPhone || null;
  const ownerName = (input.ownerName && input.ownerName.trim()) || ownerEmail.split("@")[0];
  // The pricing page passes the chosen plan + cycle, but we never auto-activate
  // a paid plan from signup. The company starts on FREE; if they picked PRO or
  // ENTERPRISE we stash the intent in `pendingPlan` / `pendingBillingCycle` so
  // the billing page can fire Razorpay checkout right after onboarding.
  const pendingPlan = input.plan && input.plan !== "BASIC" && input.plan !== "FREE" ? input.plan : null;
  const pendingBillingCycle = pendingPlan
    ? (input.billingCycle === "annual" ? "annual" : "monthly")
    : null;

  // Only consider LIVE users — soft-deleted rows (deletedAt set) hang
  // around for FK integrity but their email is mangled at delete time,
  // so the user-facing email is genuinely free.
  const existingUser = await prisma.user.findFirst({
    where: { email: ownerEmail, deletedAt: null },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "This email is already registered. Please use a different email — each company on this platform requires its own unique login.",
    );
  }

  // Skip companies that were deleted by Super Admin — the email belongs to
  // a defunct workspace and the owner is welcome to start fresh.
  const existingCompany = await prisma.company.findFirst({
    where: { email: ownerEmail, status: { not: "DELETED" } },
  });

  if (existingCompany) {
    throw new ApiError(409, "Company with this email already exists");
  }

  const { auth } = await initAuth();

  const signUp = await auth.api.signUpEmail({
    body: {
      email: ownerEmail,
      password,
      name: ownerName,
    },
  });

  if (!signUp || !signUp.user) {
    throw new ApiError(500, "Failed to create user account");
  }

  const authUserId = signUp.user.id;

  let company;
  try {
    company = await prisma.$transaction(async (tx) => {
      // BASIC tier ships with a 7-day trial. After trialEndsAt the
      // assertTrialActive gate blocks every write until upgrade.
      const TRIAL_DAYS = 7;
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const created = await tx.company.create({
        data: {
          name: companyName,
          type: companyType,
          city,
          email: ownerEmail,
          phone: ownerPhone,
          subscriptionPlan: "BASIC",
          pendingPlan,
          pendingBillingCycle,
          trialEndsAt,
        },
      });

      await tx.user.update({
        where: { id: authUserId },
        data: {
          companyId: created.id,
          role: "OWNER",
          phone: ownerPhone,
          provider: "CREDENTIAL",
          providerId: authUserId,
          // Owner is logged in immediately after signup — mark the
          // login so the User Management table shows them as Active,
          // not "Pending acceptance".
          lastLoginAt: new Date(),
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((stage) => ({
          ...stage,
          companyId: created.id,
        })),
      });

      return created;
    });
  } catch (err) {
    await prisma.user.delete({ where: { id: authUserId } }).catch(() => {});
    throw err;
  }

  const { headers: signInHeaders } = await auth.api.signInEmail({
    body: { email: ownerEmail, password },
    returnHeaders: true,
  });

  const user = await prisma.user.findUnique({ where: { id: authUserId } });

  const setCookie = signInHeaders.get("set-cookie");

  // Welcome notification for the new owner
  prisma.notification
    .create({
      data: {
        userId: user.id,
        companyId: company.id,
        type: "WELCOME",
        title: "Welcome to LeadPro!",
        body: `Your company "${company.name}" is ready. Start by adding your first lead.`,
        link: "/leads",
        metadata: { kind: "WELCOME" },
      },
    })
    .catch(() => {});

  return { company, user, setCookie };
}

async function getCompany(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const [usersCount, projectsCount, leadsCount] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.project.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId } }),
  ]);

  return {
    ...company,
    usersCount,
    projectsCount,
    leadsCount,
  };
}

async function updateCompany(companyId, data) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  return company;
}

async function completeOnboarding(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.onboardingCompleted) {
    return company;
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { onboardingCompleted: true },
  });

  return updated;
}

// --------------------------------------------------------------------------
// Per-tenant SMTP
// --------------------------------------------------------------------------

const SMTP_PASSWORD_PLACEHOLDER = "********";

// Public-facing config: never exposes the password ciphertext or plaintext.
// `hasPassword` tells the FE whether a password is already saved so the form
// can leave the field blank without losing the secret on save.
async function getCompanySmtpConfig(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassEnc: true,
      smtpFromEmail: true,
      smtpFromName: true,
    },
  });
  if (!c) throw new ApiError(404, "Company not found");
  return {
    host: c.smtpHost,
    port: c.smtpPort,
    secure: c.smtpSecure,
    username: c.smtpUser,
    fromEmail: c.smtpFromEmail,
    fromName: c.smtpFromName,
    hasPassword: !!c.smtpPassEnc,
    configured: !!(c.smtpHost && c.smtpPort && c.smtpUser && c.smtpPassEnc),
  };
}

// Internal — used by mail.js to send mail through the tenant's transporter.
// Returns null when SMTP isn't fully configured (so callers fall back to env).
async function getDecryptedCompanySmtpConfig(companyId) {
  if (!companyId) return null;
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassEnc: true,
      smtpFromEmail: true,
      smtpFromName: true,
    },
  });
  if (!c || !c.smtpHost || !c.smtpPort || !c.smtpUser || !c.smtpPassEnc) {
    return null;
  }
  let password;
  try {
    password = decrypt(c.smtpPassEnc);
  } catch (err) {
    logger.error({ err: err?.message, companyId }, "Failed to decrypt tenant SMTP password");
    return null;
  }
  return {
    host: c.smtpHost,
    port: c.smtpPort,
    secure: !!c.smtpSecure,
    user: c.smtpUser,
    pass: password,
    fromEmail: c.smtpFromEmail,
    fromName: c.smtpFromName,
  };
}

// Persist edits. Password handling: an empty/undefined password leaves the
// existing ciphertext untouched (so the form can ship a masked field); a
// non-empty value is re-encrypted and replaces the previous. Passing
// `clearPassword: true` wipes it.
async function updateCompanySmtpConfig(companyId, input) {
  const {
    host = null,
    port = null,
    secure = false,
    username = null,
    password,
    clearPassword,
    fromEmail = null,
    fromName = null,
  } = input || {};

  const data = {
    smtpHost: host || null,
    smtpPort: port == null || port === "" ? null : Number(port),
    smtpSecure: !!secure,
    smtpUser: username || null,
    smtpFromEmail: fromEmail || null,
    smtpFromName: fromName || null,
  };
  if (clearPassword) {
    data.smtpPassEnc = null;
  } else if (typeof password === "string" && password.length > 0) {
    data.smtpPassEnc = encrypt(password);
  }
  // else: don't touch smtpPassEnc — preserve the existing secret

  await prisma.company.update({ where: { id: companyId }, data });
  return getCompanySmtpConfig(companyId);
}

// Stand up a one-off transporter from either the *unsaved* form values
// (preferred — lets the user test before saving) or the persisted config.
// The recipient defaults to the calling user's email so test mails don't
// leak elsewhere.
async function sendCompanySmtpTestEmail(companyId, input, recipientEmail) {
  const useSaved = !input || !input.host;
  let host;
  let port;
  let secure;
  let user;
  let pass;
  let fromEmail;
  let fromName;

  if (useSaved) {
    const cfg = await getDecryptedCompanySmtpConfig(companyId);
    if (!cfg) {
      throw new ApiError(400, "Save SMTP settings first, or fill in the form before testing.");
    }
    ({ host, port, secure, user, pass, fromEmail, fromName } = cfg);
  } else {
    host = input.host;
    port = input.port == null || input.port === "" ? null : Number(input.port);
    secure = !!input.secure;
    user = input.username;
    // If password field was left blank but a stored one exists, use that —
    // matches the "leave password blank to keep" UX of the save flow.
    if (typeof input.password === "string" && input.password.length > 0) {
      pass = input.password;
    } else {
      const stored = await getDecryptedCompanySmtpConfig(companyId);
      pass = stored?.pass || null;
    }
    fromEmail = input.fromEmail || null;
    fromName = input.fromName || null;
  }

  if (!host || !port || !user || !pass) {
    throw new ApiError(400, "Host, port, username, and password are all required to send a test email.");
  }
  if (!recipientEmail) {
    throw new ApiError(400, "Recipient email is required for the test send.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: secure || port === 465,
    auth: { user, pass },
  });

  const from = fromName ? `"${fromName}" <${fromEmail || user}>` : (fromEmail || user);
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: "LeadPro SMTP test",
      text: "This is a test email confirming your SMTP settings are working.",
      html: '<p>This is a test email confirming your <b>SMTP settings</b> are working.</p>',
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    throw new ApiError(400, `SMTP test failed: ${err?.message || "unknown error"}`);
  }
}

module.exports = {
  registerCompanyAndOwner,
  getCompany,
  updateCompany,
  completeOnboarding,
  getCompanySmtpConfig,
  getDecryptedCompanySmtpConfig,
  updateCompanySmtpConfig,
  sendCompanySmtpTestEmail,
};
