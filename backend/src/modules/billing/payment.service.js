const { ApiError } = require("../../lib/ApiError");

const PAYMENT_INCLUDE = {
  invoice: {
    select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
  },
};

const listPaymentsService = async (tenantPrisma, query, userId, role) => {
  const { page = "1", pageSize = "20", invoiceId, paymentMethod, dateFrom, dateTo } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (invoiceId) where.invoiceId = invoiceId;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  if (dateFrom || dateTo) {
    where.paymentDate = {};
    if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
    if (dateTo) where.paymentDate.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    tenantPrisma.invoicePayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip,
      take: pageSizeNum,
      include: PAYMENT_INCLUDE,
    }),
    tenantPrisma.invoicePayment.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getPaymentByIdService = async (tenantPrisma, paymentId, userId, role) => {
  const payment = await tenantPrisma.invoicePayment.findFirst({
    where: { id: paymentId },
    include: PAYMENT_INCLUDE,
  });

  if (!payment) throw new ApiError(404, "Payment not found");

  return payment;
};

module.exports = {
  listPaymentsService,
  getPaymentByIdService,
};
