const { ApiError } = require("../../lib/ApiError");
const { validateContactSubmission } = require("./contact.validation");
const { createContactSubmission } = require("./contact.service");

const submitContactForm = async (req, res, next) => {
  try {
    const validation = validateContactSubmission(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }

    await createContactSubmission({
      ...validation.data,
      ip: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitContactForm,
};