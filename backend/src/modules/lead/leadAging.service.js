// Lead aging detection.
//
// A lead is "stale" when it has been sitting in an ACTIVE pipeline stage
// (anything other than Booked / Lost) without any contact activity for
// AGING_DAYS days. "Last contact" is read from Lead.lastContactedAt, with
// a fallback to Lead.createdAt for leads that have never been touched.
//
// We rely on an Activity row of type SYSTEM with metadata.kind="LEAD_AGING"
// as the idempotency marker — if one was written in the last AGING_DAYS
// days for a given lead, we do not fire again. That means a chronically
// stale lead will re-alert every AGING_DAYS days, which is the desired
// nudge cadence.

const prisma = require("../../config/prisma");
const { logger } = require("../../lib/logger");
const { maskLeadListForRole } = require("./leadPrivacy");

const AGING_DAYS = 7;
const ACTIVE_STATUS_FILTER = { notIn: ["Booked", "Lost"] };

function staleThresholdDate(days = AGING_DAYS) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Used by the API (GET /api/leads/aging) — tenant-scoped, called with
// tenantPrisma so the extension auto-filters by companyId.
async function getAgingLeadsService(tenantPrisma, { days = AGING_DAYS, role } = {}) {
  const cutoff = staleThresholdDate(days);
  const items = await tenantPrisma.lead.findMany({
    where: {
      status: ACTIVE_STATUS_FILTER,
      OR: [
        { lastContactedAt: { lt: cutoff } },
        { AND: [{ lastContactedAt: null }, { createdAt: { lt: cutoff } }] },
      ],
    },
    orderBy: [{ lastContactedAt: "asc" }, { createdAt: "asc" }],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      interestedProject: { select: { id: true, name: true } },
    },
  });
  const enriched = items.map((l) => ({
    ...l,
    _idleSinceMs:
      Date.now() - new Date(l.lastContactedAt || l.createdAt).getTime(),
  }));
  return {
    items: maskLeadListForRole(enriched, role),
    total: items.length,
    days,
  };
}

// Run by the scheduler — global, walks every active stale lead across
// every tenant. Writes one Activity + one Notification per lead per
// AGING_DAYS window, then returns counters for the log line.
async function runAgingTick({ days = AGING_DAYS } = {}) {
  const cutoff = staleThresholdDate(days);
  const stale = await prisma.lead.findMany({
    where: {
      status: ACTIVE_STATUS_FILTER,
      OR: [
        { lastContactedAt: { lt: cutoff } },
        { AND: [{ lastContactedAt: null }, { createdAt: { lt: cutoff } }] },
      ],
    },
    select: {
      id: true,
      name: true,
      companyId: true,
      assignedToId: true,
      lastContactedAt: true,
      createdAt: true,
      status: true,
    },
  });

  let alerted = 0;
  let skipped = 0;
  for (const lead of stale) {
    // Idempotency: skip if any LEAD_AGING activity was written for this
    // lead inside the current AGING window.
    const recent = await prisma.activity.findFirst({
      where: {
        leadId: lead.id,
        type: "SYSTEM",
        createdAt: { gte: cutoff },
      },
      select: { id: true, metadata: true },
    });
    if (recent && recent.metadata && recent.metadata.kind === "LEAD_AGING") {
      skipped++;
      continue;
    }

    const idleSinceMs =
      Date.now() - new Date(lead.lastContactedAt || lead.createdAt).getTime();
    const idleDays = Math.floor(idleSinceMs / (24 * 60 * 60 * 1000));

    try {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          companyId: lead.companyId,
          type: "SYSTEM",
          content: `No contact in ${idleDays} day${idleDays === 1 ? "" : "s"} — lead has gone stale.`,
          metadata: { kind: "LEAD_AGING", idleDays, threshold: days },
        },
      });

      // Notify the assigned owner; if unassigned, notify every active
      // OWNER / ADMIN / MANAGER in the tenant so the lead doesn't drop
      // through the cracks.
      const recipientIds = lead.assignedToId
        ? [lead.assignedToId]
        : (
            await prisma.user.findMany({
              where: {
                companyId: lead.companyId,
                isActive: true,
                role: { in: ["OWNER", "ADMIN", "MANAGER"] },
              },
              select: { id: true },
            })
          ).map((u) => u.id);

      await Promise.all(
        recipientIds.map((uid) =>
          prisma.notification.create({
            data: {
              userId: uid,
              companyId: lead.companyId,
              type: "LEAD_AGING",
              title: "Stale lead needs follow-up",
              body: `"${lead.name}" has had no contact for ${idleDays} day${idleDays === 1 ? "" : "s"}.`,
              link: `/leads/${lead.id}`,
              metadata: { leadId: lead.id, idleDays, threshold: days },
            },
          }),
        ),
      );

      alerted++;
    } catch (err) {
      logger.warn(
        { leadId: lead.id, err: err?.message },
        "lead-aging: failed to alert",
      );
    }
  }

  return { scanned: stale.length, alerted, skipped };
}

module.exports = {
  AGING_DAYS,
  getAgingLeadsService,
  runAgingTick,
  staleThresholdDate,
};
