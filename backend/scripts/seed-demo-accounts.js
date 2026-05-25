/* eslint-disable no-console */
/**
 * Seed demo accounts + leads for the presentation.
 *
 * Creates 2 companies and 4 users (all password "Demo@1234"):
 *   - Demo Realty (DEVELOPER)
 *       owner@demo.com    OWNER
 *       manager@demo.com  MANAGER
 *       agent@demo.com    AGENT
 *   - Skyline Partners (DEVELOPER) — a second company so the broker has
 *     multi-company context to demo.
 *       (no internal users — only the broker is linked)
 *
 *   broker@demo.com  CHANNEL_PARTNER — linked to BOTH companies via CompanyChannelPartner rows
 *
 * Also seeds ~15 leads in Demo Realty and ~8 in Skyline Partners so every
 * role sees populated dashboards.
 *
 * Idempotent — re-running skips anything already created.
 *
 * Usage:
 *   node scripts/seed-demo-accounts.js
 */
const prisma = require("../src/config/prisma");
const { initAuth } = require("../src/lib/auth");

const PASSWORD = "Demo@1234";

const COMPANIES = {
  realty: {
    name: "Demo Realty",
    type: "DEVELOPER",
    city: "Pune",
    email: "owner@demo.com",
    phone: "+91 9000000001",
    subscriptionPlan: "PRO",
  },
  skyline: {
    name: "Skyline Partners",
    type: "DEVELOPER",
    city: "Mumbai",
    email: "partners@demo.com",
    phone: "+91 9000000002",
    subscriptionPlan: "PRO",
  },
};

const INTERNAL_USERS = [
  { email: "owner@demo.com",    name: "Demo Owner",    role: "OWNER",   company: "realty" },
  { email: "manager@demo.com",  name: "Demo Manager",  role: "MANAGER", company: "realty" },
  { email: "agent@demo.com",    name: "Demo Agent",    role: "AGENT",   company: "realty" },
  { email: "agent2@demo.com",   name: "Demo Agent 2",  role: "AGENT",   company: "realty" },
];

const BROKER = { email: "broker@demo.com", name: "Demo Broker" };

const REALTY_LEADS = [
  { name: "Rohan Mehta",    phone: "9000010001", email: "rohan.mehta@demo.com",    source: "Website",    budget: "₹85,00,000",   status: "New",           priority: "Hot",  city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: 0,    assignTo: "agent" },
  { name: "Priya Nair",     phone: "9000010002", email: "priya.nair@demo.com",     source: "Facebook",   budget: "₹1,20,00,000", status: "Contacted",     priority: "Hot",  city: "Mumbai",    requirementType: "3BHK Apartment", followUpInDays: 0,    assignTo: "agent" },
  { name: "Aditya Singh",   phone: "9000010003", email: "aditya.singh@demo.com",   source: "Google Ads", budget: "₹65,00,000",   status: "Qualified",     priority: "Warm", city: "Bengaluru", requirementType: "Plot",           followUpInDays: 1,    assignTo: "agent" },
  { name: "Sneha Kulkarni", phone: "9000010004", email: "sneha.k@demo.com",        source: "Referral",   budget: "₹2,10,00,000", status: "Proposal Sent", priority: "Hot",  city: "Pune",      requirementType: "Villa",          followUpInDays: 2,    assignTo: "agent" },
  { name: "Vikram Iyer",    phone: "9000010005", email: "vikram.iyer@demo.com",    source: "Walk-in",    budget: "₹95,00,000",   status: "Negotiation",   priority: "Warm", city: "Chennai",   requirementType: "3BHK Apartment", followUpInDays: 3,    assignTo: "agent" },
  { name: "Anjali Verma",   phone: "9000010006", email: "anjali.verma@demo.com",   source: "Instagram",  budget: "₹55,00,000",   status: "Follow Up",     priority: "Cold", city: "Pune",      requirementType: "1BHK Apartment", followUpInDays: 5,    assignTo: "agent" },
  { name: "Karthik Reddy",  phone: "9000010007", email: "karthik.r@demo.com",      source: "Website",    budget: "₹1,50,00,000", status: "Won",           priority: "Hot",  city: "Hyderabad", requirementType: "3BHK Apartment", followUpInDays: null, assignTo: "agent" },
  { name: "Meera Joshi",    phone: "9000010008", email: "meera.joshi@demo.com",    source: "Referral",   budget: "₹78,00,000",   status: "Won",           priority: "Warm", city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: null, assignTo: "agent" },
  { name: "Rahul Khanna",   phone: "9000010009", email: "rahul.khanna@demo.com",   source: "Facebook",   budget: "₹40,00,000",   status: "Lost",          priority: "Cold", city: "Delhi",     requirementType: "Plot",           followUpInDays: null, assignTo: "agent" },
  { name: "Divya Sharma",   phone: "9000010010", email: "divya.sharma@demo.com",   source: "Google Ads", budget: "₹90,00,000",   status: "New",           priority: "Warm", city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: -1,   assignTo: "agent" },
  { name: "Sanjay Gupta",   phone: "9000010011", email: "sanjay.gupta@demo.com",   source: "IndiaMART",  budget: "₹1,80,00,000", status: "Site Visit",    priority: "Hot",  city: "Pune",      requirementType: "4BHK Apartment", followUpInDays: 1,    assignTo: "broker" },
  { name: "Neha Bansal",    phone: "9000010012", email: "neha.bansal@demo.com",    source: "JustDial",   budget: "₹70,00,000",   status: "Contacted",     priority: "Warm", city: "Mumbai",    requirementType: "2BHK Apartment", followUpInDays: 2,    assignTo: "broker" },
  { name: "Arjun Kapoor",   phone: "9000010013", email: "arjun.kapoor@demo.com",   source: "Referral",   budget: "₹3,50,00,000", status: "Negotiation",   priority: "Hot",  city: "Mumbai",    requirementType: "Penthouse",      followUpInDays: 3,    assignTo: "broker" },
  { name: "Pooja Desai",    phone: "9000010014", email: "pooja.desai@demo.com",    source: "Website",    budget: "₹60,00,000",   status: "New",           priority: "Cold", city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: 4,    assignTo: "agent" },
  { name: "Manish Tiwari",  phone: "9000010015", email: "manish.tiwari@demo.com",  source: "Facebook",   budget: "₹1,10,00,000", status: "Qualified",     priority: "Warm", city: "Bengaluru", requirementType: "3BHK Apartment", followUpInDays: 0,    assignTo: "agent" },
  // Unassigned leads — for the Assign Leads page demo
  { name: "Tanisha Roy",    phone: "9000010016", email: "tanisha.roy@demo.com",    source: "Website",    budget: "₹75,00,000",   status: "New",           priority: "Hot",  city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: 0,    assignTo: null },
  { name: "Vivaan Bose",    phone: "9000010017", email: "vivaan.bose@demo.com",    source: "Facebook",   budget: "₹1,30,00,000", status: "New",           priority: "Hot",  city: "Mumbai",    requirementType: "3BHK Apartment", followUpInDays: 0,    assignTo: null },
  { name: "Ananya Pillai",  phone: "9000010018", email: "ananya.pillai@demo.com",  source: "Instagram",  budget: "₹50,00,000",   status: "New",           priority: "Warm", city: "Bengaluru", requirementType: "1BHK Apartment", followUpInDays: 0,    assignTo: null },
  { name: "Reyansh Shah",   phone: "9000010019", email: "reyansh.shah@demo.com",   source: "Google Ads", budget: "₹1,90,00,000", status: "New",           priority: "Hot",  city: "Pune",      requirementType: "Villa",          followUpInDays: 0,    assignTo: null },
  { name: "Saanvi Menon",   phone: "9000010020", email: "saanvi.menon@demo.com",   source: "IndiaMART",  budget: "₹65,00,000",   status: "New",           priority: "Warm", city: "Chennai",   requirementType: "2BHK Apartment", followUpInDays: 0,    assignTo: null },
  // Extra unassigned leads — for repeat Assign-page demos
  { name: "Aarav Khanna",   phone: "9000010021", email: "aarav.khanna@demo.com",   source: "Website",    budget: "₹80,00,000",   status: "New",           priority: "Hot",  city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: 0,    assignTo: null },
  { name: "Ishita Rao",     phone: "9000010022", email: "ishita.rao@demo.com",     source: "Facebook",   budget: "₹1,40,00,000", status: "New",           priority: "Hot",  city: "Mumbai",    requirementType: "3BHK Apartment", followUpInDays: 0,    assignTo: null },
  { name: "Kabir Sethi",    phone: "9000010023", email: "kabir.sethi@demo.com",    source: "Google Ads", budget: "₹55,00,000",   status: "New",           priority: "Warm", city: "Bengaluru", requirementType: "1BHK Apartment", followUpInDays: 0,    assignTo: null },
];

const SKYLINE_LEADS = [
  { name: "Ishaan Malhotra", phone: "9000020001", email: "ishaan.m@demo.com",     source: "Website",    budget: "₹1,40,00,000", status: "New",         priority: "Hot",  city: "Mumbai", requirementType: "3BHK Apartment", followUpInDays: 0,    assignTo: "broker" },
  { name: "Kavya Rao",       phone: "9000020002", email: "kavya.rao@demo.com",    source: "Instagram",  budget: "₹80,00,000",   status: "Contacted",   priority: "Warm", city: "Mumbai", requirementType: "2BHK Apartment", followUpInDays: 1,    assignTo: "broker" },
  { name: "Aakash Pandey",   phone: "9000020003", email: "aakash.p@demo.com",     source: "Google Ads", budget: "₹2,80,00,000", status: "Site Visit",  priority: "Hot",  city: "Mumbai", requirementType: "4BHK Apartment", followUpInDays: 2,    assignTo: "broker" },
  { name: "Ritu Saxena",     phone: "9000020004", email: "ritu.saxena@demo.com",  source: "Referral",   budget: "₹95,00,000",   status: "Negotiation", priority: "Hot",  city: "Pune",   requirementType: "3BHK Apartment", followUpInDays: 3,    assignTo: "broker" },
  { name: "Yash Bhatia",     phone: "9000020005", email: "yash.bhatia@demo.com",  source: "IndiaMART",  budget: "₹55,00,000",   status: "Follow Up",   priority: "Cold", city: "Mumbai", requirementType: "1BHK Apartment", followUpInDays: 5,    assignTo: "broker" },
  { name: "Tanvi Mishra",    phone: "9000020006", email: "tanvi.mishra@demo.com", source: "Website",    budget: "₹1,60,00,000", status: "Won",         priority: "Hot",  city: "Mumbai", requirementType: "3BHK Apartment", followUpInDays: null, assignTo: "broker" },
  { name: "Harsh Vora",      phone: "9000020007", email: "harsh.vora@demo.com",   source: "Facebook",   budget: "₹45,00,000",   status: "Lost",        priority: "Cold", city: "Pune",   requirementType: "Plot",           followUpInDays: null, assignTo: "broker" },
  { name: "Simran Kaur",     phone: "9000020008", email: "simran.kaur@demo.com",  source: "JustDial",   budget: "₹1,00,00,000", status: "Qualified",   priority: "Warm", city: "Mumbai", requirementType: "2BHK Apartment", followUpInDays: 1,    assignTo: "broker" },
];

const REALTY_PROJECTS = [
  {
    name: "Demo Heights",
    location: "Baner, Pune",
    type: "RESIDENTIAL",
    priceRange: "₹85,00,000 – ₹2,10,00,000",
    description: "Premium 2 & 3 BHK residences with skyline views, clubhouse, and rooftop infinity pool. RERA-approved tower with possession in late 2027.",
    reraNumber: "P52100012345",
    possessionDate: new Date("2027-12-31"),
  },
  {
    name: "Demo Greens Villas",
    location: "Mulshi, Pune",
    type: "VILLA",
    priceRange: "₹3,50,00,000 – ₹6,00,00,000",
    description: "Gated community of 24 independent villas spread across 8 acres. Each villa includes a private garden, smart-home wiring, and EV charging.",
    reraNumber: "P52100023456",
    possessionDate: new Date("2026-09-30"),
  },
  {
    name: "Demo Business Park",
    location: "Hinjewadi, Pune",
    type: "COMMERCIAL",
    priceRange: "₹1,20,00,000 – ₹8,00,00,000",
    description: "Grade-A office spaces with flexible floor plates, dedicated parking, and in-building food court. Ideal for IT and SaaS tenants.",
    reraNumber: "P52100034567",
    possessionDate: new Date("2027-03-31"),
  },
  {
    name: "Demo Riverside Plots",
    location: "Lonavala, Pune",
    type: "PLOT",
    priceRange: "₹35,00,000 – ₹95,00,000",
    description: "NA-titled residential plots along the Indrayani riverfront. All plots are clear-titled with internal roads, water, and electricity ready.",
    reraNumber: "P52100045678",
    possessionDate: new Date("2026-06-30"),
  },
];

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

async function upsertCompany(cfg) {
  const existing = await prisma.company.findFirst({ where: { name: cfg.name } });
  if (existing) {
    console.log(`SKIP  company "${cfg.name}" (exists, id=${existing.id})`);
    return existing;
  }
  // 7-day trial — matches the real product behavior (planGate.assertTrialActive
  // gates writes once this lapses).
  const trialEndsAt = addDays(new Date(), 7);
  const created = await prisma.company.create({
    data: {
      name: cfg.name,
      type: cfg.type,
      city: cfg.city,
      email: cfg.email,
      phone: cfg.phone,
      subscriptionPlan: cfg.subscriptionPlan,
      trialEndsAt,
      onboardingCompleted: true,
      status: "ACTIVE",
    },
  });
  console.log(`OK    company "${cfg.name}" created (id=${created.id})`);
  return created;
}

async function ensureUser(auth, { email, name, role, companyId, invitedById = null }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role || existing.companyId !== companyId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role, companyId, isActive: true },
      });
      console.log(`UPD   ${email}  → role=${role} companyId=${companyId ?? "null"}`);
    } else {
      console.log(`SKIP  ${email} (already ${role})`);
    }
    return existing;
  }

  await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  const updated = await prisma.user.update({
    where: { email },
    data: {
      role,
      companyId,
      isActive: true,
      invitedById,
      emailVerified: true,
    },
  });
  console.log(`OK    ${email}  role=${role}  password=${PASSWORD}`);
  return updated;
}

async function linkChannelPartnerToCompany(channelPartnerId, companyId, companyName) {
  const now = new Date();
  await prisma.companyChannelPartner.upsert({
    where: { channelPartnerId_companyId: { channelPartnerId, companyId } },
    create: {
      channelPartnerId,
      companyId,
      status: "ACTIVE",
      acceptedAt: now,
      joinedAt: now,
    },
    update: {
      status: "ACTIVE",
      acceptedAt: now,
      joinedAt: now,
      revokedAt: null,
    },
  });
  console.log(`OK    channel partner linked to "${companyName}" (ACTIVE)`);
}

async function seedProjects(label, projects, companyId) {
  let created = 0;
  let skipped = 0;
  const result = [];

  for (const p of projects) {
    const existing = await prisma.project.findFirst({
      where: { companyId, name: p.name },
    });
    if (existing) {
      result.push(existing);
      skipped++;
      continue;
    }
    const project = await prisma.project.create({
      data: { ...p, companyId },
    });
    result.push(project);
    created++;
  }
  console.log(`OK    ${label} projects: ${created} created, ${skipped} skipped`);
  return result;
}

async function linkLeadsToProjects(companyId, projects) {
  if (!projects.length) return;
  // Match leads to projects by requirementType keyword so the linkage looks
  // plausible. Idempotent — only updates leads that don't already have one.
  const typeToProject = {
    Apartment: projects.find((p) => p.type === "RESIDENTIAL"),
    Penthouse: projects.find((p) => p.type === "RESIDENTIAL"),
    Villa:     projects.find((p) => p.type === "VILLA"),
    Plot:      projects.find((p) => p.type === "PLOT"),
  };

  const leads = await prisma.lead.findMany({
    where: { companyId, interestedProjectId: null },
    select: { id: true, requirementType: true },
  });

  let updated = 0;
  for (const lead of leads) {
    const key = Object.keys(typeToProject).find((k) =>
      (lead.requirementType || "").includes(k),
    );
    const project = key ? typeToProject[key] : null;
    if (!project) continue;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { interestedProjectId: project.id },
    });
    updated++;
  }
  console.log(`OK    linked ${updated} existing leads to projects`);
}

// One-time rebalance: if the second agent has 0 active leads and the first
// agent has more than 1, move half of the first agent's active leads over.
// Active = excludes Won/Lost/Booked. Idempotent — after the second agent
// has any active load the function no-ops, so re-running the seed is safe.
async function rebalanceAgentLeads(label, companyId, agentAId, agentBId) {
  if (!agentAId || !agentBId) return;
  const TERMINAL = ["Won", "Lost", "Booked"];
  const aLoad = await prisma.lead.count({
    where: { companyId, assignedToId: agentAId, status: { notIn: TERMINAL } },
  });
  const bLoad = await prisma.lead.count({
    where: { companyId, assignedToId: agentBId, status: { notIn: TERMINAL } },
  });
  if (bLoad > 0 || aLoad < 2) {
    console.log(`SKIP  ${label} rebalance (agent2 has ${bLoad} leads, agent has ${aLoad})`);
    return;
  }
  // Pick the half with even row indices from a deterministic order so
  // re-runs would behave the same if they ever fired (they won't due to
  // the bLoad > 0 guard above).
  const candidates = await prisma.lead.findMany({
    where: { companyId, assignedToId: agentAId, status: { notIn: TERMINAL } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const toMove = candidates.filter((_, i) => i % 2 === 1).map((l) => l.id);
  if (toMove.length === 0) return;
  const r = await prisma.lead.updateMany({
    where: { id: { in: toMove } },
    data: { assignedToId: agentBId },
  });
  console.log(`OK    ${label} rebalanced: moved ${r.count} leads from agent → agent2`);
}

// Backfill FollowUp rows for any lead in the company that has a
// nextFollowUpAt set but no matching pending FollowUp. The dedicated
// Follow-Ups page reads from this table — without these rows the agent's
// Follow-Ups dashboard is empty even though the leads themselves carry a
// next-follow-up date.
async function seedFollowUpsForCompany(label, companyId) {
  const leads = await prisma.lead.findMany({
    where: { companyId, nextFollowUpAt: { not: null } },
    select: { id: true, nextFollowUpAt: true, assignedToId: true, createdById: true },
  });

  let created = 0;
  let skipped = 0;
  for (const lead of leads) {
    const existing = await prisma.followUp.findFirst({
      where: { leadId: lead.id, completedAt: null },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.followUp.create({
      data: {
        companyId,
        leadId: lead.id,
        scheduledAt: lead.nextFollowUpAt,
        createdById: lead.assignedToId || lead.createdById || null,
      },
    });
    created++;
  }
  console.log(`OK    ${label} follow-ups: ${created} created, ${skipped} skipped`);
}

async function seedLeads(label, leads, { companyId, agentId, brokerId, ownerId }) {
  const today = new Date();
  let created = 0;
  let skipped = 0;

  for (const l of leads) {
    const existing = await prisma.lead.findFirst({
      where: { companyId, phone: l.phone },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const assignedToId =
      l.assignTo === null ? null : l.assignTo === "broker" ? brokerId : agentId;
    const nextFollowUpAt =
      l.followUpInDays === null ? null : addDays(today, l.followUpInDays);

    await prisma.lead.create({
      data: {
        name: l.name,
        phone: l.phone,
        email: l.email,
        source: l.source,
        budget: l.budget,
        status: l.status,
        priority: l.priority,
        city: l.city,
        requirementType: l.requirementType,
        nextFollowUpAt,
        assignedToId,
        createdById: ownerId ?? agentId ?? brokerId,
        companyId,
      },
    });
    created++;
  }
  console.log(`OK    ${label} leads: ${created} created, ${skipped} skipped`);
}

async function seedDemoAccounts() {
  console.log("\n=== Seeding demo accounts ===\n");

  const realty = await upsertCompany(COMPANIES.realty);
  const skyline = await upsertCompany(COMPANIES.skyline);

  const { auth } = await initAuth();

  console.log("\n--- Internal users (Demo Realty) ---");
  const userMap = {};
  let ownerId = null;
  for (const u of INTERNAL_USERS) {
    const created = await ensureUser(auth, {
      email: u.email,
      name: u.name,
      role: u.role,
      companyId: u.company === "realty" ? realty.id : skyline.id,
      invitedById: ownerId,
    });
    userMap[u.email] = created;
    if (u.role === "OWNER") ownerId = created.id;
  }

  console.log("\n--- Channel Partner (cross-company) ---");
  // Channel partner users have companyId=null and are linked via
  // CompanyChannelPartner rows. One login, many companies.
  const channelPartner = await ensureUser(auth, {
    email: BROKER.email,
    name: BROKER.name,
    role: "CHANNEL_PARTNER",
    companyId: null,
    invitedById: ownerId,
  });
  await linkChannelPartnerToCompany(channelPartner.id, realty.id, realty.name);
  await linkChannelPartnerToCompany(channelPartner.id, skyline.id, skyline.name);

  console.log("\n--- Projects ---");
  const realtyProjects = await seedProjects("Demo Realty", REALTY_PROJECTS, realty.id);

  console.log("\n--- Leads ---");
  await seedLeads("Demo Realty", REALTY_LEADS, {
    companyId: realty.id,
    agentId: userMap["agent@demo.com"].id,
    brokerId: channelPartner.id,
    ownerId: userMap["owner@demo.com"].id,
  });
  await seedLeads("Skyline Partners", SKYLINE_LEADS, {
    companyId: skyline.id,
    agentId: null,
    brokerId: channelPartner.id,
    ownerId: channelPartner.id,
  });

  await linkLeadsToProjects(realty.id, realtyProjects);

  console.log("\n--- Agent rebalance ---");
  await rebalanceAgentLeads(
    "Demo Realty",
    realty.id,
    userMap["agent@demo.com"]?.id,
    userMap["agent2@demo.com"]?.id,
  );

  console.log("\n--- Follow-Ups ---");
  await seedFollowUpsForCompany("Demo Realty", realty.id);
  await seedFollowUpsForCompany("Skyline Partners", skyline.id);

  console.log("\n=== Demo accounts ready ===");
  console.log("All passwords: Demo@1234\n");
  console.log("  owner@demo.com    OWNER    → Demo Realty");
  console.log("  manager@demo.com  MANAGER  → Demo Realty");
  console.log("  agent@demo.com    AGENT    → Demo Realty");
  console.log("  agent2@demo.com   AGENT    → Demo Realty");
  console.log("  broker@demo.com   CHANNEL_PARTNER  → Demo Realty + Skyline Partners\n");
}

module.exports = { seedDemoAccounts };

// Only run standalone if invoked directly (not when required by prisma/seed.js)
if (require.main === module) {
  seedDemoAccounts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
