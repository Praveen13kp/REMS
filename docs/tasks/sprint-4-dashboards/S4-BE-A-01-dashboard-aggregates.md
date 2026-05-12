# S4-BE-A-01 — Dashboard aggregate endpoints

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
