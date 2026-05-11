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

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(cookieParser());

// better-auth needs the raw body on /api/auth/*; everything else gets JSON parsed
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
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
