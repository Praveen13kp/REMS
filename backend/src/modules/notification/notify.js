async function notify(tenantPrisma, { userId, type, title, body, link, metadata }) {
  try {
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
  } catch (err) {
    console.error("notify(): failed to create notification", err);
  }
}

module.exports = { notify };
