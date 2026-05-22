// Trial-reminder scheduler. Fires every 6 hours so users in different
// timezones still see a fresh "X days left" notification on the same UTC
// day, even if their bell happens to be closed at midnight.
// trialReminder.service dedupes per UTC-day, so multiple ticks are safe.

const { logger } = require("../../lib/logger");
const { runTrialReminderTick } = require("./trialReminder.service");

const TICK_HOURS = 6;
const TICK_MS = TICK_HOURS * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 90_000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    const result = await runTrialReminderTick();
    logger.info(
      { ...result, durationMs: Date.now() - startedAt },
      "trial-reminder: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "trial-reminder: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "trial-reminder: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "trial-reminder: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info({ tickHours: TICK_HOURS }, "trial-reminder scheduler started");
}

module.exports = { start, tick };
