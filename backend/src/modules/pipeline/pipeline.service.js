const { ApiError } = require("../../lib/ApiError");

const getStagesService = async (tenantPrisma) => {
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

module.exports = {
  getStagesService,
  reorderStagesService,
  updateStageService,
};