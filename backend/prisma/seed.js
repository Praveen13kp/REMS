const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ──────────────────────────────────────────────
  // 1. Demo Company
  // ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: "demo-co-1" },
    update: {},
    create: {
      id: "demo-co-1",
      name: "Acme Realty",
      timezone: "Asia/Kolkata",
      currency: "INR",
      subscriptionPlan: "FREE_TRIAL",
      onboardingCompleted: true,
    },
  });
  console.log(`  ✓ Company created: ${company.name}`);

  // ──────────────────────────────────────────────
  // 2. Demo Users (4 users)
  //    Passwords must be set via better-auth signup.
  //    Until then, these users exist in DB but can't
  //    log in with email/password.
  // TODO(S4-BE-A-03): seed a PLATFORM_ADMIN user
  //   e.g. { email: "admin@relms.io", name: "Platform Admin", role: "PLATFORM_ADMIN" }
  // ──────────────────────────────────────────────
  const usersData = [
    { email: "owner@acme.com",   name: "Ravi Owner",   role: "OWNER" },
    { email: "manager@acme.com", name: "Priya Manager", role: "MANAGER" },
    { email: "agent1@acme.com",  name: "Amit Agent",   role: "AGENT" },
    { email: "agent2@acme.com",  name: "Sneha Agent",  role: "AGENT" },
  ];

  const createdUsers = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: true,
      },
    });
    createdUsers[u.role] = user;
    console.log(`  ✓ User created: ${user.name} (${user.role})`);
  }

  // ──────────────────────────────────────────────
  // 3. Default Pipeline Stages (9 stages)
  // ──────────────────────────────────────────────
  const stages = [
    { name: "New",                   order: 0, probability: 10, isDefault: true },
    { name: "Contacted",             order: 1, probability: 20, isDefault: true },
    { name: "Qualified",             order: 2, probability: 35, isDefault: true },
    { name: "Site Visit Scheduled",  order: 3, probability: 50, isDefault: true },
    { name: "Site Visit Done",       order: 4, probability: 60, isDefault: true },
    { name: "Negotiation",           order: 5, probability: 75, isDefault: true },
    { name: "Booked",                order: 6, probability: 90, isDefault: true },
    { name: "Closed Won",            order: 7, probability: 100, isWon: true,  isDefault: true },
    { name: "Closed Lost",           order: 8, probability: 0,   isLost: true, isDefault: true },
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: { companyId_name: { companyId: company.id, name: stage.name } },
      update: {},
      create: { ...stage, companyId: company.id },
    });
  }
  console.log(`  ✓ ${stages.length} pipeline stages seeded`);

  // ──────────────────────────────────────────────
  // 4. Demo Projects
  // ──────────────────────────────────────────────
  const project1 = await prisma.project.upsert({
    where: { id: "demo-prj-1" },
    update: {},
    create: {
      id: "demo-prj-1",
      companyId: company.id,
      name: "Acme Heights",
      location: "Mumbai",
      type: "Apartment",
      description: "Premium residential tower in Bandra",
      reraNumber: "RERA-MH-2024-00123",
      possessionDate: new Date("2027-06-30"),
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "demo-prj-2" },
    update: {},
    create: {
      id: "demo-prj-2",
      companyId: company.id,
      name: "Acme Greens",
      location: "Bangalore",
      type: "Villa",
      description: "Eco-friendly villas in Whitefield",
      reraNumber: "RERA-KA-2024-00456",
      possessionDate: new Date("2026-12-31"),
    },
  });
  console.log(`  ✓ Projects created: ${project1.name}, ${project2.name}`);

  // ──────────────────────────────────────────────
  // 5. Sample Leads (5 leads in varied stages)
  // ──────────────────────────────────────────────
  const agent1 = createdUsers["AGENT"];
  const owner = createdUsers["OWNER"];

  const sampleLeads = [
    {
      name: "Arun Sharma",
      phone: "+919000000001",
      email: "arun@example.com",
      source: "website",
      status: "New",
      city: "Mumbai",
      budget: "7500000",
      requirementType: "2BHK",
      interestedProjectId: project1.id,
      assignedToId: agent1.id,
      score: 65,
      tags: ["hot", "whatsapp-opt-in"],
    },
    {
      name: "Meera Iyer",
      phone: "+919000000002",
      email: "meera@example.com",
      source: "referral",
      status: "Contacted",
      city: "Mumbai",
      budget: "12000000",
      requirementType: "3BHK",
      interestedProjectId: project1.id,
      assignedToId: agent1.id,
      score: 50,
      tags: ["cold"],
    },
    {
      name: "Raj Patel",
      phone: "+919000000003",
      email: null,
      source: "walk-in",
      status: "Site Visit Scheduled",
      city: "Bangalore",
      budget: "5000000",
      requirementType: "1BHK",
      interestedProjectId: project2.id,
      assignedToId: createdUsers["AGENT"].id,
      score: 80,
      tags: ["hot"],
    },
    {
      name: "Neha Singh",
      phone: "+919000000004",
      email: "neha@example.com",
      source: "website",
      status: "Negotiation",
      city: "Bangalore",
      budget: "8500000",
      requirementType: "2BHK",
      interestedProjectId: project2.id,
      assignedToId: createdUsers["AGENT"].id,
      score: 90,
      tags: ["hot", "vip"],
    },
    {
      name: "Vikram Joshi",
      phone: "+919000000005",
      email: null,
      source: "call",
      status: "New",
      city: "Mumbai",
      budget: "20000000",
      requirementType: "Penthouse",
      interestedProjectId: project1.id,
      assignedToId: agent1.id,
      score: 30,
      tags: [],
    },
  ];

  for (const leadData of sampleLeads) {
    const leadExists = await prisma.lead.findFirst({
      where: { companyId: company.id, phone: leadData.phone },
    });
    if (!leadExists) {
      await prisma.lead.create({
        data: { ...leadData, companyId: company.id, createdById: owner.id },
      });
    }
  }
  console.log(`  ✓ ${sampleLeads.length} sample leads created`);

  // ──────────────────────────────────────────────
  // Done
  // ──────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log("\n📝 Next steps:");
  console.log("   Demo users are created but have NO passwords yet.");
  console.log("   Sign up via the app UI with the same email addresses");
  console.log("   to set passwords, OR use better-auth API to set them.");
  console.log("\n   Demo emails:");
  console.log("   - owner@acme.com   (OWNER)");
  console.log("   - manager@acme.com (MANAGER)");
  console.log("   - agent1@acme.com  (AGENT)");
  console.log("   - agent2@acme.com  (AGENT)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
