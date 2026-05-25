require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { initAuth } = require("../src/lib/auth");
const { PLANS } = require("../src/lib/planLimits");

const prisma = new PrismaClient();

const PLATFORM_ADMIN = {
  email: "admin@relms.io",
  password: "Admin@123",
  name: "Platform Admin",
};

async function seedPlatformAdmin() {
  const existing = await prisma.user.findFirst({
    where: { email: PLATFORM_ADMIN.email, companyId: null },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "SUPER_ADMIN",
          companyId: null,
          isActive: true,
          provider: "CREDENTIAL",
          providerId: existing.id,
        },
      });
      console.log(`  ✓ Promoted existing user to SUPER_ADMIN: ${PLATFORM_ADMIN.email}`);
    } else {
      console.log(`  ✓ SUPER_ADMIN already present: ${PLATFORM_ADMIN.email}`);
    }
    return;
  }

  // No row yet — create via better-auth so the password hash + Account
  // row are written correctly. Then stamp the SUPER_ADMIN role and clear
  // companyId (platform admins are tenant-less).
  const { auth } = await initAuth();
  const signUp = await auth.api.signUpEmail({
    body: {
      email: PLATFORM_ADMIN.email,
      password: PLATFORM_ADMIN.password,
      name: PLATFORM_ADMIN.name,
    },
  });
  await prisma.user.update({
    where: { id: signUp.user.id },
    data: {
      role: "SUPER_ADMIN",
      companyId: null,
      isActive: true,
      provider: "CREDENTIAL",
      providerId: signUp.user.id,
    },
  });
  console.log(`  ✓ SUPER_ADMIN created: ${PLATFORM_ADMIN.email}`);
}

async function repairPlatformAdminCredential() {
  const { hashPassword } = await import("@better-auth/utils/password");
  const passwordHash = await hashPassword(PLATFORM_ADMIN.password);

  const user = await prisma.user.findFirst({
    where: { email: PLATFORM_ADMIN.email, companyId: null },
    select: { id: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: PLATFORM_ADMIN.name,
      role: "SUPER_ADMIN",
      companyId: null,
      isActive: true,
      provider: "CREDENTIAL",
      providerId: user.id,
    },
  });

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });

  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
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

  console.log(`  SUPER_ADMIN credential ready: ${PLATFORM_ADMIN.email}`);
}

const PLAN_BULLETS = {
  BASIC: [
    "7-day free trial",
    "Up to 3 users",
    "200 leads",
    "2 projects",
    "500 MB file storage",
    "Kanban pipeline + contacts",
    "Tasks, notes, activity log",
    "CSV import",
    "Email notifications",
    "Community support",
  ],
  PRO: [
    "Everything in Basic",
    "Up to 10 users",
    "10,000 leads",
    "25 projects",
    "5 GB file storage",
    "BYO integrations: Facebook, Instagram, Google, IndiaMART, JustDial, Website",
    "Webhook lead intake",
    "Custom pipeline stages",
    "Lead aging alerts",
    "Duplicate-lead detection",
    "Agent privacy controls",
    "Email support",
  ],
  ENTERPRISE: [
    "Everything in Pro",
    "Unlimited users",
    "Unlimited leads & projects",
    "Unlimited file storage",
    "Audit log (compliance-ready)",
    "Priority support (email + phone)",
    "Guided onboarding session",
  ],
};

async function seedPlans() {
  const sortOrder = { BASIC: 10, PRO: 20, ENTERPRISE: 30 };

  for (const [code, plan] of Object.entries(PLANS)) {
    await prisma.plan.upsert({
      where: { code },
      update: {
        name: plan.name,
        tagline: plan.tagline,
        featured: Boolean(plan.featured),
        sortOrder: sortOrder[code],
        priceMonthly: plan.price.monthly * 100,
        priceAnnual: plan.price.annual * 100,
        trialDays: plan.trialDays || 0,
        limits: plan.limits,
        features: plan.features,
        bullets: PLAN_BULLETS[code],
        support: plan.support,
        onboarding: plan.onboarding,
        isActive: true,
      },
      create: {
        id: `plan_${code.toLowerCase()}_seed`,
        code,
        name: plan.name,
        tagline: plan.tagline,
        featured: Boolean(plan.featured),
        sortOrder: sortOrder[code],
        priceMonthly: plan.price.monthly * 100,
        priceAnnual: plan.price.annual * 100,
        trialDays: plan.trialDays || 0,
        limits: plan.limits,
        features: plan.features,
        bullets: PLAN_BULLETS[code],
        support: plan.support,
        onboarding: plan.onboarding,
        isActive: true,
      },
    });
  }

  console.log("  Plans seeded/repaired");
}

async function main() {
  console.log("🌱 Seeding database...");

  // ──────────────────────────────────────────────
  // 0. Platform admin (SUPER_ADMIN, no company)
  // ──────────────────────────────────────────────
  await seedPlatformAdmin();
  await repairPlatformAdminCredential();
  await seedPlans();

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
  // ──────────────────────────────────────────────
  const usersData = [
    { email: "owner@acme.com",   name: "Ravi Owner",   role: "OWNER" },
    { email: "manager@acme.com", name: "Priya Manager", role: "MANAGER" },
    { email: "agent1@acme.com",  name: "Amit Agent",   role: "AGENT" },
    { email: "agent2@acme.com",  name: "Sneha Agent",  role: "AGENT" },
  ];

  const createdUsers = {};
  for (const u of usersData) {
    const existingUser = await prisma.user.findFirst({
      where: { email: u.email, companyId: company.id },
    });
    if (existingUser) {
      createdUsers[u.email] = existingUser;
      console.log(`  ✓ User exists: ${existingUser.name} (${existingUser.role})`);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: true,
      },
    });
    createdUsers[u.email] = user;
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
      type: "RESIDENTIAL",
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
      type: "VILLA",
      description: "Eco-friendly villas in Whitefield",
      reraNumber: "RERA-KA-2024-00456",
      possessionDate: new Date("2026-12-31"),
    },
  });
  console.log(`  ✓ Projects created: ${project1.name}, ${project2.name}`);

  // ──────────────────────────────────────────────
  // 5. Sample Leads (5 leads in varied stages)
  // ──────────────────────────────────────────────
  const owner = createdUsers["owner@acme.com"];
  const agentAmit = createdUsers["agent1@acme.com"];
  const agentSneha = createdUsers["agent2@acme.com"];

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
      assignedToId: agentAmit.id,
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
      assignedToId: agentAmit.id,
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
      assignedToId: agentSneha.id,
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
      assignedToId: agentSneha.id,
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
      assignedToId: agentSneha.id,
      score: 30,
      tags: [],
    },
  ];

  let createdCount = 0;
  for (const leadData of sampleLeads) {
    const leadExists = await prisma.lead.findFirst({
      where: { companyId: company.id, phone: leadData.phone },
    });
    if (!leadExists) {
      await prisma.lead.create({
        data: { ...leadData, companyId: company.id, createdById: owner.id },
      });
      createdCount++;
    }
  }
  console.log(`  ✓ ${createdCount} sample leads created`);

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
  console.log("\n   Platform admin (has password — login works immediately):");
  console.log(`   - ${PLATFORM_ADMIN.email}  /  ${PLATFORM_ADMIN.password}  (SUPER_ADMIN)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
