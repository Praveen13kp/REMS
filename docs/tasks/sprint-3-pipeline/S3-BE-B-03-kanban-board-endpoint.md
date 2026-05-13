# S3-BE-B-03 — Kanban board fetch endpoint

> **WARNING — Divergence from leadpro-realty (2026-05-12):** leadpro-realty has **NO kanban page**. The pipeline view in leadpro is either a list (`Leads.jsx`) or a stage-breakdown card on the dashboard. TL to decide whether to:
> 1. **Keep this task as an extension beyond leadpro scope** (good engineering, no static reference), or
> 2. **Drop from MVP** and rely on the dashboard stage breakdown + filterable leads list.
>
> If kept, the endpoint contract below is fine for an internal Kanban without leadpro reference.

**Owner:** BE-B
**Branch:** `be/pipeline/S3-BE-B-03-board`
**Estimated:** 0.25 day
**Blocks:** S3-FE-B-02
**Blocked by:** S3-BE-B-01, S3-BE-B-02

## Goal

The Kanban view needs stages + leads-per-stage in one round trip.

## Steps

### Endpoint — `GET /api/pipeline/board`

Query: `assignedToId`, `interestedProjectId`, `search` (filters apply to leads, not stages). Returns:

```js
{
  stages: [
    { id, name, order, probability, isWon, isLost,
      leads: [ { id, name, phone, status, assignedTo, lastContactedAt, score, tags, _count: {activities} } ],
      total: number,
    },
    ...
  ]
}
```

For MVP, cap leads per column at 50 (newest first) with a `total` count + "Load more" support deferred. Document the cap.

### Service notes

- Single query: `findMany` on stages, then for each stage `findMany` leads. To avoid N+1, fetch all leads in one query then group in JS.
- AGENT scoping applies (filter `assignedToId = me`).

## Acceptance criteria

- [ ] One endpoint returns the full board payload
- [ ] Filters work
- [ ] Per-column cap of 50 + total count
- [ ] AGENT only sees own leads in each column
- [ ] curl example

## AI prompt template

> I'm on task S3-BE-B-03. Read `backend/src/modules/{lead,pipeline}/`. Build the board endpoint. The grouping must avoid N+1 — fetch leads for all stages in one query, then group by status in JS. Show me the response shape and the grouping logic first.
