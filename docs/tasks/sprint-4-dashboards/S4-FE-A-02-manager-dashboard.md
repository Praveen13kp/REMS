# S4-FE-A-02 — Manager dashboard

**Owner:** FE-A
**Branch:** `fe/dashboard/S4-FE-A-02-manager`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-FE-A-01 (dispatcher)

## Goal

Manager-focused dashboard plugged into the role dispatcher.

## Steps

1. Create `components/dashboards/ManagerDashboard.jsx`.
2. KPI row: Team Size, Today's Activities, Today's Site Visits, Overdue Tasks.
3. Agent leaderboard table: name, total leads, by-status counts, conversion %.
4. Response time card: P50 minutes (from API).
5. Quick links: "Today's site visits" → `/leads?status=SITE_VISIT_SCHEDULED&visitDate=today`.

## Acceptance criteria

- [ ] Renders all sections from `/api/dashboard/manager`
- [ ] Leaderboard sortable

## AI prompt template

> I'm on task S4-FE-A-02. Read `S4-FE-A-01`'s dispatcher and the `/api/dashboard/manager` shape from `S4-BE-A-01`. Build the ManagerDashboard component. Reuse cards from the owner dashboard where possible.
