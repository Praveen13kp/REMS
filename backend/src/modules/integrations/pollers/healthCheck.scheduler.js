// Daily health-check scheduler.
//
// Every TICK_HOURS hours, runs healthCheck against every ACTIVE
// integration to catch silent token expiries and revocations. Reuses
// integrations.service.testConnection() so behaviour matches the manual
// Test Connection button exactly — same DB updates, same notification
// on ACTIVE -> INVALID transition.
//
// Why hourly rather than daily? Hourly is what "feels right" between
// catching breakage promptly and not hammering Meta / Google / IndiaMART
// every few minutes. We can dial this down later if rate-limit concerns
// surface — none of the providers complained at hourly probes during
// dev.

const { logger } = require("../../../lib/logger");
const prisma = require("../../../config/prisma");
const { testConnection } = require("../integrations.service");

const TICK_HOURS = 1;
const TICK_MS = TICK_HOURS * 60 * 60 * 1000;
// On boot, wait this long before the first tick — so we don't probe
// every credential while the server is still warming up.
const STARTUP_DELAY_MS = 30_000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  let probed = 0;
  let broke = 0;
  try {
    const rows = await prisma.integrationCredential.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, companyId: true, provider: true, label: true, lastVerifiedAt: true },
    });
    for (const row of rows) {
      // Skip if checked very recently (e.g. tenant clicked Test 5 min
      // ago). Saves API quota without missing anything important.
      if (row.lastVerifiedAt && Date.now() - row.lastVerifiedAt.getTime() < 30 * 60 * 1000) {
        continue;
      }
      probed++;
      try {
        const res = await testConnection({
          companyId: row.companyId,
          integrationId: row.id,
          source: "cron",
        });
        if (!res?.ok) broke++;
      } catch (err) {
        logger.warn(
          { id: row.id, provider: row.provider, err: err?.message },
          "health-check: testConnection threw",
        );
        broke++;
      }
    }
    logger.info(
      { probed, broke, durationMs: Date.now() - startedAt },
      "health-check: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "health-check: tick failed at top level");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "health-check: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "health-check: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info({ tickHours: TICK_HOURS }, "health-check scheduler started");
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, _tickForTest: tick };
