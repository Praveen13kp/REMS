const prisma = require("../../config/prisma");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { notify } = require("./notify");

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function sendDailySummaries() {
  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  for (const company of companies) {
    try {
      const tenantPrisma = getTenantPrisma(company.id);
      const owners = await tenantPrisma.user.findMany({
        where: { isActive: true, role: "OWNER" },
        select: { id: true },
      });
      if (owners.length === 0) continue;

      const [newLeads, wonLeads, assignedLeads] = await Promise.all([
        tenantPrisma.lead.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        tenantPrisma.lead.count({
          where: {
            closedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        tenantPrisma.activity.count({
          where: {
            type: "ASSIGNMENT",
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      const title = "Daily summary";
      const body = [
        `New leads: ${newLeads}`,
        wonLeads > 0 ? `Bookings: ${wonLeads}` : null,
        `Leads assigned: ${assignedLeads}`,
      ]
        .filter(Boolean)
        .join(" · ");

      await Promise.all(
        owners.map((o) =>
          notify(tenantPrisma, {
            userId: o.id,
            type: "DAILY_SUMMARY",
            title,
            body,
            link: "/dashboard",
          }),
        ),
      );
    } catch (err) {
      console.error(`daily-summary: failed for company ${company.id}`, err);
    }
  }
}

async function sendWeeklyReports() {
  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = endOfDay(now);

  for (const company of companies) {
    try {
      const tenantPrisma = getTenantPrisma(company.id);
      const owners = await tenantPrisma.user.findMany({
        where: { isActive: true, role: "OWNER" },
        select: { id: true },
      });
      if (owners.length === 0) continue;

      const [newLeads, wonLeads, lostLeads, assignedLeads] = await Promise.all([
        tenantPrisma.lead.count({
          where: {
            createdAt: { gte: weekStart, lte: weekEnd },
          },
        }),
        tenantPrisma.lead.count({
          where: {
            closedAt: { gte: weekStart, lte: weekEnd },
          },
        }),
        tenantPrisma.lead.count({
          where: {
            status: { in: ["Lost", "Not Interested"] },
            updatedAt: { gte: weekStart, lte: weekEnd },
          },
        }),
        tenantPrisma.activity.count({
          where: {
            type: "ASSIGNMENT",
            createdAt: { gte: weekStart, lte: weekEnd },
          },
        }),
      ]);

      const title = "Weekly report";
      const parts = [`New leads: ${newLeads}`, `Bookings: ${wonLeads}`];
      if (lostLeads > 0) parts.push(`Lost: ${lostLeads}`);
      parts.push(`Assigned: ${assignedLeads}`);

      await Promise.all(
        owners.map((o) =>
          notify(tenantPrisma, {
            userId: o.id,
            type: "WEEKLY_REPORT",
            title,
            body: parts.join(" · "),
            link: `/reports`,
          }),
        ),
      );
    } catch (err) {
      console.error(`weekly-report: failed for company ${company.id}`, err);
    }
  }
}

async function sendFollowUpReminders() {
  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

  for (const company of companies) {
    try {
      const tenantPrisma = getTenantPrisma(company.id);
      const [owners, dueFollowUps] = await Promise.all([
        tenantPrisma.user.findMany({
          where: { isActive: true, role: "OWNER" },
          select: { id: true },
        }),
        tenantPrisma.followUp.findMany({
          where: {
            completedAt: null,
            scheduledAt: { gte: now, lte: windowEnd },
          },
          include: {
            lead: { select: { id: true, name: true, assignedToId: true } },
          },
        }),
      ]);

      for (const fu of dueFollowUps) {
        const leadLink = `/leads/${fu.leadId}`;
        const body = `Follow-up scheduled for "${fu.lead?.name}"`;

        // Notify the assigned agent (in-app only — email restricted to owners)
        if (fu.lead?.assignedToId) {
          notify(tenantPrisma, {
            userId: fu.lead.assignedToId,
            type: "FOLLOWUP_REMINDER",
            title: "Follow-up reminder",
            body,
            link: leadLink,
            metadata: { followUpId: fu.id, leadId: fu.leadId },
          });
        }

        // Notify all active owners (in-app + email)
        for (const o of owners) {
          notify(tenantPrisma, {
            userId: o.id,
            type: "FOLLOWUP_REMINDER",
            title: "Follow-up reminder",
            body,
            link: leadLink,
            metadata: { followUpId: fu.id, leadId: fu.leadId },
          });
        }
      }
    } catch (err) {
      console.error(`followup-reminder: failed for company ${company.id}`, err);
    }
  }
}

module.exports = { sendDailySummaries, sendWeeklyReports, sendFollowUpReminders };
