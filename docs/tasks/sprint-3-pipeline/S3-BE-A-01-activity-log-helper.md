# S3-BE-A-01 — Activity log helper + audit trail

> **Updated 2026-05-12:** Source-of-truth UI is now `leadpro-realty/`. Verified against `leadpro-realty/src/pages/LeadDetail.jsx`: **leadpro's LeadDetail has NO Activity tab** — it shows a single-card layout (Lead Information, Status & Workflow, Assigned Agent, Quick Actions, Notes inline). However, the static store seeds `activities[]` with icon-based events (`Phone`, `MessageSquare`, `UserPlus`, `CheckCircle`) that the dashboard timeline renders. So we still need the activity log + endpoint, but the **UI consumer is the dashboard recent-activity feed and a future Activity panel on the lead detail page** — not a tab in leadpro's current LeadDetail. Confirm with TL whether to add an Activity panel to our ported LeadDetail.
>
> Activity types from schema (CALL, EMAIL, WHATSAPP, NOTE, STATUS_CHANGE, ASSIGNMENT, SYSTEM) cover leadpro's icon set cleanly. No new types required.

**Owner:** BE-A
**Branch:** `be/activity/S3-BE-A-01-helper`
**Estimated:** 0.5 day
**Blocks:** S3-BE-B-02, S3-BE-B-03
**Blocked by:** S0-BE-A-04 (Activity model)

## Goal

A small but heavily-used helper module so feature code can write activity rows consistently. Also exposes a generic "list activities for lead" endpoint.

## Steps

### 1. Module — `backend/src/modules/activity/`

- `activity.routes.js`
- `activity.service.js`
- `activity.controller.js`

### 2. Helper API

```js
// activity.service.js
async function logActivity(tenantPrisma, { leadId, userId, type, content, metadata }) {
  return tenantPrisma.activity.create({
    data: { leadId, userId, type, content, metadata },
  });
}
module.exports = { logActivity };
```

This is imported by every feature service that wants to write activity (lead assign, status transition, note creation system event).

### 3. Endpoint — `GET /api/leads/:leadId/activity`

Returns activities for a lead, newest first, paginated. Includes user info and lead-status snapshot for transitions.

Mount this on the leads router (it's nested), but the implementation lives in the activity module to keep it isolated.

### 4. Update existing call sites

The lead-assign endpoint from S2-BE-B-03 already writes Activity inline (or stubs it); refactor to call `logActivity(...)` instead.

## Acceptance criteria

- [ ] `logActivity(...)` is the only way feature code writes activity
- [ ] `GET /api/leads/:leadId/activity` returns paginated list with user info
- [ ] S2-BE-B-03's assignment writes via the helper
- [ ] curl example added

## AI prompt template

> I'm on task S3-BE-A-01. Read `backend/src/modules/lead/lead.service.js` (specifically the assignLead function from S2-BE-B-03) and the Activity model in schema. Build the activity module with the helper and the GET endpoint. Refactor lead.service.js to use the helper. Show me the helper signature first.
