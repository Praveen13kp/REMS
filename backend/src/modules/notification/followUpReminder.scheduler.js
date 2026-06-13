const { logger } = require("../../lib/logger");
const { sendFollowUpReminders } = require("./notificationReport.service");

const TICK_MINUTES = 30;
const TICK_MS = TICK_MINUTES * 60 * 1000;
const STARTUP_DELAY_MS = 90_000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    await sendFollowUpReminders();
    logger.info(
      { durationMs: Date.now() - startedAt },
      "followup-reminder: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "followup-reminder: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "followup-reminder: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "followup-reminder: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info({ tickMinutes: TICK_MINUTES }, "followup-reminder scheduler started");
}

module.exports = { start, tick };
