// Lead-aging scheduler.
//
// Runs runAgingTick() every TICK_HOURS hours. First fire happens after
// STARTUP_DELAY_MS so we don't pile on top of server boot.
//
// Mirrors the shape of integrations/pollers/healthCheck.scheduler.js so
// the boot wiring in server.js stays uniform.

const { logger } = require("../../lib/logger");
const { runAgingTick, AGING_DAYS } = require("./leadAging.service");

const TICK_HOURS = 6;
const TICK_MS = TICK_HOURS * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 60_000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    const result = await runAgingTick({ days: AGING_DAYS });
    logger.info(
      { ...result, durationMs: Date.now() - startedAt },
      "lead-aging: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "lead-aging: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "lead-aging: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "lead-aging: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info(
    { tickHours: TICK_HOURS, agingDays: AGING_DAYS },
    "lead-aging scheduler started",
  );
}

module.exports = { start, tick };
