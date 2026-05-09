# S4-FE-A-01 — Owner dashboard

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

1. **Decide on a charts lib** — `recharts` is the easy pick. Add as dep.

2. **Page** — `pages/admin/Dashboard.jsx`:
   - Routing: `/dashboard` already routes here. Switch which dashboard renders based on `user.role`. Use a small dispatcher: `OWNER`/`ADMIN` → `<OwnerDashboard />`, `MANAGER` → `<ManagerDashboard />`, `AGENT` → `<AgentDashboard />`. (S4-FE-A-02 and S4-FE-A-03 add the other two.)

3. **OwnerDashboard component** — `components/dashboards/OwnerDashboard.jsx`:
   - Top KPI row: 4 cards — Total Leads, Open Tasks, Bookings This Month, Pipeline Value (count of non-lost)
   - Funnel widget: horizontal bar chart with stage counts + drop-off %
   - Leads-by-source: pie or donut
   - Top agents: small leaderboard table
   - Leads trend: line chart of last 30 days
   - All cards skeleton-load, then render

4. **Loading / error states** — single fetch error shows a retry button.

## Acceptance criteria

- [ ] Owner sees rich dashboard; AGENT/MANAGER see different content (in subsequent tasks)
- [ ] All charts render with real data
- [ ] No console errors with empty data (e.g. brand new company)

## AI prompt template

> I'm on task S4-FE-A-01. Read `docs/tasks/sprint-4-dashboards/S4-BE-A-01-dashboard-aggregates.md` for the response shape, then build the owner dashboard. Use `recharts`. Implement the role dispatcher in Dashboard.jsx so the next two tasks can plug in. Show me the layout grid first.

## Notes for reviewer

- Make sure empty data doesn't throw (zero leads, zero agents)
