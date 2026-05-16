# S5-BE-A-16 — Activity log emission audit

**Owner:** BE dev
**Branch:** `be/activity/S5-BE-A-16-audit`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** —

## Goal

The lead-detail timeline depends on Activity rows being written on every mutation. If S5-BE-A-03 turns up "quick action is broken", the activity row was probably also missing.

## Steps

1. Audit every mutation in:
   - `lead.service.js` (create, update, status, assign, delete)
   - `note.service.js` (create, update, delete)
   - `task.service.js` (create, complete, delete)
   - `file.service.js` (upload, delete)
2. Each mutation must call `activity.service.log(...)` with the right type + metadata.
3. Add an integration test per mutation asserting `Activity` row count grows by 1.

## Acceptance criteria

- [ ] Every mutation emits Activity
- [ ] Timeline on `LeadDetail` shows entries for all of them
- [ ] Tests prevent regressions
