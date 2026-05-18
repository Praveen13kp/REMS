# S5-FE-B-05 — Integrations settings panel

**Owner:** FE dev
**Branch:** `fe/settings/S5-FE-B-05-integrations`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S5-BE-A-04

## Goal

UI for the company OWNER to set up Facebook / Instagram lead intake.



## Steps

1. Replace (or extend) the existing Integrations tab in `admin/Settings.jsx`.
2. For each source (FB, IG) show a card:
   - Status badge (on / off)
   - Webhook URL with copy-to-clipboard button
   - Token field — masked by default, "Reveal" toggle, copy button
   - "Regenerate token" button (with confirm dialog)
   - On/off toggle
3. Wire to `GET /api/intake/config`, `PATCH /api/intake/:source` (enable/disable), `POST /api/intake/regenerate`.
4. Below each card, show "Setup instructions" expandable section with the steps to paste the webhook URL into Facebook Business Manager.

## Acceptance criteria

- [ ] OWNER can toggle FB intake on, copy webhook URL, paste into FB sandbox, receive a test lead
- [ ] Token field is masked by default
- [ ] Regenerate prompts confirmation, then shows the new token once
- [ ] Non-OWNER sees the panel read-only (or hidden)
