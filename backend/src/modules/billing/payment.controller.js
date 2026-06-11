const {
  listPaymentsService,
  getPaymentByIdService,
} = require("./payment.service");

const listPayments = async (req, res, next) => {
  try {
    const result = await listPaymentsService(req.tenantPrisma, req.query, req.user.id, req.user.role);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await getPaymentByIdService(req.tenantPrisma, req.params.id, req.user.id, req.user.role);
    res.json({ ok: true, data: payment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPayments,
  getPaymentById,
};
