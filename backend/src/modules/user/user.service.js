const crypto = require("crypto");
const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { env } = require("../../lib/env");
const { sendMail } = require("../../lib/mail");
const { inviteEmail } = require("../../lib/emails/inviteEmail");
const { logger } = require("../../lib/logger");
const { logActivity } = require("../activity/activity.service");
const { assertWithinLimit } = require("../../lib/planGate");

const INVITE_EXPIRY_DAYS = 7;

// FRONTEND_URL can be a comma-separated list of allowed origins (for CORS).
// For outbound links we want the canonical / primary one — the first entry.
const FRONTEND_BASE_URL = env.FRONTEND_URL.split(",")[0].trim();

async function createInvite(companyId, invitedById, data) {
  const { email, role, name } = data;

  if (role === "OWNER") {
    throw new ApiError(400, "Cannot invite users with OWNER role. Promote manually after acceptance.");
  }

  // Plan cap: count of active users + pending invites must stay under the
  // tenant's plan limit. Broker invites are exempt because brokers don't
  // consume a tenant seat (their User row has companyId=null).
  await assertWithinLimit(companyId, "users");

  const currentUser = await prisma.user.findUnique({
    where: { id: invitedById },
  });

  if (currentUser.email.toLowerCase() === email.toLowerCase()) {
    throw new ApiError(400, "Cannot invite yourself");
  }

  // User.email is globally unique — each email may belong to one company only.
  // Reject if the email exists anywhere: same company → "already in your team",
  // different company → asks the invitee to use a separate email here.
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, companyId: true, role: true },
  });

  if (existingUser) {
    if (existingUser.companyId === companyId) {
      throw new ApiError(409, "This user is already in your team");
    }
    throw new ApiError(
      409,
      "This email is already registered to another company on this platform. Ask the user to sign up with a different email for your company.",
    );
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

  // Fire-and-forget: don't block the API response on SMTP. Gmail handshakes
  // can stall for tens of seconds; the inviteLink is the source of truth.
  // companyId routes through tenant SMTP when configured (Settings → Email).
  sendMail({
    to: invite.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    companyId: invite.companyId,
  })
    .then((result) => {
      if (result?.delivered) {
        logger.info({ email: invite.email, mode: result.mode }, "Invite email delivered");
      }
    })
    .catch((err) => {
      logger.error({ err, email: invite.email }, "Failed to send invite email");
    });

  // Audit trail: surface invites in the company Audit Log so OWNER/ADMIN
  // can see who invited whom and when.
  await logActivityForUser(companyId, invitedById, "USER_INVITED", {
    userId: invite.id,
    email: invite.email,
    role,
  });

  return { invite, inviteLink, emailSent: true };
}

async function createBrokerInvite(companyId, invitedById, data) {
  const { email, name } = data;
  const lower = email.toLowerCase();

  const inviter = await prisma.user.findUnique({ where: { id: invitedById } });
  if (inviter.email.toLowerCase() === lower) {
    throw new ApiError(400, "Cannot invite yourself");
  }

  // Broker is *not* a normal tenant user: their User row has companyId=null
  // and they're linked to brokerages via BrokerCompany rows. Email is now
  // globally unique, so the row either doesn't exist yet (create on accept)
  // or already exists as a BROKER (reuse). If it exists with a non-broker
  // role, reject — the email is bound to that company's tenant account.
  const existingByEmail = await prisma.user.findUnique({
    where: { email: lower },
    select: { id: true, role: true, companyId: true },
  });

  if (existingByEmail && existingByEmail.role !== "CHANNEL_PARTNER") {
    throw new ApiError(
      409,
      "This email is already registered as a regular user of another company. Ask the broker to use a different email.",
    );
  }

  const existingBroker = existingByEmail; // null or a BROKER row

  if (existingBroker) {
    const link = await prisma.companyChannelPartner.findUnique({
      where: {
        channelPartnerId_companyId: {
          channelPartnerId: existingBroker.id,
          companyId,
        },
      },
    });
    if (link && link.status === "ACTIVE") {
      throw new ApiError(409, "This broker is already linked to your company");
    }
  }

  const existingInvite = await prisma.invite.findFirst({
    where: {
      email: { mode: "insensitive", equals: email },
      companyId,
      role: "CHANNEL_PARTNER",
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    throw new ApiError(409, "A pending broker invite already exists for this email");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.invite.create({
    data: {
      email: lower,
      role: "CHANNEL_PARTNER",
      companyId,
      invitedById,
      token,
      expiresAt,
    },
    include: { company: true },
  });

  // If the broker already exists, pre-create the BrokerCompany link so the
  // company can see the pending state immediately. Otherwise we create the
  // link at accept time when we know the channelPartnerId.
  if (existingBroker) {
    await prisma.companyChannelPartner.upsert({
      where: {
        channelPartnerId_companyId: {
          channelPartnerId: existingBroker.id,
          companyId,
        },
      },
      create: {
        channelPartnerId: existingBroker.id,
        companyId,
        status: "INVITED",
      },
      update: { status: "INVITED", revokedAt: null },
    });
  }

  const inviteLink = `${FRONTEND_BASE_URL}/accept-invite?token=${token}`;

  const mail = inviteEmail({
    companyName: invite.company?.name,
    role: "CHANNEL_PARTNER",
    inviterName: inviter?.name,
    inviteLink,
    expiryDays: INVITE_EXPIRY_DAYS,
  });

  sendMail({
    to: invite.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    companyId: invite.companyId,
  })
    .then((result) => {
      if (result?.delivered) {
        logger.info({ email: invite.email, mode: result.mode }, "Broker invite email delivered");
      }
    })
    .catch((err) => {
      logger.error({ err, email: invite.email }, "Failed to send broker invite email");
    });

  return { invite, inviteLink, emailSent: true };
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

  sendMail({
    to: refreshed.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    companyId: refreshed.companyId,
  })
    .then((result) => {
      if (result?.delivered) {
        logger.info({ email: refreshed.email, mode: result.mode }, "Invite email re-delivered");
      }
    })
    .catch((err) => {
      logger.error(
        { err, email: refreshed.email },
        "Failed to resend invite email",
      );
    });

  return { invite: refreshed, inviteLink, emailSent: true };
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
    companyId: invite.company.id,
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

  const { hashPassword } = await import("@better-auth/utils/password");
  const hashed = await hashPassword(password);

  // BROKER flow: User row stays with companyId=null; the link to the
  // brokerage is the BrokerCompany row, flipped to ACTIVE here. If the
  // broker User already exists (e.g. invited by another brokerage first),
  // reuse it instead of creating a new row.
  if (invite.role === "CHANNEL_PARTNER") {
    const existingBroker = await prisma.user.findFirst({
      where: { email: invite.email, role: "CHANNEL_PARTNER" },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });

    const brokerUser = await prisma.$transaction(async (tx) => {
      let user = existingBroker;
      if (!user) {
        user = await tx.user.create({
          data: {
            email: invite.email,
            name,
            role: "CHANNEL_PARTNER",
            companyId: null,
            isActive: true,
            invitedById: invite.invitedById,
            emailVerified: true,
            provider: "CREDENTIAL",
          },
          select: { id: true, name: true, email: true, role: true, companyId: true },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { providerId: user.id },
        });
        await tx.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: hashed,
          },
        });
      }
      await tx.companyChannelPartner.upsert({
        where: {
          channelPartnerId_companyId: {
            channelPartnerId: user.id,
            companyId: invite.companyId,
          },
        },
        create: {
          channelPartnerId: user.id,
          companyId: invite.companyId,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
        update: { status: "ACTIVE", acceptedAt: new Date(), revokedAt: null },
      });
      return user;
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    // Welcome notification for broker
    prisma.notification
      .create({
        data: {
          userId: brokerUser.id,
          companyId: invite.companyId,
          type: "WELCOME",
          title: "Welcome!",
          body: `You're now linked to ${invite.company.name} as a broker partner.`,
          link: "/broker",
          metadata: { kind: "WELCOME" },
        },
      })
      .catch(() => {});

    return { user: brokerUser, company: invite.company };
  }

  // Standard tenant member flow.
  // Email is globally unique now — reject if it exists anywhere.
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, companyId: true },
  });

  if (existingUser) {
    if (existingUser.companyId === invite.companyId) {
      throw new ApiError(400, "User already exists in this company. Please login.");
    }
    throw new ApiError(
      409,
      "This email is already registered to another company. Please use a different email for this invite.",
    );
  }

  // Create the user + credential account directly via Prisma. We could use
  // better-auth's signUpEmail now that email is globally unique again, but
  // the direct write keeps the row + Account creation in one transaction.
  const updatedUser = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
        name,
        role: invite.role,
        companyId: invite.companyId,
        isActive: true,
        invitedById: invite.invitedById,
        emailVerified: true,
        provider: "CREDENTIAL",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    await tx.user.update({
      where: { id: newUser.id },
      data: { providerId: newUser.id },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        accountId: newUser.id,
        providerId: "credential",
        password: hashed,
      },
    });

    return newUser;
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  // Welcome notification for the new member
  prisma.notification
    .create({
      data: {
        userId: updatedUser.id,
        companyId: invite.companyId,
        type: "WELCOME",
        title: "Welcome to the team!",
        body: `You've joined ${invite.company.name} as a ${invite.role.toLowerCase()}.`,
        link: "/dashboard",
        metadata: { kind: "WELCOME" },
      },
    })
    .catch(() => {});

  // Notify existing admins about the new member
  prisma.user
    .findMany({
      where: {
        companyId: invite.companyId,
        isActive: true,
        role: { in: ["OWNER", "ADMIN"] },
        id: { not: updatedUser.id },
      },
      select: { id: true },
    })
    .then((admins) => {
      for (const admin of admins) {
        prisma.notification
          .create({
            data: {
              userId: admin.id,
              companyId: invite.companyId,
              type: "USER_JOINED",
              title: "New team member joined",
              body: `${updatedUser.name} joined as ${invite.role.toLowerCase()}.`,
              link: "/users-mgmt",
              metadata: { kind: "USER_JOINED", joinedUserId: updatedUser.id },
            },
          })
          .catch(() => {});
      }
    });

  return { user: updatedUser, company: invite.company };
}

async function getUsers(companyId, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [users, pendingInvites, total] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, deletedAt: null },
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
    where: { id: userId, companyId, deletedAt: null },
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

  await logActivityForUser(companyId, requestingUserId, "USER_UPDATED", {
    userId: updatedUser.id,
    userName: updatedUser.name,
    changes: Object.keys(data),
  });

  return updatedUser;
}

async function toggleUserActive(userId, companyId, requestingUserId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (userId === requestingUserId) {
    throw new ApiError(400, "Cannot deactivate yourself");
  }

  if (user.role === "OWNER") {
    const ownersCount = await prisma.user.count({
      where: { companyId, role: "OWNER", isActive: true, deletedAt: null },
    });

    if (ownersCount <= 1) {
      throw new ApiError(400, "Cannot deactivate the last OWNER of the company");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
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

  await logActivityForUser(companyId, requestingUserId, "USER_TOGGLED_ACTIVE", {
    userId: updatedUser.id,
    userName: updatedUser.name,
    isActive: updatedUser.isActive,
  });

  return updatedUser;
}

async function softDeleteUser(userId, companyId, requestingUserId) {
  if (userId === requestingUserId) {
    throw new ApiError(400, "Cannot delete yourself");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "OWNER") {
    const ownersCount = await prisma.user.count({
      where: { companyId, role: "OWNER", deletedAt: null },
    });

    if (ownersCount <= 1) {
      throw new ApiError(400, "Cannot delete the last OWNER of the company");
    }
  }

  const deleted = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  await logActivityForUser(companyId, requestingUserId, "USER_DELETED", {
    userId: deleted.id,
    userName: deleted.name,
    role: deleted.role,
  });
}

// Logs a tenant-level user-management event into Activity so it shows up
// in the company Audit Log. Uses tenantPrisma so companyId is injected
// automatically by the extension. ActivityType is always SYSTEM here; the
// specific action (USER_INVITED / USER_UPDATED / USER_DISABLED / ...) is
// stored in metadata.action so the FE can render a friendlier label.
//
// Resilient: failures are logged but never thrown — user-mgmt mutations
// must not fail because the audit row didn't write.
async function logActivityForUser(companyId, requestingUserId, type, metadata) {
  try {
    const requester = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { name: true },
    });

    const verb = type.replace(/_/g, " ").toLowerCase();
    const target = metadata.userName || metadata.email || metadata.userId || "";
    const content = `${requester?.name ?? "Unknown"} ${verb}${target ? `: ${target}` : ""}`;

    const tenantPrisma = getTenantPrisma(companyId);
    await tenantPrisma.activity.create({
      data: {
        leadId: null,
        userId: requestingUserId,
        type: "SYSTEM",
        content,
        metadata: { action: type, ...metadata },
      },
    });
  } catch (err) {
    logger.warn(
      { err: err?.message, action: type, companyId },
      "logActivityForUser failed",
    );
  }
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

async function changeUserPassword(userId, currentPassword, newPassword) {
  const { verifyPassword } = await import("@better-auth/utils/password");
  const { hashPassword } = await import("@better-auth/utils/password");

  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true, password: true },
  });
  if (!account || !account.password) {
    throw new ApiError(400, "No password set on this account (social login only?)");
  }

  const ok = await verifyPassword(account.password, currentPassword);
  if (!ok) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });
}

module.exports = {
  createInvite,
  createBrokerInvite,
  resendInvite,
  getInviteByToken,
  acceptInvite,
  getUsers,
  getUserById,
  updateUser,
  toggleUserActive,
  softDeleteUser,
  getCurrentUser,
  updateOwnProfile,
  getUserWorkload,
  changeUserPassword,
};
