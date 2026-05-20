#!/usr/bin/env node
/**
 * Find User.email values that exist in more than one company.
 * Run BEFORE applying the 20260518_global_unique_email migration.
 * Resolve every duplicate (rename, delete, or merge) before continuing.
 *
 * Usage:  node backend/scripts/detect-duplicate-emails.cjs
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.user.groupBy({
    by: ["email"],
    _count: { _all: true },
    having: { email: { _count: { gt: 1 } } },
    orderBy: { _count: { email: "desc" } },
  });

  if (grouped.length === 0) {
    console.log("OK — no duplicate emails. Safe to apply the global-unique migration.");
    return;
  }

  console.log(`Found ${grouped.length} email(s) used by multiple User rows:\n`);

  for (const row of grouped) {
    const users = await prisma.user.findMany({
      where: { email: row.email },
      select: {
        id: true,
        name: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`  ${row.email}  (${row._count._all} rows)`);
    for (const u of users) {
      const co = u.companyId
        ? `${u.company?.name ?? "?"} [${u.companyId}]`
        : "(no company — broker/platform)";
      console.log(
        `    - ${u.id}  role=${u.role}  active=${u.isActive}  company=${co}  created=${u.createdAt.toISOString()}`,
      );
    }
    console.log("");
  }

  console.log("Resolve each duplicate before running `prisma migrate deploy`:");
  console.log("  - Rename one of the User.email values (preferred — the human picks a new login)");
  console.log("  - Or delete the obsolete row if it has no data");
  console.log("  - Or merge data into one row if both are the same person");
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
