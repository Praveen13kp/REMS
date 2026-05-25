const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { notify } = require("../notification/notify");
const { getTenantPrisma } = require("../../lib/tenantPrisma");

// Owner-side: list every Channel Partner connected to this company,
// regardless of status, with a few quick stats per partner so the admin
// page can render leaderboard rows without N extra queries.
async function listPartners(companyId) {
  const links = await prisma.companyChannelPartner.findMany({
    where: { companyId },
    select: {
      id: true,
      status: true,
      invitedAt: true,
      acceptedAt: true,
      joinedAt: true,
      revokedAt: true,
      channelPartner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  const cpIds = links.map((l) => l.channelPartner.id);
  if (cpIds.length === 0) return [];

  // Aggregate per-CP stats restricted to this company:
  // - sharedLeads: count of active ChannelPartnerShare rows
  // - dealsWon: leads with status "Won" or "Booked" from this CP
  // - dealsLost: status "Lost"
  // - conversionRate: won / (won + lost) * 100, two decimals
  const [shareAgg, leadAgg] = await Promise.all([
    prisma.channelPartnerShare.groupBy({
      by: ["channelPartnerId"],
      where: {
        companyId,
        channelPartnerId: { in: cpIds },
        status: "ACTIVE",
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["channelPartnerId", "status"],
      where: {
        companyId,
        channelPartnerId: { in: cpIds },
      },
      _count: { _all: true },
    }),
  ]);

  const shareByCP = Object.fromEntries(
    shareAgg.map((r) => [r.channelPartnerId, r._count._all]),
  );
  const leadsByCP = {};
  for (const r of leadAgg) {
    if (!leadsByCP[r.channelPartnerId]) leadsByCP[r.channelPartnerId] = {};
    leadsByCP[r.channelPartnerId][r.status] = r._count._all;
  }

  return links.map((l) => {
    const cp = l.channelPartner;
    const byStatus = leadsByCP[cp.id] || {};
    const won = (byStatus["Won"] || 0) + (byStatus["Booked"] || 0);
    const lost = byStatus["Lost"] || 0;
    const totalLeads = Object.values(byStatus).reduce((s, n) => s + n, 0);
    const conversionRate = won + lost > 0 ? +((won / (won + lost)) * 100).toFixed(2) : 0;
    return {
      id: cp.id,
      name: cp.name,
      email: cp.email,
      phone: cp.phone,
      image: cp.image,
      isActive: cp.isActive,
      joinedAt: l.joinedAt || l.acceptedAt,
      invitedAt: l.invitedAt,
      revokedAt: l.revokedAt,
      status: l.status,
      linkId: l.id,
      stats: {
        sharedLeads: shareByCP[cp.id] || 0,
        totalLeads,
        dealsWon: won,
        dealsLost: lost,
        conversionRate,
      },
    };
  });
}

async function getPartner(companyId, channelPartnerId) {
  const link = await prisma.companyChannelPartner.findUnique({
    where: { channelPartnerId_companyId: { channelPartnerId, companyId } },
    select: {
      id: true,
      status: true,
      invitedAt: true,
      acceptedAt: true,
      joinedAt: true,
      revokedAt: true,
      channelPartner: {
        select: { id: true, name: true, email: true, phone: true, image: true, isActive: true, createdAt: true },
      },
    },
  });
  if (!link) throw new ApiError(404, "Channel partner not found");

  const [leads, activities] = await Promise.all([
    prisma.lead.findMany({
      where: { companyId, channelPartnerId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        source: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { companyId, userId: channelPartnerId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, type: true, content: true, createdAt: true, leadId: true },
    }),
  ]);

  return { partner: link, leads, activities };
}

// Revoke a CP's access to this company. Flips the link to REVOKED and
// also kills any active shares so the CP no longer sees the leads.
async function revokePartner(companyId, channelPartnerId) {
  const link = await prisma.companyChannelPartner.findUnique({
    where: { channelPartnerId_companyId: { channelPartnerId, companyId } },
  });
  if (!link) throw new ApiError(404, "Channel partner not found");
  await prisma.$transaction([
    prisma.companyChannelPartner.update({
      where: { id: link.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),
    prisma.channelPartnerShare.updateMany({
      where: { companyId, channelPartnerId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),
  ]);
  return { ok: true };
}

// Owner/manager sends one of the company's leads to a connected
// Channel Partner. Sets assignedToId on the lead, stamps Lead.visibility
// with the level the company picked (FULL / PARTIAL / ANONYMOUS), and
// writes a ChannelPartnerShare row so the link is auditable + revocable.
//
// Returns the share id + the lead's new state.
async function shareLeadWithPartner(companyId, channelPartnerId, leadId, { visibility = "FULL", actorId }) {
  // Verify the CP is an active partner of this company.
  const link = await prisma.companyChannelPartner.findUnique({
    where: { channelPartnerId_companyId: { channelPartnerId, companyId } },
  });
  if (!link || link.status !== "ACTIVE") {
    throw new ApiError(404, "Channel partner not found");
  }

  // Verify the lead belongs to this company.
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId },
    select: { id: true, name: true, assignedToId: true },
  });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  // Persist the share + assignment + visibility atomically.
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { assignedToId: channelPartnerId, visibility },
    });
    await tx.channelPartnerShare.upsert({
      where: { leadId_companyId: { leadId, companyId } },
      create: {
        leadId,
        companyId,
        channelPartnerId,
        visibility,
        status: "ACTIVE",
      },
      update: {
        channelPartnerId,
        visibility,
        status: "ACTIVE",
        revokedAt: null,
      },
    });
    await tx.activity.create({
      data: {
        companyId,
        leadId,
        userId: actorId,
        type: "ASSIGNMENT",
        content: `Shared with channel partner (visibility: ${visibility})`,
      },
    });
  });

  // Notify the CP. The notification is user-scoped so it reaches them
  // regardless of which company they're currently viewing.
  try {
    const cp = await prisma.user.findUnique({
      where: { id: channelPartnerId },
      select: { id: true },
    });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (cp && company) {
      // notify() needs a tenantPrisma; use the company's so the
      // Notification row gets the right companyId.
      const tenantPrisma = getTenantPrisma(companyId);
      await notify(tenantPrisma, {
        userId: cp.id,
        type: "LEAD_ASSIGNED",
        title: `${company.name} shared a lead with you`,
        body: `"${lead.name}" — visibility: ${visibility}`,
        link: `/cp/leads/${leadId}`,
        metadata: { kind: "COMPANY_SHARED_LEAD", leadId, companyId, visibility },
      });
    }
  } catch {
    // notification failures don't fail the share
  }

  return { ok: true, leadId, channelPartnerId, visibility };
}

// Reactivate a previously-revoked link (idempotent).
async function reactivatePartner(companyId, channelPartnerId) {
  const link = await prisma.companyChannelPartner.findUnique({
    where: { channelPartnerId_companyId: { channelPartnerId, companyId } },
  });
  if (!link) throw new ApiError(404, "Channel partner not found");
  await prisma.companyChannelPartner.update({
    where: { id: link.id },
    data: { status: "ACTIVE", revokedAt: null, joinedAt: link.joinedAt || new Date() },
  });
  return { ok: true };
}

module.exports = {
  listPartners,
  getPartner,
  revokePartner,
  reactivatePartner,
  shareLeadWithPartner,
};
