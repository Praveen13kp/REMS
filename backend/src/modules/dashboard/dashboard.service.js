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

function percentDelta(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function getOwnerDashboard(tenantPrisma) {
  const stages = await tenantPrisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
  });
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";

  const today = startOfDay(new Date());
  const trendStart = addDays(today, -29);
  const priorPeriodStart = addDays(today, -59);
  const priorPeriodEnd = addDays(today, -30);
  const monthsStart = startOfDay(addMonths(today, -5));
  monthsStart.setDate(1);
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);
  const prevWeekEnd = addDays(today, -7);

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
  const newLeadsPrevWeek = leads.filter(
    (l) => l.createdAt >= prevWeekStart && l.createdAt < prevWeekEnd,
  ).length;
  const wonLeads = leads.filter((l) => l.status === wonStageName);
  const convertedCount = wonLeads.length;
  const revenueBooked = wonLeads.reduce((sum, l) => sum + parseBudget(l.budget), 0);

  // Prior period KPIs for trend delta
  const wonLeadsPrior = leads.filter(
    (l) =>
      l.status === wonStageName &&
      l.updatedAt >= priorPeriodStart &&
      l.updatedAt < priorPeriodEnd,
  );
  const convertedCountPrior = wonLeadsPrior.length;
  const revenueBookedPrior = wonLeadsPrior.reduce((sum, l) => sum + parseBudget(l.budget), 0);

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
    trend: {
      newLeadsDelta: percentDelta(newLeadsThisWeek, newLeadsPrevWeek),
      convertedDelta: percentDelta(convertedCount, convertedCountPrior),
      revenueDelta: percentDelta(revenueBooked, revenueBookedPrior),
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

async function getManagerDashboard(tenantPrisma) {
  const stages = await tenantPrisma.pipelineStage.findMany();
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";
  const lostStageName = stages.find((s) => s.isLost)?.name || "Lost";

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // "Team" = AGENT-role active users in the company. Schema has no
  // explicit manager hierarchy; MANAGER sees the whole sales team.
  const [leads, teamAgents] = await Promise.all([
    tenantPrisma.lead.findMany({
      select: {
        id: true,
        status: true,
        priority: true,
        assignedToId: true,
        nextFollowUpAt: true,
        createdAt: true,
      },
    }),
    tenantPrisma.user.findMany({
      where: { role: "AGENT", isActive: true },
      select: { id: true, name: true, email: true, image: true },
    }),
  ]);

  const totalLeads = leads.length;
  const bookedCount = leads.filter((l) => l.status === wonStageName).length;
  const conversionRate =
    totalLeads > 0 ? Math.round((bookedCount / totalLeads) * 100) : 0;

  const pendingFollowUps = leads.filter(
    (l) =>
      l.nextFollowUpAt &&
      l.nextFollowUpAt < tomorrow &&
      l.status !== wonStageName &&
      l.status !== lostStageName,
  ).length;

  const activeAgentsCount = teamAgents.length;

  // Per-agent stats
  const byAgent = new Map();
  for (const a of teamAgents) {
    byAgent.set(a.id, {
      userId: a.id,
      name: a.name,
      email: a.email,
      image: a.image,
      totalLeads: 0,
      booked: 0,
      conversionRate: 0,
    });
  }
  for (const l of leads) {
    if (!l.assignedToId || !byAgent.has(l.assignedToId)) continue;
    const s = byAgent.get(l.assignedToId);
    s.totalLeads++;
    if (l.status === wonStageName) s.booked++;
  }
  const teamPerformance = [...byAgent.values()]
    .map((s) => ({
      ...s,
      conversionRate:
        s.totalLeads > 0 ? Math.round((s.booked / s.totalLeads) * 100) : 0,
    }))
    .sort((a, b) => b.booked - a.booked || b.totalLeads - a.totalLeads);

  return {
    totals: {
      assignedLeads: totalLeads,
      pendingFollowUps,
      conversionRate,
      activeAgentsCount,
    },
    teamPerformance,
  };
}

async function getReportsDashboard(tenantPrisma, query) {
  const {
    from,
    to,
    projectId,
    agentId,
  } = query;

  const today = startOfDay(new Date());
  const dateFrom = from ? startOfDay(new Date(from)) : addDays(today, -29);
  const dateTo = to ? startOfDay(new Date(to)) : today;

  const stages = await tenantPrisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
  });
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";

  const where = {
    createdAt: { gte: dateFrom, lte: dateTo },
  };
  if (projectId) where.interestedProjectId = projectId;
  if (agentId) where.assignedToId = agentId;

  const leads = await tenantPrisma.lead.findMany({
    where,
    select: {
      id: true,
      status: true,
      source: true,
      budget: true,
      createdAt: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const totalLeads = leads.length;
  const conversions = leads.filter((l) => l.status === wonStageName).length;
  const conversionRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0;
  const revenueBooked = leads
    .filter((l) => l.status === wonStageName)
    .reduce((sum, l) => sum + parseBudget(l.budget), 0);

  // avgTimeToCloseHours: estimate time from lead creation to reaching won stage
  const closedLeads = leads.filter(
    (l) => l.status === wonStageName || l.status === (stages.find((s) => s.isLost)?.name || "Lost"),
  );
  let avgTimeToCloseHours = 0;
  if (closedLeads.length > 0) {
    const now = Date.now();
    const totalHours = closedLeads.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      return sum + (now - created) / (1000 * 60 * 60);
    }, 0);
    avgTimeToCloseHours = Math.round(totalHours / closedLeads.length);
  }

  // Funnel by stage
  const funnel = stages.map((s) => {
    const count = leads.filter((l) => l.status === s.name).length;
    return { stage: s.name, count };
  });

  // Sources
  const sourceCounts = new Map();
  for (const l of leads) {
    const src = l.source || "Unknown";
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }
  const leadsBySource = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Daily bucketing
  const dayBuckets = new Map();
  const diffDays = Math.ceil((dateTo - dateFrom) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < Math.min(diffDays, 90); i++) {
    dayBuckets.set(ymdKey(addDays(dateFrom, i)), 0);
  }
  for (const l of leads) {
    const key = ymdKey(l.createdAt);
    if (dayBuckets.has(key)) {
      dayBuckets.set(key, dayBuckets.get(key) + 1);
    }
  }
  const leadsByDay = [...dayBuckets.entries()].map(([date, count]) => ({ date, count }));

  // Top agents
  const agentMap = new Map();
  for (const l of leads) {
    if (!l.assignedToId) continue;
    if (!agentMap.has(l.assignedToId)) {
      const a = l.assignedTo;
      agentMap.set(l.assignedToId, {
        userId: l.assignedToId,
        name: a?.name || "Unknown",
        leads: 0,
        booked: 0,
        conversionRate: 0,
      });
    }
    const s = agentMap.get(l.assignedToId);
    s.leads++;
    if (l.status === wonStageName) s.booked++;
  }
  const topAgents = [...agentMap.values()]
    .map((a) => ({
      ...a,
      conversionRate: a.leads > 0 ? Math.round((a.booked / a.leads) * 100) : 0,
    }))
    .sort((a, b) => b.booked - a.booked || b.leads - a.leads)
    .slice(0, 10);

  return {
    totals: { leads: totalLeads, conversions, conversionRate, avgTimeToCloseHours, revenueBooked },
    funnel,
    leadsBySource,
    leadsByDay,
    topAgents,
  };
}

module.exports = {
  getOwnerDashboard,
  getAgentDashboard,
  getManagerDashboard,
  getReportsDashboard,
};
