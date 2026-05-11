# S3-FE-B-01 — Lead detail page

**Owner:** FE-B
**Branch:** `fe/lead/S3-FE-B-01-detail`
**Estimated:** 1 day
**Blocks:** S4-FE-B-01 (notes UI lives here)
**Blocked by:** S2-FE-B-01, S3-BE-A-01, S3-BE-B-02

## Goal

Click a lead → see all its info, change its status, view its activity timeline, manage tasks, edit details.

## Files to read first

- `frontend/src/pages/admin/Leads.jsx` (from S2-FE-B-01)
- Backend endpoints: `GET /api/leads/:id`, `GET /api/leads/:id/activity`, `POST /api/leads/:id/transition`, `POST /api/leads/:id/assign`, `PATCH /api/leads/:id`
- `docs/design/frontend-components.md`

## Steps

1. **Route** — request FE-A to add `/leads/:id` to `App.jsx` route tree.

2. **Page** — `pages/admin/LeadDetail.jsx`:
   - Header: lead name + phone (click-to-call: `tel:`), status badge, status dropdown (calls transition endpoint), reassign dropdown (calls assign), Edit button (opens LeadFormDialog from S2-FE-B-02 in edit mode), back link
   - Two-column layout (desktop): left = summary card, right = tabbed area
   - Summary card: contact info, source, budget, requirement, project, assignedTo, tags, createdAt
   - Tabs (use shadcn `Tabs`):
     - **Activity** (default): timeline list grouped by date, each item shows icon by type, user, content, time. Pagination/load-more.
     - **Tasks**: list of tasks for this lead, "Add task" button → opens task dialog (uses TaskDialog from S3-FE-A-01), can mark complete inline.
     - **Notes**: stub for now — will be wired in S4-FE-B-01.
     - **Details**: full read-only field list (everything from the lead, including tags + meta).

3. **Status change UX**:
   - On dropdown change, call transition endpoint
   - If target stage is "Closed Lost" or any `isLost` stage, show inline reason input first (don't open dialog — keep it light)
   - On success, refetch lead + activity tab

4. **Reassign UX**:
   - Dropdown lists company users (cached from `/api/users`)
   - On change, call assign endpoint, optional reason via popover
   - Refetch

5. **Click-to-call & WhatsApp** — phone link is `tel:`, WhatsApp icon link is `https://wa.me/<digits>`.

## Acceptance criteria

- [ ] Page renders all lead info
- [ ] Status change works (with reason for lost)
- [ ] Reassignment works
- [ ] Activity timeline populates and refreshes after status/assign actions
- [ ] Edit dialog reuses LeadFormDialog
- [ ] Tabs render without errors (Notes tab shows "coming soon")

## AI prompt template

> I'm on task S3-FE-B-01. Read `frontend/src/pages/admin/Leads.jsx`, `docs/design/frontend-components.md`, and the backend endpoints in `S2-BE-B-01`, `S2-BE-B-03`, `S3-BE-A-01`, `S3-BE-B-02`. Coordinate with FE-A to add the `/leads/:id` route. Build the page with two-column layout, status dropdown, reassign dropdown, and a tabbed timeline. Show me the layout sketch first.

## Notes for reviewer

- Verify the activity timeline renders ASSIGNMENT and STATUS_CHANGE events correctly with metadata
- The `/leads/:id` route addition must come from FE-A (not in this PR)

## Static UI reference (added 2026-05-10)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/LeadDetail.jsx` — for two-column layout, summary-card fields, tabbed area pattern.
- **Restyle:** shadcn `Card`, `Tabs`, `Badge`, `Select` (status/assign dropdowns), `Dialog` (reasons), `Avatar`. Follow `docs/STATIC-UI-MAP.md` (S0-FE-A-03).
- **Activity timeline:** plain rendered list (no extra lib) — group by date, icon per type. His structure is fine to mirror.
- **State:** `useLeadStore` (single-lead selector) + `services/leadService.js`. No `useApp()`.
