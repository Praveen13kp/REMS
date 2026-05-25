const prisma = require("../../config/prisma");
const { sendMail } = require("../../lib/mail");
const { env } = require("../../lib/env");
const { logger } = require("../../lib/logger");

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function notifyInbox({ name, email, company, phone, message, source, ip }) {
  const to = env.CONTACT_INBOX || env.SMTP_FROM || env.SMTP_USER;
  if (!to) {
    logger.warn("Contact form: no inbox configured (set CONTACT_INBOX or SMTP_FROM)");
    return;
  }

  const subject = `New contact form submission from ${name}`;
  const rows = [
    ["Name", name],
    ["Email", email],
    ["Company", company || "—"],
    ["Phone", phone || "—"],
    ["Source", source || "Website contact form"],
    ["IP", ip || "—"],
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 16px;">New contact form submission</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;width:120px;">${escapeHtml(k)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(v)}</td>
          </tr>`,
          )
          .join("")}
      </table>
      <h3 style="margin:20px 0 8px;font-size:14px;color:#666;">Message</h3>
      <div style="padding:12px;background:#f7f7f9;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escapeHtml(message || "(no message)")}</div>
      <p style="margin-top:20px;font-size:12px;color:#999;">Reply directly to ${escapeHtml(email)} to respond.</p>
    </div>
  `;

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    message || "(no message)",
  ].join("\n");

  try {
    await sendMail({ to, subject, html, text, replyTo: email });
  } catch (err) {
    logger.error({ err: err?.message }, "Contact form: failed to send notification email");
  }
}

async function createSubmission({ name, email, company, phone, message, source, ip, userAgent }) {
  const submission = await prisma.contactSubmission.create({
    data: {
      name,
      email,
      company: company || null,
      phone: phone || null,
      message,
      source: source || null,
      ip: ip || null,
      userAgent: userAgent || null,
    },
  });

  await notifyInbox({ name, email, company, phone, message, source, ip });

  return submission;
}

module.exports = { createSubmission };
