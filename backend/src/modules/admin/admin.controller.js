const adminService = require("./admin.service");

const stats = async (req, res, next) => {
  try {
    const data = await adminService.getStats();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const listCompanies = async (req, res, next) => {
  try {
    const data = await adminService.getCompanies(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const getCompany = async (req, res, next) => {
  try {
    const company = await adminService.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ ok: false, error: { message: "Company not found" } });
    res.json({ ok: true, data: company });
  } catch (err) {
    next(err);
  }
};

const patchCompany = async (req, res, next) => {
  try {
    const company = await adminService.updateCompany(req.params.id, req.body, req.user.id);
    res.json({ ok: true, data: company });
  } catch (err) {
    next(err);
  }
};

const removeCompany = async (req, res, next) => {
  try {
    await adminService.deleteCompany(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const recentSignups = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await adminService.getRecentSignups(limit);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const weeklySignups = async (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    const data = await adminService.getWeeklySignups(weeks);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const health = async (req, res, next) => {
  try {
    const data = await adminService.getHealth();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const activity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await adminService.getActivity(limit);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  stats,
  listCompanies,
  getCompany,
  patchCompany,
  removeCompany,
  recentSignups,
  weeklySignups,
  health,
  activity,
};
