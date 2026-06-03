function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Humanise the role enum for display: CHANNEL_PARTNER → "Channel Partner".
function humanRole(role) {
  if (!role) return "team member";
  return String(role)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// LeadPro platform brand palette (mirrors the app's --lp-accent /
// --lp-accent-strong / --lp-primary CSS tokens).
const BRAND = {
  name: "LeadPro",
  accent: "#7C3AED", // accent-strong — used for the button + links (good white contrast)
  accentLight: "#8B5CF6", // top hairline
  header: "#18181B", // near-black header band
  ink: "#0F172A",
  body: "#475569",
  muted: "#94A3B8",
  border: "#E2E8F0",
  bg: "#F1F5F9",
};

// "Getting started" feature cards shown under the CTA. Static product copy.
const FEATURES = [
  {
    title: "Capture leads",
    desc: "From your website, ads, and integrations — all in one inbox.",
  },
  {
    title: "Work the pipeline",
    desc: "Track follow-ups, log notes, move leads through stages.",
  },
  {
    title: "Collaborate",
    desc: "Assign, share leads, and stay aligned with your team in real time.",
  },
];

function inviteEmail({ companyName, role, inviterName, inviteLink, expiryDays = 7 }) {
  const safeCompany = escapeHtml(companyName || "your team");
  const safeRole = escapeHtml(humanRole(role));
  const safeInviter = escapeHtml(inviterName || "Your teammate");
  const safeLink = escapeHtml(inviteLink);
  const year = new Date().getFullYear();

  // Footer links point back at the app the invite came from (origin parsed
  // from the invite link). Falls back to "#" if the link can't be parsed.
  let origin = "";
  try {
    origin = new URL(inviteLink).origin;
  } catch {
    origin = "";
  }
  const link = (path) => escapeHtml(origin ? `${origin}${path}` : "#");

  const subject = `${safeInviter} invited you to join ${safeCompany} on ${BRAND.name}`;

  const text = [
    `You're invited to ${companyName || "the team"}`,
    ``,
    `${inviterName || "Your teammate"} has added you to ${companyName || "the team"}'s workspace on ${BRAND.name} as a ${humanRole(role)}.`,
    `Accept the invitation to set your password and start working with the team.`,
    ``,
    `Accept the invitation (link valid for ${expiryDays} days):`,
    inviteLink,
    ``,
    `Not expecting this email? You can safely ignore it.`,
    ``,
    `— ${BRAND.name}, Lead management for real estate teams`,
  ].join("\n");

  const featureCards = FEATURES.map(
    (f) => `
                    <td valign="top" width="33%" style="padding:0 6px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:10px;">
                        <tr>
                          <td style="padding:14px 14px 16px;">
                            <div style="font-size:13px;font-weight:700;color:${BRAND.ink};margin-bottom:6px;">${f.title}</div>
                            <div style="font-size:12px;line-height:1.5;color:${BRAND.muted};">${f.desc}</div>
                          </td>
                        </tr>
                      </table>
                    </td>`,
  ).join("");

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light only" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <!-- Preheader -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${safeInviter} has added you to ${safeCompany} on ${BRAND.name} as a ${safeRole}. The link is valid for ${expiryDays} days.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <!-- Purple hairline -->
            <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.accentLight};">&nbsp;</td></tr>
            <!-- Dark brand header -->
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
            <!-- Hero -->
            <tr>
              <td align="center" style="padding:36px 36px 8px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${BRAND.ink};font-weight:700;">
                  You're invited to ${safeCompany}
                </h1>
                <p style="margin:0;color:${BRAND.body};font-size:15px;line-height:1.6;max-width:420px;">
                  <strong style="color:${BRAND.ink};">${safeInviter}</strong> has added you to
                  <strong style="color:${BRAND.ink};">${safeCompany}</strong>'s workspace as a
                  <strong style="color:${BRAND.ink};">${safeRole}</strong>. Accept the invitation to set
                  your password and start working with the team.
                </p>
              </td>
            </tr>
            <!-- CTA -->
            <tr>
              <td align="center" style="padding:28px 36px 6px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:10px;background:${BRAND.accent};">
                      <a href="${safeLink}"
                         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 36px 4px;">
                <p style="margin:0;color:${BRAND.muted};font-size:13px;">
                  This invitation expires in <strong style="color:${BRAND.body};">${expiryDays} days</strong>.
                </p>
              </td>
            </tr>
            <!-- Getting started -->
            <tr>
              <td style="padding:28px 30px 4px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:${BRAND.muted};text-transform:uppercase;padding:0 6px 12px;">
                  Getting started
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>${featureCards}</tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
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
                <p style="margin:0 0 12px;font-size:12px;">
                  <a href="${link("/privacy")}" style="color:${BRAND.accent};text-decoration:none;font-weight:600;">Privacy</a>
                  <span style="color:${BRAND.border};">&nbsp;&middot;&nbsp;</span>
                  <a href="${link("/terms")}" style="color:${BRAND.accent};text-decoration:none;font-weight:600;">Terms</a>
                  <span style="color:${BRAND.border};">&nbsp;&middot;&nbsp;</span>
                  <a href="${link("/contact")}" style="color:${BRAND.accent};text-decoration:none;font-weight:600;">Support</a>
                </p>
                <p style="margin:0;color:${BRAND.muted};font-size:11px;">
                  Not expecting this email? You can safely ignore it.
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

module.exports = { inviteEmail };
