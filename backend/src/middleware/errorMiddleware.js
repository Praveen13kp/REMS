const multer = require("multer");
const { logger } = require("../lib/logger");
const { ApiError } = require("../lib/ApiError");

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        ok: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "Uploaded file exceeds the size limit",
        },
      });
    }
    return res.status(400).json({
      ok: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof ApiError) {
    logger.warn({ err, path: req.path }, "ApiError");
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // body-parser (and other http-errors-style throwers) attach statusCode +
  // expose. Without this branch a malformed JSON body falls through to 500
  // instead of the 400 the parser intended.
  const httpStatus = err.statusCode || err.status;
  if (typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500) {
    logger.warn({ err, path: req.path }, "Client error");
    return res.status(httpStatus).json({
      ok: false,
      error: {
        code: err.code || httpStatus,
        message: err.expose ? err.message : "Bad request",
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
