async function logBillingAudit(tenantPrisma, { userId, action, entityType, entityId, previousValue, newValue }) {
  try {
    await tenantPrisma.billingAudit.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        previousValue: previousValue || undefined,
        newValue: newValue || undefined,
      },
    });
  } catch (err) {
    console.error("logBillingAudit(): failed to create billing audit log", err);
  }
}

module.exports = { logBillingAudit };
