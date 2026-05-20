# Lead Capture Integrations — Discussion & Decisions

> Working notes from the planning conversation on 2026-05-19. Captures the *why* behind decisions so future-you (and the team) don't need to re-litigate them.

---

## The starting question

> "I want a simple setup for capturing leads from Meta ads (Facebook, Instagram) and from website forms, multi-tenant — each tenant uses their own app_id, secret, and token, entered from the frontend."

Sprint 5 had already shipped a working FB/IG webhook for **one** company ("xyz") with hardcoded tokens. The new goal: make it self-serve and multi-tenant, and extend to Google Ads, JustDial, IndiaMART, and website forms.

---

## Options considered for Meta

### Option A — Central Meta App + OAuth "Connect Facebook"
Bizzfly owns one Meta App. Tenants click "Connect Facebook" → OAuth flow → we store their Page Access Token. One webhook URL serves all tenants.

**Pros:** one-click UX, professional, scales well.
**Cons:** requires Meta App Review (2–4 weeks, often longer), Business Verification, privacy policy, screencasts. Single point of failure — if Meta suspends our app, all tenants break at once. Permanent legal/compliance surface area.

### Option B — Bring-Your-Own credentials (CHOSEN)
Each tenant creates their own Meta App, generates their own Page Access Token (or System User Token), pastes credentials into Bizzfly's Settings UI. We store encrypted, fetch leads using their token.

**Pros:** zero review burden, ships in days not weeks, no single point of failure, tenants control their own data.
**Cons:** harder onboarding for non-technical tenants, more support load, token expiry harder to manage. Acceptable for our target market of agencies with some marketing-tech literacy.

### Option C — Zapier/Make middleware (rejected)
Tenants connect FB to Zapier, Zapier forwards to us. Rejected because it adds a third-party dependency and recurring cost to the customer.

### Decision: Option B for all providers
- No central app for any platform
- Each tenant supplies their own credentials per platform
- Build a generic, provider-pluggable architecture so adding a 6th platform is a new file, not a refactor

---

## Architecture decisions

### 1. One generic credentials table
`IntegrationCredential` with a `provider` enum and an encrypted JSON `credentials` blob. Provider-specific fields live inside the blob, not as columns. Adding a new provider means a new driver file, not a schema migration.

### 2. One ingestion pipeline
A single `ingestLead(companyId, source, externalId, payload)` service is the only place that writes to the `Lead` table. Every webhook handler and poller funnels through it. Handles dedupe, field mapping, tenant context, and firing the existing Sprint-5 `LEAD_CREATED` notification.

### 3. Per-tenant webhook URLs with opaque tokens
`/api/webhooks/{provider}/byo/{webhookToken}` — `webhookToken` is generated when the credential is saved. We look up which tenant a webhook belongs to by this URL path token, **never** by trusting an ID in the payload (which would be spoofable).

### 4. Provider drivers
Each provider is one file (`drivers/{provider}.driver.js`) exporting a fixed interface:
- `verifyWebhook(req, credentials)` → `{ ok, externalIds[] }`
- `handleVerificationHandshake(req, credentials)` (Meta only)
- `fetchLead(credentials, externalId)` → raw lead fields
- `mapToLead(rawFields)` → `{ name, phone, email, source, externalId, ... }`
- `healthCheck(credentials)` → `{ ok, expiresAt? }`

The webhook router, cron jobs, and Settings UI never import provider-specific code; they go through the driver registry.

### 5. Encryption at rest
- Algorithm: **AES-256-GCM** (Node's built-in `crypto` module, no extra dependency)
- Key: `INTEGRATION_ENCRYPTION_KEY` env var (32 bytes, base64-encoded)
- Generated once with `openssl rand -base64 32`, stored in `.env` (gitignored), injected in production via the platform's secrets manager
- Ciphertext format: `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>` — the `v1:` prefix lets us rotate keys later without losing access to old data
- Plaintext credentials only ever exist in memory during a single request

**Why we need this:** if the database leaks (backup mistake, dev pulls a dump, attacker gets read access), plaintext tokens = every tenant's FB/Google/IndiaMART account is compromised. Encryption means the leak alone isn't enough — the attacker also needs the env-var key. Defense in depth.

### 6. Idempotency
`WebhookEvent` table with `@@unique([provider, externalId])`. Every inbound webhook is recorded first; duplicate deliveries (Meta retries, Google retries) hit the unique constraint and short-circuit. A lead is never created twice from the same external event.

### 7. Audit trail
`WebhookEvent.rawPayload` keeps the original JSON for debugging. Pair with Sprint-6 AuditLog for credential CRUD events (create, update, delete, status change).

---

## Confirmed scope

- **Leads land in the existing `Lead` module** with `source` field populated (`FACEBOOK_AD`, `INSTAGRAM_AD`, `GOOGLE_ADS`, `WEBSITE_FORM`, `JUSTDIAL`, `INDIAMART`).
- **Notifications**: existing `LEAD_CREATED` flow (Sprint 5) fires after every successful `ingestLead`. No new notification type.
- **Location**: new sub-route under `Settings → Integrations`. Existing Settings module is the parent.
- **Build order**: Meta → Google → Website forms → JustDial → IndiaMART.

---

## Open items (parked for later)

- **Key rotation procedure** — not built yet. The `v1:` prefix makes it possible; the actual rotation script can wait until we have a reason to rotate.
- **Token health alerts to tenant** — daily cron flags `INVALID`/`EXPIRED`, sends email + in-app notification. Phase 6.
- **Bulk operations** — disconnect all, re-test all. Nice to have, not MVP.
- **Webhook event TTL** — `WebhookEvent.rawPayload` will grow. Plan a 90-day cleanup cron eventually.
