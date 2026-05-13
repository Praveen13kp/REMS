const express = require("express");
const rateLimit = require("express-rate-limit");
const { submit } = require("./contact.controller");

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 429, message: "Too many requests. Please try again in a minute." },
  },
});

const router = express.Router();

router.post("/contact", contactLimiter, submit);

module.exports = router;

const { submitContactForm } = require("./contact.controller");

const router = express.Router();

const contactRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { ok: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/contact", contactRateLimiter, submitContactForm);

module.exports = router;
