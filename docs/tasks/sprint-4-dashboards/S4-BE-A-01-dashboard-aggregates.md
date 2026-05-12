# S4-BE-A-01 — Dashboard aggregate endpoints

> **Updated 2026-05-12:** Verified against `leadpro-realty/src/pages/Dashboard.jsx` (admin/manager/agent variants) + `Reports.jsx`. Most of the spec already aligns, but the **owner endpoint must also return data the leadpro AdminDashboard uses that wasn't in the original spec.** See "Leadpro UI data needs" section below — add missing fields. AGENT dashboard in leadpro is card-list driven (no charts), not the by-status chart originally specced. Keep both, FE can pick.

## Leadpro UI data needs (verified 2026-05-12)

**`GET /owner` (AdminDashboard, lines 37–148):**
- KPIs: `totalLeads`, `newLeadsThisWeek`, `convertedCount` (status=Booked), `revenueBooked` (sum of budget where status=Booked). **Plus trend % vs prior period** (UI shows "+12.4%", "+8.2%", "+24.1%", "+18.7%"). MISSING from spec — add `previousPeriodCounts` or per-KPI `delta`.
- `leadActivityLast30Days`: `[{date, count}]` (already covered by `leadsTrend`).
- `leadStatusBreakdown`: `[{status, count}]` for 7 statuses — New / Contacted / Interested / Site Visit / Negotiation / Booked / Lost. Spec has `pipelineValue.byStage` — confirm stage names match this exact set or rename to `leadsByStatus`.
- `leadSources`: `[{source, count}]` — already covered.
- `monthlyBookings`: `[{month, count}]` for last 6 months. MISSING — add to spec.
- `recentLeads`: top 6 by createdAt — already implicitly in `/api/leads?limit=6&sort=-createdAt`, but consider embedding to save a round-trip.
- `topAgents`: `[{userId, name, avatar?, leads, booked, revenue}]` — spec has `leads, booked`; **add `revenue` (sum of booked budget per agent)**. MISSING.

**`GET /manager` (ManagerDashboard, lines 187–237):**
- KPIs: `assignedLeads`, `pendingFollowUps` (nextFollowUp < now+1d AND status not in Booked/Lost), `conversionRate`, `activeAgentsCount`.
- `teamPerformance`: `[{userId, name, totalLeads, booked}]` for bar chart. Spec has `agentLeadCounts` — rename or alias.
- `teamMembers`: same shape essentially. MISSING — but redundant with topAgents-like list.
- `responseTimeP50` — kept from original spec, leadpro doesn't show it (we're adding value).

**`GET /agent` (AgentDashboard, lines 239–279):**
- KPIs: `myLeads.total`, `todayFollowUps` (count, where nextFollowUp.toDateString()=today), `hotLeads` (priority='Hot'), `bookings`.
- `activeLeads`: top 8 my leads with `{id, name, phone, priority, projectName, budget, status, updatedAt}`. MISSING — spec only has aggregate KPIs. **Add `activeLeads: [...]` to `/agent` response** OR FE will hit `/api/leads?assignedToMe=true&limit=8` separately (acceptable fallback).

**`GET /reports` (Reports.jsx, 3 tabs):**
- Tab 1 (Sales): `revenueByMonth: [{month, total}]` (last 6mo), `funnelByStage: [{stage, count}]` — note leadpro uses cumulative funnel (`stages.indexOf(l.status) >= stages.indexOf(s)`), spec says ordered — clarify which. `conversionByProject: [{projectId, name, bookings}]`. KPIs already match.
- Tab 2 (Agents): `agentPerformance: [{userId, name, total, active, booked, conversionRate, revenue, calls?}]`. Leadpro fakes `calls = leadCount * 2` — if we have an activities count, return it; else omit `calls`.
- Tab 3 (Leads): `leadsBySource` + `leadsByCity: [{city, count}]` for 7 Indian cities. MISSING — add to spec.

**Owner:** BE-A
**Branch:** `be/dashboard/S4-BE-A-01-aggregates`
**Estimated:** 1 day
**Blocks:** S4-FE-A-01, S4-FE-A-02, S4-FE-A-03, S4-FE-A-05 (reports page)
**Blocked by:** S2-BE-B-01, S3-BE-B-01

## Goal

Three dashboard endpoints, one per role. Each returns the numbers the matching FE page needs in one call.

## Steps

### 1. Module — `backend/src/modules/dashboard/`

### 2. Endpoints (under `/api/dashboard`)

- `GET /owner` — OWNER/ADMIN. Returns:
  ```js
  {
    totals: { leads, projects, users, openTasks },
    pipelineValue: { byStage: [{stageId, name, count}], total },
    funnel: { newToContacted, contactedToQualified, qualifiedToVisit, visitToBooked }, // counts + %
    bookingsThisMonth: number,
    leadsBySource: [{source, count}],
    topAgents: [{userId, name, leads, booked}],
    leadsTrend: [{date, count}], // last 30 days
  }
  ```
- `GET /manager` — MANAGER (or OWNER/ADMIN). Returns:
  ```js
  {
    teamSize: number,
    todayActivities: number,
    todaySiteVisits: number,
    overdueTasks: number,
    agentLeadCounts: [{userId, name, total, byStatus: {...}}],
    responseTimeP50: number, // first activity created_at - lead created_at, in minutes
  }
  ```
- `GET /agent` — any user. Scoped to `req.user.id`:
  ```js
  {
    myLeads: { total, byStatus: {...} },
    todayTasks: number,
    overdueTasks: number,
    upcomingVisits: number,
    leadsThisMonth: number,
  }
  ```
- `GET /reports` — OWNER/ADMIN/MANAGER. **Date-range filtered aggregates** used by the Reports page (S4-FE-A-05). Query: `from`, `to` (ISO dates, default last 30d), `projectId?`, `agentId?`. Returns:
  ```js
  {
    totals: { leads, conversions, conversionRate, avgTimeToCloseHours, revenueBooked },
    funnel: [{ stage, count }],            // ordered by pipeline stage
    leadsBySource: [{ source, count }],
    leadsByDay: [{ date, count }],         // bucketed daily within range
    topAgents: [{ userId, name, leads, booked, conversionRate }],
  }
  ```
  AGENT is blocked (403); the dashboard's `/agent` endpoint covers their own slice.

### 3. Implementation

Use raw aggregate queries: `tenantPrisma.lead.groupBy(...)`, `tenantPrisma.lead.count(...)`. For trend lines, use a CTE or just JS-bucket the createdAt.

Keep each handler under ~80 lines; extract a helper per metric if it gets long.

### 4. Caching

For MVP, no caching. Add a TODO note to add Redis or `Cache-Control: max-age=60` later.

## Acceptance criteria

- [ ] All four endpoints respond with the documented shape (`/owner`, `/manager`, `/agent`, `/reports`)
- [ ] Role guards correct (AGENT blocked from `/reports`)
- [ ] AGENT scoped to own data on `/agent`
- [ ] `/reports` respects `from`/`to`/`projectId`/`agentId` filters
- [ ] Each endpoint returns in <500ms on the seeded demo data
- [ ] curl examples

## AI prompt template

> I'm on task S4-BE-A-01. Read this spec, `backend/prisma/schema.prisma`, and the seed data shape from `backend/prisma/seed.js`. Build the dashboard module with three endpoints. Use Prisma's `groupBy` and `count`; raw SQL only if you can't avoid it. Show me the metric-to-query mapping for the owner endpoint first; the others are similar.

## Notes for reviewer

- Verify the funnel math (it's count-based, not session-based — clarify in code comment)
- AGENT scoping must be enforced both via filter AND via role guard so a tampered request can't read across users
