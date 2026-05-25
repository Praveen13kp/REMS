// Backfill notifications for existing leads so users see
// notification history immediately after the feature ships.
// Run: node scripts/backfill-notifications.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.notification.count();
  if (existingCount > 0) {
    console.log(`${existingCount} notifications already exist — skipping backfill.`);
    await prisma.$disconnect();
    return;
  }

  const leads = await prisma.lead.findMany({
    where: { assignedToId: { not: null } },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  let created = 0;
  for (const lead of leads) {
    const sourceLabel = lead.source ? `${lead.source} ` : '';
    await prisma.notification.create({
      data: {
        companyId: lead.companyId,
        userId: lead.assignedToId,
        type: 'LEAD_ASSIGNED',
        title: 'Lead assigned to you',
        body: `Lead "${lead.name}" has been assigned to you`,
        link: `/leads/${lead.id}`,
        metadata: { leadId: lead.id, source: lead.source || null, kind: 'BACKFILL' },
        createdAt: lead.createdAt,
      },
    });
    created++;
  }

  const ownerRecipients = await prisma.user.findMany({
    where: { role: 'OWNER', isActive: true, companyId: { not: null }, deletedAt: null },
    select: { id: true, companyId: true, name: true },
  });

  const unassignedLeads = await prisma.lead.findMany({
    where: { assignedToId: null },
  });

  for (const lead of unassignedLeads) {
    const owners = ownerRecipients.filter(o => o.companyId === lead.companyId);
    for (const owner of owners) {
      const sourceLabel = lead.source ? `${lead.source} ` : '';
      await prisma.notification.create({
        data: {
          companyId: lead.companyId,
          userId: owner.id,
          type: 'LEAD_CREATED',
          title: `New ${sourceLabel}lead`,
          body: `${lead.name} — ${lead.phone || lead.email || 'no contact'}`,
          link: `/leads/${lead.id}`,
          metadata: { leadId: lead.id, source: lead.source || null, kind: 'BACKFILL' },
          createdAt: lead.createdAt,
        },
      });
      created++;
    }
  }

  console.log(`Done. Created ${created} notifications.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
