const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const {
  validateInvite,
  validateInviteBroker,
  validateAcceptInvite,
  validateUpdateUser,
  validateUpdateMe,
  validateChangePassword,
} = require("./user.validation");
const {
  createInvite,
  createBrokerInvite,
  resendInvite: resendInviteService,
  deleteInvite: deleteInviteService,
  getInviteByToken,
  acceptInvite: acceptInviteService,
  getUsers,
  getUserById,
  updateUser: updateUserService,
  toggleUserActive,
  softDeleteUser,
  getCurrentUser,
  updateOwnProfile,
  getUserWorkload,
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

    // Managers can only invite agents — they shouldn't be able to create
    // peers (other managers) or elevate to admin/owner.
    if (req.user.role === "MANAGER" && validation.data.role !== "AGENT") {
      throw new ApiError(403, "Managers can only invite agents");
    }

    const { invite, inviteLink, emailSent } = await createInvite(
      companyId,
      req.user.id,
      req.body,
    );

    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        inviteLink,
        emailSent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function inviteBroker(req, res, next) {
  try {
    const validation = validateInviteBroker(req.body);
    if (!validation.success) {
      throw new ApiError(
        400,
        (validation.error.issues?.[0] ?? validation.error.errors?.[0])?.message ?? "Invalid input",
      );
    }
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }
    const { invite, inviteLink, emailSent } = await createBrokerInvite(
      companyId,
      req.user.id,
      req.body,
    );
    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        inviteLink,
        emailSent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function resendInvite(req, res, next) {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }
    const { invite, inviteLink, emailSent } = await resendInviteService(
      companyId,
      req.user.id,
      req.params.id,
    );
    res.json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        inviteLink,
        emailSent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteInvite(req, res, next) {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }
    const result = await deleteInviteService(companyId, req.user.id, req.params.id);
    res.json({ success: true, data: result });
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

    const { user, company } = await acceptInviteService(token, req.body);

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

    const user = await updateUserService(id, companyId, validation.data, req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function toggleActive(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    const user = await toggleUserActive(id, companyId, req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }

    await softDeleteUser(id, companyId, req.user.id);

    res.json({
      success: true,
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

    const user = await updateOwnProfile(req.user.id, validation.data);

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

    await changeUserPassword(req.user.id, req.body.currentPassword, req.body.newPassword);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}

async function workload(req, res, next) {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new ApiError(400, "User is not associated with a company");
    }
    const result = await getUserWorkload(companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getModuleOverrides(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true, moduleOverrides: true },
    });
    if (!user || user.companyId !== req.user.companyId) {
      throw new ApiError(404, "User not found");
    }
    res.json({ success: true, data: user.moduleOverrides || {} });
  } catch (err) {
    next(err);
  }
}

async function updateModuleOverrides(req, res, next) {
  try {
    const { id } = req.params;
    const { overrides } = req.body;
    if (typeof overrides !== "object" || overrides === null) {
      throw new ApiError(400, "overrides must be an object");
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });
    if (!user || user.companyId !== req.user.companyId) {
      throw new ApiError(404, "User not found");
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { moduleOverrides: overrides },
      select: { id: true, name: true, email: true, role: true, moduleOverrides: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  invite,
  inviteBroker,
  resendInvite,
  deleteInvite,
  getInvite,
  acceptInvite,
  getAllUsers,
  getUser,
  updateUser,
  toggleActive,
  deleteUser,
  getMe,
  updateMe,
  workload,
  changePassword,
  getModuleOverrides,
  updateModuleOverrides,
};