// Daily trial-reminder fan-out. Creates one in-app notification per
// OWNER/ADMIN per BASIC tenant with active trial, scoped to current
// days-remaining. The "once per day" guarantee comes from a uniqueness
// check on (userId, type=TRIAL_REMINDER, today's date in metadata).
//
// Wired from billing/trialReminder.scheduler.js which fires every 6h. We
// dedupe inside this service so multiple ticks per day don't double-send.

const prisma = require("../../config/prisma");
const { logger } = require("../../lib/logger");
const { sendMail } = require("../../lib/mail");
const { trialReminderEmail } = require("../../lib/emails/trialReminderEmail");
const { env } = require("../../lib/env");

const REMINDER_TYPE = "TRIAL_REMINDER";
const FRONTEND_BASE_URL = env.FRONTEND_URL.split(",")[0].trim();
const UPGRADE_URL = `${FRONTEND_BASE_URL}/admin/billing`;

// Email cadence is stricter than in-app — we don't want to spam inboxes
// every day. Email goes out on D-3 and D-1 only; in-app continues daily.
function shouldEmail(daysLeft) {
  return daysLeft === 3 || daysLeft === 1;
}

function startOfDayUtc(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysRemaining(trialEndsAt, now = new Date()) {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

// Returns { scanned, sent, skipped, errors } for the logger.
async function runTrialReminderTick(now = new Date()) {
  const result = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  const startOfToday = startOfDayUtc(now);

  const companies = await prisma.company.findMany({
    where: {
      subscriptionPlan: "BASIC",
      trialEndsAt: { gt: now },
      status: { not: "DELETED" },
    },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
    },
  });

  for (const company of companies) {
    result.scanned++;
    const daysLeft = daysRemaining(company.trialEndsAt, now);
    if (daysLeft <= 0) continue;

    // We only ping when there's something worth saying: every day in the
    // last 3 days, plus a "halfway" check on day 4 (= 4 days left). Mid-
    // trial silence keeps the bell from feeling spammy.
    const shouldPing = daysLeft <= 3 || daysLeft === 4;
    if (!shouldPing) {
      result.skipped++;
      continue;
    }

    const recipients = await prisma.user.findMany({
      where: {
        companyId: company.id,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Email cadence is stricter than in-app: only D-3 and D-1 to avoid
    // inbox spam. The bell keeps its daily rhythm for the last 4 days.
    const sendEmailToday = daysLeft === 3 || daysLeft === 1;

    for (const user of recipients) {
      // Dedupe: skip if we already sent a TRIAL_REMINDER to this user
      // today. Cheap query — Notification(userId, createdAt) covers it.
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: REMINDER_TYPE,
          createdAt: { gte: startOfToday },
        },
        select: { id: true },
      });
      if (existing) {
        result.skipped++;
        continue;
      }

      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: REMINDER_TYPE,
            title:
              daysLeft === 1
                ? "Your free trial ends tomorrow"
                : `${daysLeft} days left in your free trial`,
            body:
              daysLeft <= 2
                ? "Upgrade to Pro to avoid losing access to integrations, lead aging, and new invites."
                : "You're on the 7-day Basic trial. Upgrade any time to unlock the full feature set.",
            link: "/admin/billing",
            metadata: {
              kind: REMINDER_TYPE,
              daysLeft,
              trialEndsAt: company.trialEndsAt.toISOString(),
              companyId: company.id,
            },
          },
        });
        result.sent++;

        // Email send (D-3 and D-1 only). Fire-and-forget so a slow SMTP
        // handshake doesn't stall the scheduler tick — the in-app
        // notification is the primary signal; email is a nudge on top.
        if (sendEmailToday && user.email) {
          const mail = trialReminderEmail({
            ownerName: user.name,
            companyName: company.name,
            daysLeft,
            upgradeUrl: UPGRADE_URL,
          });
          sendMail({
            to: user.email,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          })
            .then((r) => {
              if (r?.delivered) {
                logger.info(
                  { email: user.email, daysLeft },
                  "trialReminder: email delivered",
                );
              }
            })
            .catch((err) => {
              logger.error(
                { err: err?.message, email: user.email },
                "trialReminder: email send failed",
              );
            });
        }
      } catch (err) {
        result.errors++;
        logger.error(
          { err: err?.message, userId: user.id, companyId: company.id },
          "trialReminder: notify failed",
        );
      }
    }
  }

  return result;
}

module.exports = { runTrialReminderTick, REMINDER_TYPE };
