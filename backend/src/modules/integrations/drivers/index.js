// Driver registry. Each provider lives in its own file and exports an
// object matching the IntegrationDriver shape below. The generic webhook
// router, CRUD service, and poller scheduler import getDriver() — they
// never import provider files directly, so adding a new provider is a new
// file + one line here.
//
// IntegrationDriver shape:
//
//   provider:       IntegrationProvider enum value (string)
//
//   credentialsSchema(zod):
//                   Zod schema for the credentials JSON object the tenant
//                   submits from the Settings UI. Used by the controller
//                   before encrypting.
//
//   externalIds(credentials) -> string[]:
//                   Optional. Pulls routing keys out of credentials so
//                   inbound webhooks can be matched (e.g. Meta page_id).
//
//   verifyWebhook({ req, rawBody, credentials }) -> { ok, externalId?, payload?, status? }:
//                   Validate the inbound webhook signature/headers and
//                   return either { ok: true, externalId, payload } so the
//                   router can proceed to fetchLead+ingest, or
//                   { ok: false, status: 401 } to reject. Some drivers
//                   (Meta) return ok with NO externalId for delivery
//                   acknowledgement events — the router treats that as a
//                   200 no-op.
//
//   handleVerificationHandshake({ req, credentials }) -> { ok, body?, status? }:
//                   Optional. For providers that do a GET handshake before
//                   accepting POSTs (Meta's hub.challenge dance).
//
//   fetchLead({ credentials, externalId, payload }) -> rawFields | null:
//                   If the webhook payload only contains an ID (Meta), fetch
//                   the actual lead fields via the provider API using the
//                   tenant's credentials. For providers whose webhook
//                   already includes the fields (Google, website forms),
//                   just return the payload.
//
//   mapToLead(rawFields, { credentials }) -> { name, phone, email, city?, notes?, source, externalId }:
//                   Normalize the provider-specific shape into the shared
//                   Lead shape that ingest.service.js writes to the DB.
//
//   healthCheck(credentials) -> { ok, expiresAt?, info? }:
//                   Lightweight liveness probe used by Test Connection +
//                   the daily health cron. Throw or return ok=false on
//                   credential failure; return ok=true with optional
//                   expiresAt so the cron can flag near-expiry credentials.

const registry = new Map();

function register(driver) {
  if (!driver || !driver.provider) {
    throw new Error("register(): driver missing 'provider' field");
  }
  if (registry.has(driver.provider)) {
    throw new Error(`register(): driver for ${driver.provider} already registered`);
  }
  registry.set(driver.provider, driver);
}

function getDriver(provider) {
  const d = registry.get(provider);
  if (!d) {
    throw new Error(`No driver registered for provider ${provider}`);
  }
  return d;
}

function hasDriver(provider) {
  return registry.has(provider);
}

function listProviders() {
  return Array.from(registry.keys());
}

// Drivers are loaded + registered HERE rather than self-registering inside
// each driver file. Self-registration would create a circular require
// (driver -> registry -> driver) and CommonJS returns a half-finished
// module object at that point. Adding a new provider = one require + one
// register call below.
register(require("./meta.driver"));
register(require("./google.driver"));
register(require("./website.driver"));
register(require("./justdial.driver"));
register(require("./indiamart.driver"));

module.exports = { register, getDriver, hasDriver, listProviders };
