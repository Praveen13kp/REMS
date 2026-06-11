const { ApiError } = require("../../lib/ApiError");
const {
  listInvoicesService,
  getInvoiceByIdService,
} = require("./invoice.service");

const listInvoices = async (req, res, next) => {
  try {
    const result = await listInvoicesService(req.tenantPrisma, req.query, req.user.id, req.user.role);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await getInvoiceByIdService(req.tenantPrisma, req.params.id, req.user.id, req.user.role);
    res.json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInvoices,
  getInvoiceById,
};
