const { ApiError } = require("../../lib/ApiError");
const {
  validateInvite,
  validateAcceptInvite,
  validateUpdateUser,
  validateUpdateMe,
  validateChangePassword,
} = require("./user.validation");
const {
  createInvite,
  getInviteByToken,
  acceptInvite: acceptInviteService,
  getUsers,
  getUserById,
  updateUser: updateUserService,
  getCurrentUser,
  updateOwnProfile,
  changeUserPassword,
} = require("./user.service");

async function invite(req, res, next) {
  try {
    const validation = validateInvite(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const { invite, inviteLink } = await createInvite(companyId, req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        inviteLink,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getInvite(req, res, next) {
  try {
    const { token } = req.params;

    const inviteData = await getInviteByToken(token);

    res.json({
      success: true,
      data: inviteData,
    });
  } catch (err) {
    next(err);
  }
}

async function acceptInvite(req, res, next) {
  try {
    const { token } = req.params;

    const validation = validateAcceptInvite(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const { user, session, company } = await acceptInviteService(token, req.body);

    res.cookie("better-auth.session_token", session.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(201).json({
      success: true,
      data: { user, company },
    });
  } catch (err) {
    next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    const result = await getUsers(companyId, page, pageSize);

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const user = await getUserById(id, companyId);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const validation = validateUpdateUser(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const user = await updateUserService(id, companyId, req.body, req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const validation = validateUpdateMe(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    const user = await updateOwnProfile(req.user.id, req.body);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const validation = validateChangePassword(req.body);

    if (!validation.success) {
      throw new ApiError(400, (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input");
    }

    await changeUserPassword(req.user.id, req.body.currentPassword, req.body.newPassword, req.headers);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  invite,
  getInvite,
  acceptInvite,
  getAllUsers,
  getUser,
  updateUser,
  getMe,
  updateMe,
  changePassword,
};