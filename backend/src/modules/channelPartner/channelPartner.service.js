const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { notify } = require("../notification/notify");
const { logActivity } = require("../activity/activity.service");
const { maskLeadForRole, maskLeadListForRole } = require("../lead/leadPrivacy");

// Returns the company IDs this Channel Partner is currently ACTIVE on.
// All CP-facing queries scope through this — a CP can never see a
// company they're not linked to (or whose link has been REVOKED).
async function activeCompanyIds(channelPartnerId) {
  const rows = await prisma.companyChannelPartner.findMany({
    where: { channelPartnerId, status: "ACTIVE" },
    select: { companyId: true },
  });
  return rows.map((r) => r.companyId);
}

async function listCompanies(channelPartnerId) {
  const rows = await prisma.companyChannelPartner.findMany({
    where: { channelPartnerId, status: { in: ["ACTIVE", "INVITED"] } },
    select: {
      status: true,
      acceptedAt: true,
      joinedAt: true,
      invitedAt: true,
      company: {
        select: { id: true, name: true, city: true, logoUrl: true, brandColor: true },
      },
    },
    orderBy: { invitedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.company.id,
    name: r.company.name,
    city: r.company.city,
    logoUrl: r.company.logoUrl,
    brandColor: r.company.brandColor,
    status: r.status,
    invitedAt: r.invitedAt,
    acceptedAt: r.acceptedAt,
    joinedAt: r.joinedAt,
  }));
}

// Resolve the company a CP query targets. The CP MUST have an ACTIVE link
// to the company they're trying to read/write. Throws 404 otherwise.
async function resolveCompany(channelPartnerId, companyId) {
  if (!companyId) {
    throw new ApiError(400, "companyId is required for this operation");
  }
  const active = await activeCompanyIds(channelPartnerId);
  if (!active.includes(companyId)) {
    throw new ApiError(404, "Company not found");
  }
  return companyId;
}

// Save the company the CP last switched to. The FE sticks the selection
// in localStorage too, but persisting it server-side means switching
// browsers / devices keeps the context.
async function setDefaultCompany(channelPartnerId, companyId) {
  // No-op if the CP isn't actually linked to that company.
  await resolveCompany(channelPartnerId, companyId);
  await prisma.user.update({
    where: { id: channelPartnerId },
    data: { defaultCompanyId: companyId },
  });
  return { ok: true, defaultCompanyId: companyId };
}

async function dashboard(channelPartnerId, companyId) {
  if (companyId) {
    await resolveCompany(channelPartnerId, companyId);
  }
  const scope = companyId
    ? [companyId]
    : await activeCompanyIds(channelPartnerId);
  if (scope.length === 0) {
    return {
      totalLeads: 0,
      hotLeads: 0,
      tasksToday: 0,
      sharedLeads: 0,
      privateLeads: 0,
      recentActivity: [],
      perCompany: [],
    };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // privateLeads = leads this CP created that haven't been shared with any
  // company yet (channelPartnerId set, no ChannelPartnerShare rows).
  // sharedLeads = active shares the CP currently owns across the scope.
  const [
    totalLeads,
    hotLeads,
    tasksToday,
    sharedLeads,
    privateLeadsRows,
    recentActivity,
    perCompanyAgg,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        companyId: { in: scope },
        OR: [{ assignedToId: channelPartnerId }, { channelPartnerId }],
      },
    }),
    prisma.lead.count({
      where: {
        companyId: { in: scope },
        priority: "Hot",
        OR: [{ assignedToId: channelPartnerId }, { channelPartnerId }],
      },
    }),
    prisma.task.count({
      where: {
        companyId: { in: scope },
        assignedToId: channelPartnerId,
        dueAt: { gte: startOfDay, lt: endOfDay },
        status: { not: "COMPLETED" },
      },
    }),
    prisma.channelPartnerShare.count({
      where: { channelPartnerId, status: "ACTIVE", companyId: { in: scope } },
    }),
    prisma.lead.findMany({
      where: { channelPartnerId, companyId: { in: scope } },
      select: { id: true },
    }),
    prisma.activity.findMany({
      where: {
        companyId: { in: scope },
        OR: [{ userId: channelPartnerId }, { lead: { channelPartnerId } }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        content: true,
        createdAt: true,
        leadId: true,
        companyId: true,
      },
    }),
    prisma.lead.groupBy({
      by: ["companyId", "status"],
      where: {
        companyId: { in: scope },
        OR: [{ assignedToId: channelPartnerId }, { channelPartnerId }],
      },
      _count: { _all: true },
    }),
  ]);

  // Hydrate company names for the per-company breakdown.
  const companies = await prisma.company.findMany({
    where: { id: { in: scope } },
    select: { id: true, name: true },
  });
  const perCompany = companies.map((c) => {
    const buckets = perCompanyAgg.filter((r) => r.companyId === c.id);
    return {
      companyId: c.id,
      companyName: c.name,
      totalLeads: buckets.reduce((s, b) => s + b._count._all, 0),
      byStatus: buckets.reduce((acc, b) => {
        acc[b.status] = b._count._all;
        return acc;
      }, {}),
    };
  });

  return {
    totalLeads,
    hotLeads,
    tasksToday,
    sharedLeads,
    privateLeads: privateLeadsRows.length,
    recentActivity,
    perCompany,
  };
}

// listLeads — returns leads this CP can see for the given company. Three
// tabs are supported through `scope`:
//   - "shared":  leads the company shared with this CP (assigned to them)
//   - "own":     leads the CP created for/shared into this company
//   - "private": leads the CP created that haven't been shared anywhere
async function listLeads(channelPartnerId, { companyId, scope = "shared" }) {
  if (scope === "private") {
    // Private = CP-owned leads with no ChannelPartnerShare rows. These
    // are NOT visible to any company; they live in the CP's pool until
    // the CP chooses to share. companyId is ignored in this mode.
    const all = await prisma.lead.findMany({
      where: { channelPartnerId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: leadListSelect(),
    });
    // Filter out leads that already have at least one active share.
    const ids = all.map((l) => l.id);
    if (ids.length === 0) return [];
    const shares = await prisma.channelPartnerShare.findMany({
      where: { leadId: { in: ids }, status: "ACTIVE" },
      select: { leadId: true },
    });
    const sharedSet = new Set(shares.map((s) => s.leadId));
    // Private leads were created by this CP — they always see them raw,
    // but maskLeadListForRole still respects that via the channelPartnerId
    // == viewerUserId branch in maskLeadForRole.
    return maskLeadListForRole(
      all.filter((l) => !sharedSet.has(l.id)),
      "CHANNEL_PARTNER",
      channelPartnerId,
    );
  }

  // For shared/own we need a company scope.
  const targetCompany = await resolveCompany(channelPartnerId, companyId);
  const where = { companyId: targetCompany };
  if (scope === "own") {
    where.channelPartnerId = channelPartnerId;
  } else {
    // "shared" = the company assigned the lead to this CP
    where.assignedToId = channelPartnerId;
  }
  const items = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: leadListSelect(),
  });
  // Apply Lead.visibility (FULL / PARTIAL / ANONYMOUS) — masks phone+email
  // for PARTIAL, plus anonymises name for ANONYMOUS. CP-authored leads
  // (own scope, lead.channelPartnerId === channelPartnerId) skip masking.
  return maskLeadListForRole(items, "CHANNEL_PARTNER", channelPartnerId);
}

function leadListSelect() {
  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    status: true,
    priority: true,
    source: true,
    visibility: true,
    companyId: true,
    channelPartnerId: true,
    company: { select: { id: true, name: true } },
    updatedAt: true,
    createdAt: true,
  };
}

async function getLead(channelPartnerId, leadId) {
  const scope = await activeCompanyIds(channelPartnerId);
  // CP can see a lead if it belongs to one of their active companies
  // OR if they created it (private leads). The OR makes the empty-scope
  // case still resolve their private leads.
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      OR: [
        ...(scope.length > 0 ? [{ companyId: { in: scope } }] : []),
        { channelPartnerId },
      ],
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      company: { select: { id: true, name: true } },
      channelPartnerShares: {
        select: {
          id: true,
          companyId: true,
          visibility: true,
          status: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }
  // Apply per-lead visibility before returning. CP-authored leads are
  // returned raw via the channelPartnerId === viewerUserId branch.
  return maskLeadForRole(lead, "CHANNEL_PARTNER", channelPartnerId);
}

// Add a new lead.
//
// Two modes:
//   - "Private" (visibleToCompany=false OR no companyId supplied):
//     companyId stays NULL on the row. Tenant-scoped queries can't see
//     it. The lead lives in the CP's private pool until they share it
//     with a company later via /leads/:id/share.
//   - "Shared" (visibleToCompany=true AND companyId supplied):
//     companyId is set, an ACTIVE ChannelPartnerShare row is created,
//     and the company's OWNER/MANAGER get a LEAD_CREATED notification.
async function addLead(channelPartnerId, { companyId, visibleToCompany = true, visibility = "FULL", ...payload }) {
  const wantsShare = visibleToCompany !== false && !!companyId;
  let targetCompany = null;
  if (wantsShare) {
    targetCompany = await resolveCompany(channelPartnerId, companyId);
  }

  const lead = await prisma.lead.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email || null,
      source: payload.source || "Channel Partner",
      budget: payload.budget || null,
      city: payload.city || null,
      requirementType: payload.requirementType || null,
      priority: payload.priority || null,
      possessionTimeline: payload.possessionTimeline || null,
      interestedProjectId: payload.interestedProjectId || null,
      companyId: targetCompany, // null = private pool
      createdById: channelPartnerId,
      channelPartnerId,
      visibility,
    },
  });

  if (wantsShare) {
    await prisma.channelPartnerShare.create({
      data: {
        leadId: lead.id,
        companyId: targetCompany,
        channelPartnerId,
        visibility,
        status: "ACTIVE",
      },
    });
    // Notify the company's OWNER + MANAGER that a CP added a lead.
    try {
      const tenantPrisma = require("../../lib/tenantPrisma").getTenantPrisma(targetCompany);
      const recipients = await prisma.user.findMany({
        where: {
          companyId: targetCompany,
          role: { in: ["OWNER", "ADMIN", "MANAGER"] },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      const cp = await prisma.user.findUnique({
        where: { id: channelPartnerId },
        select: { name: true, email: true },
      });
      for (const r of recipients) {
        await notify(tenantPrisma, {
          userId: r.id,
          type: "LEAD_CREATED",
          title: `New lead from Channel Partner`,
          body: `${cp?.name || cp?.email || "A channel partner"} shared "${lead.name}" with you.`,
          link: `/admin/leads/${lead.id}`,
          metadata: { kind: "CP_LEAD_SHARED", leadId: lead.id, channelPartnerId },
        });
      }
    } catch {
      // notification failure shouldn't fail the lead create
    }
  }

  return lead;
}

// Share an existing private lead with a company (or change visibility on an
// existing share). When the lead was private and now becomes visible, the
// company-side immediately sees it on next refresh.
async function shareLead(channelPartnerId, leadId, { companyId, visibility = "FULL" }) {
  const targetCompany = await resolveCompany(channelPartnerId, companyId);
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, channelPartnerId },
  });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const share = await prisma.channelPartnerShare.upsert({
    where: { leadId_companyId: { leadId, companyId: targetCompany } },
    create: {
      leadId,
      companyId: targetCompany,
      channelPartnerId,
      visibility,
      status: "ACTIVE",
    },
    update: { visibility, status: "ACTIVE", revokedAt: null },
  });

  // If the lead lives in a different company today (CP originally created
  // it elsewhere), we duplicate it into the target company under the same
  // channelPartnerId. This implements the "one lead, multiple companies"
  // requirement without copying contact data anywhere the CP didn't intend.
  if (lead.companyId !== targetCompany) {
    const dup = await prisma.lead.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        budget: lead.budget,
        status: "New",
        requirementType: lead.requirementType,
        city: lead.city,
        priority: lead.priority,
        possessionTimeline: lead.possessionTimeline,
        companyId: targetCompany,
        createdById: channelPartnerId,
        channelPartnerId,
        visibility,
      },
    });
    // Update the share to point at the duplicate so the company sees its
    // own copy (status changes there don't cross-pollute the other company).
    await prisma.channelPartnerShare.update({
      where: { id: share.id },
      data: { leadId: dup.id },
    });
    return { leadId: dup.id, companyId: targetCompany, visibility, status: "ACTIVE" };
  }

  return { leadId, companyId: targetCompany, visibility, status: "ACTIVE" };
}

// Withdraw a lead from a single company. The lead row in that company is
// kept (for audit), but its share is flipped to REVOKED and assignedToId
// cleared — so the company UI scopes it out.
async function unshareLead(channelPartnerId, leadId, { companyId }) {
  const targetCompany = await resolveCompany(channelPartnerId, companyId);
  const share = await prisma.channelPartnerShare.findUnique({
    where: { leadId_companyId: { leadId, companyId: targetCompany } },
  });
  if (!share || share.channelPartnerId !== channelPartnerId) {
    throw new ApiError(404, "Share not found");
  }
  await prisma.channelPartnerShare.update({
    where: { id: share.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  // Soft-detach the lead on the company side: remove assignment so company
  // dashboards stop counting it. The lead row remains for history.
  await prisma.lead.updateMany({
    where: { id: leadId, companyId: targetCompany },
    data: { assignedToId: null },
  });
  return { ok: true };
}

// Update lead status as the CP. Routed through tenantPrisma so the row's
// companyId is respected. We also fan out a notification to the company's
// OWNER + MANAGER so they see real-time progress.
async function updateLeadStatus(channelPartnerId, leadId, { status }) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
    select: { id: true, companyId: true, status: true, channelPartnerId: true, assignedToId: true, name: true },
  });
  if (!lead) throw new ApiError(404, "Lead not found");
  const scope = await activeCompanyIds(channelPartnerId);
  if (!scope.includes(lead.companyId) && lead.channelPartnerId !== channelPartnerId) {
    throw new ApiError(404, "Lead not found");
  }
  if (lead.status === status) return { ok: true };

  await prisma.lead.update({
    where: { id: leadId },
    data: { status, lastContactedAt: new Date() },
  });
  // Activity + notifications only make sense when the lead has a
  // company (i.e. it's been shared). Skip them for private-pool leads.
  if (!lead.companyId) return { ok: true };

  await prisma.activity.create({
    data: {
      companyId: lead.companyId,
      leadId,
      userId: channelPartnerId,
      type: "STATUS_CHANGE",
      content: `${lead.status} → ${status}`,
    },
  });

  // Notify company's OWNER + MANAGER for real-time sync.
  try {
    const tenantPrisma = require("../../lib/tenantPrisma").getTenantPrisma(lead.companyId);
    const recipients = await prisma.user.findMany({
      where: {
        companyId: lead.companyId,
        role: { in: ["OWNER", "ADMIN", "MANAGER"] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    const cp = await prisma.user.findUnique({
      where: { id: channelPartnerId },
      select: { name: true, email: true },
    });
    for (const r of recipients) {
      await notify(tenantPrisma, {
        userId: r.id,
        type: "LEAD_STATUS_CHANGED",
        title: `Lead: ${lead.name}`,
        body: `${cp?.name || cp?.email || "Channel partner"} moved to "${status}"`,
        link: `/admin/leads/${leadId}`,
        metadata: { kind: "CP_STATUS_CHANGE", leadId, from: lead.status, to: status },
      });
    }
  } catch {}

  return { ok: true };
}

// Update visibility on a share — CP decides what the company sees.
async function updateShareVisibility(channelPartnerId, { leadId, companyId, visibility }) {
  const targetCompany = await resolveCompany(channelPartnerId, companyId);
  const share = await prisma.channelPartnerShare.findUnique({
    where: { leadId_companyId: { leadId, companyId: targetCompany } },
  });
  if (!share || share.channelPartnerId !== channelPartnerId) {
    throw new ApiError(404, "Share not found");
  }
  await prisma.channelPartnerShare.update({
    where: { id: share.id },
    data: { visibility },
  });
  // Mirror onto Lead.visibility so company queries also see the new level.
  await prisma.lead.update({
    where: { id: leadId },
    data: { visibility },
  });
  return { ok: true, visibility };
}

module.exports = {
  listCompanies,
  setDefaultCompany,
  dashboard,
  listLeads,
  getLead,
  addLead,
  shareLead,
  unshareLead,
  updateLeadStatus,
  updateShareVisibility,
  activeCompanyIds,
};
