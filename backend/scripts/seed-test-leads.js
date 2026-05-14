/* eslint-disable no-console */
const prisma = require("../src/config/prisma");

const AGENT_EMAIL = process.argv[2] || "agent@test.com";

const LEADS = [
  { name: "Rohan Mehta",     phone: "9876500001", email: "rohan.mehta@example.com",   source: "Website",     budget: "₹85,00,000",  status: "New",          priority: "Hot",    city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: 0 },
  { name: "Priya Nair",      phone: "9876500002", email: "priya.nair@example.com",    source: "Facebook",    budget: "₹1,20,00,000", status: "Contacted",    priority: "Hot",    city: "Mumbai",    requirementType: "3BHK Apartment", followUpInDays: 0 },
  { name: "Aditya Singh",    phone: "9876500003", email: "aditya.singh@example.com",  source: "Google Ads",  budget: "₹65,00,000",  status: "Qualified",    priority: "Warm",   city: "Bengaluru", requirementType: "Plot",           followUpInDays: 1 },
  { name: "Sneha Kulkarni",  phone: "9876500004", email: "sneha.k@example.com",       source: "Referral",    budget: "₹2,10,00,000", status: "Proposal Sent",priority: "Hot",    city: "Pune",      requirementType: "Villa",          followUpInDays: 2 },
  { name: "Vikram Iyer",     phone: "9876500005", email: "vikram.iyer@example.com",   source: "Walk-in",     budget: "₹95,00,000",  status: "Negotiation",  priority: "Warm",   city: "Chennai",   requirementType: "3BHK Apartment", followUpInDays: 3 },
  { name: "Anjali Verma",    phone: "9876500006", email: "anjali.verma@example.com",  source: "Instagram",   budget: "₹55,00,000",  status: "Follow Up",    priority: "Cold",   city: "Pune",      requirementType: "1BHK Apartment", followUpInDays: 5 },
  { name: "Karthik Reddy",   phone: "9876500007", email: "karthik.r@example.com",     source: "Website",     budget: "₹1,50,00,000", status: "Won",          priority: "Hot",    city: "Hyderabad", requirementType: "3BHK Apartment", followUpInDays: null },
  { name: "Meera Joshi",     phone: "9876500008", email: "meera.joshi@example.com",   source: "Referral",    budget: "₹78,00,000",  status: "Won",          priority: "Warm",   city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: null },
  { name: "Rahul Khanna",    phone: "9876500009", email: "rahul.khanna@example.com",  source: "Facebook",    budget: "₹40,00,000",  status: "Lost",         priority: "Cold",   city: "Delhi",     requirementType: "Plot",           followUpInDays: null },
  { name: "Divya Sharma",    phone: "9876500010", email: "divya.sharma@example.com",  source: "Google Ads",  budget: "₹90,00,000",  status: "New",          priority: "Warm",   city: "Pune",      requirementType: "2BHK Apartment", followUpInDays: -1 },
];

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function main() {
  const agent = await prisma.user.findFirst({
    where: { email: { equals: AGENT_EMAIL, mode: "insensitive" } },
  });
  if (!agent) throw new Error(`Agent ${AGENT_EMAIL} not found`);

  const owner = await prisma.user.findFirst({
    where: { companyId: agent.companyId, role: "OWNER" },
  });

  console.log(`Seeding ${LEADS.length} leads for ${AGENT_EMAIL} in company ${agent.companyId}`);

  const today = new Date();
  let created = 0;

  for (const l of LEADS) {
    const existing = await prisma.lead.findFirst({
      where: { companyId: agent.companyId, phone: l.phone },
    });
    if (existing) {
      console.log(`SKIP  ${l.name} (phone ${l.phone} already exists)`);
      continue;
    }

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
        assignedToId: agent.id,
        createdById: owner?.id ?? agent.id,
        companyId: agent.companyId,
      },
    });
    created++;
    console.log(`OK    ${l.name}  ${l.status}  ${l.priority}`);
  }

  console.log(`Done. Created ${created} new leads.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
