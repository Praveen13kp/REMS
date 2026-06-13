const { logger } = require("../../lib/logger");
const { sendWeeklyReports } = require("./notificationReport.service");

const TICK_HOURS = 168;
const TICK_MS = TICK_HOURS * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 180_000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    await sendWeeklyReports();
    logger.info(
      { durationMs: Date.now() - startedAt },
      "weekly-report: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "weekly-report: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "weekly-report: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "weekly-report: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info({ tickHours: TICK_HOURS }, "weekly-report scheduler started");
}

module.exports = { start, tick };
