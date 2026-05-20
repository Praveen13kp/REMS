const { z } = require("zod");

// IndiaMART Lead API — pull-only. The seller generates a "CRM Key" from
// seller.indiamart.com → Lead Manager → API. That single key is the only
// credential needed; everything else is endpoint/format machinery owned
// by us.
//
// Endpoint:
//   GET https://mapi.indiamart.com/wservce/crm/crmListing/v2/
//       ?glusr_crm_key=<KEY>&start_time=<IST>&end_time=<IST>
//
// IST timestamps in "YYYY-MM-DD HH:mm:ss" — IndiaMART's API server is
// fixed at IST (UTC+5:30), regardless of where it's called from.
//
// Rate limit: 5 calls per 5 minutes per CRM key. Our scheduler defaults
// to 1 call per 300s, comfortably under the cap. We refuse to let the
// tenant set a faster interval.
//
// Response shape:
//   { CODE: 200, RESPONSE: [ { UNIQUE_QUERY_ID, SENDER_NAME, SENDER_MOBILE, SENDER_EMAIL, SUBJECT, QUERY_TIME, ... } ] }
//
// On free / unpaid seller plans the API returns an error message instead.
// healthCheck surfaces that as a clear "upgrade your plan" string.

const credentialsSchema = z.object({
  crmKey: z.string().min(20, "CRM Key looks too short — copy the full string from seller.indiamart.com"),
  // Not exposed in the FE; defaults to 300 (the lowest safe value vs
  // IndiaMART's rate limit). Surfacing it would just invite tenants to
  // crank it down and hit 429s.
  pollIntervalSec: z.coerce.number().int().min(300).max(3600).default(300),
});

const ENDPOINT = "https://mapi.indiamart.com/wservce/crm/crmListing/v2/";
const MAX_WINDOW_DAYS = 7;

// --- helpers --------------------------------------------------------------

// Format a Date as "YYYY-MM-DD HH:mm:ss" in IST regardless of process TZ.
// We do this with the offset arithmetic trick rather than Intl APIs since
// some Node builds in containers don't carry the ICU data.
function toIstString(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 19).replace("T", " ");
}

function buildUrl({ crmKey, start, end }) {
  const u = new URL(ENDPOINT);
  u.searchParams.set("glusr_crm_key", crmKey);
  u.searchParams.set("start_time", toIstString(start));
  u.searchParams.set("end_time", toIstString(end));
  return u.toString();
}

// IndiaMART caps a single call at 7 days. For an initial backfill we
// might need to chunk; for the steady-state poller (300s interval) the
// window is always tiny so this loop runs once.
function* slidingWindows(from, to, maxDays = MAX_WINDOW_DAYS) {
  const stepMs = maxDays * 24 * 60 * 60 * 1000;
  let cursor = from.getTime();
  const end = to.getTime();
  while (cursor < end) {
    const next = Math.min(cursor + stepMs, end);
    yield { start: new Date(cursor), end: new Date(next) };
    cursor = next;
  }
}

async function callIndiaMart({ crmKey, start, end }) {
  const url = buildUrl({ crmKey, start, end });
  const res = await fetch(url, { method: "GET" });
  const text = await res.text().catch(() => "");
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON from IndiaMART (HTTP ${res.status})` };
  }

  // CODE 200 = data ok. Other codes are documented as auth / quota /
  // plan errors — surface verbatim so the tenant knows what to fix.
  if (parsed && parsed.CODE === 200 && Array.isArray(parsed.RESPONSE)) {
    return { ok: true, items: parsed.RESPONSE };
  }
  const message =
    parsed?.MESSAGE ||
    parsed?.message ||
    parsed?.STATUS ||
    parsed?.STATUS_MESSAGE ||
    `Unexpected response (HTTP ${res.status})`;
  return { ok: false, error: String(message).slice(0, 240) };
}

// --- driver interface -----------------------------------------------------

const driver = {
  provider: "INDIAMART",
  credentialsSchema,

  externalIds() {
    return [];
  },

  handleVerificationHandshake() {
    return { ok: true, body: "IndiaMART integration is pull-only — no webhook delivery." };
  },

  // IndiaMART doesn't push; webhook calls to this path are a misuse but
  // shouldn't error out — they just produce no work.
  verifyWebhook() {
    return { ok: false, status: 405 };
  },

  // Map a single IndiaMART RESPONSE row to the standard Lead shape. The
  // API's field names are uppercase + SENDER_-prefixed, which makes this
  // mapping cleaner than JustDial's.
  mapToLead(rawFields /*, { credentials } */) {
    if (!rawFields || typeof rawFields !== "object") return null;

    const name = String(rawFields.SENDER_NAME || rawFields.SENDERNAME || "Unknown").trim() || "Unknown";
    const phone = String(rawFields.SENDER_MOBILE || rawFields.SENDER_PHONE || "").trim();
    const email = rawFields.SENDER_EMAIL ? String(rawFields.SENDER_EMAIL).trim() : null;
    const city = rawFields.SENDER_CITY ? String(rawFields.SENDER_CITY).trim() : null;

    // IndiaMART includes product subject + free-text query body — both
    // useful to the agent receiving the lead. Stash them as notes.
    const notesParts = [];
    if (rawFields.SUBJECT) notesParts.push(`Subject: ${rawFields.SUBJECT}`);
    if (rawFields.QUERY_MESSAGE) notesParts.push(`Query: ${rawFields.QUERY_MESSAGE}`);
    if (rawFields.QUERY_PRODUCT_NAME) notesParts.push(`Product: ${rawFields.QUERY_PRODUCT_NAME}`);
    if (rawFields.SENDER_COMPANY) notesParts.push(`Company: ${rawFields.SENDER_COMPANY}`);
    if (rawFields.SENDER_STATE) notesParts.push(`State: ${rawFields.SENDER_STATE}`);
    if (rawFields.QUERY_TIME) notesParts.push(`Query time (IST): ${rawFields.QUERY_TIME}`);

    return {
      name,
      phone,
      email,
      city,
      notes: notesParts.length ? notesParts.join("\n") : null,
      source: "INDIAMART",
      externalId: rawFields.UNIQUE_QUERY_ID ? String(rawFields.UNIQUE_QUERY_ID) : null,
    };
  },

  async healthCheck(credentials) {
    // 24h window — wide enough that an active seller account should
    // return at least one lead, but small enough that quota is preserved.
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const res = await callIndiaMart({ crmKey: credentials.crmKey, start: since, end: now });
    if (!res.ok) return { ok: false, error: res.error };
    return {
      ok: true,
      info: `Endpoint reachable. ${res.items.length} lead(s) in last 24h.`,
    };
  },

  // Called by pollers/scheduler.js. Returns the array of raw RESPONSE
  // items; scheduler funnels each through ingest.service.
  async pullRecent({ credentials, since }) {
    const now = new Date();
    const start = since instanceof Date ? since : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // Initial backfill paths can ask for >7d; chunk by week.
    let allItems = [];
    for (const win of slidingWindows(start, now)) {
      const res = await callIndiaMart({ crmKey: credentials.crmKey, start: win.start, end: win.end });
      if (!res.ok) {
        // Throw so the scheduler records the error on the credential row.
        // Doing this AFTER any prior successful windows ingested means a
        // partial backfill still makes progress before the failure.
        throw new Error(res.error);
      }
      allItems = allItems.concat(res.items);
    }
    return allItems;
  },
};

module.exports = driver;
