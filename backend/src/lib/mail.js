const nodemailer = require("nodemailer");
const { env } = require("./env");
const { logger } = require("./logger");

let _platformTransporter;

function getPlatformTransporter() {
  if (_platformTransporter !== undefined) return _platformTransporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn(
      "Platform SMTP not configured — outgoing mail will be logged to console only. " +
        "Set SMTP_HOST/PORT/USER/PASS/FROM in .env to enable real delivery.",
    );
    _platformTransporter = null;
    return null;
  }

  _platformTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === true || env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return _platformTransporter;
}

// One-shot transporter for the tenant config. Not cached — companies are
// expected to change SMTP credentials rarely, and recreating a transporter
// per mail keeps things simple (no cache invalidation when settings change).
function buildTenantTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure || cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

async function loadTenantConfig(companyId) {
  if (!companyId) return null;
  // Required lazily to avoid a circular import: company.service depends on
  // crypto + nothing in this file, but this file is required during module
  // load by callers that company.service itself reaches into transitively.
  const { getDecryptedCompanySmtpConfig } = require("../modules/company/company.service");
  try {
    return await getDecryptedCompanySmtpConfig(companyId);
  } catch (err) {
    logger.error({ err: err?.message, companyId }, "loadTenantConfig failed; falling back to platform SMTP");
    return null;
  }
}

// sendMail
// - Pass companyId to route through that tenant's SMTP when configured.
// - When companyId is omitted (or the tenant has no SMTP), uses platform SMTP.
// - When neither is available, logs to console and returns {delivered:false}.
async function sendMail({ to, subject, html, text, replyTo, companyId }) {
  // 1. Try tenant SMTP first
  if (companyId) {
    const tenant = await loadTenantConfig(companyId);
    if (tenant) {
      const transporter = buildTenantTransporter(tenant);
      const from = tenant.fromName
        ? `"${tenant.fromName}" <${tenant.fromEmail || tenant.user}>`
        : (tenant.fromEmail || tenant.user);
      try {
        const info = await transporter.sendMail({ from, to, subject, html, text, replyTo });
        logger.info({ to, subject, messageId: info.messageId, mode: "tenant-smtp", companyId }, "[mail] sent");
        return { delivered: true, mode: "tenant-smtp", messageId: info.messageId };
      } catch (err) {
        // Don't silently fall back — tenant SMTP failures usually mean
        // credentials drifted, and silently using the platform server could
        // mean their email goes from the wrong domain. Surface the error.
        logger.error({ err: err?.message, companyId }, "Tenant SMTP send failed");
        throw err;
      }
    }
  }

  // 2. Platform SMTP fallback
  const t = getPlatformTransporter();
  const from = env.SMTP_FROM || env.SMTP_USER || "no-reply@relms.local";

  if (!t) {
    logger.info(
      { to, subject, replyTo, preview: text?.slice(0, 200) },
      "[mail:console] would send",
    );
    return { delivered: false, mode: "console" };
  }

  const info = await t.sendMail({ from, to, subject, html, text, replyTo });
  logger.info({ to, subject, messageId: info.messageId, mode: "platform-smtp" }, "[mail] sent");
  return { delivered: true, mode: "platform-smtp", messageId: info.messageId };
}

// Returns one of:
//   { status: "healthy", mode: "smtp" }   - platform SMTP handshake succeeded
//   { status: "down", mode: "smtp", error } - platform SMTP configured but unreachable
//   { status: "degraded", mode: "console" } - no platform SMTP, console fallback
// Tenant SMTP isn't checked here — too tenant-specific for a platform-level
// health probe. The Settings UI has its own "Send test email" button.
async function verifyMailer() {
  const t = getPlatformTransporter();
  if (!t) {
    return { status: "degraded", mode: "console" };
  }
  try {
    await t.verify();
    return { status: "healthy", mode: "smtp" };
  } catch (err) {
    return { status: "down", mode: "smtp", error: err?.message };
  }
}

module.exports = { sendMail, verifyMailer };
