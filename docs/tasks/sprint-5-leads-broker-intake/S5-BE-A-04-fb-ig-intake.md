# S5-BE-A-04 — Facebook + Instagram lead intake webhooks

**Owner:** BE dev
**Branch:** `be/intake/S5-BE-A-04-fb-ig-webhooks`
**Estimated:** 1.5 days
**Blocks:** S5-FE-B-05
**Blocked by:** —

## Goal

Allow leads created in Facebook Lead Ads and Instagram Lead Ads to flow into the right company automatically.

## Steps

1. **Schema**:
   - Add `LeadSource.FACEBOOK` and `LeadSource.INSTAGRAM` to the existing enum if not there
   - On `Company`: `intakeTokens Json?` — `{ facebook: { token, enabled, secret }, instagram: { ... } }`
2. **Module** `backend/src/modules/leadIntake/`:
   - `POST /api/intake/:source/:token` — public, no auth cookie
   - Resolve company by `(source, token)` — 404 if not found / disabled
   - Verify FB signature header (`X-Hub-Signature-256`) using the per-company secret
   - Map FB lead-form payload to lead fields (name, phone, email, custom answers → `notes`)
   - Run existing dedup service → create-or-merge
   - Tenant scope is **derived from the token**, not the session — never call user-context helpers here
3. `GET /api/intake/config` — authenticated, returns the masked token + webhook URL for the company (for the FE settings panel).
4. `POST /api/intake/regenerate` — rotates the token, invalidates old one.
5. Strict per-IP and per-token rate limits.

## Acceptance criteria

- [ ] Webhook with valid signature creates a lead with `source = FACEBOOK`
- [ ] Webhook with bad signature → 401, no DB write
- [ ] Wrong/disabled token → 404
- [ ] Lead appears in the correct company only (cross-tenant test)
- [ ] Dedup picks up an existing lead with the same phone/email
- [ ] Token regenerate invalidates the old token
