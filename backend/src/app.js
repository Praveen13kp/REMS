const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
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

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

app.use(errorMiddleware);

module.exports = app;