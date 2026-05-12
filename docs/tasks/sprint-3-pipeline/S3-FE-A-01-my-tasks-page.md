# S3-FE-A-01 — Follow-Ups page

> **Updated 2026-05-12:** Renamed from "My Tasks" to "Follow-Ups" to align with the leadpro-realty static UI which is now the source of truth. Route is `/follow-ups` (not `/tasks`). Page mirrors `leadpro-realty/src/pages/FollowUps.jsx` 1:1.

**Owner:** FE-A
**Branch:** `fe/follow-ups/S3-FE-A-01-page`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S3-BE-B-04 (or whichever endpoint backs follow-ups — see BE task open question)

## Goal

Port `leadpro-realty/src/pages/FollowUps.jsx` into `frontend/src/pages/FollowUps.jsx`. Three buckets: **Missed**, **Today**, **Upcoming** — driven by lead `nextFollowUp` (or task `dueAt` depending on BE decision in S3-BE-B-04).

## Source of truth

- **Page to port:** `leadpro-realty/src/pages/FollowUps.jsx`
- Reuse `KpiCard` from `leadpro-realty/src/components/KpiCard.jsx` (port it if not already in `frontend/src/components/`)
- Backend: see S3-BE-B-04 (open question: tasks table vs `lead.nextFollowUp`)

## Stack rules (enforce strictly)

- **Styling:** leadpro CSS classes only — `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-ghost`, `.card`, `.card-title`, `.kpi-grid`, `.kpi-icon`, `.kpi-icon-*`, `.badge`, `.data` (table), `.table-scroll`, `.avatar`, `.row`, `.stack`, `.content-head`, `.text-muted`, `.text-sm`, `.text-xs`, `.mb-4`, `.mt-*`. NOT shadcn primitives.
- **No shadcn:** no `Tabs`, `Dialog`, `Checkbox`, `Calendar`, `Popover`, `Form`. Use raw `<table>`, `<button>`, `<input>` with leadpro classes.
- **Modals:** leadpro `.modal-backdrop` + `.modal` pattern (see how `useApp().setModal` is used in leadpro — we replicate via our own store/portal).
- **Forms:** react-hook-form + zod; inputs use `.input`, `.select`, `.textarea` classes.
- **Theme:** light default; dark via `.dark` class.
- **Icons:** lucide-react. The leadpro page imports `Phone, MessageSquare, AlertTriangle, CalendarClock, Calendar, PhoneCall, ListChecks, Lightbulb` — keep the same set.

## Steps

1. **Route** — add `/follow-ups` to `App.jsx`, link from `DashboardLayout` sidebar.

2. **Page** — `frontend/src/pages/FollowUps.jsx`:
   - Header: `<div className="content-head">` with title "Follow-Ups" and subtitle "Stay on top of every customer touchpoint."
   - 4 KPIs in `.kpi-grid`: Today's Calls, Missed, Upcoming (7 days), Total Active
   - Smart Suggestion card (gradient background, Lightbulb icon) — copy verbatim from leadpro
   - 3 sections, each in a `.card`: Missed (with red AlertTriangle), Today (CalendarClock), Upcoming (Calendar). Each renders the same `<Table>` row layout from leadpro.
   - Row layout per leadpro: Customer (avatar + name + phone), Project, Due/Was due, Last Contact, Status badge, Priority badge, action icons (Phone, MessageSquare).
   - Click customer row → navigate to `/leads/:id`.

3. **Data source:**
   - If S3-BE-B-04 lands as a Task table: fetch `GET /api/tasks?dueBefore=...` and split into buckets client-side.
   - If it lands as `lead.nextFollowUp`: fetch `GET /api/leads?nextFollowUp=...` and group by today/missed/upcoming the way leadpro does (see lines 10–14 of source).
   - Coordinate with BE-B before starting.

4. **Action buttons** — call and WhatsApp icons currently toast in leadpro. For our impl: `tel:` link and `https://wa.me/<digits>`.

## Acceptance criteria

- [ ] Visual parity with `leadpro-realty/src/pages/FollowUps.jsx`
- [ ] Uses leadpro CSS classes — zero shadcn imports in this file
- [ ] Three buckets render with correct data
- [ ] KPIs compute correctly
- [ ] Smart Suggestion card present
- [ ] Row click navigates to lead detail

## AI prompt template

> I'm on task S3-FE-A-01. Read `leadpro-realty/src/pages/FollowUps.jsx` and port it 1:1 into `frontend/src/pages/FollowUps.jsx`. Use leadpro CSS classes (already in `frontend/src/styles/leadpro.css`), NOT shadcn. Replace `useApp()` with our zustand store + axios fetch. Show me the file scaffold first.

## Notes for reviewer

- No shadcn imports allowed in this file
- The "Completed" bucket from the old spec is dropped — leadpro shows only Missed/Today/Upcoming. If BE wants Completed visibility, it lives elsewhere.
