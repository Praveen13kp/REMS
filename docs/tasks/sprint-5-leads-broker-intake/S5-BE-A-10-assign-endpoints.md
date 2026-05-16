# S5-BE-A-10 — Assign-page endpoints

**Owner:** BE dev
**Branch:** `be/lead/S5-BE-A-10-assign`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** —

## Goal

`admin/Assign.jsx` has 3 TODOs falling back to client-side logic. Replace with proper endpoints.

## Steps

1. `GET /api/leads/unassigned?limit=...` — leads with `assignedToId IS NULL`, ordered by createdAt asc.
2. `POST /api/leads/auto-assign` — body `{ strategy: "round-robin" | "weighted-by-workload", userIds: [...] }`. Reassigns N unassigned leads, returns the assignment map. Writes Activity rows.
3. `GET /api/users/workload` — for each tenant user, count of open leads / open tasks. Cached briefly.

## Acceptance criteria

- [ ] Round-robin actually round-robins across the chosen users
- [ ] Auto-assign is atomic (all-or-nothing on failure)
- [ ] Workload counts match the leads table reality
