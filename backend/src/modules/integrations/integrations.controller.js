const { ApiError } = require("../../lib/ApiError");
const { env } = require("../../lib/env");
const {
  listForCompany,
  createForCompany,
  updateForCompany,
  deleteForCompany,
  testConnection,
  statsForCompany,
  recentEventsForIntegration,
} = require("./integrations.service");
const {
  createIntegrationBody,
  updateIntegrationBody,
} = require("./integrations.schema");

const publicBaseUrl = () => env.BETTER_AUTH_URL.replace(/\/+$/, "");

// Provider enum → URL slug. Must mirror webhooks.controller.js#slugToProvider.
// Lowercasing the enum doesn't work for multi-word providers (WEBSITE_FORM,
// GOOGLE_ADS) since the route map uses the short slug.
const PROVIDER_TO_SLUG = {
  META: "meta",
  GOOGLE_ADS: "google",
  WEBSITE_FORM: "website",
  JUSTDIAL: "justdial",
  INDIAMART: "indiamart",
};

function withWebhookUrl(row) {
  if (!row) return row;
  const slug = PROVIDER_TO_SLUG[row.provider] || row.provider.toLowerCase();
  return {
    ...row,
    webhookUrl: `${publicBaseUrl()}/api/webhooks/${slug}/byo/${row.webhookToken}`,
  };
}

async function listIntegrations(req, res, next) {
  try {
    const rows = await listForCompany(req.user.companyId);
    return res.json({ ok: true, integrations: rows.map(withWebhookUrl) });
  } catch (err) {
    next(err);
  }
}

async function createIntegration(req, res, next) {
  try {
    const parsed = createIntegrationBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid request body", { details: parsed.error.issues });
    }
    const created = await createForCompany({
      companyId: req.user.companyId,
      userId: req.user.id,
      body: parsed.data,
    });
    return res.status(201).json({ ok: true, integration: withWebhookUrl(created) });
  } catch (err) {
    next(err);
  }
}

async function updateIntegration(req, res, next) {
  try {
    const parsed = updateIntegrationBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid request body", { details: parsed.error.issues });
    }
    const updated = await updateForCompany({
      companyId: req.user.companyId,
      integrationId: req.params.id,
      body: parsed.data,
    });
    return res.json({ ok: true, integration: withWebhookUrl(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteIntegration(req, res, next) {
  try {
    const result = await deleteForCompany({
      companyId: req.user.companyId,
      integrationId: req.params.id,
    });
    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function testIntegration(req, res, next) {
  try {
    const result = await testConnection({
      companyId: req.user.companyId,
      integrationId: req.params.id,
    });
    return res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await statsForCompany(req.user.companyId);
    return res.json({ ok: true, stats });
  } catch (err) {
    next(err);
  }
}

async function getEvents(req, res, next) {
  try {
    const events = await recentEventsForIntegration({
      companyId: req.user.companyId,
      integrationId: req.params.id,
      limit: req.query.limit,
    });
    return res.json({ ok: true, events });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  getStats,
  getEvents,
};
