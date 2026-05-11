# S4-FE-A-03 — Agent dashboard

**Owner:** FE-A
**Branch:** `fe/dashboard/S4-FE-A-03-agent`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-FE-A-01

## Goal

What an AGENT sees on `/dashboard`.

## Steps

1. `components/dashboards/AgentDashboard.jsx`.
2. KPI row: My Leads, Today's Tasks, Overdue Tasks, Upcoming Visits.
3. By-status bar chart of my leads.
4. Today's task list (top 5; link to /tasks).
5. Recent activity feed (last 10 across my leads — uses `/api/leads/:id/activity` aggregated client-side, OR add a `/api/dashboard/agent/recent-activity` if it gets gnarly; for MVP just hit the leads list and pull recent).

## Acceptance criteria

- [ ] Renders all sections from `/api/dashboard/agent`
- [ ] Empty state for new agents

## AI prompt template

> I'm on task S4-FE-A-03. Same pattern as S4-FE-A-01/02. Build the agent dashboard component. If you find yourself making >2 API calls just to populate this page, propose adding a `/api/dashboard/agent/recent-activity` endpoint and ping BE-A.

## Static UI reference (added 2026-05-10)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/Dashboard.jsx` (agent-role sections — his data filters by role client-side; ours is server-driven).
- **Restyle:** shadcn `Card`, `Table`, recharts. Reuse `KpiCard` from S4-FE-A-01. Follow `docs/STATIC-UI-MAP.md` (S0-FE-A-03).
