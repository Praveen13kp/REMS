# S5-BE-A-11 — Tasks bucket filter (today / overdue / upcoming)

**Owner:** BE dev
**Branch:** `be/task/S5-BE-A-11-bucket-filter`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

`admin/FollowUps.jsx` buckets tasks client-side; that breaks once there are more than a page of tasks. Server-side filter instead.

## Steps

1. Extend `GET /api/tasks` with `?bucket=today|overdue|upcoming|completed` and `?assignedTo=me|userId|all`.
2. Use the caller's timezone (from header or user pref) to compute "today".
3. Keep existing list + filter behavior intact.

## Acceptance criteria

- [ ] Each bucket returns the right tasks for the calling user
- [ ] Timezone respected (test with UTC vs IST users)
- [ ] FE removes the client-side bucketing loop
