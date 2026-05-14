function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inviteEmail({ companyName, role, inviterName, inviteLink, expiryDays = 7 }) {
  const safeCompany = escapeHtml(companyName || "your team");
  const safeRole = escapeHtml(role || "team member");
  const safeInviter = escapeHtml(inviterName || "Your teammate");

  const subject = `${safeInviter} invited you to join ${safeCompany} on RELMS`;

  const text = [
    `Hi,`,
    ``,
    `${inviterName || "Your teammate"} has invited you to join ${companyName || "their team"} on RELMS as a ${role || "team member"}.`,
    ``,
    `Accept the invite (link valid for ${expiryDays} days):`,
    inviteLink,
    ``,
    `If you weren't expecting this email, you can ignore it.`,
    ``,
    `— RELMS`,
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1f2937;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:24px 24px 8px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">You're invited to ${safeCompany}</h2>
          <p style="margin:0;color:#475569;font-size:14px;">
            ${safeInviter} has invited you to join <strong>${safeCompany}</strong> on RELMS as a <strong>${safeRole}</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;">
          <a href="${inviteLink}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">
            Accept invite
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <p style="margin:0;color:#64748b;font-size:12px;">
            Or paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#334155;">${escapeHtml(inviteLink)}</span>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            This link will expire in ${expiryDays} days. If you weren't expecting this email, you can safely ignore it.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, text, html };
}

module.exports = { inviteEmail };
