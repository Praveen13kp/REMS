const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ where: { slug: null } });
  for (const c of companies) {
    const base = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = (base || "company") + "-" + c.id.slice(0, 8);
    await prisma.company.update({ where: { id: c.id }, data: { slug } });
    console.log("Set slug for", c.name, "->", slug);
  }
  console.log("Done. Updated", companies.length, "companies");
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
