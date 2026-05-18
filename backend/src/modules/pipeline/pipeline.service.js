const { ApiError } = require("../../lib/ApiError");
const { DEFAULT_STAGES } = require("./pipeline.constants");

// Companies registered before the company.service auto-seed shipped have
// no PipelineStage rows, which makes the Kanban board appear empty even
// when leads exist (getBoardService returns { stages: [] }). Self-heal:
// the first time anyone looks at the board for a stage-less company, seed
// the defaults so leads in status "New" / "Contacted" / etc. become
// visible immediately.
const ensureDefaultStages = async (tenantPrisma) => {
  const count = await tenantPrisma.pipelineStage.count();
  if (count > 0) return;
  await tenantPrisma.pipelineStage.createMany({
    data: DEFAULT_STAGES,
  });
};

const getStagesService = async (tenantPrisma) => {
  await ensureDefaultStages(tenantPrisma);
  return tenantPrisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
  });
};

const reorderStagesService = async (tenantPrisma, { stageIds, companyId }) => {
  const existingStages = await tenantPrisma.pipelineStage.findMany({
    where: { companyId },
    select: { id: true },
  });

  const existingIds = new Set(existingStages.map((s) => s.id));
  const newIds = new Set(stageIds);

  if (existingIds.size !== newIds.size) {
    throw new ApiError(400, "Stage IDs must match existing stages");
  }

  for (const id of stageIds) {
    if (!existingIds.has(id)) {
      throw new ApiError(400, `Invalid stage ID: ${id}`);
    }
  }

  return tenantPrisma.$transaction(
    stageIds.map((id, index) =>
      tenantPrisma.pipelineStage.update({
        where: { id },
        data: { order: index + 1 },
      })
    )
  );
};

const updateStageService = async (tenantPrisma, { stageId, name, probability, companyId }) => {
  const existing = await tenantPrisma.pipelineStage.findFirst({
    where: { id: stageId, companyId },
  });

  if (!existing) {
    throw new ApiError(404, "Stage not found");
  }

  if (name && name !== existing.name) {
    const duplicate = await tenantPrisma.pipelineStage.findFirst({
      where: { companyId, name, not: { id: stageId } },
    });
    if (duplicate) {
      throw new ApiError(400, "Stage name already exists in this company");
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (probability !== undefined) updateData.probability = probability;

  return tenantPrisma.pipelineStage.update({
    where: { id: stageId },
    data: updateData,
  });
};

const getBoardService = async (tenantPrisma, query, userId, role) => {
  const { assignedToId, interestedProjectId, search } = query;

  await ensureDefaultStages(tenantPrisma);

  const stages = await tenantPrisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
  });

  if (stages.length === 0) {
    return { stages: [] };
  }

  const stageNames = stages.map((s) => s.name);
  const where = { status: { in: stageNames } };

  let effectiveAssignedToId;
  if (role === "AGENT") {
    effectiveAssignedToId = userId;
  } else if (assignedToId === "null" || assignedToId === "unassigned") {
    effectiveAssignedToId = null;
  } else if (assignedToId) {
    effectiveAssignedToId = assignedToId;
  }

  if (effectiveAssignedToId !== undefined) {
    where.assignedToId = effectiveAssignedToId;
  }

  if (interestedProjectId) {
    where.interestedProjectId = interestedProjectId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const allLeads = await tenantPrisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { activities: true } },
    },
  });

  const leadsByStatus = {};
  for (const lead of allLeads) {
    const status = lead.status;
    if (!leadsByStatus[status]) {
      leadsByStatus[status] = [];
    }
    leadsByStatus[status].push(lead);
  }

  // Per-column cap of 50 leads (newest first). Load-more deferred to future.
  const CAP = 50;
  const boardStages = stages.map((stage) => {
    const allLeadsForStage = leadsByStatus[stage.name] || [];
    return {
      id: stage.id,
      name: stage.name,
      order: stage.order,
      probability: stage.probability,
      isWon: stage.isWon,
      isLost: stage.isLost,
      leads: allLeadsForStage.slice(0, CAP),
      total: allLeadsForStage.length,
    };
  });

  return { stages: boardStages };
};

module.exports = {
  getStagesService,
  reorderStagesService,
  updateStageService,
  getBoardService,
};