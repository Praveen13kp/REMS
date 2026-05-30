const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const { logger } = require("./lib/logger");
const { env, normalizeFrontendOrigins } = require("./lib/env");
const { errorHandler } = require("./middleware/errorMiddleware");
const routes = require("./routes");

const app = express();

// Allow comma-separated FRONTEND_URL so Vite fallbacks (5174, 5175 when 5173
// is taken) and dev tunnels don't trip CORS.
const allowedOrigins = normalizeFrontendOrigins(env.FRONTEND_URL);

// Public ingestion endpoints — Website Form webhooks, ad-creative pages,
// JustDial push, etc. — are POSTed from arbitrary customer-controlled
// domains. They must accept ANY origin or the integration is unusable.
// Cookies/credentials are NOT used on these routes (token in URL acts as
// auth), so an open CORS policy here doesn't widen the attack surface.
const PUBLIC_CORS_PREFIXES = ["/api/webhooks/", "/api/public/landing/"];
// `/api/intake/*` is mixed: the legacy webhook POST `/api/intake/:source/:token`
// is public, but `/config`, `/regenerate`, and `PATCH /:source` are
// authed admin endpoints called from Settings with cookies. Treat ONLY
// the webhook shape as public so the admin paths get credentialed CORS.
const isPublicIntakeWebhook = (req) =>
  req.method === "POST" && /^\/api\/intake\/[^/]+\/[^/]+\/?$/.test(req.path);
app.use((req, res, next) => {
  if (
    PUBLIC_CORS_PREFIXES.some((p) => req.path.startsWith(p)) ||
    isPublicIntakeWebhook(req)
  ) {
    return cors({ origin: true, credentials: false })(req, res, next);
  }
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (env.NODE_ENV === "development" && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })(req, res, next);
});
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(cookieParser());

// better-auth needs the raw body on its own /api/auth/* routes, but our
// custom Express handlers (/api/auth/sign-in, /api/auth/superadmin/login)
// are JSON and need express.json(). Skip JSON parsing only for the routes
// better-auth owns.
const BETTER_AUTH_RAW_PREFIXES = [
  "/api/auth/sign-up",
  "/api/auth/sign-in/email",
  "/api/auth/sign-in/social",
  "/api/auth/sign-out",
  "/api/auth/get-session",
  "/api/auth/forget-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/callback",
  "/api/auth/oauth",
];
// Intake + integration webhooks verify HMAC over the exact request bytes,
// so we stash the raw body alongside the parsed JSON for those paths.
// /api/intake/* = Sprint 5 shared-secret webhooks (legacy).
// /api/webhooks/* = new BYO multi-provider router.
const RAW_BODY_PREFIXES = ["/api/intake/", "/api/webhooks/", "/api/billing/webhooks/"];
const jsonParser = express.json({
  verify: (req, _res, buf) => {
    if (RAW_BODY_PREFIXES.some((p) => req.path.startsWith(p))) {
      req.rawBody = buf;
    }
  },
});
// JustDial (and other legacy partners) sometimes deliver XML or form-
// encoded POSTs to /api/webhooks/*. Add parsers for those content types so
// drivers can read req.body uniformly while still keeping req.rawBody
// available for any signature verification. Text parser captures XML as a
// string — drivers parse the actual structure themselves (the shape is
// vendor-specific and we don't want a giant XML dep in the hot path).
const urlencodedParser = express.urlencoded({
  extended: true,
  verify: (req, _res, buf) => {
    if (RAW_BODY_PREFIXES.some((p) => req.path.startsWith(p))) req.rawBody = buf;
  },
});
const textParser = express.text({
  type: ["application/xml", "text/xml", "text/plain"],
  limit: "256kb",
  verify: (req, _res, buf) => {
    if (RAW_BODY_PREFIXES.some((p) => req.path.startsWith(p))) req.rawBody = buf;
  },
});
app.use((req, res, next) => {
  if (BETTER_AUTH_RAW_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  // Run all three in sequence. Each is a no-op when the Content-Type
  // doesn't match. Order: JSON first (most common), then form-encoded,
  // then XML/text fallback.
  jsonParser(req, res, (err) => {
    if (err) return next(err);
    urlencodedParser(req, res, (err2) => {
      if (err2) return next(err2);
      textParser(req, res, next);
    });
  });
});

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

app.use(errorHandler);

module.exports = app;
