const { ApiError } = require("../../lib/ApiError");

async function revenueReportService(tenantPrisma, query) {
  const { dateFrom, dateTo, groupBy = "month" } = query;
  const where = { status: "COMPLETED" };

  if (dateFrom || dateTo) {
    where.paymentDate = {};
    if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
    if (dateTo) where.paymentDate.lte = new Date(dateTo);
  }

  const payments = await tenantPrisma.invoicePayment.findMany({
    where,
    select: { amount: true, paymentDate: true, paymentMethod: true },
    orderBy: { paymentDate: "asc" },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const grouped = {};
  for (const p of payments) {
    let key;
    if (groupBy === "day") {
      key = p.paymentDate.toISOString().split("T")[0];
    } else if (groupBy === "year") {
      key = String(p.paymentDate.getFullYear());
    } else {
      key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, "0")}`;
    }
    if (!grouped[key]) grouped[key] = { period: key, revenue: 0, count: 0 };
    grouped[key].revenue += Number(p.amount);
    grouped[key].count += 1;
  }

  const methodBreakdown = {};
  for (const p of payments) {
    const method = p.paymentMethod || "OTHER";
    if (!methodBreakdown[method]) methodBreakdown[method] = 0;
    methodBreakdown[method] += Number(p.amount);
  }

  return {
    totalRevenue,
    paymentCount: payments.length,
    averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
    groupedData: Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period)),
    methodBreakdown: Object.entries(methodBreakdown).map(([method, amount]) => ({ method, amount })),
  };
}

async function outstandingReportService(tenantPrisma, query) {
  const { page = "1", pageSize = "50" } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {
    deletedAt: null,
    status: { notIn: ["PAID", "CANCELLED"] },
    balanceAmount: { gt: 0 },
  };

  const [items, total] = await Promise.all([
    tenantPrisma.invoice.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip,
      take: pageSizeNum,
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        projectId: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        dueDate: true,
        status: true,
        project: { select: { name: true } },
      },
    }),
    tenantPrisma.invoice.count({ where }),
  ]);

  const totalOutstanding = await tenantPrisma.invoice.aggregate({
    where,
    _sum: { balanceAmount: true },
  });

  return {
    items,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalOutstanding: Number(totalOutstanding._sum.balanceAmount || 0),
  };
}

async function agingReportService(tenantPrisma) {
  const now = new Date();

  const buckets = [
    { label: "0-30 days", min: 0, max: 30 },
    { label: "31-60 days", min: 31, max: 60 },
    { label: "61-90 days", min: 61, max: 90 },
    { label: "90+ days", min: 91, max: Infinity },
  ];

  const overdueInvoices = await tenantPrisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["PAID", "CANCELLED"] },
      dueDate: { lt: now },
      balanceAmount: { gt: 0 },
    },
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      project: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const agedBuckets = buckets.map((bucket) => {
    const items = overdueInvoices.filter((inv) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
      return daysOverdue >= bucket.min && daysOverdue <= bucket.max;
    });

    return {
      label: bucket.label,
      count: items.length,
      totalAmount: items.reduce((sum, i) => sum + Number(i.balanceAmount), 0),
      invoices: items,
    };
  });

  return {
    asOf: now.toISOString(),
    totalOverdue: overdueInvoices.length,
    totalOverdueAmount: overdueInvoices.reduce((sum, i) => sum + Number(i.balanceAmount), 0),
    buckets: agedBuckets,
  };
}

async function paymentCollectionReportService(tenantPrisma, query) {
  const { dateFrom, dateTo, page = "1", pageSize = "50" } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
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
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    }),
    tenantPrisma.invoicePayment.count({ where }),
  ]);

  const agg = await tenantPrisma.invoicePayment.aggregate({
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    items,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalCollected: Number(agg._sum.amount || 0),
    totalTransactions: agg._count.id || 0,
  };
}

async function customerPaymentHistoryService(tenantPrisma, query) {
  const { customerId, page = "1", pageSize = "20" } = query;

  if (!customerId) {
    throw new ApiError(400, "customerId is required");
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = { customerId };

  const [payments, paymentTotal] = await Promise.all([
    tenantPrisma.invoicePayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip,
      take: pageSizeNum,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        receiver: { select: { id: true, name: true } },
      },
    }),
    tenantPrisma.invoicePayment.count({ where }),
  ]);

  const [invoices, invoiceTotal] = await Promise.all([
    tenantPrisma.invoice.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        dueDate: true,
      },
    }),
    tenantPrisma.invoice.count({ where: { customerId, deletedAt: null } }),
  ]);

  return {
    payments: { items: payments, total: paymentTotal },
    invoices: { items: invoices, total: invoiceTotal },
  };
}

async function projectRevenueReportService(tenantPrisma, query) {
  const { projectId, dateFrom, dateTo } = query;
  const where = { deletedAt: null, status: { notIn: ["CANCELLED"] } };

  if (projectId) where.projectId = projectId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const invoices = await tenantPrisma.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      projectId: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      project: { select: { name: true } },
    },
  });

  const byProject = {};
  for (const inv of invoices) {
    const name = inv.project?.name || "Unknown";
    if (!byProject[name]) {
      byProject[name] = {
        projectId: inv.projectId,
        projectName: name,
        totalInvoiced: 0,
        totalCollected: 0,
        outstanding: 0,
        invoiceCount: 0,
        paidCount: 0,
      };
    }
    byProject[name].totalInvoiced += Number(inv.totalAmount);
    byProject[name].totalCollected += Number(inv.paidAmount);
    byProject[name].outstanding += Number(inv.balanceAmount);
    byProject[name].invoiceCount += 1;
    if (inv.status === "PAID") byProject[name].paidCount += 1;
  }

  const agg = await tenantPrisma.invoice.aggregate({
    where,
    _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
    _count: { id: true },
  });

  return {
    summary: {
      totalInvoiced: Number(agg._sum.totalAmount || 0),
      totalCollected: Number(agg._sum.paidAmount || 0),
      totalOutstanding: Number(agg._sum.balanceAmount || 0),
      invoiceCount: agg._count.id || 0,
    },
    byProject: Object.values(byProject),
  };
}

module.exports = {
  revenueReportService,
  outstandingReportService,
  agingReportService,
  paymentCollectionReportService,
  customerPaymentHistoryService,
  projectRevenueReportService,
};
