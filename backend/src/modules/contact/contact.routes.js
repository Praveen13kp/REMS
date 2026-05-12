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
