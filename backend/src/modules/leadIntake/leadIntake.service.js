const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { getTenantPrisma } = require("../../lib/tenantPrisma");
const { ApiError } = require("../../lib/ApiError");
const { findDuplicates } = require("../lead/lead.service");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");

const SUPPORTED_SOURCES = ["facebook", "instagram"];

const generateToken = () => crypto.randomBytes(24).toString("hex");
const generateSecret = () => crypto.randomBytes(32).toString("hex");

const emptyConfig = () => ({
  facebook: { token: null, secret: null, enabled: false },
  instagram: { token: null, secret: null, enabled: false },
});

const normalizeConfig = (raw) => {
  const base = emptyConfig();
  if (!raw || typeof raw !== "object") return base;
  for (const src of SUPPORTED_SOURCES) {
    const slot = raw[src];
    if (slot && typeof slot === "object") {
      base[src] = {
        token: typeof slot.token === "string" ? slot.token : null,
        secret: typeof slot.secret === "string" ? slot.secret : null,
        enabled: Boolean(slot.enabled),
      };
    }
  }
  return base;
};

const maskToken = (t) => {
  if (!t || typeof t !== "string") return null;
  if (t.length <= 8) return "*".repeat(t.length);
  return `${t.slice(0, 4)}${"*".repeat(t.length - 8)}${t.slice(-4)}`;
};

// Public read shape for the settings panel — never leaks the secret.
const toPublicView = (cfg, baseUrl) => {
  const view = {};
  for (const src of SUPPORTED_SOURCES) {
    const slot = cfg[src];
    view[src] = {
      enabled: slot.enabled,
      hasToken: Boolean(slot.token),
      maskedToken: maskToken(slot.token),
      webhookUrl: slot.token ? `${baseUrl}/api/intake/${src}/${slot.token}` : null,
    };
  }
  return view;
};

async function getConfigForCompany(companyId, baseUrl) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { intakeTokens: true },
  });
  if (!company) throw new ApiError(404, "Company not found");
  const cfg = normalizeConfig(company.intakeTokens);
  return toPublicView(cfg, baseUrl);
}

async function setEnabled(companyId, source, enabled, baseUrl) {
  if (!SUPPORTED_SOURCES.includes(source)) {
    throw new ApiError(400, "Unsupported intake source");
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { intakeTokens: true },
  });
  if (!company) throw new ApiError(404, "Company not found");

  const cfg = normalizeConfig(company.intakeTokens);
  // Auto-provision a token + secret on first enable so OWNER can copy the
  // webhook URL immediately without a separate "create" step.
  if (enabled && !cfg[source].token) {
    cfg[source].token = generateToken();
    cfg[source].secret = generateSecret();
  }
  cfg[source].enabled = Boolean(enabled);

  await prisma.company.update({
    where: { id: companyId },
    data: { intakeTokens: cfg },
  });

  return toPublicView(cfg, baseUrl);
}

// Rotates token + secret for a single source. Old token immediately stops
// resolving (it's gone from the row). Returns the new token ONCE in clear
// so the OWNER can copy it, plus the standard masked view.
async function regenerate(companyId, source, baseUrl) {
  if (!SUPPORTED_SOURCES.includes(source)) {
    throw new ApiError(400, "Unsupported intake source");
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { intakeTokens: true },
  });
  if (!company) throw new ApiError(404, "Company not found");

  const cfg = normalizeConfig(company.intakeTokens);
  cfg[source].token = generateToken();
  cfg[source].secret = generateSecret();
  // Don't auto-flip enabled — preserve existing on/off state.

  await prisma.company.update({
    where: { id: companyId },
    data: { intakeTokens: cfg },
  });

  return {
    source,
    token: cfg[source].token,
    secret: cfg[source].secret,
    webhookUrl: `${baseUrl}/api/intake/${source}/${cfg[source].token}`,
    view: toPublicView(cfg, baseUrl),
  };
}

// Resolve a (source, token) pair to a tenant. Returns the company row +
// secret needed for HMAC verification. Throws 404 if disabled or unknown —
// we never disclose which of the two failed.
async function resolveCompanyByToken(source, token) {
  if (!SUPPORTED_SOURCES.includes(source) || !token) {
    throw new ApiError(404, "Not found");
  }
  // Prisma can't filter on JSON token equality across all DBs cleanly, so
  // we scan companies that have intakeTokens. This is fine: even with 10k
  // tenants the row is tiny and the operation runs at webhook rate, which
  // is rate-limited upstream.
  const rows = await prisma.company.findMany({
    where: { intakeTokens: { not: null } },
    select: { id: true, intakeTokens: true },
  });
  for (const row of rows) {
    const cfg = normalizeConfig(row.intakeTokens);
    const slot = cfg[source];
    if (slot.enabled && slot.token === token) {
      return { companyId: row.id, secret: slot.secret };
    }
  }
  throw new ApiError(404, "Not found");
}

function verifyFacebookSignature(rawBody, secret, headerValue) {
  if (!headerValue || typeof headerValue !== "string") return false;
  if (!rawBody || !secret) return false;
  // Header format: "sha256=<hex>"
  const [algo, sig] = headerValue.split("=");
  if (algo !== "sha256" || !sig) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // timingSafeEqual requires equal-length buffers; bail before it throws.
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

// FB Lead Ads webhook payload shape (simplified):
//   { entry: [{ changes: [{ value: { field_data: [{name, values}], ... } }] }] }
// We also accept a flat shape { name, phone, email, ... } for test/curl convenience.
function mapPayloadToLead(source, body) {
  if (!body || typeof body !== "object") return null;

  // Flat shape — used by test curl and the FB "test lead" tool
  if (typeof body.name === "string" || typeof body.phone === "string" || typeof body.email === "string") {
    return {
      name: (body.name || "Unknown").trim() || "Unknown",
      phone: (body.phone || "").trim(),
      email: body.email ? String(body.email).trim() : null,
      city: body.city ? String(body.city).trim() : null,
      notes: body.notes ? String(body.notes) : null,
    };
  }

  // FB Lead Ads nested shape
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const e of entries) {
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const ch of changes) {
      const fd = ch?.value?.field_data;
      if (Array.isArray(fd)) {
        const flat = {};
        for (const f of fd) {
          if (f?.name && Array.isArray(f.values) && f.values.length) {
            flat[String(f.name).toLowerCase()] = f.values[0];
          }
        }
        const phone = flat.phone_number || flat.phone || "";
        const name = flat.full_name || flat.name || "Unknown";
        const email = flat.email || null;
        const city = flat.city || null;
        const notes = Object.entries(flat)
          .filter(([k]) => !["full_name", "name", "phone_number", "phone", "email", "city"].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n") || null;
        return {
          name: String(name).trim() || "Unknown",
          phone: String(phone).trim(),
          email: email ? String(email).trim() : null,
          city: city ? String(city).trim() : null,
          notes,
        };
      }
    }
  }
  return null;
}

async function ingestLead(source, companyId, mapped) {
  if (!mapped) throw new ApiError(400, "Could not extract lead fields from payload");
  if (!mapped.phone && !mapped.email) {
    throw new ApiError(400, "Lead must have at least a phone or email");
  }

  const tenantPrisma = getTenantPrisma(companyId);
  // Pascal-case to match the FE LEAD_SOURCES dropdown values exactly —
  // otherwise the source filter on the Leads page returns 0 rows for
  // intake-created leads.
  const sourceLabel = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();

  // Dedup: if an existing lead has the same phone/email, attach a note + activity
  // instead of creating a duplicate row.
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
      metadata: { kind: "INTAKE_DEDUP", source: sourceLabel },
    });
    return { id: existing.id, deduped: true };
  }

  const created = await tenantPrisma.lead.create({
    data: {
      name: mapped.name,
      phone: mapped.phone || "",
      email: mapped.email,
      city: mapped.city,
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
    content: `Lead created from ${sourceLabel} intake`,
    metadata: { kind: "INTAKE_CREATED", source: sourceLabel },
  });

  // Notify every OWNER + MANAGER in the tenant so external leads don't sit
  // unassigned in the unassigned bucket. Fire-and-forget — notify() catches
  // and logs its own errors, so a notification failure won't fail the
  // webhook response.
  const recipients = await tenantPrisma.user.findMany({
    where: { isActive: true, role: { in: ["OWNER", "MANAGER"] } },
    select: { id: true },
  });
  await Promise.all(
    recipients.map((r) =>
      notify(tenantPrisma, {
        userId: r.id,
        type: "LEAD_CREATED",
        title: `New ${sourceLabel} lead`,
        body: `${mapped.name} — ${mapped.phone || mapped.email || "no contact"}`,
        link: `/leads/${created.id}`,
        metadata: { leadId: created.id, source: sourceLabel, kind: "INTAKE_CREATED" },
      }),
    ),
  );

  return { id: created.id, deduped: false };
}

module.exports = {
  SUPPORTED_SOURCES,
  getConfigForCompany,
  setEnabled,
  regenerate,
  resolveCompanyByToken,
  verifyFacebookSignature,
  mapPayloadToLead,
  ingestLead,
};
