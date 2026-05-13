class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = details?.code || statusCode;
    this.details = details?.details || details;
    this.name = "ApiError";
  }
}

module.exports = { ApiError };
