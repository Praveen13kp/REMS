// Dashboard aggregates. All queries scoped via tenantPrisma.

function parseBudget(value) {
  if (!value) return 0;
  const digits = String(value).replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function ymdKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d) {
  return new Date(d).toLocaleDateString("en-IN", { month: "short" });
}

async function getOwnerDashboard(tenantPrisma) {
  const stages = await tenantPrisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
  });
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";

  const today = startOfDay(new Date());
  const trendStart = addDays(today, -29); // inclusive 30-day window ending today
  const monthsStart = startOfDay(addMonths(today, -5));
  monthsStart.setDate(1);
  const weekStart = addDays(today, -6);

  const [leads, agents] = await Promise.all([
    tenantPrisma.lead.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        source: true,
        budget: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
        interestedProject: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    tenantPrisma.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER", "ADMIN"] }, isActive: true },
      select: { id: true, name: true, email: true, image: true, role: true },
    }),
  ]);

  // KPIs
  const totalLeads = leads.length;
  const newLeadsThisWeek = leads.filter((l) => l.createdAt >= weekStart).length;
  const wonLeads = leads.filter((l) => l.status === wonStageName);
  const convertedCount = wonLeads.length;
  const revenueBooked = wonLeads.reduce((sum, l) => sum + parseBudget(l.budget), 0);

  // 30-day trend
  const trendBuckets = new Map();
  for (let i = 0; i < 30; i++) {
    trendBuckets.set(ymdKey(addDays(trendStart, i)), 0);
  }
  for (const l of leads) {
    const key = ymdKey(l.createdAt);
    if (trendBuckets.has(key)) {
      trendBuckets.set(key, trendBuckets.get(key) + 1);
    }
  }
  const leadsTrend = [...trendBuckets.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  // Status breakdown (use pipeline stage order)
  const statusCounts = new Map();
  for (const stage of stages) statusCounts.set(stage.name, 0);
  for (const l of leads) {
    if (statusCounts.has(l.status)) {
      statusCounts.set(l.status, statusCounts.get(l.status) + 1);
    } else {
      statusCounts.set(l.status, 1);
    }
  }
  const leadsByStatus = [...statusCounts.entries()].map(([status, count]) => ({
    status,
    count,
  }));

  // Lead sources
  const sourceCounts = new Map();
  for (const l of leads) {
    const src = l.source || "Unknown";
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }
  const leadsBySource = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly bookings — last 6 months (using updatedAt as proxy for booking date)
  const monthBuckets = new Map();
  for (let i = 0; i < 6; i++) {
    const d = addMonths(monthsStart, i);
    monthBuckets.set(monthKey(d), { month: monthLabel(d), count: 0 });
  }
  for (const l of wonLeads) {
    const key = monthKey(l.updatedAt);
    if (monthBuckets.has(key)) {
      monthBuckets.get(key).count++;
    }
  }
  const monthlyBookings = [...monthBuckets.values()];

  // Recent leads (top 6)
  const recentLeads = leads.slice(0, 6).map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    status: l.status,
    budget: l.budget,
    projectName: l.interestedProject?.name || null,
    assignedTo: l.assignedTo
      ? {
          id: l.assignedTo.id,
          name: l.assignedTo.name,
          email: l.assignedTo.email,
          image: l.assignedTo.image,
        }
      : null,
    createdAt: l.createdAt,
  }));

  // Top agents by revenue
  const agentStats = new Map();
  for (const a of agents) {
    agentStats.set(a.id, {
      userId: a.id,
      name: a.name,
      email: a.email,
      image: a.image,
      role: a.role,
      leads: 0,
      booked: 0,
      revenue: 0,
    });
  }
  for (const l of leads) {
    if (!l.assignedToId || !agentStats.has(l.assignedToId)) continue;
    const s = agentStats.get(l.assignedToId);
    s.leads++;
    if (l.status === wonStageName) {
      s.booked++;
      s.revenue += parseBudget(l.budget);
    }
  }
  const topAgents = [...agentStats.values()]
    .sort((a, b) => b.revenue - a.revenue || b.booked - a.booked)
    .slice(0, 5);

  return {
    totals: {
      totalLeads,
      newLeadsThisWeek,
      convertedCount,
      revenueBooked,
    },
    leadsTrend,
    leadsByStatus,
    leadsBySource,
    monthlyBookings,
    recentLeads,
    topAgents,
  };
}

async function getAgentDashboard(tenantPrisma, userId) {
  const stages = await tenantPrisma.pipelineStage.findMany();
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const myLeads = await tenantPrisma.lead.findMany({
    where: { assignedToId: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      priority: true,
      budget: true,
      nextFollowUpAt: true,
      createdAt: true,
      updatedAt: true,
      interestedProject: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const total = myLeads.length;
  const byStatus = {};
  for (const l of myLeads) byStatus[l.status] = (byStatus[l.status] || 0) + 1;

  const todayFollowUps = myLeads.filter(
    (l) =>
      l.nextFollowUpAt &&
      l.nextFollowUpAt >= today &&
      l.nextFollowUpAt < tomorrow,
  ).length;

  const hotLeads = myLeads.filter((l) => l.priority === "Hot").length;
  const bookings = myLeads.filter((l) => l.status === wonStageName).length;
  const leadsThisMonth = myLeads.filter((l) => l.createdAt >= monthStart).length;

  const activeLeads = myLeads
    .filter((l) => l.status !== wonStageName)
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      priority: l.priority,
      budget: l.budget,
      projectName: l.interestedProject?.name || null,
      updatedAt: l.updatedAt,
    }));

  return {
    myLeads: { total, byStatus },
    todayFollowUps,
    hotLeads,
    bookings,
    leadsThisMonth,
    activeLeads,
  };
}

module.exports = {
  getOwnerDashboard,
  getAgentDashboard,
};
