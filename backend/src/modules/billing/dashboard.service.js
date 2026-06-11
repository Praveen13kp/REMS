async function getBillingDashboardService(tenantPrisma) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenueAgg,
    monthRevenueAgg,
    outstandingAgg,
    statusCounts,
    monthlyRevenue,
    revenueByProject,
    overdueCount,
  ] = await Promise.all([
    tenantPrisma.invoicePayment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    tenantPrisma.invoicePayment.aggregate({
      where: { status: "COMPLETED", paymentDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    tenantPrisma.invoice.aggregate({
      where: { status: { notIn: ["PAID", "CANCELLED"] }, deletedAt: null },
      _sum: { balanceAmount: true },
    }),
    tenantPrisma.invoice.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    getMonthlyRevenue(tenantPrisma, startOfYear),
    getRevenueByProject(tenantPrisma),
    tenantPrisma.invoice.count({
      where: { status: "OVERDUE", deletedAt: null },
    }),
  ]);

  return {
    stats: {
      totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
      revenueThisMonth: Number(monthRevenueAgg._sum.amount || 0),
      outstandingRevenue: Number(outstandingAgg._sum.balanceAmount || 0),
      paidInvoices: (statusCounts.find((s) => s.status === "PAID")?._count?.id) || 0,
      overdueInvoices: overdueCount,
      pendingCollections: Number(outstandingAgg._sum.balanceAmount || 0),
    },
    charts: {
      monthlyRevenue,
      revenueByProject,
      statusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    },
  };
}

async function getMonthlyRevenue(tenantPrisma, since) {
  const payments = await tenantPrisma.invoicePayment.findMany({
    where: {
      status: "COMPLETED",
      paymentDate: { gte: since },
    },
    select: { amount: true, paymentDate: true },
    orderBy: { paymentDate: "asc" },
  });

  const monthly = {};
  for (const p of payments) {
    const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + Number(p.amount);
  }

  return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue }));
}

async function getRevenueByProject(tenantPrisma) {
  const invoices = await tenantPrisma.invoice.findMany({
    where: { deletedAt: null, status: { notIn: ["CANCELLED"] } },
    select: {
      projectId: true,
      totalAmount: true,
      paidAmount: true,
      project: { select: { name: true } },
    },
  });

  const byProject = {};
  for (const inv of invoices) {
    const name = inv.project?.name || "Unknown";
    if (!byProject[name]) {
      byProject[name] = { totalAmount: 0, paidAmount: 0, balanceAmount: 0 };
    }
    byProject[name].totalAmount += Number(inv.totalAmount);
    byProject[name].paidAmount += Number(inv.paidAmount);
    byProject[name].balanceAmount += Number(inv.totalAmount) - Number(inv.paidAmount);
  }

  return Object.entries(byProject).map(([project, data]) => ({
    project,
    ...data,
  }));
}

module.exports = { getBillingDashboardService };
