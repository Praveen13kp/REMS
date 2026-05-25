const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.notification.groupBy({ by: ['type', 'userId'], _count: { id: true } });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
