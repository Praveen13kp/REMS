const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const latest = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true, email: true } } } });
  console.log('Latest 10 notifications:', JSON.stringify(latest.map(n => ({ id: n.id, userId: n.userId, user: n.user?.name, type: n.type, title: n.title, createdAt: n.createdAt })), null, 2));
  const total = await prisma.notification.count();
  console.log('Total notifications:', total);
  await prisma.$disconnect();
})();
