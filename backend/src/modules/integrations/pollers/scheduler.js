// Pull-poller scheduler.
//
// One global tick runs every TICK_SEC seconds. Each tick:
//   1. Loads ACTIVE integrations whose driver implements pullRecent().
//   2. For each, checks if (lastPolledAt + pollIntervalSec) is due.
//   3. Runs the pull, dedupes via WebhookEvent, ingests new leads.
//
// We deliberately use ONE shared interval rather than per-credential
// setIntervals — this keeps the boot-time wiring simple and means a
// freshly-saved credential picks up its first poll within TICK_SEC
// seconds instead of waiting for an interval to be created.

const { logger } = require("../../../lib/logger");
const prisma = require("../../../config/prisma");
const { decryptJson } = require("../crypto");
const { getDriver, hasDriver } = require("../drivers");
const {
  ingestLead,
  recordWebhookEvent,
  markEventProcessed,
  markEventFailed,
} = require("../ingest.service");

const TICK_SEC = 60;
const DEFAULT_INTERVAL_SEC = 300;

let timer = null;
let running = false;

async function tick() {
  if (running) return; // overlap guard
  running = true;
  try {
    const rows = await prisma.integrationCredential.findMany({
      where: { status: "ACTIVE" },
    });
    for (const row of rows) {
      // Only providers whose driver exposes pullRecent are polled.
      if (!hasDriver(row.provider)) continue;
      const driver = getDriver(row.provider);
      if (typeof driver.pullRecent !== "function") continue;

      let credentials;
      try {
        credentials = decryptJson(row.credentials);
      } catch (err) {
        logger.warn({ id: row.id, err: err?.message }, "poller: decrypt failed");
        continue;
      }

      // Pull variant only — for JustDial today, also future IndiaMART.
      // Drivers that always poll (no variant discriminator) should not set
      // variant; we treat absence as "always".
      if (credentials.variant && credentials.variant !== "PULL") continue;

      const intervalSec =
        Number(credentials.pollIntervalSec) > 0
          ? Number(credentials.pollIntervalSec)
          : DEFAULT_INTERVAL_SEC;

      const last = row.lastPolledAt ? row.lastPolledAt.getTime() : 0;
      if (Date.now() - last < intervalSec * 1000) continue;

      try {
        await runOnePoll({ row, driver, credentials });
      } catch (err) {
        logger.error({ id: row.id, err: err?.message }, "poller: pull failed");
        await prisma.integrationCredential.update({
          where: { id: row.id },
          data: {
            lastErrorAt: new Date(),
            lastError: String(err?.message || err).slice(0, 500),
            // Don't auto-flip status to INVALID on a single failure — a
            // transient 503 shouldn't disable an integration. The daily
            // health-check cron (phase 6) will be more decisive.
          },
        });
      }
    }
  } finally {
    running = false;
  }
}

async function runOnePoll({ row, driver, credentials }) {
  const since = row.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const items = await driver.pullRecent({ credentials, since });
  let processed = 0;
  let deduped = 0;
  for (const item of Array.isArray(items) ? items : []) {
    // Derive externalId per driver — JustDial puts leadid in many spots,
    // so use the same fuzzy match the verifyWebhook path uses.
    const extId = deriveExternalId(row.provider, item);
    if (!extId) continue;
    const event = await recordWebhookEvent({
      provider: row.provider,
      externalId: extId,
      credentialId: row.id,
      rawPayload: item,
    });
    if (event.duplicate) {
      deduped++;
      continue;
    }
    try {
      const mapped = driver.mapToLead(item, { credentials });
      if (!mapped) {
        await markEventFailed(event.id, "mapToLead returned null");
        continue;
      }
      mapped.externalId = extId;
      const result = await ingestLead({ companyId: row.companyId, mapped });
      await markEventProcessed(event.id, { leadId: result.id, deduped: result.deduped });
      processed++;
    } catch (err) {
      await markEventFailed(event.id, err?.message);
    }
  }
  await prisma.integrationCredential.update({
    where: { id: row.id },
    data: {
      lastPolledAt: new Date(),
      lastVerifiedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
    },
  });
  logger.info({ id: row.id, processed, deduped }, "poller: pull ok");
}

function deriveExternalId(provider, item) {
  if (!item || typeof item !== "object") return null;
  // Generic fuzzy ID resolver shared across pull-based providers.
  const candidates = [
    "leadid", "lead_id", "id",
    "unique_query_id", "UNIQUE_QUERY_ID", "uniqueId",
  ];
  const lower = {};
  for (const [k, v] of Object.entries(item)) lower[k.toLowerCase()] = v;
  for (const c of candidates) {
    const v = lower[c.toLowerCase()];
    if (v != null && String(v).trim() !== "") {
      return `${provider.toLowerCase()}_${String(v).trim()}`;
    }
  }
  return null;
}

function start() {
  if (timer) return;
  // Stagger the first tick so the server isn't pulling external APIs as
  // its very first action on boot.
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "poller: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "poller: tick failed"));
    }, TICK_SEC * 1000);
  }, 5_000);
  logger.info({ tickSec: TICK_SEC }, "integrations poller scheduled");
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, _tickForTest: tick };
