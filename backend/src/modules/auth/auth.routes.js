const express = require("express");
const rateLimit = require("express-rate-limit");
const { loginSuperadmin, loginTenant, getSession } = require("./auth.controller");

const router = express.Router();

const superadminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 429, message: "Too many attempts. Try again in a minute." },
  },
});

router.post("/superadmin/login", superadminLimiter, loginSuperadmin);
router.post("/sign-in", loginTenant);
router.get("/session", getSession);

module.exports = router;
