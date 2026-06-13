const { logger } = require("../../lib/logger");
const { sendDailySummaries } = require("./notificationReport.service");

const TARGET_HOUR = 15;
const TARGET_MINUTE = 57;
const DAY_MS = 24 * 60 * 60 * 1000;

let timer = null;
let running = false;

function msUntilTarget() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    diff += DAY_MS;
  }
  return diff;
}

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    await sendDailySummaries();
    logger.info(
      { durationMs: Date.now() - startedAt },
      "daily-summary: tick complete",
    );
  } catch (err) {
    logger.error({ err: err?.message }, "daily-summary: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  const delay = msUntilTarget();
  logger.info(
    { firstTickInMs: delay, targetTime: `${TARGET_HOUR}:${String(TARGET_MINUTE).padStart(2, "0")}` },
    "daily-summary scheduler started",
  );
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "daily-summary: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "daily-summary: tick failed"));
    }, DAY_MS);
  }, delay);
}

module.exports = { start, tick };
