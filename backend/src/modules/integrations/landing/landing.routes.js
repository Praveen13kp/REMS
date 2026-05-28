const express = require("express");
const rateLimit = require("express-rate-limit");
const { renderLanding, submitLanding } = require("./landing.controller");

// Per-IP limiter on the submit path. The render path is cheap HTML — let
// it through without throttling so legit visitors don't hit a 429 on a
// noisy office network.
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown",
  message: { ok: false, error: { code: 429, message: "Too many submissions — please wait a minute and try again." } },
});

const router = express.Router();

// PUBLIC — no auth, no tenant middleware. Tenant is resolved from the
// publicSlug in the path. Slug is encrypted at rest and only handed to
// the integration's owner, so it doubles as a capability token.
router.get("/:slug", renderLanding);
router.post("/:slug/submit", submitLimiter, submitLanding);

module.exports = router;
