/* eslint-disable no-console */
const prisma = require("../src/config/prisma");
const { initAuth } = require("../src/lib/auth");

const PASSWORD = "Password123!";

const TEST_USERS = [
  { email: "manager@test.com", name: "Test Manager", role: "MANAGER" },
  { email: "agent@test.com", name: "Test Agent", role: "AGENT" },
];

// Pass an owner email as the first CLI arg to target a specific company,
// otherwise use the most recently-created OWNER's company.
async function main() {
  const ownerEmailArg = process.argv[2];

  const owner = ownerEmailArg
    ? await prisma.user.findFirst({
        where: { email: { equals: ownerEmailArg, mode: "insensitive" }, role: "OWNER" },
        include: { company: true },
      })
    : await prisma.user.findFirst({
        where: { role: "OWNER" },
        include: { company: true },
        orderBy: { createdAt: "desc" },
      });

  if (!owner || !owner.company) {
    throw new Error("No OWNER user found. Sign up a company first via the UI.");
  }
  const company = owner.company;

  console.log(`Seeding into company: ${company.name} (${company.id})`);

  const { auth } = await initAuth();

  for (const u of TEST_USERS) {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: u.email, mode: "insensitive" } },
    });
    if (existing) {
      console.log(`SKIP  ${u.email} (already exists, role=${existing.role})`);
      continue;
    }

    await auth.api.signUpEmail({
      body: { email: u.email, password: PASSWORD, name: u.name },
    });

    await prisma.user.update({
      where: { email: u.email },
      data: {
        role: u.role,
        companyId: company.id,
        isActive: true,
        invitedById: owner?.id ?? null,
      },
    });

    console.log(`OK    ${u.email}  role=${u.role}  password=${PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
