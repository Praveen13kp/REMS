/**
 * Creates or updates the superadmin user.
 * Usage: node scripts/create-superadmin.js
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SUPERADMIN = {
  email: "superadmint@gmail.com",
  password: "Password#1234",
  name: "Super Admin",
};

async function main() {
  const { hashPassword } = await import("@better-auth/utils/password");
  const passwordHash = await hashPassword(SUPERADMIN.password);

  // Upsert the user row
  let user = await prisma.user.findFirst({
    where: { email: SUPERADMIN.email },
    select: { id: true, role: true },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: SUPERADMIN.name,
        role: "SUPER_ADMIN",
        companyId: null,
        isActive: true,
        provider: "CREDENTIAL",
        providerId: user.id,
      },
    });
    console.log(`✓ Updated existing user to SUPER_ADMIN: ${SUPERADMIN.email}`);
  } else {
    user = await prisma.user.create({
      data: {
        name: SUPERADMIN.name,
        email: SUPERADMIN.email,
        role: "SUPER_ADMIN",
        companyId: null,
        isActive: true,
        provider: "CREDENTIAL",
        emailVerified: true,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { providerId: user.id },
    });
    console.log(`✓ Created SUPER_ADMIN: ${SUPERADMIN.email}`);
  }

  // Upsert the credential account
  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { accountId: user.id, password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  console.log(`✓ Password set for: ${SUPERADMIN.email}`);
  console.log(`\nSuperAdmin ready:`);
  console.log(`  Email:    ${SUPERADMIN.email}`);
  console.log(`  Password: ${SUPERADMIN.password}`);
  console.log(`  Login at: http://localhost:5173/superadmin/login`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
