// Trash purge scheduler.
//
// Every TICK_HOURS hours, permanently delete any lead whose deletedAt is
// older than RETENTION_DAYS. Matches the soft-delete flow in lead.service:
// the user "deactivates" a lead and gets a 30-day window to restore; past
// that window we hard-delete the row and its lead-owned children to free
// the cap and stop the row from accumulating dead data.
//
// Mirrors the shape of leadAging.scheduler so boot wiring stays uniform.

const prisma = require("../../config/prisma");
const { logger } = require("../../lib/logger");

const RETENTION_DAYS = 30;
const TICK_HOURS = 12;
const TICK_MS = TICK_HOURS * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 90_000;

let timer = null;
let running = false;

async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expired = await prisma.lead.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });
  if (expired.length === 0) return { purged: 0 };

  const ids = expired.map((l) => l.id);

  // Same child-detach pattern as the hard-delete path in lead.service.
  // Notes are lead-owned (delete); Tasks + Files outlive the lead (detach).
  // Activities are deleted last so the audit trail goes with the row.
  await prisma.$transaction([
    prisma.note.deleteMany({ where: { leadId: { in: ids } } }),
    prisma.task.updateMany({
      where: { leadId: { in: ids } },
      data: { leadId: null },
    }),
    prisma.file.updateMany({
      where: { leadId: { in: ids } },
      data: { leadId: null },
    }),
    prisma.activity.deleteMany({ where: { leadId: { in: ids } } }),
    prisma.lead.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return { purged: ids.length };
}

async function tick() {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    const result = await purgeExpiredTrash();
    if (result.purged > 0) {
      logger.info(
        { ...result, durationMs: Date.now() - startedAt },
        "trash-purge: removed expired soft-deleted leads",
      );
    }
  } catch (err) {
    logger.error({ err: err?.message }, "trash-purge: tick failed");
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(() => {
    tick().catch((err) => logger.error(err, "trash-purge: first tick failed"));
    timer = setInterval(() => {
      tick().catch((err) => logger.error(err, "trash-purge: tick failed"));
    }, TICK_MS);
  }, STARTUP_DELAY_MS);
  logger.info(
    { tickHours: TICK_HOURS, retentionDays: RETENTION_DAYS },
    "trash-purge scheduler started",
  );
}

module.exports = { start, tick, purgeExpiredTrash, RETENTION_DAYS };
