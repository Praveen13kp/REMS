# Three New Lead Features — How They Work

Shipped on branch `sprint-6/audit-ratelimit` on 2026-05-20. No DB migrations required.

---

## 1. Lead Aging Alerts

**What it does:** Automatically flags leads that have gone cold so they don't fall through the cracks.

### When it fires
A background worker wakes every **6 hours** (first run 60s after server boot — see [backend/src/modules/lead/leadAging.scheduler.js](../../backend/src/modules/lead/leadAging.scheduler.js)) and looks for leads where ALL of the following are true:

- `status` is NOT `Booked` and NOT `Lost` (still active in the pipeline)
- `lastContactedAt` is older than **7 days** — or, if the lead has never been contacted, `createdAt` is older than 7 days

`lastContactedAt` is updated automatically whenever a lead's stage changes (see [lead.service.js:578](../../backend/src/modules/lead/lead.service.js#L578)).

### What happens to each stale lead
1. A `SYSTEM` activity is appended to the lead's timeline:
   > *"No contact in 9 days — lead has gone stale."*
2. A `LEAD_AGING` notification appears in the bell popover for:
   - the assigned user, OR
   - every active OWNER / ADMIN / MANAGER if the lead is unassigned
3. The notification links to `/leads/<id>` so one click takes the user there.

### Why it doesn't spam
Before alerting, the worker checks if a `LEAD_AGING` activity already exists on this lead within the last 7 days. If yes, it skips. So a lead that stays stale re-alerts every 7 days, not every 6 hours.

### Manual API
```
GET /api/leads/aging?days=7
```
Returns `{ items, total, days }` — the current list of stale leads for the requesting tenant. Useful for building a dashboard KPI card or a dedicated "Stale leads" page later.

### How to test
1. Pick a lead and set `lastContactedAt` to 10 days ago in the DB (or just create a lead and wait).
2. Restart the backend, wait ~60s for the first tick.
3. Check the bell icon for the assigned user — a `LEAD_AGING` notification should appear.
4. Open the lead — the timeline should show a SYSTEM "lead has gone stale" entry.

---

## 2. Calendar View on Leads

**What it does:** Shows leads as a month-grid calendar based on their scheduled follow-up date.

### Where to find it
Go to **Leads** → at the top right of the table toolbar there's a view toggle:

```
[ Table ]  [ Kanban ]  [ Calendar ]
```

Click **Calendar**. The URL updates to `?view=calendar` so the choice is bookmarkable / shareable.

### What it shows
- A **6-row × 7-column month grid** (Sun → Sat).
- Each lead with a `nextFollowUpAt` in the visible month appears as a small chip on its scheduled day.
- Days show up to **2 lead names** + a "+N more" pill if more.
- **Today** has an accent outline. The **selected day** is highlighted blue.
- Navigation: `‹` previous month · `Today` jump to current month · `›` next month.

### Day detail panel
Click any day → the bottom panel lists every lead due that day:

| Customer | Phone | Status | Time | Assigned |
|----------|-------|--------|------|----------|

Clicking a row navigates to `/leads/<id>`.

### Filters carry through
Any filter active on the Leads page — search, status, source, priority, assignee, project — is automatically applied to the calendar query. So you can filter to one agent and see only their follow-ups on the calendar.

### How it's wired
The calendar component ([frontend/src/components/leads/LeadsCalendar.jsx](../../frontend/src/components/leads/LeadsCalendar.jsx)) calls:
```
GET /api/leads?nextFollowUpFrom=<month-start>&nextFollowUpTo=<month-end>&pageSize=500&sort=nextFollowUpAt:asc
```
The two date params were added to [lead.service.js](../../backend/src/modules/lead/lead.service.js) and the response is bucketed into a `Map<dayKey, leads[]>` for O(1) cell rendering.

### How to test
1. Open any lead and set its `nextFollowUpAt` to a date this month.
2. Go to Leads → click Calendar.
3. The lead's name should appear as a chip on its scheduled day.
4. Click that day → it should appear in the bottom-panel table.

---

## 3. Drag-Drop Pipeline Stage Editor

**What it does:** Lets owners/admins reshape the sales pipeline without code or DB access.

### Where to find it
Go to **Settings** → new **Pipeline** tab in the sidebar (between General and Profile).

> Visible to OWNER and ADMIN only. AGENT still sees only Profile / Appearance / Notifications.

### What you can do

| Action | How |
|--------|-----|
| **Reorder stages** | Grab the `⋮⋮` handle on the left of any row and drop it elsewhere. The new order is saved immediately. |
| **Rename a stage** | Click the name input → type → click **Save**. |
| **Change probability %** | Edit the number → click **Save**. Used by Kanban weighted-pipeline math. |
| **Add a stage** | Click **+ Add stage** → modal asks for name, probability, optional Won/Lost flags. New stages append to the end. |
| **Delete a stage** | Click the trash icon → confirm. |

### Safety rails
The backend ([pipeline.service.js](../../backend/src/modules/pipeline/pipeline.service.js)) enforces three rules:

1. **The default stage cannot be deleted.** The seeded "New" stage is marked `isDefault: true`. Its trash button is disabled in the UI and the API rejects DELETE on it.
2. **A stage with leads in it cannot be deleted.** If you try, the API responds with HTTP 400 and a message like:
   > *"Cannot delete stage 'Negotiation' — 4 leads still in this stage. Move them first."*
   Surfaced as a red toast. Move or reassign those leads first.
3. **Stage names must be unique per company.** Attempting to rename to or create a duplicate name returns a 400.

### Where stages flow to
Stages live in the `PipelineStage` table and are read by:
- The **Kanban board** column layout
- The **status dropdown** on Lead Detail
- The **status filter** on the Leads list
- The **transition endpoint** validation

All of these read from `GET /api/pipeline/stages` on each load, so changes propagate instantly — no server restart needed.

### API surface (for reference)
```
GET    /api/pipeline/stages              — list (auto-seeds defaults for old companies)
POST   /api/pipeline/stages              — create (OWNER/ADMIN)
PATCH  /api/pipeline/stages/reorder      — reorder via { stageIds: [...] }
PATCH  /api/pipeline/stages/:id          — rename / change probability
DELETE /api/pipeline/stages/:id          — delete (rejects default + in-use)
```

### How to test
1. Settings → Pipeline tab.
2. Drag "Qualified" above "Contacted" → toast "Order saved" → reload Kanban board → columns should appear in the new order.
3. Click `+ Add stage` → name "Site Visit Done", probability 50 → Add. Open any lead and the new stage should appear in the status dropdown.
4. Try to delete a stage that has leads in it — should fail with the "leads still in this stage" toast.
5. Try to delete the default "New" stage — trash button should be disabled.

---

## File map

| Feature | New files | Modified files |
|---------|-----------|----------------|
| Aging | [backend/src/modules/lead/leadAging.service.js](../../backend/src/modules/lead/leadAging.service.js)<br>[backend/src/modules/lead/leadAging.scheduler.js](../../backend/src/modules/lead/leadAging.scheduler.js) | [backend/server.js](../../backend/server.js)<br>[backend/src/modules/lead/lead.controller.js](../../backend/src/modules/lead/lead.controller.js)<br>[backend/src/modules/lead/lead.routes.js](../../backend/src/modules/lead/lead.routes.js) |
| Calendar | [frontend/src/components/leads/LeadsCalendar.jsx](../../frontend/src/components/leads/LeadsCalendar.jsx) | [backend/src/modules/lead/lead.service.js](../../backend/src/modules/lead/lead.service.js)<br>[frontend/src/pages/admin/Leads.jsx](../../frontend/src/pages/admin/Leads.jsx) |
| Stage editor | [frontend/src/components/pipeline/StageEditor.jsx](../../frontend/src/components/pipeline/StageEditor.jsx) | [backend/src/modules/pipeline/pipeline.service.js](../../backend/src/modules/pipeline/pipeline.service.js)<br>[backend/src/modules/pipeline/pipeline.controller.js](../../backend/src/modules/pipeline/pipeline.controller.js)<br>[backend/src/modules/pipeline/pipeline.routes.js](../../backend/src/modules/pipeline/pipeline.routes.js)<br>[frontend/src/pages/admin/Settings.jsx](../../frontend/src/pages/admin/Settings.jsx) |
