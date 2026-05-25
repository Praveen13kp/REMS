const service = require("./channelPartner.service");

async function getCompanies(req, res, next) {
  try {
    const data = await service.listCompanies(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function setDefaultCompany(req, res, next) {
  try {
    const { companyId } = req.body || {};
    const data = await service.setDefaultCompany(req.user.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const data = await service.dashboard(req.user.id, req.query.companyId || null);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLeads(req, res, next) {
  try {
    const data = await service.listLeads(req.user.id, {
      companyId: req.query.companyId || null,
      scope: req.query.scope || "shared",
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLeadById(req, res, next) {
  try {
    const data = await service.getLead(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function postLead(req, res, next) {
  try {
    const data = await service.addLead(req.user.id, req.body || {});
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function postShare(req, res, next) {
  try {
    const data = await service.shareLead(req.user.id, req.params.id, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function postUnshare(req, res, next) {
  try {
    const data = await service.unshareLead(req.user.id, req.params.id, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function patchStatus(req, res, next) {
  try {
    const data = await service.updateLeadStatus(req.user.id, req.params.id, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function patchVisibility(req, res, next) {
  try {
    const data = await service.updateShareVisibility(req.user.id, {
      leadId: req.params.id,
      ...(req.body || {}),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCompanies,
  setDefaultCompany,
  getDashboard,
  getLeads,
  getLeadById,
  postLead,
  postShare,
  postUnshare,
  patchStatus,
  patchVisibility,
};
