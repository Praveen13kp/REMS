function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND = {
  name: "LeadPro",
  accent: "#7C3AED",
  accentLight: "#8B5CF6",
  header: "#18181B",
  ink: "#0F172A",
  body: "#475569",
  muted: "#94A3B8",
  border: "#E2E8F0",
  bg: "#F1F5F9",
};

const ICONS = {
  LEAD_CREATED: "🆕",
  LEAD_ASSIGNED: "📋",
  LEAD_STATUS_CHANGED: "🔄",
  NOTE_MENTION: "💬",
  SYSTEM: "🔔",
  NEW_BOOKING: "✅",
  DAILY_SUMMARY: "📊",
  WEEKLY_REPORT: "📈",
  FOLLOWUP_REMINDER: "🔔",
};

function notificationEmail({ userName, notificationType, title, body, link }) {
  const safeName = escapeHtml(userName || "there");
  const safeTitle = escapeHtml(title);
  const safeBody = body ? escapeHtml(body) : "";
  const icon = ICONS[notificationType] || "🔔";
  const year = new Date().getFullYear();

  let origin = "";
  try {
    origin = link ? new URL(link).origin : "";
  } catch {
    origin = "";
  }

  const subject = `${safeTitle} — ${BRAND.name} Notification`;

  const text = [
    `Hi ${safeName},`,
    ``,
    `${safeTitle}`,
    safeBody ? `\n${safeBody}\n` : "",
    link ? `View details: ${link}` : "",
    ``,
    `— ${BRAND.name}, Lead management for real estate teams`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.accentLight};">&nbsp;</td></tr>
            <tr>
              <td style="background:${BRAND.header};padding:20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-right:10px;">
                      <div style="width:34px;height:34px;border-radius:8px;background:${BRAND.accent};color:#ffffff;font-size:14px;font-weight:800;text-align:center;line-height:34px;">LP</div>
                    </td>
                    <td valign="middle">
                      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${BRAND.name}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:36px 36px 8px;">
                <div style="font-size:40px;line-height:1;margin-bottom:16px;">${icon}</div>
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:${BRAND.ink};font-weight:700;">
                  ${safeTitle}
                </h1>
                ${safeBody ? `<p style="margin:16px 0 0;color:${BRAND.body};font-size:15px;line-height:1.6;">${safeBody}</p>` : ""}
              </td>
            </tr>
            ${link ? `
            <tr>
              <td align="center" style="padding:24px 36px 6px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:10px;background:${BRAND.accent};">
                      <a href="${escapeHtml(link)}"
                         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                        View details
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:28px 36px 0;">
                <div style="border-top:1px solid ${BRAND.border};height:1px;line-height:1px;font-size:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 36px 32px;">
                <p style="margin:0 0 4px;color:${BRAND.body};font-size:13px;font-weight:600;">
                  ${BRAND.name} &mdash; Lead management for real estate teams
                </p>
                <p style="margin:0 0 10px;color:${BRAND.muted};font-size:12px;">
                  &copy; ${year} ${BRAND.name} Realty. All rights reserved.
                </p>
                <p style="margin:0;color:${BRAND.muted};font-size:11px;">
                  You received this email because your notification preferences are set to receive ${escapeHtml(notificationType.toLowerCase().replace(/_/g, " "))} alerts.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, text, html };
}

module.exports = { notificationEmail };
