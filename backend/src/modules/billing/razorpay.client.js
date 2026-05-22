// Lazy Razorpay client. Returns null when keys are missing so the billing
// endpoints can respond with a clean 503 instead of crashing.
// Plan IDs are read from env at call time — we don't hardcode them because
// they're created once in the Razorpay dashboard per environment.

const Razorpay = require("razorpay");
const crypto = require("crypto");
const { env } = require("../../lib/env");

let _client = null;

function getRazorpay() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  if (_client) return _client;
  _client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return _client;
}

function getPublicKey() {
  return env.RAZORPAY_KEY_ID || null;
}

// (plan, billingCycle) → env var → Razorpay plan_xxx ID. Returns null if
// the env entry is unset so the caller can throw a useful 503.
function planIdFor(plan, billingCycle) {
  const key = `RAZORPAY_PLAN_${plan}_${billingCycle.toUpperCase()}`;
  return env[key] || null;
}

// Razorpay signs webhooks with HMAC-SHA256(secret, raw-body). We expose
// raw-body to the route via the existing RAW_BODY_PREFIXES in app.js so
// we can recompute the digest and timing-safe compare.
function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = {
  getRazorpay,
  getPublicKey,
  planIdFor,
  verifyWebhookSignature,
};
