const express = require("express");
const rateLimit = require("express-rate-limit");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  receiveWebhook,
  getConfig,
  patchSource,
  postRegenerate,
} = require("./leadIntake.controller");

// Per-IP cap — protects against a single noisy source flooding us.
const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown",
  message: { ok: false, error: { code: 429, message: "Too many requests" } },
});

// Per-token cap — protects a single tenant's pipeline from a runaway ad.
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.params.source}:${req.params.token}`,
  message: { ok: false, error: { code: 429, message: "Per-token rate limit reached" } },
});

const router = express.Router();

// PUBLIC webhook — no auth, no tenantMiddleware. Tenant is derived from the
// (source, token) pair inside the controller. Order matters: rate limit
// before resolving the token.
router.post("/:source/:token", ipLimiter, tokenLimiter, receiveWebhook);

// AUTH'd routes — OWNER-only. Settings panel reads/writes these.
router.use(authMiddleware);
router.get("/config", requireRole("OWNER", "ADMIN"), getConfig);
router.patch("/:source", requireRole("OWNER"), patchSource);
router.post("/regenerate", requireRole("OWNER"), postRegenerate);

module.exports = router;
