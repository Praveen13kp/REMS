# S4-FE-A-03 — Agent dashboard

> **Updated 2026-05-12:** Port the `AgentDashboard` function from `leadpro-realty/src/pages/Dashboard.jsx` (lines ~239–279). Leadpro's agent view is **card-grid based** (not chart-heavy) — keep that shape. No charts unless BE provides aggregated by-status data; otherwise lean on `.lead-card-grid`. Use leadpro classes, not shadcn.

**Owner:** FE-A
**Branch:** `fe/dashboard/S4-FE-A-03-agent`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-FE-A-01

## Goal

What an AGENT sees on `/dashboard`.

## Steps

1. `components/dashboards/AgentDashboard.jsx`.
2. `.content-head`: "Hi {firstName}, here are your leads." H1 + "Add Lead" button.
3. `.kpi-grid`: My Leads, Today's Follow-Ups (red), Hot Leads (red, lucide `Flame`), Bookings (green).
4. "Your Active Leads" card with `.lead-card-grid` — render `.lead-card`s with name/phone, priority badge, project, budget (accent color), status badge, "x ago" — clickable to `/leads/:id`. Show top 8.
5. (Optional, our addition) If BE exposes a small task list under `/api/dashboard/agent`, render below the lead grid.

## Acceptance criteria

- [ ] Renders all sections from `/api/dashboard/agent`
- [ ] Empty state for new agents

## AI prompt template

> I'm on task S4-FE-A-03. Same pattern as S4-FE-A-01/02. Build the agent dashboard component. If you find yourself making >2 API calls just to populate this page, propose adding a `/api/dashboard/agent/recent-activity` endpoint and ping BE-A.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/Dashboard.jsx` `AgentDashboard` (lines 239–279).
- **Classes:** leadpro CSS — esp. `.lead-card-grid`, `.lead-card`, `.lead-card-head`, `.lead-card-foot`. No shadcn.
