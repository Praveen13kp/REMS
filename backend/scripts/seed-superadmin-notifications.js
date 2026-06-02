// Seed platform notifications for Super Admins so the notifications page
// shows real content immediately (one "new organization signed up" entry per
// existing company). Mirrors the going-forward notify added to
// company.service.js registerCompanyAndOwner.
// Run: node scripts/seed-superadmin-notifications.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', deletedAt: null },
    select: { id: true, email: true },
  });

  if (!admins.length) {
    console.log('No SUPER_ADMIN users found — nothing to seed.');
    await prisma.$disconnect();
    return;
  }

  // Most recent companies first so the freshest signups sit at the top.
  const companies = await prisma.company.findMany({
    where: { status: { not: 'DELETED' } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!companies.length) {
    console.log('No companies found — nothing to seed.');
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  for (const admin of admins) {
    for (const company of companies) {
      // Skip if this admin already has a signup notification for this company
      // (keeps the script idempotent across re-runs).
      const existing = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          companyId: company.id,
          type: 'SYSTEM',
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId: admin.id,
          companyId: company.id,
          type: 'SYSTEM',
          title: 'New organization signed up',
          body: `"${company.name}" just registered on the platform.`,
          link: '/admin/orgs',
          metadata: { kind: 'ORG_SIGNUP', companyId: company.id },
          createdAt: company.createdAt,
        },
      });
      created++;
    }
  }

  console.log(`Done. Created ${created} notifications for ${admins.length} super admin(s).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
