function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Used by trialReminder.service for the last 3 days of the Basic trial.
// Tone shifts more urgent each day: D-3 = informational, D-1 = "ends
// tomorrow". upgradeUrl is the canonical billing page link.
function trialReminderEmail({ ownerName, companyName, daysLeft, upgradeUrl }) {
  const safeName = escapeHtml(ownerName || "there");
  const safeCompany = escapeHtml(companyName || "your team");
  const safeUrl = escapeHtml(upgradeUrl);
  const urgent = daysLeft <= 1;

  const subject =
    daysLeft === 1
      ? `Your LeadPro trial ends tomorrow`
      : `${daysLeft} days left in your LeadPro trial`;

  const headline =
    daysLeft === 1
      ? "Your trial ends tomorrow"
      : `${daysLeft} days left in your free trial`;

  const body =
    daysLeft === 1
      ? "Your 7-day Basic trial ends in 24 hours. Upgrade to Pro now to keep integrations, lead aging, and your full team of agents working without interruption."
      : daysLeft === 2
        ? `Your 7-day Basic trial ends in 2 days. Once it expires you'll lose access to integrations, custom pipeline stages, and the ability to invite new users. Upgrade now to avoid any downtime.`
        : `You're on the Basic 7-day trial — ${daysLeft} days remaining. You can upgrade to Pro any time before then to lock in unlimited integrations, larger user caps, and priority email support.`;

  const text = [
    `Hi ${ownerName || "there"},`,
    ``,
    body,
    ``,
    `Upgrade ${safeCompany}: ${upgradeUrl}`,
    ``,
    `If you've already upgraded, ignore this email.`,
    ``,
    `— LeadPro`,
  ].join("\n");

  const ctaColor = urgent ? "#dc2626" : "#8b5cf6";

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1f2937;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:24px 24px 8px;">
          <div style="font-size:12px;color:${ctaColor};font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px;">
            ${urgent ? "Trial ending soon" : "Trial reminder"}
          </div>
          <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${escapeHtml(headline)}</h2>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.55;">
            Hi ${safeName},
          </p>
          <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.55;">
            ${escapeHtml(body)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;">
          <a href="${safeUrl}"
             style="display:inline-block;background:${ctaColor};color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;font-size:14px;">
            Upgrade ${safeCompany} to Pro
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 8px;">
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
            Or paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#334155;">${safeUrl}</span>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 0;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#64748b;font-size:12px;">
            <strong style="color:#1f2937;">What happens when the trial ends?</strong><br/>
            You'll stay on the Basic plan but new leads, projects, invites, and integrations will be blocked until you upgrade. Existing data is never deleted.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 24px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            If you've already upgraded, ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, text, html };
}

module.exports = { trialReminderEmail };
