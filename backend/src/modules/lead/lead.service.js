const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");
const {
  isPrivacyRestricted,
  maskLeadForRole,
  maskLeadListForRole,
  maskDuplicateMatchesForRole,
} = require("./leadPrivacy");

// Fields AGENT / BROKER are NOT allowed to write (PATCH) — preserves data
// integrity (so a masked "XXXXX" string can't overwrite the real number)
// and prevents an agent from silently mutating PII they shouldn't even
// see. The validation layer accepts these fields so other roles can use
// them; restrictedFieldGuard() below strips them before the service
// writes.
const RESTRICTED_WRITE_FIELDS = ["phone", "email"];

function stripRestrictedWrites(data, role) {
  if (!isPrivacyRestricted(role)) return data;
  const next = { ...data };
  for (const k of RESTRICTED_WRITE_FIELDS) {
    if (k in next) delete next[k];
  }
  return next;
}

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "name",
  "score",
  "priority",
  "nextFollowUpAt",
  "lastContactedAt",
]);

const DEFAULT_LEAD_INCLUDE = {
  assignedTo: { select: { id: true, name: true, email: true, dept: true } },
  interestedProject: { select: { id: true, name: true } },
  _count: { select: { activities: true } },
};

const ACTIVE_LEAD_FILTER = {
  status: { notIn: ["Booked", "Lost"] },
};

const parseSort = (sort) => {
  const [rawField, rawDir] = String(sort || "").split(":");
  const field = SORTABLE_FIELDS.has(rawField) ? rawField : "createdAt";
  const dir = rawDir === "asc" ? "asc" : "desc";
  return { [field]: dir };
};

const cleanLeadInput = (data) => {
  const out = {};
  const assignIf = (key) => {
    if (data[key] !== undefined) out[key] = data[key];
  };
  [
    "name",
    "phone",
    "email",
    "source",
    "requirementType",
    "budget",
    "city",
    "interestedProjectId",
    "tags",
    "assignedToId",
    "priority",
    "possessionTimeline",
    "nextFollowUpAt",
    "status",
  ].forEach(assignIf);
  return out;
};

const findDuplicates = async (tenantPrisma, { phone, email, name, city }, role) => {
  const hardConditions = [];
  if (phone) hardConditions.push({ phone });
  if (email) hardConditions.push({ email: { equals: email, mode: "insensitive" } });

  const hard = hardConditions.length > 0
    ? await tenantPrisma.lead.findMany({
        where: { OR: hardConditions },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
        },
      })
    : [];

  const soft = name && city
    ? await tenantPrisma.lead.findMany({
        where: {
          name: { contains: name, mode: "insensitive" },
          city: { equals: city, mode: "insensitive" },
          NOT: { id: { in: hard.map((h) => h.id) } },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
        },
      })
    : [];

  return maskDuplicateMatchesForRole({ hard, soft }, role);
};

const createLeadService = async (tenantPrisma, data, userId, force = false, role) => {
  // Pass role=null here so dedup matches we surface in the 409 already
  // get masked when the caller is an AGENT.
  const { hard } = await findDuplicates(tenantPrisma, {
    phone: data.phone,
    email: data.email,
    name: data.name,
    city: data.city,
  }, role);

  if (hard.length > 0 && !force) {
    throw new ApiError(409, "Duplicate lead found", {
      code: "LEAD_DUPLICATE",
      details: { matches: hard },
    });
  }

  // Validate assignee belongs to the same tenant — otherwise Prisma errors
  // with a confusing FK violation. Fall back to the creator on bad input.
  let resolvedAssigneeId = data.assignedToId || userId;
  if (data.assignedToId && data.assignedToId !== userId) {
    const assignee = await tenantPrisma.user.findFirst({
      where: { id: data.assignedToId },
      select: { id: true },
    });
    if (!assignee) {
      throw new ApiError(
        400,
        "Selected assignee is not a member of this company. Refresh and try again.",
      );
    }
    resolvedAssigneeId = assignee.id;
  }

  const created = await tenantPrisma.lead.create({
    data: {
      ...cleanLeadInput(data),
      tags: data.tags ?? [],
      status: data.status ?? "New",
      assignedToId: resolvedAssigneeId,
      createdById: userId,
    },
    include: DEFAULT_LEAD_INCLUDE,
  });

  // If the user typed an initial note in the AddLead form, persist it as a
  // real Note row attached to the new lead.
  if (typeof data.notes === "string" && data.notes.trim().length > 0) {
    await tenantPrisma.note.create({
      data: {
        leadId: created.id,
        userId,
        content: data.notes.trim(),
      },
    });
  }

  // Notify every active OWNER + ADMIN + MANAGER in the tenant about the new lead,
  // EXCEPT the creator themselves — they obviously know they just clicked
  // Save. Mirrors the intake-webhook notification shape so the bell looks
  // unified regardless of how the lead got in. Fire-and-forget: notify()
  // catches its own errors so a failed notification can't fail the create.
  const recipients = await tenantPrisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
      id: { not: userId },
    },
    select: { id: true },
  });
  const creator = await tenantPrisma.user.findFirst({
    where: { id: userId },
    select: { name: true },
  });
  const sourceLabel = created.source ? `${created.source} ` : "";
  const byClause = creator?.name ? ` · by ${creator.name}` : "";
  await Promise.all(
    recipients.map((r) =>
      notify(tenantPrisma, {
        userId: r.id,
        type: "LEAD_CREATED",
        title: `New ${sourceLabel}lead`,
        body: `${created.name} — ${created.phone || created.email || "no contact"}${byClause}`,
        link: `/leads/${created.id}`,
        metadata: {
          leadId: created.id,
          source: created.source || null,
          kind: "MANUAL_CREATED",
          createdById: userId,
        },
      }),
    ),
  );

  return maskLeadForRole(created, role);
};

const getAllLeadsService = async (tenantPrisma, query, userId, role) => {
  const {
    search,
    status,
    assignedToId,
    source,
    interestedProjectId,
    tag,
    city,
    priority,
    nextFollowUpFrom,
    nextFollowUpTo,
    page = "1",
    pageSize = "20",
    sort = "createdAt:desc",
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId === "null" || assignedToId === "unassigned") {
    where.assignedToId = null;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }
  // Case-insensitive so legacy uppercase rows (e.g. "FACEBOOK" from earlier
  // intake writes) and any inconsistently-cased external feeds still match
  // the Pascal-case dropdown values.
  if (source) where.source = { equals: source, mode: "insensitive" };
  if (interestedProjectId) where.interestedProjectId = interestedProjectId;
  if (tag) where.tags = { has: tag };
  if (city) where.city = { contains: city, mode: "insensitive" };

  if (nextFollowUpFrom || nextFollowUpTo) {
    where.nextFollowUpAt = {};
    if (nextFollowUpFrom) {
      const d = new Date(nextFollowUpFrom);
      if (!Number.isNaN(d.getTime())) where.nextFollowUpAt.gte = d;
    }
    if (nextFollowUpTo) {
      const d = new Date(nextFollowUpTo);
      if (!Number.isNaN(d.getTime())) where.nextFollowUpAt.lte = d;
    }
  }

  if (role === "AGENT") {
    where.assignedToId = userId;
  }

  const orderBy = parseSort(sort);

  const [items, total] = await Promise.all([
    tenantPrisma.lead.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: DEFAULT_LEAD_INCLUDE,
    }),
    tenantPrisma.lead.count({ where }),
  ]);

  return {
    items: maskLeadListForRole(items, role),
    total,
    page: pageNum,
    pageSize: pageSizeNum,
  };
};

const getUnassignedLeadsService = async (tenantPrisma, query, role) => {
  const {
    page = "1",
    pageSize = "50",
    sort = "score:desc",
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 50));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = { assignedToId: null, ...ACTIVE_LEAD_FILTER };
  const orderBy = parseSort(sort);

  const [items, total] = await Promise.all([
    tenantPrisma.lead.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: DEFAULT_LEAD_INCLUDE,
    }),
    tenantPrisma.lead.count({ where }),
  ]);

  return {
    items: maskLeadListForRole(items, role),
    total,
    page: pageNum,
    pageSize: pageSizeNum,
  };
};

const getLeadByIdService = async (tenantPrisma, id, { userId, role } = {}) => {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id },
    include: DEFAULT_LEAD_INCLUDE,
  });

  if (!lead) throw new ApiError(404, "Lead not found");

  // Agents can only see leads assigned to them. This closes an IDOR hole:
  // the list endpoint already filters by assignedToId for AGENT, but
  // enumerating /leads/:id directly bypassed that check.
  if (role === "AGENT" && lead.assignedToId !== userId) {
    throw new ApiError(404, "Lead not found");
  }

  return maskLeadForRole(lead, role);
};

// Fields tracked in the generic UPDATE activity. Assignment + status have
// their own dedicated activity types and notifications, so they're excluded.
const UPDATE_AUDIT_FIELDS = [
  "name",
  "phone",
  "email",
  "source",
  "requirementType",
  "budget",
  "city",
  "interestedProjectId",
  "priority",
  "possessionTimeline",
  "nextFollowUpAt",
  "tags",
];

const computeChangedFields = (before, after) => {
  const changes = {};
  for (const k of UPDATE_AUDIT_FIELDS) {
    if (!(k in after)) continue;
    const a = before[k];
    const b = after[k];
    const same =
      Array.isArray(a) && Array.isArray(b)
        ? a.length === b.length && a.every((v, i) => v === b[i])
        : a === b ||
          (a == null && b == null) ||
          (a instanceof Date && b instanceof Date && a.getTime() === b.getTime());
    if (!same) changes[k] = { from: a ?? null, to: b ?? null };
  }
  return changes;
};

const updateLeadService = async (tenantPrisma, id, data, userId, role) => {
  const existing = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Lead not found");

  // Agents can only edit leads assigned to them. Mirrors the IDOR fix on
  // getLeadByIdService — without this an agent could PATCH any lead by id.
  if (role === "AGENT" && existing.assignedToId !== userId) {
    throw new ApiError(404, "Lead not found");
  }

  // Drop phone / email from the payload if an agent attempted to send
  // them. Avoids the masked "+91 98765 XXXXX" string ever overwriting the
  // real number, and keeps PII strictly read-only for AGENT / BROKER.
  const sanitised = stripRestrictedWrites(data, role);
  const updateData = cleanLeadInput(sanitised);

  const result = await tenantPrisma.lead.updateMany({
    where: { id },
    data: updateData,
  });

  if (result.count === 0) throw new ApiError(404, "Lead not found");

  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    await logActivity(tenantPrisma, {
      leadId: id,
      userId,
      type: "ASSIGNMENT",
      content: existing.assignedToId
        ? `Lead reassigned from user ${existing.assignedToId} to user ${data.assignedToId}`
        : `Lead assigned to user ${data.assignedToId}`,
      metadata: { from: existing.assignedToId, to: data.assignedToId },
    });

    notify(tenantPrisma, {
      userId: data.assignedToId,
      type: "LEAD_ASSIGNED",
      title: "New lead assigned",
      body: `Lead "${existing.name}" has been assigned to you`,
      link: `/leads/${id}`,
      metadata: { leadId: id, assignedById: userId },
    });
  }

  const changes = computeChangedFields(existing, updateData);
  if (Object.keys(changes).length > 0) {
    await logActivity(tenantPrisma, {
      leadId: id,
      userId,
      type: "SYSTEM",
      content: `Updated: ${Object.keys(changes).join(", ")}`,
      metadata: { kind: "LEAD_UPDATED", changes },
    });
  }

  return getLeadByIdService(tenantPrisma, id, { userId, role });
};

const deleteLeadService = async (tenantPrisma, id) => {
  const existing = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!existing) throw new ApiError(404, "Lead not found");

  // Schema lacks onDelete:Cascade on Lead's children, so naive delete
  // FK-violates for any lead that has activities, notes, tasks, or files.
  // Activities + Notes are owned by the lead → delete. Tasks + Files can
  // outlive the lead → detach (set leadId null).
  await tenantPrisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { leadId: id } });
    await tx.note.deleteMany({ where: { leadId: id } });
    await tx.task.updateMany({ where: { leadId: id }, data: { leadId: null } });
    await tx.file.updateMany({ where: { leadId: id }, data: { leadId: null } });
    await tx.lead.deleteMany({ where: { id } });
  });
};

const assignLeadService = async (tenantPrisma, { leadId, assignedToId, reason, actorId, actorRole }) => {
  const before = await tenantPrisma.lead.findFirst({ where: { id: leadId } });
  if (!before) throw new ApiError(404, "Lead not found");

  // assignedToId == null is the explicit "unassign" path; the LeadDetail
  // assign-modal sends null when the user picks "— Unassigned —".
  let target = null;
  if (assignedToId) {
    // findFirst is tenant-scoped via the extension; findUnique is NOT.
    target = await tenantPrisma.user.findFirst({ where: { id: assignedToId } });
    if (!target) throw new ApiError(404, "User not found in this company");
  }

  const activityContent = assignedToId
    ? `Reassigned from ${before.assignedToId ?? "unassigned"} to ${assignedToId}${reason ? ` — ${reason}` : ""}`
    : `Unassigned${before.assignedToId ? ` from ${before.assignedToId}` : ""}${reason ? ` — ${reason}` : ""}`;

  const lead = await tenantPrisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { assignedToId: assignedToId || null },
    });

    await tx.activity.create({
      data: {
        leadId,
        companyId: before.companyId,
        userId: actorId,
        type: "ASSIGNMENT",
        content: activityContent,
        metadata: { from: before.assignedToId, to: assignedToId || null, reason },
      },
    });

    return updated;
  });

  if (assignedToId && assignedToId !== actorId) {
    notify(tenantPrisma, {
      userId: assignedToId,
      type: "LEAD_ASSIGNED",
      title: "Lead assigned to you",
      body: `Lead "${before.name}" has been assigned to you`,
      link: `/leads/${leadId}`,
      metadata: { leadId, assignedById: actorId },
    });
  }

  return maskLeadForRole(lead, actorRole);
};

const bulkAssignLeadsService = async (tenantPrisma, { leadIds, assignedToId, reason, actorId }) => {
  const target = await tenantPrisma.user.findFirst({ where: { id: assignedToId } });
  if (!target) throw new ApiError(404, "User not found in this company");

  const results = { successCount: 0, failures: [], assignments: [] };

  for (const leadId of leadIds) {
    try {
      await assignLeadService(tenantPrisma, { leadId, assignedToId, reason, actorId });
      results.successCount++;
      results.assignments.push({ leadId, assignedToId });
    } catch (err) {
      results.failures.push({ leadId, error: err.message });
    }
  }

  return results;
};

const autoAssignLeadsService = async (tenantPrisma, { leadIds, actorId }) => {
  const candidateAgents = await tenantPrisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["AGENT", "MANAGER"] },
    },
    select: { id: true },
  });

  if (candidateAgents.length === 0) {
    throw new ApiError(400, "No active agents available for assignment");
  }

  const workloads = await tenantPrisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      assignedToId: { in: candidateAgents.map((u) => u.id) },
      ...ACTIVE_LEAD_FILTER,
    },
    _count: { _all: true },
  });

  const loadByUser = new Map(candidateAgents.map((u) => [u.id, 0]));
  for (const w of workloads) {
    if (w.assignedToId) loadByUser.set(w.assignedToId, w._count._all);
  }

  const targetLeads = leadIds && leadIds.length > 0
    ? await tenantPrisma.lead.findMany({
        where: { id: { in: leadIds }, assignedToId: null, ...ACTIVE_LEAD_FILTER },
        select: { id: true, companyId: true },
      })
    : await tenantPrisma.lead.findMany({
        where: { assignedToId: null, ...ACTIVE_LEAD_FILTER },
        select: { id: true, companyId: true },
      });

  const results = { successCount: 0, failures: [], assignments: [] };

  for (const lead of targetLeads) {
    let nextAgentId = null;
    let nextLoad = Infinity;
    for (const [uid, load] of loadByUser.entries()) {
      if (load < nextLoad) {
        nextLoad = load;
        nextAgentId = uid;
      }
    }
    if (!nextAgentId) {
      results.failures.push({ leadId: lead.id, error: "No agent available" });
      continue;
    }

    try {
      await tenantPrisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: { assignedToId: nextAgentId },
        });
        await tx.activity.create({
          data: {
            leadId: lead.id,
            companyId: lead.companyId,
            userId: actorId,
            type: "ASSIGNMENT",
            content: `Auto-assigned to ${nextAgentId}`,
            metadata: { auto: true, to: nextAgentId },
          },
        });
      });
      notify(tenantPrisma, {
        userId: nextAgentId,
        type: "LEAD_ASSIGNED",
        title: "Lead auto-assigned",
        body: `Lead has been auto-assigned to you`,
        link: `/leads/${lead.id}`,
        metadata: { leadId: lead.id, auto: true },
      });
      loadByUser.set(nextAgentId, nextLoad + 1);
      results.assignments.push({ leadId: lead.id, assignedToId: nextAgentId });
      results.successCount++;
    } catch (err) {
      results.failures.push({ leadId: lead.id, error: err.message });
    }
  }

  return results;
};

const normalizeStageName = (name) =>
  name?.toLowerCase().replace(/[\s-_]/g, "").trim() || "";

const transitionLeadService = async (tenantPrisma, { leadId, toStatus, reason, actorId, actorRole }) => {
  const lead = await tenantPrisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new ApiError(404, "Lead not found");

  // Agents can only transition leads assigned to them. Same IDOR fix as
  // updateLeadService — without this, an agent could move any lead by id.
  if (actorRole === "AGENT" && lead.assignedToId !== actorId) {
    throw new ApiError(404, "Lead not found");
  }

  if (lead.status === toStatus) {
    return maskLeadForRole(lead, actorRole);
  }

  const stages = await tenantPrisma.pipelineStage.findMany();
  const target = stages.find(
    (s) => normalizeStageName(s.name) === normalizeStageName(toStatus)
  );
  if (!target) {
    throw new ApiError(400, "Unknown stage");
  }

  if ((target.isLost || toStatus === "Lost") && !reason) {
    throw new ApiError(400, "Reason required for lost stage");
  }

  return tenantPrisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { status: toStatus, lastContactedAt: new Date() },
    });

    await tx.activity.create({
      data: {
        leadId,
        companyId: lead.companyId,
        userId: actorId,
        type: "STATUS_CHANGE",
        content: `${lead.status} → ${toStatus}${reason ? ` — ${reason}` : ""}`,
        metadata: { from: lead.status, to: toStatus, reason },
      },
    });

    if (lead.assignedToId && lead.assignedToId !== actorId) {
      notify(tenantPrisma, {
        userId: lead.assignedToId,
        type: "LEAD_STATUS_CHANGED",
        title: "Lead status changed",
        body: `Lead "${lead.name}" moved from ${lead.status} to ${toStatus}`,
        link: `/leads/${leadId}`,
        metadata: { leadId, from: lead.status, to: toStatus },
      });
    }

    return maskLeadForRole(updated, actorRole);
  });
};

// Click-to-call: the channel an AGENT MUST use to reach a customer once
// PII masking is on. We never reveal the raw phone number — we log a CALL
// activity, refresh lastContactedAt so the aging worker doesn't false-
// positive on this lead, and return a placeholder callId. The real
// autodialer integration (Twilio / Exotel / cloud PBX) takes over from
// here: the dialer reads the raw phone server-side and bridges the call.
async function initiateCallService(tenantPrisma, { leadId, actorId, actorRole }) {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id: leadId },
    select: { id: true, name: true, phone: true, assignedToId: true, companyId: true },
  });
  if (!lead) throw new ApiError(404, "Lead not found");

  if (actorRole === "AGENT" && lead.assignedToId !== actorId) {
    // Same IDOR guard — never let an agent call a lead not assigned to
    // them. The autodialer would otherwise expose the raw number on the
    // dialer's side-channel logs.
    throw new ApiError(404, "Lead not found");
  }

  if (!lead.phone) {
    throw new ApiError(400, "This lead has no phone number on file");
  }

  // TODO: replace this stub with a real dialer dispatch when the
  // autodialer integration is built. The integration must:
  //   1. Read lead.phone server-side (never send to the FE)
  //   2. Place the call via Twilio/Exotel/Knowlarity SIP trunk
  //   3. Stream call disposition + recording URL back via a webhook
  //      and update the Activity row created below.
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await tenantPrisma.$transaction(async (tx) => {
    await tx.activity.create({
      data: {
        leadId: lead.id,
        companyId: lead.companyId,
        userId: actorId,
        type: "CALL",
        content: "Call initiated via auto-dialer",
        metadata: { callId, dialer: "stub", initiatedAt: new Date().toISOString() },
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: { lastContactedAt: new Date() },
    });
  });

  return {
    callId,
    status: "INITIATED",
    message: "Auto-dialer will connect the call. Customer number is not exposed.",
  };
}

module.exports = {
  findDuplicates,
  createLeadService,
  getAllLeadsService,
  getUnassignedLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  assignLeadService,
  bulkAssignLeadsService,
  autoAssignLeadsService,
  transitionLeadService,
  initiateCallService,
};
