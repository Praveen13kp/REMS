# S4-FE-A-01 — Owner dashboard

> **Updated 2026-05-12:** Source of truth is `leadpro-realty/src/pages/Dashboard.jsx` (the `AdminDashboard` function, lines ~37–148). Port it into `frontend/src/pages/Dashboard.jsx` using leadpro CSS classes (`.kpi-grid`, `.card`, `.card-title`, `.chart-wrap`, `.content-head`, `.table-scroll`, `.data`, `.avatar`, `.badge`, `.row`, `.stack`) — all already present in `frontend/src/styles/leadpro.css`. Do NOT use shadcn components, recharts, or `useApp()`. Charts: **chart.js + react-chartjs-2** matching leadpro. State: `useDashboardStore` + `services/dashboardService.js`. Icons: lucide-react.

**Owner:** FE-A
**Branch:** `fe/dashboard/S4-FE-A-01-owner`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S4-BE-A-01

## Goal

Build the dashboard rendered when an OWNER/ADMIN logs in.

## Files to read first

- Backend: `GET /api/dashboard/owner` from `S4-BE-A-01`
- `frontend/src/pages/admin/Dashboard.jsx` (placeholder)

## Steps

1. **Charts lib** — use **chart.js + react-chartjs-2** (already what leadpro-realty uses). Register only the modules you need: `CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler`. Reuse the `chartOpts(theme)` helper from `leadpro-realty/src/pages/Dashboard.jsx` lines 18–35.

2. **Page** — `pages/Dashboard.jsx`:
   - Routing: `/dashboard` already routes here. Switch which dashboard renders based on `user.role`. Use a small dispatcher: `OWNER`/`ADMIN` → `<OwnerDashboard />`, `MANAGER` → `<ManagerDashboard />`, `AGENT` → `<AgentDashboard />`. (S4-FE-A-02 and S4-FE-A-03 add the other two.)

3. **OwnerDashboard component** — `components/dashboards/OwnerDashboard.jsx` — port the `AdminDashboard` function from leadpro Dashboard.jsx:
   - `content-head` with welcome H1 + Export + Add Lead buttons
   - `.kpi-grid` with 4 `<KpiCard>`s — Total Leads, New This Week, Converted, Revenue (with trend % and lucide icons). Port `leadpro-realty/src/components/KpiCard.jsx` to `frontend/src/components/KpiCard.jsx`.
   - 2-col grid (`gridTemplateColumns: '2fr 1fr'`): Line chart "Lead Activity (last 30 days)" + Doughnut "Lead Status Breakdown". Both in `.chart-wrap`.
   - 2-col grid: horizontal Bar "Lead Sources" + Bar "Monthly Bookings"
   - 2-col grid (`1.4fr 1fr`): Recent Leads `.data` table + Top Performing Agents stack
   - Empty-state safe: zero leads → charts render with empty datasets, no crashes

4. **Loading / error states** — single fetch error shows a retry button.

## Acceptance criteria

- [ ] Owner sees rich dashboard; AGENT/MANAGER see different content (in subsequent tasks)
- [ ] All charts render with real data
- [ ] No console errors with empty data (e.g. brand new company)

## AI prompt template

> I'm on task S4-FE-A-01. Read `docs/tasks/sprint-4-dashboards/S4-BE-A-01-dashboard-aggregates.md` for the response shape, then build the owner dashboard. Use `recharts`. Implement the role dispatcher in Dashboard.jsx so the next two tasks can plug in. Show me the layout grid first.

## Notes for reviewer

- Make sure empty data doesn't throw (zero leads, zero agents)

## Static UI reference (updated 2026-05-12 — supersedes 2026-05-10)

- **Source of truth:** `leadpro-realty/src/pages/Dashboard.jsx` (`AdminDashboard`) — port directly, do not restyle.
- **Classes:** leadpro CSS classes only (`.kpi-grid`, `.card`, `.card-title`, `.chart-wrap`, `.content-head`, `.row`, `.stack`, `.data`, `.badge`, `.avatar`). No shadcn primitives.
- **Charts:** **chart.js + react-chartjs-2** (matches leadpro). Do NOT use recharts.
- **State:** `useDashboardStore` + `services/dashboardService.js` (one call to `GET /api/dashboard/owner`). No `useApp()`.
