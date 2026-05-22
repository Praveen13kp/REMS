// All admin queries use the raw prisma client — cross-tenant access is intentional.

const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");
const { inviteEmail } = require("../../lib/emails/inviteEmail");
const { sendMail, verifyMailer } = require("../../lib/mail");
const { logger } = require("../../lib/logger");
const { env } = require("../../lib/env");

// Wall-clock when this Node process booted — used as the "API uptime"
// duration for the platform health card. Resets on every restart, which
// is the honest answer until we plug in a real uptime probe.
const PROCESS_STARTED_AT = Date.now();

// Storage quota for the platform-admin Storage Used bar. Files live in
// the File table (and optionally on disk under backend/uploads). When
// real billing lands this should come from the company's plan; for now,
// a 10 GB platform-wide quota matches what the UI showed pre-real-data.
const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

// Cache health checks for HEALTH_CACHE_MS. Dashboard polls /admin/health
// on every visit, and SMTP `verify()` + DB ping are both round-trips —
// we don't want a 5-line dashboard widget pegging the mailer.
const HEALTH_CACHE_MS = 30 * 1000;
let _healthCache = null; // { data, expiresAt }

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

async function probeDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - start;
    // Soft tiering: anything under 100ms is fine; up to 500ms is degraded;
    // beyond that the DB is essentially unusable from the API's perspective.
    let status = "healthy";
    if (ms >= 500) status = "down";
    else if (ms >= 100) status = "degraded";
    return { status, latencyMs: ms };
  } catch (err) {
    return { status: "down", error: err?.message };
  }
}

async function probeStorage() {
  try {
    const agg = await prisma.file.aggregate({ _sum: { sizeBytes: true } });
    const usedBytes = agg._sum.sizeBytes ?? 0;
    const usedPct = Math.min(100, Math.round((usedBytes / STORAGE_QUOTA_BYTES) * 100));
    return { usedBytes, quotaBytes: STORAGE_QUOTA_BYTES, usedPct };
  } catch (err) {
    logger.warn({ err: err?.message }, "probeStorage failed");
    return { usedBytes: 0, quotaBytes: STORAGE_QUOTA_BYTES, usedPct: 0 };
  }
}

async function probeQueuedJobs() {
  // We don't run a real job queue (BullMQ etc) yet. The closest proxy is
  // inbound webhook events that haven't been processed — these accumulate
  // when an integration handler chokes, and indicate ops attention is
  // needed. Reuse this counter until a real queue is introduced.
  try {
    const queued = await prisma.webhookEvent.count({ where: { status: "RECEIVED" } });
    return { queued };
  } catch {
    return { queued: 0 };
  }
}

const INVITE_EXPIRY_DAYS = 7;
const FRONTEND_BASE_URL = env.FRONTEND_URL.split(",")[0].trim();

const VALID_PLANS = ["BASIC", "PRO", "ENTERPRISE"];
const VALID_COMPANY_TYPES = ["DEVELOPER", "BROKERAGE", "CHANNEL_PARTNER", "INDIVIDUAL"];

// Platform-admin company creation. Unlike /signup (which is a public,
// self-service flow that needs a password), this endpoint creates the
// Company row and an OWNER invite — the owner sets their password when
// they accept. Reasons we don't reuse registerCompanyAndOwner here:
//   1. No password to ask for (admin shouldn't pick one for the owner)
//   2. We want to send an invite email so the owner activates themselves
//   3. user.service.createInvite() refuses role=OWNER on purpose — we
//      write the invite row directly here to bypass that guard
async function createCompanyByAdmin(input, actorId) {
  const name = (input.name || "").trim();
  const ownerEmail = (input.ownerEmail || "").trim().toLowerCase();
  const ownerName = (input.ownerName && input.ownerName.trim()) || ownerEmail.split("@")[0];
  const plan = input.plan || "BASIC";
  const type = input.type || null;
  const city = (input.city || "").trim() || null;

  if (!name) throw new ApiError(400, "Organisation name is required");
  if (!ownerEmail) throw new ApiError(400, "Owner email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new ApiError(400, "Enter a valid owner email");
  }
  if (!VALID_PLANS.includes(plan)) {
    throw new ApiError(400, `Plan must be one of: ${VALID_PLANS.join(", ")}`);
  }
  if (type && !VALID_COMPANY_TYPES.includes(type)) {
    throw new ApiError(400, `Type must be one of: ${VALID_COMPANY_TYPES.join(", ")}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists. Use a different owner email.",
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { company, invite } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        type,
        city,
        email: ownerEmail,
        subscriptionPlan: plan,
        subscriptionStatus: "TRIALING",
        maxUsers: plan === "ENTERPRISE" ? -1 : plan === "PRO" ? 25 : 1,
        maxLeads: plan === "BASIC" ? 50 : -1,
        billingCycle: "MONTHLY",
        isTrialActive: true,
        status: "ACTIVE",
      },
    });

    await tx.pipelineStage.createMany({
      data: DEFAULT_STAGES.map((stage) => ({ ...stage, companyId: company.id })),
    });

    const invite = await tx.invite.create({
      data: {
        email: ownerEmail,
        role: "OWNER",
        companyId: company.id,
        invitedById: actorId,
        token,
        expiresAt,
      },
    });

    await tx.platformAudit.create({
      data: {
        actorId,
        action: "COMPANY_CREATED",
        targetId: company.id,
        metadata: { name, plan, type, ownerEmail },
      },
    });

    return { company, invite };
  });

  const inviteLink = `${FRONTEND_BASE_URL}/accept-invite?token=${token}`;

  const mail = inviteEmail({
    companyName: name,
    role: "OWNER",
    inviterName: "Platform Admin",
    inviteLink,
    expiryDays: INVITE_EXPIRY_DAYS,
  });

  // Fire-and-forget — same pattern as user.service.createInvite. The
  // invite link is the source of truth; the email is convenience.
  sendMail({
    to: ownerEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
    .then((result) => {
      if (result?.delivered) {
        logger.info({ email: ownerEmail, companyId: company.id }, "Owner-invite email delivered");
      }
    })
    .catch((err) => {
      logger.error({ err, email: ownerEmail }, "Failed to send owner-invite email");
    });

  return {
    company: {
      id: company.id,
      name: company.name,
      plan: company.subscriptionPlan,
      status: company.status,
      industry: company.type,
      createdAt: company.createdAt,
    },
    invite: { id: invite.id, email: ownerEmail, expiresAt },
    inviteLink,
  };
}

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

async function getStats() {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const thirtyDaysAgo = addDays(now, -30);

  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    newSignups7d,
    newSignups30d,
    totalLeads,
    activeSubscriptions,
    expiredSubscriptions,
    basicUsers,
    proUsers,
    enterpriseUsers,
  ] =
    await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.company.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.lead.count(),
      prisma.company.count({ where: { subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } } }),
      prisma.company.count({
        where: {
          OR: [
            { subscriptionStatus: { in: ["EXPIRED", "CANCELLED", "PAST_DUE"] } },
            { subscriptionEndDate: { lt: now } },
          ],
        },
      }),
      prisma.company.count({ where: { subscriptionPlan: "BASIC" } }),
      prisma.company.count({ where: { subscriptionPlan: "PRO" } }),
      prisma.company.count({ where: { subscriptionPlan: "ENTERPRISE" } }),
    ]);

  const monthlyRevenue = proUsers * 1000 + enterpriseUsers * 1500 + basicUsers * 500;
  return {
    totalCompanies,
    activeCompanies,
    activeSubscriptions,
    expiredSubscriptions,
    totalUsers,
    activeUsers: totalUsers,
    totalLeads,
    newSignups7d,
    newSignups30d,
    basicUsers,
    proUsers,
    enterpriseUsers,
    monthlyRevenue,
    mrr: monthlyRevenue,
  };
}

async function getCompanies(query) {
  const { status, plan, search, page = "1", pageSize = "20" } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (status) where.status = status;
  if (plan) where.subscriptionPlan = plan;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: pageSizeNum,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, leads: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  const items = companies.map((c) => ({
    id: c.id,
    name: c.name,
    timezone: c.timezone,
    plan: c.subscriptionPlan,
    status: c.status,
    industry: c.type,
    userCount: c._count.users,
    leadCount: c._count.leads,
    createdAt: c.createdAt,
  }));

  return { items, total, page: pageNum, pageSize: pageSizeNum };
}

async function getCompanyById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, leads: true, projects: true } },
      users: {
        where: { role: "OWNER" },
        select: { id: true, name: true, email: true, phone: true },
        take: 1,
      },
    },
  });

  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    timezone: company.timezone,
    plan: company.subscriptionPlan,
    status: company.status,
    industry: company.type,
    city: company.city,
    onboardingCompleted: company.onboardingCompleted,
    userCount: company._count.users,
    leadCount: company._count.leads,
    projectCount: company._count.projects,
    owner: company.users[0] || null,
    createdAt: company.createdAt,
  };
}

async function updateCompany(id, data, actorId) {
  const updates = {};
  if (data.status !== undefined) updates.status = data.status;
  if (data.plan !== undefined) updates.subscriptionPlan = data.plan;
  if (data.notes !== undefined) updates.notes = data.notes;

  const company = await prisma.company.update({
    where: { id },
    data: updates,
  });

  if (data.status) {
    await prisma.platformAudit.create({
      data: {
        actorId,
        action: data.status === "SUSPENDED" ? "COMPANY_SUSPENDED" : "COMPANY_ACTIVATED",
        targetId: id,
        metadata: { previousStatus: company.status, newStatus: data.status },
      },
    });
  }

  return company;
}

async function deleteCompany(id, actorId) {
  const company = await prisma.company.update({
    where: { id },
    data: { status: "DELETED" },
  });

  await prisma.platformAudit.create({
    data: {
      actorId,
      action: "COMPANY_DELETED",
      targetId: id,
      metadata: { previousStatus: company.status },
    },
  });

  return company;
}

async function getRecentSignups(limit = 20) {
  return prisma.company.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      subscriptionPlan: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
}

async function getWeeklySignups(weeks = 12) {
  const endDate = startOfDay(new Date());
  const startDate = addDays(endDate, -(weeks * 7));

  const signups = await prisma.company.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
  });

  const buckets = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(startDate, i * 7);
    const weekEnd = addDays(weekStart, 7);
    const count = signups.filter(
      (s) => s.createdAt >= weekStart && s.createdAt < weekEnd,
    ).length;
    buckets.push({
      week: weekStart.toISOString().slice(0, 10),
      count,
    });
  }

  return buckets;
}

async function getHealth() {
  if (_healthCache && Date.now() < _healthCache.expiresAt) {
    return _healthCache.data;
  }

  const [db, mail, storage, jobs] = await Promise.all([
    probeDatabase(),
    verifyMailer(),
    probeStorage(),
    probeQueuedJobs(),
  ]);

  const data = {
    // "Uptime" used to be a fake 99.98% SLA figure. Replaced with the
    // honest duration this Node process has been running — resets on
    // restart. Plug a real uptime probe (Pingdom / UptimeRobot) into the
    // apiUptimePct field when it exists.
    apiUptime: formatUptime(Date.now() - PROCESS_STARTED_AT),
    apiUptimePct: null,
    database: db.status,
    databaseLatencyMs: db.latencyMs ?? null,
    emailService: mail.status,
    emailMode: mail.mode,
    jobs,
    storage,
  };

  _healthCache = { data, expiresAt: Date.now() + HEALTH_CACHE_MS };
  return data;
}

async function getActivity(limit = 10) {
  return prisma.platformAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}

module.exports = {
  getStats,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getRecentSignups,
  getWeeklySignups,
  getHealth,
  getActivity,
  createCompanyByAdmin,
};
