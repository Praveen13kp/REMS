// Single ingestion pipeline. Every provider driver — webhook-driven or
// poller-driven — funnels here. This is the ONLY place that writes to the
// Lead table from external sources. Mirrors the dedupe + notification
// pattern already established by Sprint 5's leadIntake.service.js, so
// downstream consumers (notification bell, activity feed) don't need to
// learn a second flow.

const prisma = require("../../config/prisma");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { findDuplicates } = require("../lead/lead.service");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");

// Pascal-case for the FE LEAD_SOURCES dropdown — same convention Sprint 5
// uses. Keeps the source filter on the Leads page consistent across both
// the old /api/intake/* and the new BYO integrations.
const SOURCE_LABELS = {
  META_FB: "Facebook",
  META_IG: "Instagram",
  GOOGLE_ADS: "Google Ads",
  WEBSITE_FORM: "Website",
  JUSTDIAL: "JustDial",
  INDIAMART: "IndiaMART",
};

function labelFor(source) {
  return SOURCE_LABELS[source] || source;
}

// Record every inbound webhook BEFORE any processing. The unique
// (provider, externalId) constraint is what guarantees Meta/Google retries
// don't create duplicate leads. Callers pass the provider enum + the
// provider's own external ID (leadgen_id, UNIQUE_QUERY_ID, etc.).
async function recordWebhookEvent({ provider, externalId, credentialId, rawPayload }) {
  try {
    return await prisma.webhookEvent.create({
      data: {
        provider,
        externalId,
        credentialId: credentialId || null,
        status: "RECEIVED",
        rawPayload: rawPayload ?? {},
      },
    });
  } catch (err) {
    // Unique constraint hit = duplicate delivery. Return the existing row
    // so the router can short-circuit with a 200 OK to stop retries.
    if (err && err.code === "P2002") {
      const existing = await prisma.webhookEvent.findUnique({
        where: { provider_externalId: { provider, externalId } },
      });
      return { ...existing, duplicate: true };
    }
    throw err;
  }
}

async function markEventProcessed(eventId, { leadId, deduped }) {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      processedAt: new Date(),
      status: deduped ? "DUPLICATE" : "PROCESSED",
      errorMessage: leadId ? null : "no lead created",
    },
  });
}

async function markEventFailed(eventId, message) {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      processedAt: new Date(),
      status: "FAILED",
      errorMessage: String(message || "unknown error").slice(0, 500),
    },
  });
}

// Core write path. `mapped` is the driver's normalized output:
//   { name, phone, email, city?, notes?, source, externalId? }
async function ingestLead({ companyId, mapped }) {
  if (!companyId) throw new Error("ingestLead: missing companyId");
  if (!mapped) throw new Error("ingestLead: missing mapped lead");
  if (!mapped.phone && !mapped.email) {
    throw new Error("Lead must have at least a phone or email");
  }

  const tenantPrisma = getTenantPrisma(companyId);
  const sourceLabel = labelFor(mapped.source);

  // Dedupe: if a lead with the same phone/email already exists in this
  // tenant, attach the new submission as a note + activity instead of
  // creating a second row.
  const { hard } = await findDuplicates(tenantPrisma, {
    phone: mapped.phone || undefined,
    email: mapped.email || undefined,
  });

  if (hard.length > 0) {
    const existing = hard[0];
    if (mapped.notes) {
      await tenantPrisma.note.create({
        data: { leadId: existing.id, userId: null, content: `[${sourceLabel}] ${mapped.notes}` },
      });
    }
    await logActivity(tenantPrisma, {
      leadId: existing.id,
      userId: null,
      type: "SYSTEM",
      content: `Duplicate ${sourceLabel} submission merged`,
      metadata: { kind: "INTEGRATION_DEDUP", source: sourceLabel, externalId: mapped.externalId || null },
    });
    return { id: existing.id, deduped: true };
  }

  const created = await tenantPrisma.lead.create({
    data: {
      name: mapped.name || "Unknown",
      phone: mapped.phone || "",
      email: mapped.email || null,
      city: mapped.city || null,
      source: sourceLabel,
      status: "New",
      tags: [],
    },
  });

  if (mapped.notes) {
    await tenantPrisma.note.create({
      data: { leadId: created.id, userId: null, content: `[${sourceLabel}] ${mapped.notes}` },
    });
  }

  await logActivity(tenantPrisma, {
    leadId: created.id,
    userId: null,
    type: "SYSTEM",
    content: `Lead created from ${sourceLabel} integration`,
    metadata: { kind: "INTEGRATION_CREATED", source: sourceLabel, externalId: mapped.externalId || null },
  });

  // Same LEAD_CREATED fan-out pattern as Sprint 5 — every OWNER + ADMIN
  // + MANAGER in the tenant gets a bell notification so external leads
  // don't sit unassigned. notify() swallows its own errors, so a
  // notification failure won't fail the webhook response.
  const recipients = await tenantPrisma.user.findMany({
    where: { isActive: true, role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
    select: { id: true },
  });
  await Promise.all(
    recipients.map((r) =>
      notify(tenantPrisma, {
        userId: r.id,
        type: "LEAD_CREATED",
        title: `New ${sourceLabel} lead`,
        body: `${mapped.name || "Unknown"} — ${mapped.phone || mapped.email || "no contact"}`,
        link: `/leads/${created.id}`,
        metadata: { leadId: created.id, source: sourceLabel, kind: "INTEGRATION_CREATED" },
      }),
    ),
  );

  return { id: created.id, deduped: false };
}

module.exports = {
  ingestLead,
  recordWebhookEvent,
  markEventProcessed,
  markEventFailed,
  labelFor,
};
