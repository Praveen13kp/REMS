# S4-FE-A-05 — Reports page

**Owner:** FE-A
**Branch:** `fe/reports/S4-FE-A-05-page`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-BE-A-01 (dashboard aggregates), S2-BE-B-01 (leads API), S3-BE-B-01 (pipeline)

## Goal

Build the Reports page from the manager's static UI — date-range filters + a small grid of charts and a downloadable table. Reuses the aggregate endpoints from S4-BE-A-01; if a specific cut isn't available, derive client-side from `/api/leads`.

## Files to read first

- `_tmp_leadpro/leadpro-realty/src/pages/Reports.jsx`
- `frontend/src/pages/admin/Dashboard.jsx` (after S4-FE-A-01 lands — for chart/KPI patterns to reuse)
- Backend: `S4-BE-A-01-dashboard-aggregates.md` for endpoint shapes
- `docs/STATIC-UI-MAP.md`

## Steps

1. **Page header** — title + date-range `Popover` (preset chips: 7d / 30d / 90d / Custom) + project filter + "Export CSV" `Button`.

2. **KPI strip** — 4 `KpiCard`s (reuse the component from S4-FE-A-01): Total leads, Conversion %, Avg time-to-close, Revenue booked.

3. **Charts grid (`grid grid-cols-1 md:grid-cols-2 gap-4`)**:
   - Lead funnel (recharts `FunnelChart` or stacked bar) by status.
   - Source breakdown (`PieChart`).
   - Leads over time (`LineChart`, x = day).
   - Top agents by conversions (`BarChart`).

4. **Detail table** — paginated `Table` of leads in the selected range with status/source/agent/created columns. Click row → `/leads/:id`.

5. **Export CSV** — generate client-side from current filter via `papaparse.unparse`. (Skip server-side export for MVP.)

6. **Role gate** — only OWNER/ADMIN/MANAGER. AGENT route redirects to `/dashboard`.

## Acceptance criteria

- [ ] Filters update all charts + table together
- [ ] All four charts render with real data, no console warnings from recharts
- [ ] Export CSV produces a valid file with the same rows as the table
- [ ] AGENT cannot reach the page (UI gate + server enforces)
- [ ] Empty-state handled (no leads in range → friendly card per chart, not broken chart)

## AI prompt template

> I'm on task S4-FE-A-05. Read the manager's `Reports.jsx` for intent, the BE aggregates contract from `S4-BE-A-01-dashboard-aggregates.md`, and the KPI/chart patterns from `S4-FE-A-01-owner-dashboard.md`. Build the reports page with shadcn + recharts. Show me which aggregates you need from BE and which you'll derive client-side before writing.

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/Reports.jsx`.
- **Restyle:** shadcn `Card`, `KpiCard` (reused from S4-FE-A-01), `Tabs`, `Popover` + `Calendar` (date range), `Select`, `Button`, `Table`, `Badge`. Charts via **recharts**, not chart.js.
- **State:** local `useState` for filters; data via `reportService` (new) wrapping the aggregate endpoints. Toasts via `sonner`.

## Notes for reviewer

- Don't pre-aggregate on the client if the BE endpoint exists for that cut — keeps reports consistent with the owner dashboard.
- Date-range filter belongs in URL params so a manager can share a link to a specific report.
