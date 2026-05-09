# S3-BE-B-03 — Kanban board fetch endpoint

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
