const crypto = require("crypto");
const { z } = require("zod");

// Website Forms — generic HMAC-signed inbound webhook with a tenant-
// configured field map. Same endpoint serves WordPress (CF7, WPForms),
// Webflow, Elementor, Typeform, raw HTML/JS, or any backend that can POST
// JSON. The driver is intentionally permissive about payload shape:
// anything that comes in as a flat key/value JSON object is routed through
// the fieldMap and the remainder lands in notes.
//
// Auth model:
//   requireSignature=true (default): HMAC-SHA256 of the raw request body
//     keyed with the tenant's webhookSecret. Header: x-bizzfly-signature
//     in the form "sha256=<hex>". We also accept "Typeform-Signature"
//     (Typeform-native HMAC) since Typeform won't let users customise the
//     header name.
//
//   requireSignature=false: the URL itself is the secret. Useful for
//     Webflow / Elementor / similar that don't support custom HMAC
//     headers. Tenants must keep the URL private. We still verify a
//     Content-Type of application/json or application/x-www-form-urlencoded
//     so accidental GETs / browser crawlers don't ingest.

const fieldMapSchema = z.record(z.string().min(1), z.string().min(1)).default({});

const credentialsSchema = z.object({
  webhookSecret: z.string().min(32, "webhookSecret must be at least 32 chars"),
  requireSignature: z.boolean().default(true),
  fieldMap: fieldMapSchema,
  // Slug used to publicly serve a Bizzfly-hosted landing page bound to this
  // integration (GET /api/public/landing/:slug). Server-injected on create.
  publicSlug: z.string().optional(),
});

// --- helpers --------------------------------------------------------------

function timingSafeHexEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function verifyHmacHeader(rawBody, secret, headerValue) {
  if (!headerValue || !rawBody || !secret) return false;
  // Accept both "sha256=<hex>" (our convention) and bare "<hex>" (some
  // form builders strip the prefix). Typeform sends "sha256=<base64>".
  const v = String(headerValue);
  const [maybeAlgo, maybeSig] = v.includes("=") ? v.split("=") : ["sha256", v];
  if (maybeAlgo !== "sha256") return false;
  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (timingSafeHexEq(maybeSig, expectedHex)) return true;
  // Typeform's signature is base64, not hex. Try that path too.
  try {
    const expectedB64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    if (Buffer.from(maybeSig).equals(Buffer.from(expectedB64))) return true;
  } catch {
    // ignore
  }
  return false;
}

// We don't have a natural external ID from website forms, so synthesise one
// from the raw body hash. Two POSTs with identical bytes will dedup —
// which is the desired behaviour for accidental double-submits. Different
// leads will always have at least a timestamp diff in the payload (form
// builders typically include submitted_at, or the body diff comes from
// different field values), so the collision risk is negligible in practice.
function externalIdFromBody(rawBody) {
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ""));
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  return `web_${hash.slice(0, 32)}`;
}

// Flatten Typeform's `form_response.answers[]` shape into the same
// key/value map shape the fieldMap is configured against. Other form
// builders that nest in form_response are normalised here too.
function normaliseTypeform(body) {
  const fr = body.form_response;
  if (!fr || typeof fr !== "object") return null;
  const out = { ...body };
  if (Array.isArray(fr.answers)) {
    for (const ans of fr.answers) {
      const key = ans?.field?.ref || ans?.field?.id;
      if (!key) continue;
      // type-specific value extraction
      const v =
        ans.text ??
        ans.email ??
        ans.phone_number ??
        ans.number ??
        ans.url ??
        ans.choice?.label ??
        ans.choices?.labels?.join(", ") ??
        null;
      if (v != null) out[key] = v;
    }
  }
  return out;
}

// --- driver interface -----------------------------------------------------

const driver = {
  provider: "WEBSITE_FORM",
  credentialsSchema,

  externalIds() {
    return [];
  },

  // No GET handshake. We respond OK to GETs so tenants who paste the URL
  // into a browser don't see a 404 (they often do this to "check it
  // works"). The generic router still returns 200 with a body.
  handleVerificationHandshake() {
    return { ok: true, body: "Bizzfly website webhook is live. POST JSON to submit a lead." };
  },

  verifyWebhook({ req, rawBody, credentials }) {
    // Reject unsupported content-types fast — guards against accidental
    // form-encoded posts in unsigned mode that wouldn't have made sense.
    const ct = String(req.headers["content-type"] || "").toLowerCase();
    if (!ct.includes("application/json") && !ct.includes("application/x-www-form-urlencoded") && !ct.includes("multipart/form-data")) {
      return { ok: false, status: 415 };
    }

    if (credentials.requireSignature) {
      const sig =
        req.headers["x-bizzfly-signature"] ||
        req.headers["typeform-signature"] ||
        req.headers["x-hub-signature-256"]; // also accept FB-style header for users coming from Sprint-5 patterns
      const ok = verifyHmacHeader(rawBody, credentials.webhookSecret, sig);
      if (!ok) return { ok: false, status: 401 };
    }

    const externalId = externalIdFromBody(rawBody);
    return { ok: true, externalId, payload: req.body };
  },

  // Payload IS the lead — no second API call. Hand it through.
  fetchLead({ payload }) {
    return payload;
  },

  mapToLead(rawFields, { credentials } = {}) {
    if (!rawFields || typeof rawFields !== "object") return null;

    // Typeform pushes a nested form_response; normalise first.
    const flat = rawFields.form_response ? normaliseTypeform(rawFields) : { ...rawFields };

    const map = credentials?.fieldMap || {};
    const out = { name: null, phone: null, email: null, city: null };
    const consumed = new Set();

    // Apply tenant's mapping first — explicit wins over heuristic.
    for (const [src, dst] of Object.entries(map)) {
      if (flat[src] != null && String(flat[src]).trim() !== "") {
        const norm = String(dst).toLowerCase();
        if (["name", "phone", "email", "city"].includes(norm)) {
          out[norm] = String(flat[src]).trim();
          consumed.add(src);
        }
      }
    }

    // Heuristic fallback for the common cases when fieldMap is empty.
    const KNOWN_ALIASES = {
      name: ["name", "full_name", "fullName", "your_name", "your-name", "lead_name"],
      phone: ["phone", "phone_number", "mobile", "mobile_no", "mobile_number", "contact"],
      email: ["email", "email_id", "email_address", "e-mail"],
      city: ["city", "city_name", "town", "location"],
    };
    for (const [field, aliases] of Object.entries(KNOWN_ALIASES)) {
      if (out[field]) continue;
      for (const a of aliases) {
        if (flat[a] != null && String(flat[a]).trim() !== "") {
          out[field] = String(flat[a]).trim();
          consumed.add(a);
          break;
        }
      }
    }

    // Everything else → notes
    const notesParts = [];
    for (const [k, v] of Object.entries(flat)) {
      if (consumed.has(k)) continue;
      if (k === "form_response") continue; // already normalised
      if (v == null || v === "") continue;
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      notesParts.push(`${k}: ${s}`);
    }
    const notes = notesParts.length ? notesParts.join("\n") : null;

    if (!out.name) out.name = "Unknown";
    return {
      name: out.name,
      phone: out.phone || "",
      email: out.email,
      city: out.city,
      notes,
      source: "WEBSITE_FORM",
      externalId: null, // router will fill from verifyWebhook
    };
  },

  // Website forms are push-only. There's no API we could ping. Always
  // returns ok with a hint so the UI doesn't make the tenant think
  // something is broken.
  async healthCheck() {
    return {
      ok: true,
      info: "Push-only integration — no health probe possible. Send a test event from your form to verify.",
    };
  },
};

module.exports = driver;
