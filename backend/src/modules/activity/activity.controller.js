const { getLeadActivityService } = require("./activity.service");

const getLeadActivity = async (req, res, next) => {
  try {
    const result = await getLeadActivityService(req.tenantPrisma, req.params.leadId, req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeadActivity };
