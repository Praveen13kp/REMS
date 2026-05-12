# S4-FE-A-05 — Reports page

> **Updated 2026-05-12:** Port `leadpro-realty/src/pages/Reports.jsx` directly. Use leadpro `.tabs` (3 tabs: Sales Analytics / Agent Performance / Lead Analytics — NOT shadcn `Tabs`). Charts: **chart.js + react-chartjs-2** (NOT recharts). Use `.chart-wrap.tall` for the two larger charts (Revenue Trend, Funnel).

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

1. **Page header** — `.content-head` with "Reports & Analytics" H1 + date-range `<select className="select">` (Last 30 days / 7 days / This Quarter / This Year) + "Export" + "Build Report" buttons.

2. **Tabs** — leadpro `.tabs` with three `.tab` buttons: "Sales Analytics" / "Agent Performance" / "Lead Analytics".

3. **Tab 0 — Sales Analytics:**
   - `.kpi-grid`: Bookings, Revenue, Avg Deal Size, Conversion Rate (KpiCards with trend %).
   - Grid `2fr 1fr`: Line "Revenue Trend" (months × ₹lakhs, accent fill) + horizontal Bar "Funnel" (stages × counts, colored bars). Both in `.chart-wrap.tall`.
   - Single Bar "Conversion by Project" in `.chart-wrap`.

4. **Tab 1 — Agent Performance:**
   - Grouped Bar "Calls vs Bookings (per agent)" in `.chart-wrap`.
   - `.data` table "Detailed Performance": Agent / Total / Active / Booked / Conv. Rate (color-coded badge) / Revenue.

5. **Tab 2 — Lead Analytics:**
   - 2-col grid: Doughnut "Leads by Source" + Bar "Leads by City".

6. **Export CSV** — client-side via `papaparse.unparse` from current tab/filter.

7. **Role gate** — only OWNER/ADMIN/MANAGER. AGENT route redirects to `/dashboard`.

## Acceptance criteria

- [ ] Filters update all charts + table together
- [ ] All charts render with real data, no console warnings from chart.js
- [ ] Export CSV produces a valid file with the same rows as the table
- [ ] AGENT cannot reach the page (UI gate + server enforces)
- [ ] Empty-state handled (no leads in range → friendly card per chart, not broken chart)

## AI prompt template

> I'm on task S4-FE-A-05. Read the manager's `Reports.jsx` for intent, the BE aggregates contract from `S4-BE-A-01-dashboard-aggregates.md`, and the KPI/chart patterns from `S4-FE-A-01-owner-dashboard.md`. Build the reports page with shadcn + recharts. Show me which aggregates you need from BE and which you'll derive client-side before writing.

## Static UI reference (updated 2026-05-12 — supersedes 2026-05-11)

- **Source of truth:** `leadpro-realty/src/pages/Reports.jsx` — port directly.
- **Classes:** leadpro CSS (`.tabs`, `.tab`, `.chart-wrap`, `.chart-wrap.tall`, `.data`, `.kpi-grid`, `.badge`). No shadcn.
- **Charts:** **chart.js + react-chartjs-2** (NOT recharts).
- **State:** local `useState` for tab + filters; data via `reportService` wrapping `/api/dashboard/reports`.

## Notes for reviewer

- Don't pre-aggregate on the client if the BE endpoint exists for that cut — keeps reports consistent with the owner dashboard.
- Date-range filter belongs in URL params so a manager can share a link to a specific report.
