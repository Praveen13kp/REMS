const { logger } = require("../../../lib/logger");
const { getDriver, hasDriver } = require("../drivers");
const {
  resolveByWebhookToken,
} = require("../integrations.service");
const {
  ingestLead,
  recordWebhookEvent,
  markEventProcessed,
  markEventFailed,
} = require("../ingest.service");

// Slug used in /api/webhooks/{slug}/byo/{token} → IntegrationProvider enum.
function slugToProvider(slug) {
  const map = {
    meta: "META",
    google: "GOOGLE_ADS",
    website: "WEBSITE_FORM",
    justdial: "JUSTDIAL",
    indiamart: "INDIAMART",
  };
  return map[String(slug || "").toLowerCase()] || null;
}

function notFound(res) {
  // Same 404 shape regardless of why (unknown slug, unknown token,
  // disabled credential). We never disclose which.
  return res.status(404).json({ ok: false, error: { code: 404, message: "Not found" } });
}

// GET /api/webhooks/:slug/byo/:token
// Provider verification handshake. Only Meta needs this today; other
// drivers without handleVerificationHandshake return 200 with a no-op
// body so curl-tests don't error.
async function handleHandshake(req, res, next) {
  try {
    const provider = slugToProvider(req.params.slug);
    if (!provider || !hasDriver(provider)) return notFound(res);

    const resolved = await resolveByWebhookToken(req.params.token);
    if (!resolved) return notFound(res);

    const driver = getDriver(provider);
    if (!driver.handleVerificationHandshake) {
      return res.status(200).send("ok");
    }
    const result = await driver.handleVerificationHandshake({
      req,
      credentials: resolved.credentials,
    });
    if (!result || !result.ok) {
      return res.status(result?.status || 403).send(result?.body || "forbidden");
    }
    res.set("Content-Type", "text/plain");
    return res.status(200).send(String(result.body ?? ""));
  } catch (err) {
    next(err);
  }
}

// POST /api/webhooks/:slug/byo/:token
// Generic dispatch:
//   1. resolve token -> credential
//   2. driver.verifyWebhook  -> { ok, externalId?, payload? }
//   3. record WebhookEvent (idempotent via @@unique[provider, externalId])
//   4. driver.fetchLead     -> raw lead fields
//   5. driver.mapToLead     -> normalized shape
//   6. ingestLead           -> Lead row + LEAD_CREATED notification
async function handleWebhook(req, res, next) {
  const provider = slugToProvider(req.params.slug);
  if (!provider || !hasDriver(provider)) return notFound(res);

  const resolved = await resolveByWebhookToken(req.params.token);
  if (!resolved) return notFound(res);

  const driver = getDriver(provider);

  let verification;
  try {
    verification = await driver.verifyWebhook({
      req,
      rawBody: req.rawBody,
      credentials: resolved.credentials,
    });
  } catch (err) {
    logger.warn({ provider, err: err?.message }, "webhook verify error");
    return res.status(401).json({ ok: false, error: { code: 401, message: "Verification failed" } });
  }

  if (!verification || !verification.ok) {
    return res
      .status(verification?.status || 401)
      .json({ ok: false, error: { code: verification?.status || 401, message: "Verification failed" } });
  }

  // Some Meta deliveries are object-level events with no leadgen change
  // (e.g. page test pings) — driver returns ok with no externalId. ACK
  // them with 200 so Meta doesn't retry.
  if (!verification.externalId) {
    return res.status(200).json({ ok: true, acked: true });
  }

  // Record + dedupe BEFORE doing any heavy provider API calls.
  const eventRow = await recordWebhookEvent({
    provider,
    externalId: verification.externalId,
    credentialId: resolved.row.id,
    rawPayload: verification.payload || req.body || {},
  });

  if (eventRow.duplicate) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  try {
    const rawFields = driver.fetchLead
      ? await driver.fetchLead({
          credentials: resolved.credentials,
          externalId: verification.externalId,
          payload: verification.payload,
        })
      : verification.payload;

    if (!rawFields) {
      await markEventFailed(eventRow.id, "fetchLead returned empty");
      return res.status(200).json({ ok: true, skipped: true });
    }

    const mapped = driver.mapToLead(rawFields, { credentials: resolved.credentials });
    if (!mapped) {
      await markEventFailed(eventRow.id, "mapToLead returned null");
      return res.status(200).json({ ok: true, skipped: true });
    }
    // Stamp the externalId on the mapped lead so duplicates can be traced.
    mapped.externalId = mapped.externalId || verification.externalId;

    const result = await ingestLead({ companyId: resolved.row.companyId, mapped });
    await markEventProcessed(eventRow.id, { leadId: result.id, deduped: result.deduped });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err: err?.message, provider, externalId: verification.externalId }, "webhook ingest failed");
    await markEventFailed(eventRow.id, err?.message);
    // 200 anyway: we already recorded the failure, retrying won't help if
    // it's a code bug. Returning 5xx makes Meta hammer us. Operators
    // inspect WebhookEvent.status='FAILED' rows.
    return res.status(200).json({ ok: false, error: "internal", reason: err?.message });
  }
}

module.exports = { handleHandshake, handleWebhook };
