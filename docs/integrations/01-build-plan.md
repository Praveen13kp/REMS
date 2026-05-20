# Lead Capture Integrations — Build Plan

> Phased implementation plan. Total estimate: ~10–11 working days for one engineer.

---

## Architecture summary

- **Storage**: `IntegrationCredential` (encrypted blob) + `WebhookEvent` (idempotency + audit)
- **Ingestion**: single `ingestLead()` service is the only writer of leads
- **Routing**: per-tenant webhook URLs `…/webhooks/{provider}/byo/{webhookToken}`
- **Extensibility**: provider drivers behind a fixed interface
- **Security**: AES-256-GCM encryption of credentials at rest, key from env

See `00-discussion-and-decisions.md` for the *why* behind each decision.

---

## Database changes

```prisma
model IntegrationCredential {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  provider        Provider
  label           String                              // tenant-friendly name
  credentials     String                              // AES-GCM encrypted JSON
  webhookToken    String   @unique                    // opaque, in webhook URL path
  externalIds     String[]                            // [page_id], [customer_id], …
  status          IntegrationStatus @default(ACTIVE)
  lastVerifiedAt  DateTime?
  lastErrorAt     DateTime?
  lastError       String?
  expiresAt       DateTime?
  lastPolledAt    DateTime?                           // for pull-based providers
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([companyId, provider, label])
  @@index([provider])
  @@index([status])
}

enum Provider {
  META
  GOOGLE_ADS
  WEBSITE_FORM
  JUSTDIAL
  INDIAMART
}

enum IntegrationStatus { ACTIVE INVALID EXPIRED REVOKED }

model WebhookEvent {
  id            String   @id @default(cuid())
  provider      Provider
  externalId    String
  credentialId  String?
  receivedAt    DateTime @default(now())
  processedAt   DateTime?
  status        String   // RECEIVED | PROCESSED | FAILED | DUPLICATE
  errorMessage  String?
  rawPayload    Json

  @@unique([provider, externalId])
  @@index([credentialId, receivedAt])
}
```

The existing `Lead` model already has `source`; we add `externalId String?` if not present, for cross-referencing.

---

## Backend file structure

```
backend/src/modules/integrations/
├── integrations.controller.js        // REST: list/create/update/delete/test
├── integrations.service.js           // CRUD + encrypt/decrypt
├── integrations.routes.js
├── integrations.schema.js            // zod per provider
├── crypto.js                         // AES-GCM helpers
├── ingest.service.js                 // THE one ingestLead() function
├── drivers/
│   ├── index.js                      // registry; getDriver(provider)
│   ├── meta.driver.js
│   ├── google.driver.js
│   ├── website.driver.js
│   ├── justdial.driver.js
│   └── indiamart.driver.js
├── webhooks/
│   ├── webhooks.routes.js            // /api/webhooks/:provider/byo/:token
│   └── webhooks.controller.js        // generic; delegates to driver
└── pollers/
    ├── poller.scheduler.js           // cron orchestrator
    ├── indiamart.poller.js
    └── justdial-pull.poller.js
```

---

## Frontend file structure

```
frontend/src/pages/settings/integrations/
├── IntegrationsList.jsx              // entry page: provider cards + status
├── ConnectMeta.jsx
├── ConnectGoogle.jsx
├── ConnectWebsite.jsx
├── ConnectJustDial.jsx
├── ConnectIndiaMART.jsx
└── components/
    ├── IntegrationCard.jsx
    ├── CredentialField.jsx           // input with show/hide, copy, paste-clean
    ├── StepAccordion.jsx             // numbered setup steps w/ screenshots
    └── TestConnectionButton.jsx
```

Route: `/settings/integrations` (list) and `/settings/integrations/connect/:provider`.

---

## Phase 0 — Foundations (~2 days)

Build the shared infrastructure that all providers will use. No provider-specific code yet.

- [ ] Prisma migration: `IntegrationCredential`, `WebhookEvent`, `Provider` enum, `IntegrationStatus` enum
- [ ] Add optional `externalId` to `Lead` if missing
- [ ] `INTEGRATION_ENCRYPTION_KEY` in `.env.example`; document generation command in README
- [ ] `crypto.js`: `encrypt(plaintext) → string` and `decrypt(string) → plaintext` using AES-256-GCM with versioned ciphertext (`v1:` prefix)
- [ ] Driver interface contract (JSDoc typedef) + `drivers/index.js` registry
- [ ] `ingest.service.js`:
  - Dedupe via `WebhookEvent` unique constraint
  - Field mapping (driver's `mapToLead`)
  - Tenant-scoped Prisma write to `Lead`
  - Fire existing `LEAD_CREATED` notification
- [ ] Generic webhook router `POST /api/webhooks/:provider/byo/:token`:
  - Lookup `IntegrationCredential` by `webhookToken`
  - Decrypt credentials
  - Delegate to driver's `verifyWebhook` → `fetchLead` → `ingestLead`
  - Log every event to `WebhookEvent`
- [ ] Integrations controller endpoints: `GET /api/integrations`, `POST /api/integrations`, `PATCH /api/integrations/:id`, `DELETE /api/integrations/:id`, `POST /api/integrations/:id/test`
- [ ] `IntegrationsList.jsx` skeleton (cards grid, empty state)
- [ ] Add `Settings → Integrations` route + sidebar entry

**Acceptance:** I can save a fake credential, see it listed, delete it. No real provider yet.

---

## Phase 1 — Meta (~2 days)

End-to-end FB + IG lead capture using tenant's own Meta App.

- [ ] `meta.driver.js`:
  - [ ] `handleVerificationHandshake(req, credentials)` — GET handshake, echo `hub.challenge` if `hub.verify_token` matches stored value
  - [ ] `verifyWebhook(req, credentials)` — HMAC-SHA256 of raw body with `appSecret`, compare against `X-Hub-Signature-256`
  - [ ] `fetchLead(credentials, leadgenId)` — `GET https://graph.facebook.com/v19.0/{leadgenId}?access_token={pageAccessToken}` and return `field_data`
  - [ ] `mapToLead(rawFields)` — collapse `field_data` array into `{ name, phone, email, source: 'FACEBOOK_AD' | 'INSTAGRAM_AD', externalId }`
  - [ ] `healthCheck(credentials)` — `GET /me?access_token=…`, returns `{ ok, expiresAt }`
- [ ] `GET /api/webhooks/meta/byo/:token` — verification handshake endpoint
- [ ] `ConnectMeta.jsx`:
  - StepAccordion with 6 numbered sections mirroring `02-meta-credentials-guide.md`
  - Form: appId, appSecret, pageId, pageAccessToken, verifyToken
  - "Test Connection" button calls `/api/integrations/:id/test` → shows Page name on success
  - On save, shows the webhook URL (`/api/webhooks/meta/byo/{webhookToken}`) for tenant to paste into Meta App settings
- [ ] Token-health daily cron (Phase 6 also touches this; minimum stub here)
- [ ] E2E test using Meta Lead Ads Testing Tool against a tunnel URL

**Acceptance:** I create a Meta App on my own FB account, paste credentials into Bizzfly, submit a test lead via Meta's testing tool, see it land in the Leads page with `source = FACEBOOK_AD` and receive the bell notification.

---

## Phase 2 — Google Ads (~2 days)

Webhook-based lead form delivery (the easier path; API polling is intentionally out of scope for MVP).

- [ ] `google.driver.js`:
  - `verifyWebhook(req, credentials)` — verify `google-lead-webhook-key` header against stored `webhookKey`
  - No `fetchLead` needed — Google's lead-form webhook payload already includes the field values
  - `mapToLead(rawFields)` — Google's column-array shape → standard Lead
  - `healthCheck(credentials)` — refresh OAuth token + call `customers:listAccessibleCustomers` to confirm developer token + refresh token are valid
- [ ] `ConnectGoogle.jsx`:
  - Big banner up top: "Developer Token approval takes 1–3 weeks. You can still save credentials and we'll start syncing as soon as approval lands."
  - StepAccordion for Cloud project → OAuth client → Developer Token → Refresh Token → Customer ID → Webhook configuration in Google Ads UI
  - Form: clientId, clientSecret, developerToken, refreshToken, customerId, loginCustomerId (optional), webhookKey
  - On save, shows webhook URL to paste into Google Ads Lead Form delivery settings

**Acceptance:** Lead form configured in tenant's Google Ads → test submission → lands in Bizzfly with `source = GOOGLE_ADS`.

---

## Phase 3 — Website Forms (~1 day)

Drop-in webhook for any external form (WordPress, Webflow, Elementor, custom HTML, Typeform).

- [ ] `website.driver.js`:
  - `verifyWebhook(req, credentials)` — HMAC-SHA256 of raw body with `webhookSecret`, compare against `x-bizzfly-signature` header
  - No `fetchLead` — payload IS the lead
  - `mapToLead(rawFields)` — uses tenant-configured `fieldMap` to translate `{ your_name: 'Rahul', mobile: '+91…' }` → `{ name: 'Rahul', phone: '+91…' }`
  - `healthCheck` is a no-op (push-only)
- [ ] `ConnectWebsite.jsx`:
  - Auto-generates webhook URL + signing secret on first save
  - **Field mapping UI**: dynamic key/value rows ("My form's field → Bizzfly field")
  - Copy-paste snippets: cURL, WordPress (CF7 + WPForms webhook plugin), Webflow native webhook, Elementor Pro webhook, raw HTML+JS fetch
  - "Send a test event" button on our side that simulates an inbound request and shows the resulting Lead row

**Acceptance:** Paste the URL+secret into a free WordPress test site's WPForms webhook → submit form → lands in Bizzfly with `source = WEBSITE_FORM`.

---

## Phase 4 — JustDial (~1.5 days)

Support both push and pull flavors because JustDial's offering varies per tenant account.

- [ ] `justdial.driver.js`:
  - **Push variant**: tenant pastes a signing secret/header value; `verifyWebhook` checks it
  - **Pull variant**: nothing to verify; poller calls JustDial endpoint with creds, dedupes via `WebhookEvent`
  - Lenient parser — handles both JSON and XML (XML uses `fast-xml-parser` package)
  - `mapToLead` flexible enough for either shape
- [ ] `pollers/justdial-pull.poller.js` — cron every 5 min per active pull-variant credential
- [ ] `ConnectJustDial.jsx`:
  - Two tabs: **"Push API (recommended)"** and **"Pull API"**
  - Guidance text: *"Email your JustDial account manager and ask for 'Push API for CRM integration'. They'll either ask for our webhook URL (push) or send you an API endpoint + key (pull)."*
  - Push form: webhookSecret/headerValue
  - Pull form: endpointUrl, authType (basic | apiKey | header), credentials

**Acceptance:** Both variants tested with a Postman-simulated JustDial payload (we likely won't have a real JustDial account during dev).

---

## Phase 5 — IndiaMART (~1 day)

Simplest provider. Pull-based, one credential field, works without any tunnel.

- [ ] `indiamart.driver.js`:
  - `fetchRecentLeads(credentials, sinceTimestamp)` — calls `https://mapi.indiamart.com/wservce/crm/crmListing/v2/` with `glusr_crm_key`, `start_time`, `end_time`; max 7-day window
  - Per-credential token-bucket rate limiter (5 calls per 5 min)
  - `mapToLead(rawFields)` — IndiaMART's `{ SENDER_NAME, SENDER_MOBILE, SENDER_EMAIL, UNIQUE_QUERY_ID, ... }` shape
  - `healthCheck(credentials)` — 1-hour-window pull
- [ ] `pollers/indiamart.poller.js` — cron every 5 min per active credential; uses `lastPolledAt` as the sliding window's start
- [ ] `ConnectIndiaMART.jsx`:
  - Single-field form: CRM Key
  - "Test Connection" pulls last 24h as a preview
  - On save, kicks off an initial 7-day backfill

**Acceptance:** Use my (or a friend's) real IndiaMART seller account, paste CRM Key, see real leads pulled in.

---

## Phase 6 — Polish & operations (~1 day)

- [ ] Status dashboard on `IntegrationsList.jsx`: per-provider connection count, last lead time, errors-in-last-24h
- [ ] Email + in-app notification when status flips to `INVALID` / `EXPIRED`
- [ ] Reconnect flow per provider (prefilled where safe, secrets blanked)
- [ ] Per-credential "Recent webhook events" debug viewer (read-only `WebhookEvent` list, last 50)
- [ ] Final E2E pass through each provider's sandbox/testing tool

---

## Environment variables to add

```
# Required: 32-byte key, base64-encoded. Generate once with:
#   openssl rand -base64 32
INTEGRATION_ENCRYPTION_KEY=base64-encoded-32-byte-key

# Optional: override Graph API version (default v19.0)
META_GRAPH_API_VERSION=v19.0

# Optional: IndiaMART poll interval in seconds (default 300)
INDIAMART_POLL_INTERVAL_SEC=300
```

---

## Provider rollout decision recap

Build order: **Meta → Google → Website → JustDial → IndiaMART**.

Note: IndiaMART is technically the simplest (one credential field, pull-based, no tunnel needed for localhost testing). Building the harder webhook-based providers first ensures the architecture handles the hardest case from day one; pull-based providers slot in cleanly afterward.
