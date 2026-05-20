const crypto = require("crypto");

const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { encryptJson, decryptJson } = require("./crypto");
const { getDriver } = require("./drivers");
const { notify } = require("../notification/notify");

const generateWebhookToken = () => crypto.randomBytes(24).toString("hex");

// Hide encrypted blob + sensitive driver-decided fields from the API
// response. Returns enough for the Settings UI to render the row, but
// nothing a leak would compromise. Non-secret credential bits (toggle
// flags, field maps) are surfaced so the edit modal can reflect real
// persisted state instead of defaulting every time.
const NON_SECRET_CRED_KEYS = new Set(["requireSignature", "fieldMap"]);

function toPublicView(row) {
  if (!row) return null;
  let publicCreds = null;
  try {
    const decrypted = decryptJson(row.credentials);
    publicCreds = Object.fromEntries(
      Object.entries(decrypted || {}).filter(([k]) => NON_SECRET_CRED_KEYS.has(k)),
    );
  } catch {
    publicCreds = null;
  }
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    webhookToken: row.webhookToken,
    externalIds: row.externalIds || [],
    status: row.status,
    lastVerifiedAt: row.lastVerifiedAt,
    lastErrorAt: row.lastErrorAt,
    lastError: row.lastError,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    credentials: publicCreds,
  };
}

// Internal helper: load + decrypt. Used by the webhook router and the
// health-check action. Throws 404 if the row isn't found in the tenant.
async function loadDecrypted({ companyId, integrationId, webhookToken }) {
  const where = webhookToken ? { webhookToken } : { id: integrationId };
  const row = await prisma.integrationCredential.findFirst({
    where: companyId ? { ...where, companyId } : where,
  });
  if (!row) throw new ApiError(404, "Integration not found");
  const credentials = decryptJson(row.credentials);
  return { row, credentials };
}

async function listForCompany(companyId) {
  const rows = await prisma.integrationCredential.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicView);
}

async function createForCompany({ companyId, userId, body }) {
  const driver = getDriver(body.provider);
  // Provider-specific shape check. Driver throws/returns a Zod error which
  // we surface as a 400 with the issues array.
  const parsed = driver.credentialsSchema
    ? driver.credentialsSchema.safeParse(body.credentials)
    : { success: true, data: body.credentials };
  if (!parsed.success) {
    throw new ApiError(400, "Invalid credentials shape", {
      details: parsed.error.issues,
    });
  }

  const credentialsJson = parsed.data;
  const externalIds = driver.externalIds ? driver.externalIds(credentialsJson) : [];
  const encrypted = encryptJson(credentialsJson);
  const webhookToken = generateWebhookToken();

  try {
    const created = await prisma.integrationCredential.create({
      data: {
        companyId,
        provider: body.provider,
        label: body.label,
        credentials: encrypted,
        webhookToken,
        externalIds: externalIds || [],
        createdById: userId || null,
      },
    });
    return toPublicView(created);
  } catch (err) {
    if (err && err.code === "P2002") {
      throw new ApiError(409, "An integration with this provider + label already exists");
    }
    throw err;
  }
}

async function updateForCompany({ companyId, integrationId, body }) {
  const existing = await prisma.integrationCredential.findFirst({
    where: { id: integrationId, companyId },
  });
  if (!existing) throw new ApiError(404, "Integration not found");

  const data = {};

  if (body.label !== undefined) data.label = body.label;
  if (body.status !== undefined) data.status = body.status;

  if (body.credentials !== undefined) {
    const driver = getDriver(existing.provider);
    // Merge incoming patch onto existing decrypted creds so the UI can flip
    // a single flag (e.g. requireSignature) without resending the full
    // secret. The driver's schema still validates the merged result.
    const existingCreds = decryptJson(existing.credentials);
    const merged = { ...existingCreds, ...body.credentials };
    const parsed = driver.credentialsSchema
      ? driver.credentialsSchema.safeParse(merged)
      : { success: true, data: merged };
    if (!parsed.success) {
      throw new ApiError(400, "Invalid credentials shape", {
        details: parsed.error.issues,
      });
    }
    data.credentials = encryptJson(parsed.data);
    data.externalIds = driver.externalIds ? driver.externalIds(parsed.data) : [];
    // Re-flipping to ACTIVE on credential update is intentional — if the
    // tenant edited creds, they're asserting the new ones work; let the
    // next health check or webhook prove otherwise.
    if (body.status === undefined && existing.status !== "ACTIVE") {
      data.status = "ACTIVE";
      data.lastError = null;
      data.lastErrorAt = null;
    }
  }

  const updated = await prisma.integrationCredential.update({
    where: { id: integrationId },
    data,
  });
  return toPublicView(updated);
}

async function deleteForCompany({ companyId, integrationId }) {
  const existing = await prisma.integrationCredential.findFirst({
    where: { id: integrationId, companyId },
  });
  if (!existing) throw new ApiError(404, "Integration not found");
  await prisma.integrationCredential.delete({ where: { id: integrationId } });
  return { ok: true };
}

// Internal helper: fan out INTEGRATION_FAILED notifications to OWNER +
// ADMIN of the tenant when an integration newly fails. Only called on
// the ACTIVE -> INVALID transition so daily cron runs don't spam the
// bell with the same broken integration over and over.
async function notifyIntegrationFailed({ row, error }) {
  const tenantPrisma = getTenantPrisma(row.companyId);
  const recipients = await tenantPrisma.user.findMany({
    where: { isActive: true, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  const providerLabel = providerDisplayName(row.provider);
  await Promise.all(
    recipients.map((r) =>
      notify(tenantPrisma, {
        userId: r.id,
        type: "INTEGRATION_FAILED",
        title: `${providerLabel} integration disconnected`,
        body: `"${row.label}" stopped working: ${String(error || "credentials invalid").slice(0, 140)}`,
        link: `/settings?tab=integrations&reconnect=${row.id}`,
        metadata: {
          integrationId: row.id,
          provider: row.provider,
          kind: "INTEGRATION_FAILED",
        },
      }),
    ),
  );
}

function providerDisplayName(p) {
  switch (p) {
    case "META": return "Facebook & Instagram";
    case "GOOGLE_ADS": return "Google Ads";
    case "WEBSITE_FORM": return "Website Form";
    case "JUSTDIAL": return "JustDial";
    case "INDIAMART": return "IndiaMART";
    default: return p;
  }
}

// Run the driver's healthCheck against the tenant's live credentials.
// Updates lastVerifiedAt + status based on the result. Used by the Test
// Connection button and the daily health-check cron. On the ACTIVE ->
// INVALID transition (first failure after being healthy), fires a
// notification to OWNER + ADMIN so they know to reconnect.
async function testConnection({ companyId, integrationId, source = "manual" }) {
  const { row, credentials } = await loadDecrypted({ companyId, integrationId });
  const driver = getDriver(row.provider);
  if (!driver.healthCheck) {
    return { ok: true, info: "no health check implemented for this provider" };
  }

  const wasActive = row.status === "ACTIVE";

  let result;
  let nextStatus = row.status;
  let errorMessage = null;
  try {
    result = await driver.healthCheck(credentials);
    if (result.ok) {
      nextStatus = "ACTIVE";
    } else {
      nextStatus = "INVALID";
      errorMessage = result.error || "health check returned not-ok";
    }
  } catch (err) {
    nextStatus = "INVALID";
    errorMessage = String(err?.message || err);
    result = { ok: false, error: errorMessage };
  }

  await prisma.integrationCredential.update({
    where: { id: row.id },
    data: {
      status: nextStatus,
      lastVerifiedAt: new Date(),
      lastError: result.ok ? null : errorMessage?.slice(0, 500),
      lastErrorAt: result.ok ? null : new Date(),
      expiresAt: result.expiresAt || null,
    },
  });

  // Notify only on the transition. If it was already INVALID, the user
  // already got the bell ping on the original failure.
  if (wasActive && nextStatus === "INVALID") {
    try {
      await notifyIntegrationFailed({ row, error: errorMessage });
    } catch (_) {
      // notification failure shouldn't break the health-check call path
    }
  }

  // Surface the source in the result so the cron caller can log it
  // without re-querying.
  return { ...result, source };
}

// Webhook router entry: resolve a webhookToken (from the URL path) to a
// tenant + decrypted credentials. Returns null if not found — the router
// must respond 404 without disclosing whether the token was unknown or
// belonged to a disabled integration.
async function resolveByWebhookToken(webhookToken) {
  if (!webhookToken || typeof webhookToken !== "string") return null;
  try {
    const { row, credentials } = await loadDecrypted({ webhookToken });
    if (row.status !== "ACTIVE") return null;
    return { row, credentials };
  } catch {
    return null;
  }
}

// Aggregate dashboard stats for the Integrations panel. Cheap queries
// fan out for one company at a time; if traffic ever justifies it we
// can move to a materialised view, but at our scale this is fine.
async function statsForCompany(companyId) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const integrations = await prisma.integrationCredential.findMany({
    where: { companyId },
    select: { id: true, provider: true, status: true, label: true, lastVerifiedAt: true, lastError: true },
  });

  // Lead counts in the last 24h grouped by source label. Sources are
  // stored as the human label ("Facebook", "IndiaMART", etc.), so we
  // group on that.
  const leadAgg = await prisma.lead.groupBy({
    by: ["source"],
    where: { companyId, createdAt: { gte: since24h } },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  // Failed webhook events in the last 24h. Scoped to this tenant by
  // joining through credentialId. Two-step query because Prisma
  // groupBy on a relation column isn't worth the complexity here.
  const credIds = integrations.map((i) => i.id);
  let errorsByCred = {};
  if (credIds.length) {
    const failedEvents = await prisma.webhookEvent.groupBy({
      by: ["credentialId"],
      where: {
        credentialId: { in: credIds },
        status: "FAILED",
        receivedAt: { gte: since24h },
      },
      _count: { _all: true },
    });
    errorsByCred = Object.fromEntries(
      failedEvents.map((e) => [e.credentialId, e._count._all]),
    );
  }

  const providerLabels = {
    META: ["Facebook", "Instagram"],
    GOOGLE_ADS: ["Google Ads"],
    WEBSITE_FORM: ["Website"],
    JUSTDIAL: ["JustDial"],
    INDIAMART: ["IndiaMART"],
  };

  const byProvider = {};
  for (const [p, labels] of Object.entries(providerLabels)) {
    const conns = integrations.filter((i) => i.provider === p);
    const leadsRows = leadAgg.filter((l) => labels.includes(l.source));
    const leads24h = leadsRows.reduce((s, r) => s + (r._count?._all || 0), 0);
    const lastLeadAt = leadsRows
      .map((r) => r._max?.createdAt)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    const errors24h = conns.reduce((s, c) => s + (errorsByCred[c.id] || 0), 0);
    byProvider[p] = {
      connections: conns.length,
      activeConnections: conns.filter((c) => c.status === "ACTIVE").length,
      brokenConnections: conns.filter((c) => c.status !== "ACTIVE").length,
      leads24h,
      lastLeadAt,
      errors24h,
    };
  }

  const totalLeads24h = leadAgg.reduce((s, r) => s + (r._count?._all || 0), 0);
  const lastLeadAt =
    leadAgg
      .map((r) => r._max?.createdAt)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  const totalErrors24h = Object.values(errorsByCred).reduce((a, b) => a + b, 0);

  return {
    totals: {
      connections: integrations.length,
      activeConnections: integrations.filter((i) => i.status === "ACTIVE").length,
      brokenConnections: integrations.filter((i) => i.status !== "ACTIVE").length,
      leads24h: totalLeads24h,
      lastLeadAt,
      errors24h: totalErrors24h,
    },
    byProvider,
  };
}

// Recent inbound events for one credential. Used by the FE's "View
// events" modal for debugging. We deliberately truncate rawPayload to
// keep response size sane; the FE can fetch the full row if needed
// (not exposed yet — call it YAGNI until someone asks).
async function recentEventsForIntegration({ companyId, integrationId, limit = 50 }) {
  const cred = await prisma.integrationCredential.findFirst({
    where: { id: integrationId, companyId },
    select: { id: true },
  });
  if (!cred) throw new ApiError(404, "Integration not found");

  const events = await prisma.webhookEvent.findMany({
    where: { credentialId: integrationId },
    orderBy: { receivedAt: "desc" },
    take: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
  });

  return events.map((e) => {
    let preview = null;
    try {
      const s = JSON.stringify(e.rawPayload ?? {});
      preview = s.length > 500 ? s.slice(0, 500) + "…" : s;
    } catch {
      preview = "(unserializable)";
    }
    return {
      id: e.id,
      externalId: e.externalId,
      status: e.status,
      receivedAt: e.receivedAt,
      processedAt: e.processedAt,
      errorMessage: e.errorMessage,
      payloadPreview: preview,
    };
  });
}

module.exports = {
  listForCompany,
  createForCompany,
  updateForCompany,
  deleteForCompany,
  testConnection,
  resolveByWebhookToken,
  statsForCompany,
  recentEventsForIntegration,
  toPublicView,
};
