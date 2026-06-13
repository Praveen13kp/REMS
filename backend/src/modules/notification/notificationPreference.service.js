const prisma = require("../../config/prisma");

const TENANT_PREF_KEYS = [
  "lead_created",
  "lead_assigned",
  "followup_reminder",
  "lead_status_changed",
  "new_booking",
  "daily_summary",
  "weekly_report",
];

const TENANT_DEFAULTS = {
  lead_created: { email: true, inapp: true },
  lead_assigned: { email: true, inapp: true },
  followup_reminder: { email: true, inapp: true },
  lead_status_changed: { email: true, inapp: true },
  new_booking: { email: true, inapp: true },
  daily_summary: { email: true, inapp: true },
  weekly_report: { email: false, inapp: true },
};

function getPrismaClient(companyId) {
  if (companyId) {
    const { getTenantPrisma } = require("../../lib/tenantPrisma");
    return getTenantPrisma(companyId);
  }
  return prisma;
}

async function getPreferencesService(tenantPrisma, userId) {
  const rows = await tenantPrisma.notificationPreference.findMany({
    where: { userId },
  });

  const prefs = {};
  for (const key of TENANT_PREF_KEYS) {
    const saved = rows.find((r) => r.type === key);
    prefs[key] = {
      email: saved ? saved.email : TENANT_DEFAULTS[key].email,
      inapp: saved ? saved.inapp : TENANT_DEFAULTS[key].inapp,
    };
  }

  return prefs;
}

async function updatePreferencesService(tenantPrisma, userId, prefs) {
  const pairs = Object.entries(prefs);
  const upserts = pairs.map(([type, value]) => {
    const email = value?.email ?? true;
    const inapp = value?.inapp ?? true;
    return tenantPrisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, email, inapp },
      update: { email, inapp },
    });
  });

  await Promise.all(upserts);

  return getPreferencesService(tenantPrisma, userId);
}

module.exports = {
  getPreferencesService,
  updatePreferencesService,
  getPrismaClient,
  TENANT_PREF_KEYS,
  TENANT_DEFAULTS,
};
