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

const createCompany = async (req, res, next) => {
  try {
    const data = await adminService.createCompanyByAdmin(req.body || {}, req.user.id);
    res.status(201).json({ ok: true, data });
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

const subscriptions = async (req, res, next) => {
  try {
    const data = await adminService.getSubscriptionsOverview();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const data = await adminService.getAllUsers(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await adminService.getUserByIdAdmin(req.params.id);
    if (!user) {
      return res.status(404).json({ ok: false, error: { message: "User not found" } });
    }
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

const patchUser = async (req, res, next) => {
  try {
    const user = await adminService.patchUserAdmin(req.params.id, req.body, req.user.id);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

const auditLog = async (req, res, next) => {
  try {
    const data = await adminService.getPlatformAuditList(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

// Per-company tenant audit (SuperAdmin only) — drill into one tenant's
// internal Activity feed to help diagnose / support their team.
const companyAuditLog = async (req, res, next) => {
  try {
    const data = await adminService.getCompanyAuditLog(req.params.id, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const invoices = async (req, res, next) => {
  try {
    const data = await adminService.getAllInvoices(req.query);
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
  createCompany,
  recentSignups,
  weeklySignups,
  health,
  activity,
  subscriptions,
  listUsers,
  getUser,
  patchUser,
  auditLog,
  companyAuditLog,
  invoices,
};
