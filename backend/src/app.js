const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const { logger } = require("./lib/logger");
const { env } = require("./lib/env");
const { errorHandler } = require("./middleware/errorMiddleware");
const routes = require("./routes");

const app = express();

// Allow comma-separated FRONTEND_URL so Vite fallbacks (5174, 5175 when 5173
// is taken) and dev tunnels don't trip CORS.
const allowedOrigins = env.FRONTEND_URL
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
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
app.use((req, res, next) => {
  if (BETTER_AUTH_RAW_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  express.json()(req, res, next);
});

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

app.use(errorHandler);

module.exports = app;
