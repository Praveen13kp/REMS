const { ApiError } = require("../../lib/ApiError");
const {
  getStagesService,
  reorderStagesService,
  updateStageService,
  createStageService,
  deleteStageService,
  getBoardService,
} = require("./pipeline.service");

const getStages = async (req, res, next) => {
  try {
    const stages = await getStagesService(req.tenantPrisma);
    res.json({ ok: true, data: stages });
  } catch (err) {
    next(err);
  }
};

const reorderStages = async (req, res, next) => {
  try {
    const { stageIds } = req.body;
    if (!stageIds || !Array.isArray(stageIds) || stageIds.length === 0) {
      throw new ApiError(400, "stageIds must be a non-empty array");
    }

    const companyId = req.user.companyId;
    await reorderStagesService(req.tenantPrisma, { stageIds, companyId });

    const stages = await getStagesService(req.tenantPrisma);
    res.json({ ok: true, data: stages });
  } catch (err) {
    next(err);
  }
};

const updateStage = async (req, res, next) => {
  try {
    const { name, probability } = req.body;

    if (name === undefined && probability === undefined) {
      throw new ApiError(400, "At least one of 'name' or 'probability' is required");
    }

    const companyId = req.user.companyId;
    const stage = await updateStageService(req.tenantPrisma, {
      stageId: req.params.id,
      name,
      probability,
      companyId,
    });

    res.json({ ok: true, data: stage });
  } catch (err) {
    next(err);
  }
};

const createStage = async (req, res, next) => {
  try {
    const { name, probability, isWon, isLost } = req.body || {};
    const stage = await createStageService(req.tenantPrisma, {
      name,
      probability,
      isWon,
      isLost,
      companyId: req.user.companyId,
    });
    res.status(201).json({ ok: true, data: stage });
  } catch (err) {
    next(err);
  }
};

const deleteStage = async (req, res, next) => {
  try {
    await deleteStageService(req.tenantPrisma, {
      stageId: req.params.id,
      companyId: req.user.companyId,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const getBoard = async (req, res, next) => {
  try {
    const result = await getBoardService(
      req.tenantPrisma,
      req.query,
      req.user.id,
      req.user.role,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStages,
  reorderStages,
  updateStage,
  createStage,
  deleteStage,
  getBoard,
};