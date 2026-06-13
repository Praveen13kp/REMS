async function notify(tenantPrisma, { userId, type, title, body, link, metadata }) {
  try {
    const prefKey = type.toLowerCase();
    const pref = await tenantPrisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type: prefKey } },
    });

    // Fallback to system defaults if no per-user row exists yet
    const { TENANT_DEFAULTS } = require("./notificationPreference.service");
    const canEmail = pref ? pref.email : (TENANT_DEFAULTS[prefKey]?.email ?? true);
    const canInApp = pref ? pref.inapp : (TENANT_DEFAULTS[prefKey]?.inapp ?? true);

    if (canEmail) {
      // trySendEmailNotification is fire-and-forget (catches its own errors)
      // but we await it here so the caller (like lead create) can be sure
      // the dispatch was at least attempted.
      await trySendEmailNotification(tenantPrisma, { userId, type, title, body, link });
    }

    if (canInApp) {
      await tenantPrisma.notification.create({
        data: {
          userId,
          type,
          title,
          body: body || null,
          link: link || null,
          metadata: metadata || undefined,
        },
      });
    }
  } catch (err) {
    console.error("notify(): failed to dispatch notification", err);
  }
}

async function trySendEmailNotification(tenantPrisma, { userId, type, title, body, link }) {
  try {
    const user = await tenantPrisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true, companyId: true },
    });

    if (!user) return;

    const { notificationEmail } = require("../../lib/emails/notificationEmail");
    const { sendMail } = require("../../lib/mail");
    const { env } = require("../../lib/env");

    // Prepend the frontend URL to the relative link so the "View" button works in email
    let absoluteLink = link;
    if (link && link.startsWith("/")) {
      const base = env.FRONTEND_URL.split(",")[0].trim().replace(/\/$/, "");
      absoluteLink = `${base}${link}`;
    }

    const { subject, text, html } = notificationEmail({
      userName: user.name,
      notificationType: type,
      title,
      body,
      link: absoluteLink,
    });

    await sendMail({
      to: user.email,
      subject,
      html,
      text,
      companyId: user.companyId,
    });
  } catch (err) {
    console.error("notify(): failed to send email notification", err);
  }
}

module.exports = { notify };
