# S4-FE-A-02 — Manager dashboard

> **Updated 2026-05-12:** Port the `ManagerDashboard` function from `leadpro-realty/src/pages/Dashboard.jsx` (lines ~187–237). Use leadpro classes + chart.js (NOT shadcn / recharts).

**Owner:** FE-A
**Branch:** `fe/dashboard/S4-FE-A-02-manager`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-FE-A-01 (dispatcher)

## Goal

Manager-focused dashboard plugged into the role dispatcher.

## Steps

1. Create `components/dashboards/ManagerDashboard.jsx`.
2. `.content-head` with "Team Dashboard" H1 + "Assign Leads" button (lucide `UserCheck`).
3. `.kpi-grid` with 4 KpiCards — Assigned Leads, Pending Follow-Ups, Conversion Rate, Active Agents. (Leadpro shows these exact four — keep them.)
4. 2-col grid (`2fr 1fr`):
   - "Team Performance" Bar chart (`react-chartjs-2 Bar` in `.chart-wrap`) — grouped bars: Total Leads (light purple) + Booked (green), one per agent.
   - "Team Members" stack — avatar + name + `{leads} leads · {booked} booked` + conversion `badge badge-success`.
5. Add response-time P50 card below if BE exposes it (not in leadpro static — append as our extension).

## Acceptance criteria

- [ ] Renders all sections from `/api/dashboard/manager`
- [ ] Leaderboard sortable

## AI prompt template

> I'm on task S4-FE-A-02. Read `S4-FE-A-01`'s dispatcher and the `/api/dashboard/manager` shape from `S4-BE-A-01`. Build the ManagerDashboard component. Reuse cards from the owner dashboard where possible.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/Dashboard.jsx` — the `ManagerDashboard` function (already split by role in leadpro).
- **Classes:** leadpro CSS only. **Charts:** chart.js / react-chartjs-2. Reuse `KpiCard` from S4-FE-A-01.
