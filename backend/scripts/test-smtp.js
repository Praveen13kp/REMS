/* eslint-disable no-console */
require("dotenv").config();
const { sendMail } = require("../src/lib/mail");

const TO = process.argv[2];
if (!TO) {
  console.error("Usage: node scripts/test-smtp.js you@example.com");
  process.exit(1);
}

(async () => {
  console.log(`Sending test email to ${TO} ...`);
  try {
    const result = await sendMail({
      to: TO,
      subject: "RELMS SMTP test",
      text: "If you can read this, your Gmail SMTP setup works.",
      html: "<p>If you can read this, your Gmail SMTP setup works.</p>",
    });
    console.log("Result:", result);
    if (result.delivered) {
      console.log("✅ Sent. Check the inbox (and Spam folder).");
    } else {
      console.log("⚠️  SMTP not configured — logged to console only.");
    }
  } catch (err) {
    console.error("❌ Send failed:", err.message);
    if (err.code) console.error("   code:", err.code);
    if (err.response) console.error("   server said:", err.response);
  }
  process.exit(0);
})();
