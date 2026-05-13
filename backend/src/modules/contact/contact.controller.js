const { ApiError } = require("../../lib/ApiError");
const { validateSubmit } = require("./contact.validation");
const { createSubmission } = require("./contact.service");

async function submit(req, res, next) {
  try {
    const validation = validateSubmit(req.body);

    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0] || validation.error.errors?.[0];
      throw new ApiError(400, firstIssue?.message || "Invalid input");
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
