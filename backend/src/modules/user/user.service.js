const crypto = require("crypto");
const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { env } = require("../../lib/env");
const { sendMail } = require("../../lib/mail");
const { inviteEmail } = require("../../lib/emails/inviteEmail");
const { logger } = require("../../lib/logger");

const INVITE_EXPIRY_DAYS = 7;

// FRONTEND_URL can be a comma-separated list of allowed origins (for CORS).
// For outbound links we want the canonical / primary one — the first entry.
const FRONTEND_BASE_URL = env.FRONTEND_URL.split(",")[0].trim();

async function createInvite(companyId, invitedById, data) {
  const { email, role, name } = data;

  if (role === "OWNER") {
    throw new ApiError(400, "Cannot invite users with OWNER role. Promote manually after acceptance.");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: invitedById },
  });

  if (currentUser.email.toLowerCase() === email.toLowerCase()) {
    throw new ApiError(400, "Cannot invite yourself");
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { mode: "insensitive", equals: email }, companyId },
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists in this company");
  }

  const existingInvite = await prisma.invite.findFirst({
    where: {
      email: { mode: "insensitive", equals: email },
      companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new ApiError(409, "A pending invite already exists for this email");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.invite.create({
    data: {
      email: email.toLowerCase(),
      role,
      companyId,
      invitedById,
      token,
      expiresAt,
    },
    include: { company: true },
  });

  const inviteLink = `${FRONTEND_BASE_URL}/accept-invite?token=${token}`;

  const mail = inviteEmail({
    companyName: invite.company?.name,
    role,
    inviterName: currentUser?.name,
    inviteLink,
    expiryDays: INVITE_EXPIRY_DAYS,
  });

  let emailSent = false;
  try {
    const result = await sendMail({
      to: invite.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    emailSent = result?.delivered === true;
  } catch (err) {
    logger.error({ err, email: invite.email }, "Failed to send invite email");
  }

  return { invite, inviteLink, emailSent };
}

async function resendInvite(companyId, invitedById, inviteId) {
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, companyId },
    include: { company: true },
  });
  if (!invite) throw new ApiError(404, "Invite not found");
  if (invite.acceptedAt) {
    throw new ApiError(400, "Invite has already been accepted");
  }

  // Refresh expiry so the link remains valid for another full window.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  const refreshed = await prisma.invite.update({
    where: { id: invite.id },
    data: { expiresAt },
    include: { company: true },
  });

  const inviter = await prisma.user.findUnique({ where: { id: invitedById } });
  const inviteLink = `${FRONTEND_BASE_URL}/accept-invite?token=${refreshed.token}`;

  const mail = inviteEmail({
    companyName: refreshed.company?.name,
    role: refreshed.role,
    inviterName: inviter?.name,
    inviteLink,
    expiryDays: INVITE_EXPIRY_DAYS,
  });

  let emailSent = false;
  try {
    const result = await sendMail({
      to: refreshed.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    emailSent = result?.delivered === true;
  } catch (err) {
    logger.error({ err, email: refreshed.email }, "Failed to resend invite email");
  }

  return { invite: refreshed, inviteLink, emailSent };
}

async function getInviteByToken(token) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { company: true },
  });

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  if (invite.acceptedAt) {
    throw new ApiError(410, "Invite has already been accepted");
  }

  if (invite.expiresAt < new Date()) {
    throw new ApiError(410, "Invite has expired");
  }

  return {
    email: invite.email,
    role: invite.role,
    companyName: invite.company.name,
  };
}

async function acceptInvite(token, data) {
  const { name, password } = data;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { company: true },
  });

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  if (invite.acceptedAt) {
    throw new ApiError(410, "Invite has already been accepted");
  }

  if (invite.expiresAt < new Date()) {
    throw new ApiError(410, "Invite has expired");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists. Please login.");
  }

  const { auth } = await initAuth();

  // 1. Create the auth user via better-auth's sign-up flow (matches the
  //    working seed script). additionalFields with input:false on the
  //    auth config mean we cannot pass role/companyId here — we set them
  //    in a follow-up update.
  await auth.api.signUpEmail({
    body: { email: invite.email, password, name },
  });

  // 2. Stamp the role / company / inviter on the freshly-created user.
  const updatedUser = await prisma.user.update({
    where: { email: invite.email },
    data: {
      role: invite.role,
      companyId: invite.companyId,
      isActive: true,
      invitedById: invite.invitedById,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
    },
  });

  // 3. Mark invite consumed.
  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  // No server-side session — the frontend signs in immediately after
  // with the password it already has, which sets the cookie via the
  // normal /api/auth/sign-in/email path.
  return { user: updatedUser, company: invite.company };
}

async function getUsers(companyId, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [users, pendingInvites, total] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        dept: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invite.findMany({
      where: {
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
    }),
    prisma.user.count({ where: { companyId } }),
  ]);

  const usersWithStatus = users.map((user) => ({
    ...user,
    status: "ACTIVE",
  }));

  const pendingInvitesWithStatus = pendingInvites.map((invite) => ({
    id: invite.id,
    name: null,
    email: invite.email,
    role: invite.role,
    isActive: null,
    createdAt: invite.createdAt,
    updatedAt: null,
    status: "PENDING",
    expiresAt: invite.expiresAt,
  }));

  return {
    users: [...usersWithStatus, ...pendingInvitesWithStatus],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getUserById(userId, companyId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      image: true,
      dept: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

async function updateUser(userId, companyId, data, requestingUserId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (userId === requestingUserId) {
    throw new ApiError(400, "Cannot change your own role or status");
  }

  if (data.role === "OWNER") {
    throw new ApiError(400, "Cannot set role to OWNER via this endpoint");
  }

  if (data.role && data.role !== user.role) {
    if (user.role === "OWNER") {
      const ownersCount = await prisma.user.count({
        where: { companyId, role: "OWNER" },
      });

      if (ownersCount <= 1) {
        throw new ApiError(400, "Cannot demote the last OWNER of the company");
      }
    }
  }

  if (data.isActive === false && user.role === "OWNER") {
    const ownersCount = await prisma.user.count({
      where: { companyId, role: "OWNER" },
    });

    if (ownersCount <= 1) {
      throw new ApiError(400, "Cannot disable the last OWNER of the company");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.role && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.name && { name: data.name }),
      ...(data.dept !== undefined && { dept: data.dept }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      image: true,
      dept: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      image: true,
      dept: true,
      lastLoginAt: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

async function updateOwnProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.dept !== undefined && { dept: data.dept }),
      ...(data.image !== undefined && { image: data.image }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      image: true,
      dept: true,
      lastLoginAt: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

async function getUserWorkload(companyId) {
  const ACTIVE_STATUSES_NOT_IN = ["Booked", "Lost"];

  const users = await prisma.user.findMany({
    where: { companyId, isActive: true, role: { in: ["AGENT", "MANAGER", "ADMIN"] } },
    select: { id: true, name: true, email: true, role: true, dept: true, image: true },
  });

  const counts = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      companyId,
      assignedToId: { in: users.map((u) => u.id) },
      status: { notIn: ACTIVE_STATUSES_NOT_IN },
    },
    _count: { _all: true },
  });

  const countByUser = new Map(counts.map((c) => [c.assignedToId, c._count._all]));

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    dept: u.dept,
    image: u.image,
    activeCount: countByUser.get(u.id) ?? 0,
  }));
}

async function changeUserPassword(userId, currentPassword, newPassword, headers) {
  const { auth, fromNodeHeaders } = await initAuth();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
      },
      headers: fromNodeHeaders(headers),
    });
  } catch (err) {
    if (err?.body?.code === "INVALID_PASSWORD") {
      throw new ApiError(400, "Current password is incorrect");
    }
    throw err;
  }
}

module.exports = {
  createInvite,
  resendInvite,
  getInviteByToken,
  acceptInvite,
  getUsers,
  getUserById,
  updateUser,
  getCurrentUser,
  updateOwnProfile,
  getUserWorkload,
  changeUserPassword,
};