const errorMiddleware = (err, req, res, next) => {

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error",
  });

};

module.exports = errorMiddleware;
const { logger } = require("../lib/logger");
const { ApiError } = require("../lib/ApiError");

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    logger.warn({ err, path: req.path }, "ApiError");
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.statusCode,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  return res.status(500).json({
    ok: false,
    error: {
      code: 500,
      message: "Internal server error",
    },
  });
}

module.exports = { errorHandler };
