const {
  revenueReportService,
  outstandingReportService,
  agingReportService,
  paymentCollectionReportService,
  customerPaymentHistoryService,
  projectRevenueReportService,
} = require("./reports.service");

const revenueReport = async (req, res, next) => {
  try {
    const data = await revenueReportService(req.tenantPrisma, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const outstandingReport = async (req, res, next) => {
  try {
    const data = await outstandingReportService(req.tenantPrisma, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const agingReport = async (req, res, next) => {
  try {
    const data = await agingReportService(req.tenantPrisma);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const paymentCollectionReport = async (req, res, next) => {
  try {
    const data = await paymentCollectionReportService(req.tenantPrisma, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const customerPaymentHistory = async (req, res, next) => {
  try {
    const data = await customerPaymentHistoryService(req.tenantPrisma, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const projectRevenueReport = async (req, res, next) => {
  try {
    const data = await projectRevenueReportService(req.tenantPrisma, req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  revenueReport,
  outstandingReport,
  agingReport,
  paymentCollectionReport,
  customerPaymentHistory,
  projectRevenueReport,
};
