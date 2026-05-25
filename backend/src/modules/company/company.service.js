const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");

async function registerCompanyAndOwner(input) {
  const { companyName, companyType, ownerEmail, password } = input;
  const city = input.city || null;
  const ownerPhone = input.ownerPhone || null;
  const ownerName = (input.ownerName && input.ownerName.trim()) || ownerEmail.split("@")[0];
  // The pricing page passes the chosen plan + cycle, but we never auto-activate
  // a paid plan from signup. The company starts on FREE; if they picked PRO or
  // ENTERPRISE we stash the intent in `pendingPlan` / `pendingBillingCycle` so
  // the billing page can fire Razorpay checkout right after onboarding.
  const pendingPlan = input.plan && input.plan !== "BASIC" && input.plan !== "FREE" ? input.plan : null;
  const pendingBillingCycle = pendingPlan
    ? (input.billingCycle === "annual" ? "annual" : "monthly")
    : null;

  // Only consider LIVE users — soft-deleted rows (deletedAt set) hang
  // around for FK integrity but their email is mangled at delete time,
  // so the user-facing email is genuinely free.
  const existingUser = await prisma.user.findFirst({
    where: { email: ownerEmail, deletedAt: null },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "This email is already registered. Please use a different email — each company on this platform requires its own unique login.",
    );
  }

  // Skip companies that were deleted by Super Admin — the email belongs to
  // a defunct workspace and the owner is welcome to start fresh.
  const existingCompany = await prisma.company.findFirst({
    where: { email: ownerEmail, status: { not: "DELETED" } },
  });

  if (existingCompany) {
    throw new ApiError(409, "Company with this email already exists");
  }

  const { auth } = await initAuth();

  const signUp = await auth.api.signUpEmail({
    body: {
      email: ownerEmail,
      password,
      name: ownerName,
    },
  });

  if (!signUp || !signUp.user) {
    throw new ApiError(500, "Failed to create user account");
  }

  const authUserId = signUp.user.id;

  let company;
  try {
    company = await prisma.$transaction(async (tx) => {
      // BASIC tier ships with a 7-day trial. After trialEndsAt the
      // assertTrialActive gate blocks every write until upgrade.
      const TRIAL_DAYS = 7;
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const created = await tx.company.create({
        data: {
          name: companyName,
          type: companyType,
          city,
          email: ownerEmail,
          phone: ownerPhone,
          subscriptionPlan: "BASIC",
          pendingPlan,
          pendingBillingCycle,
          trialEndsAt,
        },
      });

      await tx.user.update({
        where: { id: authUserId },
        data: {
          companyId: created.id,
          role: "OWNER",
          phone: ownerPhone,
          provider: "CREDENTIAL",
          providerId: authUserId,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((stage) => ({
          ...stage,
          companyId: created.id,
        })),
      });

      return created;
    });
  } catch (err) {
    await prisma.user.delete({ where: { id: authUserId } }).catch(() => {});
    throw err;
  }

  const { headers: signInHeaders } = await auth.api.signInEmail({
    body: { email: ownerEmail, password },
    returnHeaders: true,
  });

  const user = await prisma.user.findUnique({ where: { id: authUserId } });

  const setCookie = signInHeaders.get("set-cookie");

  // Welcome notification for the new owner
  prisma.notification
    .create({
      data: {
        userId: user.id,
        companyId: company.id,
        type: "WELCOME",
        title: "Welcome to LeadPro!",
        body: `Your company "${company.name}" is ready. Start by adding your first lead.`,
        link: "/leads",
        metadata: { kind: "WELCOME" },
      },
    })
    .catch(() => {});

  return { company, user, setCookie };
}

async function getCompany(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const [usersCount, projectsCount, leadsCount] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.project.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId } }),
  ]);

  return {
    ...company,
    usersCount,
    projectsCount,
    leadsCount,
  };
}

async function updateCompany(companyId, data) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  return company;
}

async function completeOnboarding(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.onboardingCompleted) {
    return company;
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { onboardingCompleted: true },
  });

  return updated;
}

module.exports = { registerCompanyAndOwner, getCompany, updateCompany, completeOnboarding };
