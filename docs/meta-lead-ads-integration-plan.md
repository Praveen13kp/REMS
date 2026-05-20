# Meta Lead Ads Integration — Proper OAuth Plan

**Status:** Planned. Replaces the current per-tenant-HMAC design for Meta sources only.
**Owner:** TBD
**Estimated effort:** 2–3 working days
**Depends on:** Sprint-6 audit + rate-limit landing first (so audit captures the new flows from day one).

---

## 1. Why this exists

The Sprint-5 intake (`/api/intake/:source/:token`) verifies webhooks with a **per-tenant HMAC secret** stored in `Company.intakeTokens`. That design works for our own webform (Slice 1 in the upgrade plan) but **does not match how Meta Lead Ads actually authenticates**:

- Meta signs all `leadgen` webhook callbacks with **the Meta App Secret** (one global value per Meta App), not anything per-tenant.
- Meta requires **one webhook URL** registered on the App — it cannot vary per tenant.
- Tenants are identified inside the payload by the **Facebook Page ID** that the lead form belongs to.

Until this is fixed, Meta → our endpoint always fails signature verification. The current workaround (Make.com / Zapier relay that re-signs with the tenant secret) is fine for one ad but does not scale to multiple paying tenants.

This task moves Meta intake to the path Meta intends:
- One Meta App registered by us, App Secret kept in env.
- Each tenant connects their own Facebook Page through **Facebook Login for Business** OAuth.
- We store the tenant's Page ID + Page Access Token.
- Webhook signature verified once against the App Secret; tenant resolved by Page ID.

The existing per-tenant-HMAC intake **stays** for non-Meta sources (webform, generic API). Only `facebook` and `instagram` move to the new path.

---

## 2. End-state user flow

### OWNER onboarding (one-time per tenant)
1. OWNER goes to Settings → Integrations → Facebook.
2. Clicks **"Connect Facebook Page"** → redirected to Facebook OAuth consent screen.
3. Selects which of their Pages to connect, grants `leadgen` + `pages_show_list` + `pages_manage_metadata` + `pages_read_engagement` scopes.
4. Returns to our app. We exchange the short-lived user token for a long-lived Page Access Token, store `{ metaPageId, metaPageAccessToken, metaPageName, connectedAt }` on `Company`.
5. We call Graph API `POST /{pageId}/subscribed_apps?subscribed_fields=leadgen` once to wire the webhook.
6. Integrations page now shows: "Connected to Page «My Real Estate Co.» — Disconnect | Reconnect".

### Lead arrival (runtime, per ad submission)
1. User fills the Lead Form on Facebook / Instagram.
2. Meta POSTs to `https://api.our-domain.com/api/intake/meta/webhook` with `X-Hub-Signature-256: sha256=<hmac>`, body contains `entry[].id` (the Page ID) and `entry[].changes[].value.leadgen_id`.
3. We verify HMAC with the **App Secret** from env.
4. Find `Company` by `metaPageId = entry.id`. If none, return 200 (Meta retries otherwise) but log a warning — orphan lead, no tenant claims it.
5. Fetch full lead detail from Graph API: `GET /{leadgen_id}?access_token={pageAccessToken}` → returns the form's `field_data` array.
6. Map to our internal shape (same `mapPayloadToLead` we already have, slight tweak).
7. `ingestLead(companyId, source: "facebook" | "instagram", mapped)` — **reuse the existing pipeline unchanged** (dedup, notification, activity).

### Webhook verification (one-time, Meta requirement)
Meta calls `GET /api/intake/meta/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` once when we register the URL in the App dashboard. We compare `hub.verify_token` against `META_VERIFY_TOKEN` env, echo back `hub.challenge`. This stays a one-time setup step done by the dev, not per tenant.

---

## 3. Architecture changes

### 3.1. Env vars (add)
```
META_APP_ID=...
META_APP_SECRET=...
META_VERIFY_TOKEN=...       # any random string, we choose, must match what we paste in Meta App dashboard
META_REDIRECT_URI=https://api.our-domain.com/api/intake/meta/oauth/callback
```

### 3.2. Schema (additive — no migration of existing data)
Add to `Company`:
```prisma
model Company {
  // ... existing ...
  metaPageId           String?  @unique     // FB Page ID, globally unique
  metaPageName         String?
  metaPageAccessToken  String?              // long-lived, ~60 days; refresh logic later
  metaConnectedAt      DateTime?
}
```
- `metaPageId` is `@unique` so a Page cannot be connected to two tenants (defensive — Meta would let it, we won't).
- `metaPageAccessToken` stored plain for MVP; **flag for hardening slice** — encrypt at rest with KMS or `pgcrypto`. Note in the SOW hardening list ([[project_saas_multitenant_upgrade_plan]] slice 4 — "Per-company PII encryption at rest" already covers this).

The existing `intakeTokens` JSON column stays — it now serves only webform / non-Meta sources.

### 3.3. New routes
```
GET    /api/intake/meta/oauth/start         OWNER only — returns FB OAuth redirect URL
GET    /api/intake/meta/oauth/callback      handles ?code=... from FB, completes connect
POST   /api/intake/meta/disconnect          OWNER only — unsubscribe + clear tokens
GET    /api/intake/meta/webhook             FB verify challenge (no auth)
POST   /api/intake/meta/webhook             leadgen events (no auth, HMAC verified)
```
The old `POST /api/intake/:source/:token` stays for `webform` (when we ship Slice 1). Drop `facebook`/`instagram` from its `SUPPORTED_SOURCES` once Meta path is live to avoid two parallel ways to ingest the same source.

### 3.4. Module structure
```
backend/src/modules/meta/
  meta.routes.js
  meta.controller.js
  meta.service.js          ← OAuth, token exchange, page subscription, webhook
  meta.graph.js            ← thin wrapper over Graph API fetch calls
```
Kept separate from `leadIntake/` so the per-tenant-HMAC intake and the Meta-OAuth intake do not become spaghetti. `meta.service.ingestLead` calls into `leadIntake.service.ingestLead` for the shared part (dedup, notify, activity) — extract that into a tiny `lead.ingest.service.js` if it makes the boundary cleaner.

### 3.5. Frontend changes
Settings → Integrations page:
- Facebook section now shows **either** "Not connected — [Connect Facebook Page]" **or** "Connected to «Page Name» — [Disconnect]".
- Remove the "regenerate token" UI for Facebook/Instagram (still keep for webform).
- "Connect" button calls `GET /api/intake/meta/oauth/start`, gets back `{ url }`, redirects browser to it.
- OAuth callback page (`/integrations/meta/callback`) reads `?status=ok|error&reason=...` from query and shows a toast, then redirects back to Settings.

---

## 4. Detailed task breakdown

Each row is a self-contained PR. Numbered for sequencing.

| # | Task | Files touched | Done when |
|---|---|---|---|
| 1 | **Meta App setup (manual, no code)** | — | Meta App created in Meta for Developers, App Secret in env, `leadgen` webhook field added to dashboard with placeholder URL. |
| 2 | **Schema additive migration** | `prisma/schema.prisma`, new migration | `metaPageId @unique` + 3 sibling columns on Company; migration applied locally. |
| 3 | **`meta.graph.js` Graph API wrapper** | new file | `exchangeCodeForToken(code)`, `getLongLivedPageToken(userToken, pageId)`, `getLeadDetail(leadgenId, pageToken)`, `subscribeApp(pageId, pageToken)`, `unsubscribeApp(pageId, pageToken)`. Each is a typed `fetch` with timeout. |
| 4 | **OAuth start + callback** | `meta.routes.js`, `meta.controller.js`, `meta.service.js` | OWNER hitting `/api/intake/meta/oauth/start` gets a Facebook OAuth URL; callback exchanges code, stores page row, subscribes the page to `leadgen`. |
| 5 | **Webhook verify GET handler** | `meta.controller.js` | Hitting `GET /api/intake/meta/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=X` returns `X` when the verify token matches env. |
| 6 | **Webhook POST handler** | `meta.controller.js`, `meta.service.js`, `app.js` (rawBody for this route) | HMAC-verified Meta callback resolves `Company` by Page ID, fetches lead detail, calls into existing `ingestLead`. Test with Meta's "Test webhook" tool from the App dashboard. |
| 7 | **Disconnect endpoint** | `meta.controller.js`, `meta.service.js` | `POST /api/intake/meta/disconnect` unsubscribes the page from Graph API and nulls the 4 columns on Company. |
| 8 | **Frontend Integrations refactor** | `src/pages/Settings/Integrations.jsx` (or wherever it lives) | Facebook section uses connect/disconnect flow; Instagram inherits the same Page connection (IG biz accounts post `leadgen` through the linked Page). |
| 9 | **Remove FB/IG from legacy intake** | `leadIntake.service.js` `SUPPORTED_SOURCES`, tests | `POST /api/intake/facebook/:token` returns 404 once Meta path is live (or 410 with a message during transition). |
| 10 | **Smoke test script** | `backend/scripts/smoke-meta-webhook.sh` (or `.ps1`) | Script POSTs a sample `leadgen` payload to `/api/intake/meta/webhook` with a real HMAC computed from `META_APP_SECRET`, asserts a lead is created in the company connected to that test Page ID. |
| 11 | **Audit log entries** | wire into [[project_sprint_6_audit_ratelimit_plan]] | `META_PAGE_CONNECTED`, `META_PAGE_DISCONNECTED`, `META_LEAD_INGESTED`, `META_LEAD_INGEST_FAILED` written to `AuditLog`. |
| 12 | **Production URL + cert** | infra | Public HTTPS URL pointing at `/api/intake/meta/webhook` — Meta requires valid cert. |

Tasks 2 → 7 are backend, sequential. Task 8 (FE) can start in parallel with task 6. Task 9 lands last to avoid breaking the (currently working) relay path before the real path is verified in production.

---

## 5. Things that look like edge cases but actually matter

### 5.1. Instagram inherits the Page
Instagram Business / Creator accounts are *attached to* a Facebook Page. The `leadgen` webhook fires on the **Page**, with the payload telling you whether the form was IG or FB via `entry.changes.value.ad_id` lineage (or you can call `GET /{ad_id}?fields=adset{campaign{objective}}` if you really need to disambiguate — usually `mapped.source` from the form's metadata is enough). For the MVP, mark all Meta leads as source `Facebook` and revisit when IG-specific tracking matters.

### 5.2. Page Access Token expiry
Long-lived Page tokens last ~60 days but auto-refresh as long as the Page admin uses Facebook. They can still expire. **Add a daily cron** (Slice 6) that calls `GET /me?access_token=...` for each connected page; on failure, mark `metaConnectionStatus = "EXPIRED"` and surface a banner on Integrations. Not blocking for MVP.

### 5.3. Webhook delivery is at-least-once
Meta retries on non-2xx. Always return 200 even on internal errors (and log/audit the failure separately), otherwise Meta backs off and you lose leads. Already roughly the case today; double-check after the refactor.

### 5.4. Test mode users vs production
While the Meta App is in dev mode, only users you've added as testers can submit leads. To go live with the real ad, the App needs to be **submitted for App Review** for the `leadgen` permission. This typically takes 1–7 days. **Start the App Review request the same day task 4 lands** so it's approved by the time the rest is ready.

### 5.5. The `verifyFacebookSignature` already in the codebase
It's correct HMAC-SHA256 logic — we just need to swap the key from per-tenant `secret` to `process.env.META_APP_SECRET`. Reuse the function, don't rewrite it.

### 5.6. Rawbody middleware
Express body-parser by default consumes the stream. Verify there's already a `rawBody` capture on the intake route (there is — `leadIntake.routes.js` uses it). Apply the same capture to the new `/api/intake/meta/webhook` route only. Do **not** capture rawBody globally — wastes memory on every authenticated request.

### 5.7. Multi-tenant ownership of a Page
Two of our tenants might both try to connect the same FB Page (e.g. an agency that quit one company and joined another). The `metaPageId @unique` constraint blocks the second connect with a clean error. Surface it as: "This Facebook Page is already connected to another company on this platform. Disconnect it there first, or contact support."

---

## 6. Order of operations vs the existing roadmap

Insert this **after** Slice 2 (audit + rate-limit, currently in flight on `sprint-6/audit-ratelimit`) and **before** Slice 4 (hardening). The global-unique-email cutover (Slice 3, just landed today) does not interact with this.

Updated slice order in [[project_saas_multitenant_upgrade_plan]]:
1. Ad-form / webform intake (still uses per-tenant HMAC — pending)
2. Audit + rate-limit (in flight)
3. Global-unique email cutover (✅ done 2026-05-18)
4. **Meta Lead Ads OAuth integration ← this plan**
5. Hardening + premium features

---

## 7. Interim path for the live ad while this is built

Use a **Make.com** scenario (free tier):
- Trigger: "Facebook Lead Ads — Watch new leads" on the page.
- Action: "HTTP — Make a request" → POST to `https://<our-tunnel>/api/intake/facebook/<token>` with body `{"name":"{{full_name}}","phone":"{{phone_number}}","email":"{{email}}"}` and header `X-Hub-Signature-256: sha256=<computed HMAC>`.
- HMAC step: Make has a built-in "Encryption → HMAC" module; key = the tenant secret from `intakeTokens`.

This buys us the 2–3 days needed to ship the proper path without losing leads from the live ad. Delete the Make scenario once task 9 lands.

---

## 8. Acceptance criteria for declaring this slice done

- [ ] OWNER can connect a Facebook Page via OAuth without a developer touching anything.
- [ ] A real lead submitted on a real Facebook Lead Ad appears in the connected tenant's Leads page within 5 seconds, with source `Facebook`, status `New`, and an Activity row `Lead created from Facebook intake`.
- [ ] OWNER + all MANAGERs of the tenant see a `LEAD_CREATED` notification immediately.
- [ ] Disconnecting the Page from our UI also unsubscribes our App from the Page on Meta's side (verify in Page → Settings → Business Integrations).
- [ ] Submitting a duplicate phone/email number from the same Lead Form merges into the existing lead with a note + dedup activity — does not create a second row.
- [ ] No `intakeTokens.facebook` row remains in use for any company; the column still exists but is empty for Meta sources.
- [ ] App Review for `leadgen` permission is approved on Meta.
- [ ] Audit log shows `META_PAGE_CONNECTED` for every connect, `META_LEAD_INGESTED` for every lead.
- [ ] Smoke test script in CI passes end-to-end (mocked Graph API).

---

## 9. Rough day-by-day

**Day 1 (BE):** Tasks 1, 2, 3 — Meta App registered, schema migrated, Graph wrapper unit-tested.
**Day 2 (BE):** Tasks 4, 5, 6, 7 — OAuth + webhook + disconnect end-to-end on localhost via ngrok/cloudflared.
**Day 3 (FE + cleanup):** Tasks 8, 9, 10, 11 — Integrations UI, retire FB/IG from legacy intake, smoke script, audit hooks.
**Async, starts day 1:** App Review submission for `leadgen` permission (Meta's queue is the long pole).
