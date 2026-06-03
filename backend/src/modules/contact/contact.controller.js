const { ApiError } = require("../../lib/ApiError");
const { validateSubmit } = require("./contact.validation");
const { createSubmission } = require("./contact.service");
const { verifyEmailExists } = require("../../lib/emailVerification");
const { logger } = require("../../lib/logger");

async function submit(req, res, next) {
  try {
    const validation = validateSubmit(req.body);

    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0] || validation.error.errors?.[0];
      throw new ApiError(400, firstIssue?.message || "Invalid input");
    }

    const emailCheck = await verifyEmailExists(validation.data.email);
    if (!emailCheck.valid) {
      throw new ApiError(400, "Please provide a valid email address that exists in the real world");
    }

    const ip = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null;
    const userAgent = req.headers["user-agent"] || null;

    await createSubmission({ ...validation.data, ip, userAgent });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit };
