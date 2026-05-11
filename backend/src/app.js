const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const routes = require("./routes");

const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(helmet());

app.use(morgan("dev"));

app.use(cookieParser());

const pinoHttp = require("pino-http");
const { logger } = require("./lib/logger");
const { env } = require("./lib/env");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    return next();
  }
  express.json()(req, res, next);
});

const routes = require("./routes");
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

app.use(errorMiddleware);

module.exports = app;
app.use(errorHandler);

module.exports = app;
