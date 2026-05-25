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
  const { from, to, projectId, agentId } = query;

  const today = startOfDay(new Date());
  const dateFrom = from ? startOfDay(new Date(from)) : addDays(today, -29);
  const dateTo = to ? startOfDay(new Date(to)) : today;
  const dateToEnd = new Date(dateTo);
  dateToEnd.setHours(23, 59, 59, 999);

  // Prior period mirrors the chosen window so trend % is comparable.
  const windowMs = dateToEnd - dateFrom;
  const priorTo = new Date(dateFrom.getTime() - 1);
  const priorFrom = new Date(priorTo.getTime() - windowMs);

  const [stages, projects, agents] = await Promise.all([
    tenantPrisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    tenantPrisma.project.findMany({ select: { id: true, name: true } }),
    tenantPrisma.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER"] }, isActive: true, deletedAt: null },
      select: { id: true, name: true, email: true, image: true, role: true },
    }),
  ]);
  const wonStageName = stages.find((s) => s.isWon)?.name || "Won";
  const lostStageName = stages.find((s) => s.isLost)?.name || "Lost";

  const baseWhere = {};
  if (projectId) baseWhere.interestedProjectId = projectId;
  if (agentId) baseWhere.assignedToId = agentId;

  const [leads, priorLeads] = await Promise.all([
    tenantPrisma.lead.findMany({
      where: { ...baseWhere, createdAt: { gte: dateFrom, lte: dateToEnd } },
      select: {
        id: true,
        status: true,
        source: true,
        city: true,
        budget: true,
        createdAt: true,
        updatedAt: true,
        assignedToId: true,
        interestedProjectId: true,
        interestedProject: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    tenantPrisma.lead.findMany({
      where: { ...baseWhere, createdAt: { gte: priorFrom, lte: priorTo } },
      select: { id: true, status: true, budget: true },
    }),
  ]);

  const leadIds = leads.map((l) => l.id);

  // Real activity counts in the period (used for the "Calls" metric per agent)
  const activitiesInWindow = leadIds.length
    ? await tenantPrisma.activity.findMany({
        where: {
          leadId: { in: leadIds },
          createdAt: { gte: dateFrom, lte: dateToEnd },
          type: { in: ["CALL", "WHATSAPP", "EMAIL"] },
        },
        select: { type: true, userId: true, leadId: true },
      })
    : [];

  // ----- KPIs (current vs prior) -----
  const wonLeads = leads.filter((l) => l.status === wonStageName);
  const bookings = wonLeads.length;
  const revenue = wonLeads.reduce((s, l) => s + parseBudget(l.budget), 0);
  const avgDeal = bookings ? Math.round(revenue / bookings) : 0;
  const conv = leads.length ? Math.round((bookings / leads.length) * 100) : 0;

  const priorWon = priorLeads.filter((l) => l.status === wonStageName);
  const priorBookings = priorWon.length;
  const priorRevenue = priorWon.reduce((s, l) => s + parseBudget(l.budget), 0);
  const priorAvg = priorBookings ? Math.round(priorRevenue / priorBookings) : 0;
  const priorConv = priorLeads.length
    ? Math.round((priorBookings / priorLeads.length) * 100)
    : 0;

  const kpis = {
    bookings: { value: bookings, delta: percentDelta(bookings, priorBookings) },
    revenue: { value: revenue, delta: percentDelta(revenue, priorRevenue) },
    avgDeal: { value: avgDeal, delta: percentDelta(avgDeal, priorAvg) },
    conversion: { value: conv, delta: percentDelta(conv, priorConv) },
  };

  // ----- Funnel from real pipeline stages (exclude lost-style stages) -----
  const funnel = stages
    .filter((s) => !s.isLost)
    .map((s) => ({
      stage: s.name,
      count: leads.filter((l) => l.status === s.name).length,
    }));

  // ----- Revenue trend by month (year-aware, last 6 months) -----
  const monthBuckets = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = addMonths(today, -i);
    monthBuckets.set(monthKey(d), { label: monthLabel(d), revenue: 0, bookings: 0 });
  }
  for (const l of wonLeads) {
    const k = monthKey(l.updatedAt || l.createdAt);
    if (monthBuckets.has(k)) {
      const b = monthBuckets.get(k);
      b.revenue += parseBudget(l.budget);
      b.bookings += 1;
    }
  }
  const revenueTrend = [...monthBuckets.values()];

  // ----- Sources -----
  const sourceCounts = new Map();
  for (const l of leads) {
    const src = l.source || "Unknown";
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }
  const leadsBySource = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // ----- Cities -----
  const cityCounts = new Map();
  for (const l of leads) {
    if (!l.city) continue;
    cityCounts.set(l.city, (cityCounts.get(l.city) || 0) + 1);
  }
  const leadsByCity = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ----- Conversion by project -----
  const projectMap = new Map(projects.map((p) => [p.id, { id: p.id, name: p.name, leads: 0, booked: 0 }]));
  for (const l of leads) {
    if (!l.interestedProjectId) continue;
    const p = projectMap.get(l.interestedProjectId);
    if (!p) continue;
    p.leads += 1;
    if (l.status === wonStageName) p.booked += 1;
  }
  const projectConversion = [...projectMap.values()]
    .filter((p) => p.leads > 0)
    .map((p) => ({ ...p, conversionRate: p.leads ? Math.round((p.booked / p.leads) * 100) : 0 }))
    .sort((a, b) => b.booked - a.booked || b.leads - a.leads);

  // ----- Agent performance (real call/activity counts) -----
  const agentMap = new Map(
    agents.map((a) => [
      a.id,
      {
        userId: a.id,
        name: a.name || a.email,
        image: a.image,
        leads: 0,
        active: 0,
        booked: 0,
        revenue: 0,
        calls: 0,
        whatsapps: 0,
        emails: 0,
      },
    ]),
  );
  for (const l of leads) {
    if (!l.assignedToId) continue;
    const a = agentMap.get(l.assignedToId);
    if (!a) continue;
    a.leads += 1;
    if (l.status === wonStageName) {
      a.booked += 1;
      a.revenue += parseBudget(l.budget);
    } else if (l.status !== lostStageName) {
      a.active += 1;
    }
  }
  for (const act of activitiesInWindow) {
    if (!act.userId) continue;
    const a = agentMap.get(act.userId);
    if (!a) continue;
    if (act.type === "CALL") a.calls += 1;
    else if (act.type === "WHATSAPP") a.whatsapps += 1;
    else if (act.type === "EMAIL") a.emails += 1;
  }
  const agentPerformance = [...agentMap.values()]
    .map((a) => ({
      ...a,
      conversionRate: a.leads ? Math.round((a.booked / a.leads) * 100) : 0,
    }))
    .sort((a, b) => b.booked - a.booked || b.leads - a.leads);

  // ----- Lifecycle metric kept for callers that still read it -----
  const closedLeads = leads.filter(
    (l) => l.status === wonStageName || l.status === lostStageName,
  );
  let avgTimeToCloseHours = 0;
  if (closedLeads.length > 0) {
    const totalHours = closedLeads.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      const closed = new Date(l.updatedAt || l.createdAt).getTime();
      return sum + Math.max(0, closed - created) / (1000 * 60 * 60);
    }, 0);
    avgTimeToCloseHours = Math.round(totalHours / closedLeads.length);
  }

  return {
    range: {
      from: dateFrom.toISOString(),
      to: dateToEnd.toISOString(),
      priorFrom: priorFrom.toISOString(),
      priorTo: priorTo.toISOString(),
    },
    kpis,
    // Back-compat for any caller still reading `totals`.
    totals: {
      leads: leads.length,
      conversions: bookings,
      conversionRate: conv,
      avgTimeToCloseHours,
      revenueBooked: revenue,
    },
    funnel,
    revenueTrend,
    leadsBySource,
    leadsByCity,
    projectConversion,
    agentPerformance,
  };
}

module.exports = {
  getOwnerDashboard,
  getAgentDashboard,
  getManagerDashboard,
  getReportsDashboard,
};
