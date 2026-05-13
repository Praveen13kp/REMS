const crypto = require("crypto");
const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { getTenantPrisma } = require("../../lib/tenantPrisma");

const INVITE_EXPIRY_DAYS = 7;

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

  const inviteLink = `http://localhost:5173/accept-invite?token=${token}`;

  return { invite, inviteLink };
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

  const { user: authUser } = await auth.user.create({
    email: invite.email,
    password: password,
    name: name,
    data: {
      role: invite.role,
      isActive: true,
      companyId: invite.companyId,
      invitedById: invite.invitedById,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  const session = await auth.api.signInWithEmail({
    email: invite.email,
    password: password,
  });

  return { user: authUser, session, company: invite.company };
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