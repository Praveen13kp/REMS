// Temporary smoke-test helper: seeds a known intake token on the first
// Company so we can exercise /api/intake/facebook/:token without needing
// an OWNER session. Safe to re-run.
const prisma = require("../src/config/prisma");

(async () => {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    console.error("No Company rows found — seed a company first");
    process.exit(1);
  }
  const cfg = {
    facebook: { token: "smoketoken-fb", secret: "smokesecret-fb", enabled: true },
    instagram: { token: "smoketoken-ig", secret: "smokesecret-ig", enabled: false },
  };
  await prisma.company.update({ where: { id: company.id }, data: { intakeTokens: cfg } });
  console.log(JSON.stringify({ companyId: company.id, companyName: company.name, intakeTokens: cfg }, null, 2));
  await prisma.$disconnect();
})();
