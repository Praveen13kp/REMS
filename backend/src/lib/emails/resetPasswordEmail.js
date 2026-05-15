function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resetPasswordEmail({ name, resetLink, expiryMinutes = 30 }) {
  const safeName = escapeHtml(name || "there");
  const subject = "Reset your RELMS password";

  const text = [
    `Hi ${name || "there"},`,
    ``,
    `Someone (hopefully you) requested a password reset for your RELMS account.`,
    ``,
    `Reset your password (link valid for ${expiryMinutes} minutes):`,
    resetLink,
    ``,
    `If you didn't request this, you can safely ignore this email — your password won't change.`,
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
          <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Reset your password</h2>
          <p style="margin:0;color:#475569;font-size:14px;">
            Hi ${safeName}, click the button below to set a new password for your RELMS account.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;">
          <a href="${resetLink}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">
            Reset password
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <p style="margin:0;color:#64748b;font-size:12px;">
            Or paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#334155;">${escapeHtml(resetLink)}</span>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            This link expires in ${expiryMinutes} minutes. If you didn't request a reset, you can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, text, html };
}

module.exports = { resetPasswordEmail };
