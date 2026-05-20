const crypto = require("crypto");
const { z } = require("zod");

// JustDial has no self-serve developer portal. Credentials come from
// JustDial's account manager after the tenant emails them. The shape
// varies per account tier; we accept the two common flavours:
//
//   PUSH (preferred): JustDial POSTs leads to a URL we give them. They
//                     include a fixed auth header (name + value) that
//                     we verify by equality.
//
//   PULL (fallback):  We poll JustDial's endpoint every N minutes with
//                     basic auth or an API key. Their JSON / XML payload
//                     contains a recent-leads list which we dedup by
//                     leadid before ingesting.

// --- credential schemas ---------------------------------------------------

const pushCreds = z.object({
  variant: z.literal("PUSH"),
  // Header NAME (e.g. "X-JD-Auth"). Lower-cased on verify since Node
  // normalises req.headers to lowercase.
  headerName: z.string().min(1).max(80),
  headerValue: z.string().min(4).max(512),
});

const pullCreds = z.object({
  variant: z.literal("PULL"),
  endpointUrl: z.string().url(),
  authType: z.enum(["NONE", "BASIC", "API_KEY_HEADER", "API_KEY_QUERY"]),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  pollIntervalSec: z.coerce.number().int().min(300).max(3600).default(300),
});

const credentialsSchema = z.discriminatedUnion("variant", [pushCreds, pullCreds]);

// --- helpers --------------------------------------------------------------

function timingSafeStrEq(a, b) {
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  if (A.length !== B.length) return false;
  try {
    return crypto.timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

// Pluck the first non-empty value across a candidate list of field names,
// case-insensitive. JustDial's column names differ across accounts, so
// this is wider than e.g. Google's clean column_id taxonomy.
function firstValue(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  const lower = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

// Minimal flat-XML parser. JustDial XML samples look like:
//   <lead><leadid>123</leadid><name>X</name><mobile>...</mobile>...</lead>
// One level deep, no attributes, no CDATA, no namespaces. Returns the
// inner-text map. Doesn't try to be a real XML parser — if a tenant has
// nested XML, we add fast-xml-parser later.
function parseFlatXml(xml) {
  if (typeof xml !== "string") return null;
  const out = {};
  const re = /<([a-zA-Z0-9_:-]+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[1];
    let val = m[2];
    // Strip nested tags so name/mobile/etc. resolve cleanly even if the
    // wrapper element appears earlier in the match.
    if (/<[a-zA-Z]/.test(val)) continue;
    val = val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    if (val !== "") out[tag] = val;
  }
  return Object.keys(out).length ? out : null;
}

// Accept JSON (already parsed by express.json into req.body), form-encoded
// (express.urlencoded), or XML text (express.text). Returns a flat
// key/value object regardless of input format.
function coerceToFlatObject(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length) {
    // JSON or form-encoded — already a flat object (or close enough).
    return body;
  }
  if (typeof body === "string" && body.trim()) {
    // express.text fired → XML or text payload. Try XML first.
    const xml = parseFlatXml(body);
    if (xml) return xml;
    // Fallback: treat as a single "raw" field so we don't lose it entirely.
    return { raw: body };
  }
  // Last resort — try parsing rawBody if Express handed us nothing.
  if (req.rawBody) {
    const s = req.rawBody.toString("utf8");
    const xml = parseFlatXml(s);
    if (xml) return xml;
  }
  return null;
}

// JustDial responses come back in many shapes:
//   { leads: [ {...} ] }
//   { data: [ {...} ] }
//   { response: { leads: [...] } }
//   [ {...} ]
function extractLeadArray(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.leads)) return parsed.leads;
  if (Array.isArray(parsed.data)) return parsed.data;
  if (Array.isArray(parsed?.response?.leads)) return parsed.response.leads;
  if (Array.isArray(parsed?.RESPONSE)) return parsed.RESPONSE;
  // Single-lead push shape — wrap.
  if (typeof parsed === "object") return [parsed];
  return [];
}

// --- driver interface -----------------------------------------------------

const driver = {
  provider: "JUSTDIAL",
  credentialsSchema,

  externalIds() {
    return [];
  },

  handleVerificationHandshake() {
    return { ok: true, body: "Bizzfly JustDial webhook is live." };
  },

  verifyWebhook({ req, credentials }) {
    if (credentials.variant !== "PUSH") {
      // Pull-only credentials shouldn't receive webhooks — but we allow
      // tenants to receive a one-off push during testing if they configured
      // it. The pull path doesn't touch this method.
      return { ok: false, status: 405 };
    }
    const got = req.headers[String(credentials.headerName).toLowerCase()];
    if (!got || !timingSafeStrEq(got, credentials.headerValue)) {
      return { ok: false, status: 401 };
    }
    const flat = coerceToFlatObject(req);
    if (!flat) {
      return { ok: false, status: 400 };
    }
    // JustDial leads have a leadid we trust for dedup. If absent, fall
    // back to body hash so we still get idempotency.
    const leadId =
      firstValue(flat, ["leadid", "lead_id", "id", "unique_query_id", "unique_id"]) ||
      `jd_${crypto.createHash("sha256").update(req.rawBody || Buffer.from(JSON.stringify(flat))).digest("hex").slice(0, 24)}`;
    return { ok: true, externalId: leadId, payload: flat };
  },

  fetchLead({ payload }) {
    return payload;
  },

  mapToLead(rawFields /*, { credentials } */) {
    if (!rawFields || typeof rawFields !== "object") return null;

    const name =
      firstValue(rawFields, [
        "name",
        "customer_name",
        "lead_name",
        "fullname",
        "full_name",
        "prefix_name",
      ]) || "Unknown";

    const phone = firstValue(rawFields, [
      "mobile",
      "phone",
      "phone_number",
      "mobile_number",
      "contact",
      "contact_number",
      "mobile_no",
    ]) || "";

    const email = firstValue(rawFields, ["email", "email_id", "email_address"]);
    const city = firstValue(rawFields, ["city", "location", "city_name", "area"]);

    // Anything not consumed becomes notes — JustDial often includes
    // category, requirement, source channel etc. that the sales team
    // values for routing.
    const consumed = new Set([
      "name", "customer_name", "lead_name", "fullname", "full_name", "prefix_name",
      "mobile", "phone", "phone_number", "mobile_number", "contact", "contact_number", "mobile_no",
      "email", "email_id", "email_address",
      "city", "location", "city_name", "area",
      "leadid", "lead_id", "id", "unique_query_id", "unique_id",
    ]);
    const notesParts = [];
    for (const [k, v] of Object.entries(rawFields)) {
      if (consumed.has(k.toLowerCase())) continue;
      if (v == null || v === "") continue;
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      notesParts.push(`${k}: ${s}`);
    }

    return {
      name,
      phone,
      email,
      city,
      notes: notesParts.length ? notesParts.join("\n") : null,
      source: "JUSTDIAL",
      externalId: null, // filled by router from verifyWebhook
    };
  },

  async healthCheck(credentials) {
    if (credentials.variant === "PUSH") {
      return {
        ok: true,
        info: "Push integration — JustDial sends leads to your webhook URL. No outbound probe possible.",
      };
    }
    // PULL: make a real call and look at response shape.
    try {
      const res = await callJustDialPullEndpoint(credentials, { window: "1h" });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, info: `Endpoint reachable. ${res.leadCount} lead(s) in last 1h.` };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  },

  // Called by the poller. Returns an array of mapped leads + their
  // externalIds. The poller funnels each through ingest.service.
  async pullRecent({ credentials, since }) {
    if (credentials.variant !== "PULL") return [];
    const res = await callJustDialPullEndpoint(credentials, { since });
    if (!res.ok) throw new Error(res.error);
    return res.items;
  },
};

// --- pull endpoint client -------------------------------------------------

async function callJustDialPullEndpoint(credentials, { since, window } = {}) {
  const headers = { Accept: "application/json, application/xml;q=0.9, */*;q=0.8" };
  let url = credentials.endpointUrl;

  if (credentials.authType === "BASIC" && credentials.username) {
    const basic = Buffer.from(`${credentials.username}:${credentials.password || ""}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  } else if (credentials.authType === "API_KEY_HEADER" && credentials.apiKeyName && credentials.apiKeyValue) {
    headers[credentials.apiKeyName] = credentials.apiKeyValue;
  } else if (credentials.authType === "API_KEY_QUERY" && credentials.apiKeyName && credentials.apiKeyValue) {
    const u = new URL(url);
    u.searchParams.set(credentials.apiKeyName, credentials.apiKeyValue);
    url = u.toString();
  }

  // Append a since= / window= hint so JustDial endpoints that accept
  // either know what range we want. They're tolerant of unknown params.
  try {
    const u = new URL(url);
    if (since instanceof Date) u.searchParams.set("since", since.toISOString());
    if (window) u.searchParams.set("window", window);
    url = u.toString();
  } catch {
    // ignore — endpointUrl already validated as URL by zod
  }

  const res = await fetch(url, { headers, method: "GET" });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  let parsed = null;
  const ct = String(res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!parsed && (ct.includes("xml") || text.trim().startsWith("<"))) {
    parsed = parseFlatXml(text) || { raw: text };
    // Single-lead XML shape → wrap as one-element array for the extractor.
    if (!Array.isArray(parsed)) parsed = [parsed];
  }
  if (!parsed) {
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: `Could not parse response (content-type ${ct})` };
    }
  }

  const arr = extractLeadArray(parsed);
  return { ok: true, leadCount: arr.length, items: arr };
}

module.exports = driver;
