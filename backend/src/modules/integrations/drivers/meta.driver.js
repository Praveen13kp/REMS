const crypto = require("crypto");
const { z } = require("zod");
const { env } = require("../../../lib/env");

// Tenant-supplied credentials for a single Meta Page. Same shape covers
// both FB Lead Ads and Instagram Lead Ads — IG leads come through the
// same Page webhook as long as the IG Business account is linked to this
// Page in Meta Business Suite.
const credentialsSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(8),
  pageId: z.string().min(1),
  pageAccessToken: z.string().min(20),
  verifyToken: z.string().min(4),
});

const META_API = () => `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`;

// --- helpers --------------------------------------------------------------

function verifyHubSignature(rawBody, appSecret, headerValue) {
  if (!headerValue || typeof headerValue !== "string") return false;
  if (!rawBody || !appSecret) return false;
  const [algo, sig] = headerValue.split("=");
  if (algo !== "sha256" || !sig) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// Meta's webhook payload: { object, entry: [{ id, changes: [{ field, value: {...} }] }] }
// We only care about field === "leadgen". `value.leadgen_id` is the unique
// external ID we use for idempotency. There can be multiple changes per
// delivery; this driver returns the FIRST leadgen change. Subsequent
// deliveries with other leadgen_ids will arrive as separate webhook calls
// from Meta in practice — and even if batched, the leadgen ID dedup will
// cover the next one on its own redelivery.
function extractLeadgen(payload) {
  if (!payload || typeof payload !== "object") return null;
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const e of entries) {
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const ch of changes) {
      if (ch?.field === "leadgen" && ch?.value?.leadgen_id) {
        return {
          leadgenId: String(ch.value.leadgen_id),
          formId: ch.value.form_id ? String(ch.value.form_id) : null,
          pageId: ch.value.page_id ? String(ch.value.page_id) : (e.id ? String(e.id) : null),
          adId: ch.value.ad_id ? String(ch.value.ad_id) : null,
          createdTime: ch.value.created_time || null,
        };
      }
    }
  }
  return null;
}

function detectSource({ pageId, eventPageId, credentials }) {
  // If the page receiving the leadgen change is the same as the configured
  // Page, that's a regular FB Page lead. IG leadgen events from a linked
  // IG Business account come through with a different `page_id` matching
  // the IG account's numeric ID, but Meta's docs are inconsistent here —
  // we fall back to FB unless the event source clearly differs.
  if (eventPageId && credentials.pageId && eventPageId !== credentials.pageId) {
    return "META_IG";
  }
  return "META_FB";
}

// --- driver interface -----------------------------------------------------

const driver = {
  provider: "META",
  credentialsSchema,

  externalIds(credentials) {
    return credentials?.pageId ? [String(credentials.pageId)] : [];
  },

  // Meta's webhook setup does a GET handshake before it'll start sending
  // POSTs. Query: ?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
  // Must respond with the raw value of hub.challenge as plain text if
  // hub.verify_token matches what the tenant configured on their app side.
  handleVerificationHandshake({ req, credentials }) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode !== "subscribe") {
      return { ok: false, status: 400, body: "bad mode" };
    }
    if (!token || token !== credentials.verifyToken) {
      return { ok: false, status: 403, body: "bad verify token" };
    }
    return { ok: true, body: String(challenge ?? "") };
  },

  // Verify HMAC then pluck out leadgen_id. Returns ok:true even when no
  // leadgen change is in the payload (page-level test pings) — controller
  // ACKs without externalId so Meta stops retrying.
  verifyWebhook({ req, rawBody, credentials }) {
    const sig = req.headers["x-hub-signature-256"];
    const valid = verifyHubSignature(rawBody, credentials.appSecret, sig);
    if (!valid) {
      return { ok: false, status: 401 };
    }
    const leadgen = extractLeadgen(req.body);
    if (!leadgen) {
      return { ok: true, externalId: null, payload: req.body };
    }
    return {
      ok: true,
      externalId: leadgen.leadgenId,
      payload: { ...leadgen, raw: req.body },
    };
  },

  // Fetch the actual lead by ID. Meta's webhook only sends pointers; the
  // PII (name/phone/email) lives behind a Graph API call authenticated
  // with the Page Access Token. Tokens last ~90 days for the lead to be
  // fetchable, after which Meta deletes the lead — operators should
  // process webhooks promptly.
  async fetchLead({ credentials, externalId }) {
    const url = `${META_API()}/${encodeURIComponent(externalId)}?access_token=${encodeURIComponent(credentials.pageAccessToken)}&fields=field_data,form_id,created_time,ad_id,adgroup_id,campaign_id`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Meta fetchLead ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json();
  },

  // Meta's field_data: [{ name: "full_name", values: ["Rahul"] }, ...].
  // Field names depend on what the advertiser put on the form — there
  // are well-known names (full_name, email, phone_number, city) plus
  // arbitrary custom questions. We collapse known ones into Lead columns
  // and stash the rest as notes.
  mapToLead(rawFields, { credentials } = {}) {
    if (!rawFields || !Array.isArray(rawFields.field_data)) return null;
    const flat = {};
    for (const f of rawFields.field_data) {
      if (f?.name && Array.isArray(f.values) && f.values.length) {
        flat[String(f.name).toLowerCase()] = f.values[0];
      }
    }
    const name = flat.full_name || flat.name || "Unknown";
    const phone = flat.phone_number || flat.phone || "";
    const email = flat.email || null;
    const city = flat.city || null;
    const knownKeys = new Set(["full_name", "name", "phone_number", "phone", "email", "city"]);
    const notesParts = Object.entries(flat)
      .filter(([k]) => !knownKeys.has(k))
      .map(([k, v]) => `${k}: ${v}`);
    const notes = notesParts.length ? notesParts.join("\n") : null;

    // Source: if the lead was delivered against the configured pageId,
    // it's FB. If we can detect an Instagram-originated form, flag IG.
    // (form_id alone doesn't distinguish — Meta returns the same shape.)
    const source = detectSource({
      eventPageId: rawFields.page_id,
      credentials: credentials || {},
    });

    return {
      name: String(name).trim() || "Unknown",
      phone: String(phone).trim(),
      email: email ? String(email).trim() : null,
      city: city ? String(city).trim() : null,
      notes,
      source,
      externalId: rawFields.id || rawFields.leadgen_id || null,
    };
  },

  // Lightweight liveness probe. GET /me returns the entity behind the
  // Page Access Token; success means the token still works. Failure is
  // almost always either expired token or revoked app permission.
  async healthCheck(credentials) {
    try {
      const url = `${META_API()}/me?access_token=${encodeURIComponent(credentials.pageAccessToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
      }
      const body = await res.json();
      return { ok: true, info: body?.name ? `Connected as ${body.name}` : "Connected" };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  },
};

module.exports = driver;
