const { z } = require("zod");

// Google Ads Lead Form webhook delivery.
//
// Auth model: tenant configures a "Webhook URL" + "Key" inside Google Ads
// → Ads & Extensions → Lead form → Delivery options → Webhook. Google
// includes that Key in EVERY delivery as `google_key` in the JSON
// payload — there is no HMAC header. We verify by equality on the
// payload field. This is Google's documented mechanism.
//
// Payload (abbreviated):
//   {
//     "lead_id": "abc...",
//     "api_version": "1.0",
//     "form_id": 1234,
//     "campaign_id": 9876,
//     "gcl_id": "...",
//     "google_key": "<the key the tenant configured>",
//     "is_test": false,
//     "user_column_data": [
//       { "column_name": "FULL_NAME",    "string_value": "Rahul",      "column_id": "FULL_NAME" },
//       { "column_name": "EMAIL",        "string_value": "r@x.com",    "column_id": "EMAIL" },
//       { "column_name": "PHONE_NUMBER", "string_value": "+91...",     "column_id": "PHONE_NUMBER" },
//       { "column_name": "CITY",         "string_value": "Pune",       "column_id": "CITY" },
//       ...custom questions...
//     ]
//   }
//
// `lead_id` is the unique external ID we dedup on.

const credentialsSchema = z.object({
  // OAuth client (created in Google Cloud Console).
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),

  // Developer Token from Google Ads MCC → API Center.
  developerToken: z.string().min(1),

  // Refresh token from OAuth Playground exchange.
  refreshToken: z.string().min(1),

  // Customer IDs — digits only, no dashes.
  customerId: z.string().regex(/^\d{8,12}$/, "Customer ID is 8–12 digits, no dashes"),
  loginCustomerId: z
    .string()
    .regex(/^\d{8,12}$/, "Login Customer ID is 8–12 digits, no dashes")
    .optional()
    .or(z.literal("")),

  // Shared secret the tenant pasted into Google Ads Lead Form delivery →
  // "Key" field. We verify Google's webhook deliveries by comparing the
  // payload's google_key against this value.
  webhookKey: z.string().min(8),
});

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

// --- helpers --------------------------------------------------------------

// Refresh the access token using the long-lived refresh token. Used both
// by healthCheck and (later) any API polling we might add. Returns the
// access_token string or throws.
async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Token refresh failed: ${res.status} ${json.error || ""} ${json.error_description || ""}`.trim(),
    );
  }
  return json.access_token;
}

// Column name → standardised Lead field. Google's "well-known" columns
// are documented at developers.google.com/google-ads/api/data/codes-formats.
const COLUMN_MAP = {
  FULL_NAME: "name",
  FIRST_NAME: "firstName",
  LAST_NAME: "lastName",
  EMAIL: "email",
  PHONE_NUMBER: "phone",
  CITY: "city",
  // Anything not in this map is appended to notes as "label: value".
};

const KNOWN_COLUMNS = new Set(Object.keys(COLUMN_MAP));

function timingSafeStrEq(a, b) {
  // Constant-time string equality — guards against timing-side-channel
  // attacks on the webhook key. Length-prefixed because crypto.timingSafeEqual
  // throws on unequal lengths.
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  if (A.length !== B.length) return false;
  try {
    return require("crypto").timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

// --- driver interface -----------------------------------------------------

const driver = {
  provider: "GOOGLE_ADS",
  credentialsSchema,

  externalIds(credentials) {
    return credentials?.customerId ? [String(credentials.customerId)] : [];
  },

  // Google verifies once at setup with a test delivery. There's no
  // GET-style handshake — we accept any GET on the webhook URL with a
  // simple "ok" so tenants pasting the URL into a browser don't see a 404
  // and think it's broken.
  handleVerificationHandshake() {
    return { ok: true, body: "ok" };
  },

  verifyWebhook({ req, credentials }) {
    const body = req.body || {};
    const providedKey = body.google_key;
    if (!providedKey || !timingSafeStrEq(providedKey, credentials.webhookKey)) {
      return { ok: false, status: 401 };
    }
    const leadId = body.lead_id ? String(body.lead_id) : null;
    if (!leadId) {
      // Google sends a one-off "is_test=true" delivery with a real lead_id
      // when the tenant clicks "Send test data" — that path is fine. A
      // payload with no lead_id at all is not a real delivery; ACK so
      // Google doesn't retry, but don't ingest.
      return { ok: true, externalId: null, payload: body };
    }
    return { ok: true, externalId: leadId, payload: body };
  },

  // Google's webhook ships the lead fields directly. No second API call
  // needed — we just hand the verified payload back to mapToLead.
  fetchLead({ payload }) {
    return payload;
  },

  mapToLead(rawFields /*, { credentials } = {} */) {
    if (!rawFields || typeof rawFields !== "object") return null;
    const columns = Array.isArray(rawFields.user_column_data) ? rawFields.user_column_data : [];

    const out = { firstName: null, lastName: null };
    const notesParts = [];
    for (const c of columns) {
      const key = String(c?.column_id || c?.column_name || "").toUpperCase();
      const val = c?.string_value;
      if (val == null || val === "") continue;
      if (KNOWN_COLUMNS.has(key)) {
        out[COLUMN_MAP[key]] = String(val);
      } else {
        notesParts.push(`${c.column_name || key}: ${val}`);
      }
    }

    // Compose name from FULL_NAME if present, otherwise stitch FIRST+LAST.
    const name =
      out.name ||
      [out.firstName, out.lastName].filter(Boolean).join(" ") ||
      "Unknown";

    // Include Google-specific routing info in notes so the sales user can
    // trace the lead back to a campaign/ad in their Ads dashboard.
    if (rawFields.campaign_id) notesParts.unshift(`campaign_id: ${rawFields.campaign_id}`);
    if (rawFields.form_id) notesParts.unshift(`form_id: ${rawFields.form_id}`);
    if (rawFields.gcl_id) notesParts.push(`gcl_id: ${rawFields.gcl_id}`);
    const notes = notesParts.length ? notesParts.join("\n") : null;

    return {
      name: String(name).trim() || "Unknown",
      phone: (out.phone || "").trim(),
      email: out.email ? String(out.email).trim() : null,
      city: out.city ? String(out.city).trim() : null,
      notes,
      source: "GOOGLE_ADS",
      externalId: rawFields.lead_id ? String(rawFields.lead_id) : null,
    };
  },

  async healthCheck(credentials) {
    // Step 1: prove the OAuth client + refresh token still work. If this
    // fails, the rest doesn't matter.
    let accessToken;
    try {
      accessToken = await refreshAccessToken(credentials);
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }

    // Step 2: prove the developer token + customer access works by
    // calling listAccessibleCustomers. This is the cheapest authenticated
    // call to the Google Ads API. Failure here typically means: developer
    // token not approved for production yet (Test Access only), or the
    // OAuth user doesn't have access to the customer.
    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": credentials.developerToken,
        "Content-Type": "application/json",
      };
      if (credentials.loginCustomerId) {
        headers["login-customer-id"] = credentials.loginCustomerId;
      }
      const res = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, { headers });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return {
          ok: false,
          error: `Google Ads API ${res.status}: ${txt.slice(0, 240)}`,
        };
      }
      const body = await res.json();
      const resources = Array.isArray(body.resourceNames) ? body.resourceNames : [];
      const ids = resources.map((r) => r.split("/").pop());
      const found = ids.includes(String(credentials.customerId));
      return {
        ok: found,
        info: found
          ? `Token valid; can access customer ${credentials.customerId}`
          : `Token valid but customer ${credentials.customerId} not in accessible list (${ids.join(", ") || "none"})`,
        error: found ? null : "Customer ID not accessible by the connected OAuth user",
      };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  },
};

module.exports = driver;
