const { ApiError } = require("../../lib/ApiError");
const planService = require("../plan/plan.service");

const RESOLVE_INVOICE_INCLUDE = {};

const LIST_INVOICE_INCLUDE = {};

function buildListWhere(query, userId, role) {
  const where = {};
  const { status, search } = query;

  if (status) where.status = status;

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

const listInvoicesService = async (tenantPrisma, query, userId, role) => {
  const { page = "1", pageSize = "20", sort: rawSort, sortBy: rawSortBy = "createdAt", sortOrder: rawSortOrder = "desc" } = query;
  const sortBy = rawSort ? rawSort.split(":")[0] || "createdAt" : rawSortBy;
  const sortOrder = rawSort ? (rawSort.split(":")[1] || "desc") : rawSortOrder;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = buildListWhere(query, userId, role);

  const orderBy = {};
  orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    tenantPrisma.invoice.findMany({
      where,
      orderBy,
      skip,
      take: pageSizeNum,
      include: LIST_INVOICE_INCLUDE,
    }),
    tenantPrisma.invoice.count({ where }),
  ]);

  return { items, total, page: pageNum, pageSize: pageSizeNum };
};

const getInvoiceByIdService = async (tenantPrisma, invoiceId, userId, role) => {
  const invoice = await tenantPrisma.invoice.findFirst({
    where: { id: invoiceId },
  });

  if (!invoice) throw new ApiError(404, "Invoice not found");

  return invoice;
};

function generateInvoiceNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${ts}${rand}`;
}

// Auto-generate an Invoice row from a subscription activation/charge event.
// Called after payment is confirmed (verify flow or webhook).
// `tx` is an optional Prisma transaction client; if omitted, uses the default
// tenantPrisma (caller's responsibility to be inside a transaction).
async function createInvoiceFromSubscription({ subscription, payment, tenantPrisma }) {
  const planRow = await planService.getPlanByCode(subscription.plan);
  const planName = planRow?.name || subscription.plan;

  // subscription.amount is in paise (price inclusive of 18% GST)
  const totalInr = subscription.amount / 100;
  const taxPct = 0.18;
  const baseInr = totalInr / (1 + taxPct);
  const taxAmountInr = totalInr - baseInr;

  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = payment?.paidAt ? new Date(payment.paidAt) : new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7); // net 7

  const prisma = tenantPrisma || require("../../config/prisma");

  // Idempotency: skip if an invoice already exists for this payment
  if (payment?.razorpayPaymentId) {
    const existing = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: payment.razorpayPaymentId },
    });
    if (existing) return existing;
  }

  return prisma.invoice.create({
    data: {
      companyId: subscription.companyId,
      invoiceNumber,
      subscriptionId: subscription.id,
      planId: subscription.plan,
      planName,
      billingCycle: subscription.billingCycle,
      amount: amountInr,
      taxAmount: taxAmountInr,
      totalAmount: totalInr,
      status: "PAID",
      invoiceDate,
      dueDate,
      paidDate: payment?.paidAt ? new Date(payment.paidAt) : null,
      razorpayOrderId: payment?.razorpayOrderId || null,
      razorpayPaymentId: payment?.razorpayPaymentId || null,
    },
  });
}

module.exports = {
  listInvoicesService,
  getInvoiceByIdService,
  createInvoiceFromSubscription,
};
