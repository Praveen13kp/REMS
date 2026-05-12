const { ApiError } = require("../../lib/ApiError");
const { validateRegister, validateUpdateCompany } = require("./company.validation");
const { registerCompanyAndOwner, getCompany, updateCompany, completeOnboarding } = require("./company.service");

async function register(req, res, next) {
  try {
    const validation = validateRegister(req.body);

    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }

    const { company, user, session } = await registerCompanyAndOwner(req.body);

    res.cookie("better-auth.session_token", session.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

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
      throw new ApiError(400, validation.error.errors[0].message);
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

module.exports = { register, getCompanyMe, updateCompanyMe, completeOnboardingMe };