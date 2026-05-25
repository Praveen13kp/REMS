const svc = require("./channelPartnerAdmin.service");
const { ApiError } = require("../../lib/ApiError");

function requireCompany(req) {
  if (!req.user.companyId) throw new ApiError(400, "Not a company user");
  return req.user.companyId;
}

async function list(req, res, next) {
  try {
    const data = await svc.listPartners(requireCompany(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await svc.getPartner(requireCompany(req), req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    const data = await svc.revokePartner(requireCompany(req), req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function reactivate(req, res, next) {
  try {
    const data = await svc.reactivatePartner(requireCompany(req), req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, revoke, reactivate };
