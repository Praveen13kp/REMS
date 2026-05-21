const nodemailer = require("nodemailer");
const { env } = require("./env");
const { logger } = require("./logger");

let _transporter;

function getTransporter() {
  if (_transporter !== undefined) return _transporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn(
      "SMTP not configured — outgoing mail will be logged to console only. " +
        "Set SMTP_HOST/PORT/USER/PASS/FROM in .env to enable real delivery.",
    );
    _transporter = null;
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === true || env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return _transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = env.SMTP_FROM || env.SMTP_USER || "no-reply@relms.local";

  if (!t) {
    logger.info(
      { to, subject, preview: text?.slice(0, 200) },
      "[mail:console] would send",
    );
    return { delivered: false, mode: "console" };
  }

  const info = await t.sendMail({ from, to, subject, html, text });
  logger.info({ to, subject, messageId: info.messageId }, "[mail] sent");
  return { delivered: true, mode: "smtp", messageId: info.messageId };
}

// Returns one of:
//   { status: "healthy", mode: "smtp" }   - SMTP handshake succeeded
//   { status: "down", mode: "smtp", error } - SMTP configured but unreachable
//   { status: "degraded", mode: "console" } - no SMTP config, falling back to console logs
// Used by the platform-admin health endpoint. We deliberately swallow the
// transport error into the return value so /admin/health never throws.
async function verifyMailer() {
  const t = getTransporter();
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
