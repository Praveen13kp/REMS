/* eslint-disable no-console */
require("dotenv").config();
const prisma = require("../src/config/prisma");

const SUBJECT = "{{company.name}} – Exciting opportunities waiting for you!";
const TEMPLATE_NAME = "Premium Property Outreach";
const CATEGORY = "Outreach";

const BODY = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1d2671 0%,#c33764 100%);padding:36px 20px 28px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding-bottom:6px">
          <span style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.3px">{{company.name}}</span>
        </td></tr>
        <tr><td align="center">
          <span style="color:rgba(255,255,255,0.8);font-size:14px">Premium Real Estate Services</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff">
    <tr><td align="center" style="padding:36px 24px 8px">
      <table width="520" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:28px;font-weight:700;color:#1a1c2b;padding-bottom:10px">
          Hello {{lead.name}}!
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.7;color:#4a4d63;padding-bottom:6px">
          Thank you for reaching out to <strong>{{company.name}}</strong>. We specialise in helping you find the perfect property — whether it's your dream home or a smart investment.
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.7;color:#4a4d63;padding-bottom:24px">
          Our team is here to guide you through every step with transparency and expertise.
        </td></tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa">
    <tr><td align="center" style="padding:32px 20px">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="font-size:12px;font-weight:600;color:#1d2671;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:4px">Why Choose Us</td></tr>
        <tr><td align="center" style="font-size:24px;font-weight:700;color:#1a1c2b;padding-bottom:24px">Premium <span style="color:#c33764">Experience</span></td></tr>
      </table>
      <table width="560" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="padding:6px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;border:1px solid #e8eaf0">
              <tr><td style="padding:20px 16px;text-align:center">
                <span style="font-size:26px">🏠</span>
                <div style="font-size:14px;font-weight:700;color:#1a1c2b;padding-top:8px;padding-bottom:4px">Curated Properties</div>
                <div style="font-size:12px;line-height:1.5;color:#7c809a">Hand-picked listings tailored to your needs and budget</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:6px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;border:1px solid #e8eaf0">
              <tr><td style="padding:20px 16px;text-align:center">
                <span style="font-size:26px">🤝</span>
                <div style="font-size:14px;font-weight:700;color:#1a1c2b;padding-top:8px;padding-bottom:4px">Expert Guidance</div>
                <div style="font-size:12px;line-height:1.5;color:#7c809a">Dedicated agents with deep local market knowledge</div>
              </td></tr>
            </table>
          </td>
          <td width="33%" style="padding:6px;vertical-align:top">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;border:1px solid #e8eaf0">
              <tr><td style="padding:20px 16px;text-align:center">
                <span style="font-size:26px">🔒</span>
                <div style="font-size:14px;font-weight:700;color:#1a1c2b;padding-top:8px;padding-bottom:4px">Hassle-Free Process</div>
                <div style="font-size:12px;line-height:1.5;color:#7c809a">From site visits to paperwork — we handle it all</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1d2671 0%,#c33764 100%)">
    <tr><td align="center" style="padding:36px 20px">
      <table width="520" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="font-size:14px;color:rgba(255,255,255,0.85);padding-bottom:6px">Ready to take the next step?</td></tr>
        <tr><td align="center" style="font-size:20px;font-weight:700;color:#fff;padding-bottom:18px">Let's find your perfect property</td></tr>
        <tr><td align="center">
          <table cellpadding="0" cellspacing="0" style="border-radius:8px;background:#fff">
            <tr><td style="padding:11px 28px;font-size:14px;font-weight:700;color:#1d2671">📞 Reply or call us today</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1c2b">
    <tr><td align="center" style="padding:24px 20px">
      <table width="520" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="font-size:16px;font-weight:700;color:#fff;padding-bottom:4px">{{company.name}}</td></tr>
        <tr><td align="center" style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;padding-bottom:12px">{{company.email}} · {{company.phone}}</td></tr>
        <tr><td align="center" style="font-size:10px;color:rgba(255,255,255,0.3);border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">
          You received this because you expressed interest. Reply to opt out.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

async function seed() {
  const targetEmail = process.argv[2] || "owner@demo.com";
  const user = await prisma.user.findFirst({
    where: { email: targetEmail },
    include: { company: true },
  });
  if (!user || !user.company) {
    console.log(`User "${targetEmail}" not found or has no company.`);
    console.log("Usage: node backend/scripts/seed-email-template.js [user-email]");
    process.exit(1);
  }
  const existing = await prisma.emailTemplate.findFirst({
    where: { companyId: user.companyId, name: TEMPLATE_NAME },
  });
  if (existing) {
    console.log(`Template "${TEMPLATE_NAME}" already exists for ${user.company.name}. Skipping.`);
    process.exit(0);
  }
  await prisma.emailTemplate.create({
    data: {
      companyId: user.companyId,
      createdById: user.id,
      name: TEMPLATE_NAME,
      category: CATEGORY,
      subject: SUBJECT,
      body: BODY,
    },
  });
  console.log(`✓ Template "${TEMPLATE_NAME}" created for ${user.company.name} (${user.companyId})`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
