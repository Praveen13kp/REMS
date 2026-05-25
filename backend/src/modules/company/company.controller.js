const { ApiError } = require("../../lib/ApiError");
const { validateRegister, validateUpdateCompany, validateSmtpConfig, validateSmtpTest } = require("./company.validation");
const {
  registerCompanyAndOwner,
  getCompany,
  updateCompany,
  completeOnboarding,
  getCompanySmtpConfig,
  updateCompanySmtpConfig,
  sendCompanySmtpTestEmail,
} = require("./company.service");

async function register(req, res, next) {
  try {
    const validation = validateRegister(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const { company, user, setCookie } = await registerCompanyAndOwner(req.body);

    if (setCookie) {
      res.setHeader("Set-Cookie", setCookie);
    }

    res.status(201).json({
      success: true,
      data: { company, user },
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyMe(req, res, next) {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const company = await getCompany(companyId);

    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

async function updateCompanyMe(req, res, next) {
  try {
    const validation = validateUpdateCompany(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const company = await updateCompany(companyId, req.body);

    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

async function completeOnboardingMe(req, res, next) {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const company = await completeOnboarding(companyId);

    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

async function getSmtpMe(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "User is not associated with a company");
    const data = await getCompanySmtpConfig(req.user.companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateSmtpMe(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "User is not associated with a company");
    const validation = validateSmtpConfig(req.body);
    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid SMTP config");
    }
    const data = await updateCompanySmtpConfig(req.user.companyId, validation.data);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function testSmtpMe(req, res, next) {
  try {
    if (!req.user.companyId) throw new ApiError(400, "User is not associated with a company");
    const validation = validateSmtpTest(req.body);
    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid test request");
    }
    const recipient = validation.data.recipientEmail || req.user.email;
    const result = await sendCompanySmtpTestEmail(req.user.companyId, validation.data, recipient);
    res.json({ success: true, data: { ...result, recipient } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  getCompanyMe,
  updateCompanyMe,
  completeOnboardingMe,
  getSmtpMe,
  updateSmtpMe,
  testSmtpMe,
};