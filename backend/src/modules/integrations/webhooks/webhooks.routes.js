const express = require("express");
const rateLimit = require("express-rate-limit");
const { handleHandshake, handleWebhook } = require("./webhooks.controller");

// Per-IP cap — protects against a single noisy source flooding us.
const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown",
  message: { ok: false, error: { code: 429, message: "Too many requests" } },
});

// Per-token cap — protects a single tenant from a runaway external source.
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.params.slug}:${req.params.token}`,
  message: { ok: false, error: { code: 429, message: "Per-token rate limit reached" } },
});

const router = express.Router();

// PUBLIC — no auth, no tenant middleware. Tenant is derived from the path
// token in the controller. Order matters: rate limit before resolution.
router.get("/:slug/byo/:token", ipLimiter, tokenLimiter, handleHandshake);
router.post("/:slug/byo/:token", ipLimiter, tokenLimiter, handleWebhook);

module.exports = router;
