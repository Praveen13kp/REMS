const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");

async function registerCompanyAndOwner(input) {
  const { companyName, companyType, ownerEmail, password } = input;
  const city = input.city || null;
  const ownerPhone = input.ownerPhone || null;
  const ownerName = (input.ownerName && input.ownerName.trim()) || ownerEmail.split("@")[0];

  const existingUser = await prisma.user.findFirst({
    where: { email: ownerEmail },
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  const existingCompany = await prisma.company.findFirst({
    where: { email: ownerEmail },
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
      const created = await tx.company.create({
        data: {
          name: companyName,
          type: companyType,
          city,
          email: ownerEmail,
          phone: ownerPhone,
        },
      });

      await tx.user.update({
        where: { id: authUserId },
        data: {
          companyId: created.id,
          role: "OWNER",
          phone: ownerPhone,
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
