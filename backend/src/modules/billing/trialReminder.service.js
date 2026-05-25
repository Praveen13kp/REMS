// Trial-reminder fan-out. Covers all three plans (Basic/Pro/Enterprise)
// since each gets a 7-day trial. Fires four milestones per company:
//   1. Active welcome  — once, on the day the trial starts
//   2. 2 days remaining
//   3. 1 day remaining (final urgency)
//   4. Expired         — once, on/after trialEndsAt with no paid sub
//
// Wired from billing/trialReminder.scheduler.js which fires every 6h.
// Dedupe is keyed on (userId, metadata.milestone) so each milestone fires
// exactly once per trial regardless of how often the scheduler ticks.

const prisma = require("../../config/prisma");
const { logger } = require("../../lib/logger");
const { sendMail } = require("../../lib/mail");
const { trialReminderEmail } = require("../../lib/emails/trialReminderEmail");
const { env } = require("../../lib/env");

const REMINDER_TYPE = "TRIAL_REMINDER";
const FRONTEND_BASE_URL = env.FRONTEND_URL.split(",")[0].trim();
const UPGRADE_URL = `${FRONTEND_BASE_URL}/admin/billing`;

function daysRemaining(trialEndsAt, now = new Date()) {
  return Math.ceil(
    (trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
}

// Decide which milestone (if any) the company is currently at. Returns
// one of: "active" | "two-days" | "one-day" | "expired" | null.
function milestoneFor(trialEndsAt, now) {
  const days = daysRemaining(trialEndsAt, now);
  if (days <= 0) return "expired";
  if (days === 1) return "one-day";
  if (days === 2) return "two-days";
  // "active" fires for the first day of the trial only — once daysLeft
  // drops below 7 we've already passed the welcome window.
  if (days >= 7) return "active";
  return null;
}

const COPY = {
  active: (planName) => ({
    title: `Welcome to your ${planName} free trial`,
    body: `You have 7 days to explore every ${planName} feature. We'll remind you before it ends.`,
  }),
  "two-days": (planName) => ({
    title: "2 days left in your free trial",
    body: `Your ${planName} trial ends in 2 days. Subscribe now to avoid losing access.`,
  }),
  "one-day": (planName) => ({
    title: "Your free trial ends tomorrow",
    body: "Subscribe today to keep your team, leads, and integrations active.",
  }),
  expired: (planName) => ({
    title: "Your free trial has ended",
    body: `Your ${planName} trial has ended. Subscribe to restore access.`,
  }),
};

// Email gets sent for the two-days / one-day / expired milestones. Active
// welcome is in-app only — no point cluttering inboxes with that.
const EMAIL_MILESTONES = new Set(["two-days", "one-day", "expired"]);

// Returns { scanned, sent, skipped, errors } for the logger.
async function runTrialReminderTick(now = new Date()) {
  const result = { scanned: 0, sent: 0, skipped: 0, errors: 0 };

  // All tenants with a trial date set (any plan, not just BASIC). Companies
  // that have already converted to a paid subscription are filtered out
  // per-tenant below so we don't keep nagging paying customers.
  const companies = await prisma.company.findMany({
    where: {
      trialEndsAt: { not: null },
      status: { not: "DELETED" },
    },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      subscriptionPlan: true,
    },
  });

  for (const company of companies) {
    result.scanned++;

    const milestone = milestoneFor(company.trialEndsAt, now);
    if (!milestone) {
      result.skipped++;
      continue;
    }

    // Paid customers don't get trial reminders. We check per company so a
    // freshly-upgraded tenant stops being nagged on the very next tick.
    const activeSub = await prisma.subscription.findFirst({
      where: { companyId: company.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (activeSub) {
      result.skipped++;
      continue;
    }

    const planName = (company.subscriptionPlan || "BASIC")
      .toString()
      .toLowerCase()
      .replace(/(^| )(.)/g, (_, sp, c) => sp + c.toUpperCase());
    const copy = COPY[milestone](planName);

    const recipients = await prisma.user.findMany({
      where: {
        companyId: company.id,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true, email: true },
    });

    for (const user of recipients) {
      // Dedupe across the whole trial: each milestone fires once per
      // (user, trialEndsAt). Stored as metadata.milestone so we can spot
      // re-runs without time-window math.
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: REMINDER_TYPE,
          metadata: {
            path: ["milestone"],
            equals: milestone,
          },
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
            title: copy.title,
            body: copy.body,
            link: "/admin/billing",
            metadata: {
              kind: REMINDER_TYPE,
              milestone,
              plan: company.subscriptionPlan,
              trialEndsAt: company.trialEndsAt.toISOString(),
              companyId: company.id,
            },
          },
        });
        result.sent++;

        if (EMAIL_MILESTONES.has(milestone) && user.email) {
          const daysLeft = Math.max(0, daysRemaining(company.trialEndsAt, now));
          const mail = trialReminderEmail({
            ownerName: user.name,
            companyName: company.name,
            daysLeft,
            upgradeUrl: UPGRADE_URL,
            milestone,
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
                  { email: user.email, milestone },
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
