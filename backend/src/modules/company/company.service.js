const { ApiError } = require("../../lib/ApiError");
const prisma = require("../../config/prisma");
const { initAuth } = require("../../lib/auth");
const { DEFAULT_STAGES } = require("../pipeline/pipeline.constants");

async function registerCompanyAndOwner(input) {
  const { companyName, companyType, city, ownerName, ownerEmail, ownerPhone, password } = input;

  const existingUser = await prisma.user.findUnique({
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

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        type: companyType,
        city: city,
        email: ownerEmail,
        phone: ownerPhone,
      },
    });

    const { user: authUser } = await auth.user.create({
      email: ownerEmail,
      password: password,
      name: ownerName,
      phone: ownerPhone,
      data: {
        role: "OWNER",
        isActive: true,
        companyId: company.id,
      },
    });

    const user = await tx.user.update({
      where: { id: authUser.id },
      data: {
        companyId: company.id,
        role: "OWNER",
      },
    });

    const pipelineStages = await tx.pipelineStage.createMany({
      data: DEFAULT_STAGES.map((stage) => ({
        ...stage,
        companyId: company.id,
      })),
    });

    return { company, user };
  });

  const { auth: authInstance } = await initAuth();
  const session = await authInstance.api.signInWithEmail({
    email: ownerEmail,
    password: password,
  });

  return { company: result.company, user: result.user, session };
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

module.exports = { registerCompanyAndOwner, getCompany, updateCompany };