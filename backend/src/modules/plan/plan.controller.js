const { ApiError } = require("../../lib/ApiError");
const planService = require("./plan.service");

async function listAllForAdmin(req, res, next) {
  try {
    const rows = await planService.listPlans();
    // Admin view includes Razorpay IDs + archive history (the public shape
    // hides those). Return raw rows so the UI can show "this plan currently
    // syncs to plan_xxx in Razorpay".
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const code = req.params.code;
    if (!code) throw new ApiError(400, "Plan code is required");
    const updated = await planService.updatePlan(code, req.body || {}, req.user.id);
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAllForAdmin, updatePlan };
