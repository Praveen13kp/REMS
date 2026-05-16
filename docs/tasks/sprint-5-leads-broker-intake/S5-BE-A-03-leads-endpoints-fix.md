# S5-BE-A-03 — Fix Leads endpoints (Kanban, Table, Quick Actions)

**Owner:** BE dev
**Branch:** `be/lead/S5-BE-A-03-fix-endpoints`
**Estimated:** 1 day
**Blocks:** S5-FE-B-04
**Blocked by:** —

## Goal

The leads module is the core of the product and several actions are returning errors in the UI. Audit and fix every endpoint that powers the Kanban board, the Leads table, and the lead-detail Quick Actions menu.

## Steps

1. Repro every action while watching `backend` logs:
   - Table: list, filter, sort, paginate, search, bulk-assign, bulk-delete
   - Kanban: list-by-stage, drag-card (status transition), reorder within column
   - Quick Actions on a lead: log call, add note (already in note module), change status (incl. Closed Lost reason), reassign agent, schedule task
2. For each failure: classify (missing endpoint / wrong validation / tenant-scope bug / stale Prisma include / null deref) and fix.
3. Make sure every state-changing endpoint:
   - uses `tenantPrisma(req)` not raw `prisma`
   - writes an `Activity` row (see S5-BE-A-16)
   - fires `notify()` where the previous spec said it should
4. Add at least one integration test per quick action.

## Acceptance criteria

- [ ] All 5 quick-action endpoints succeed with 200 / 201 and proper response shape
- [ ] Kanban PATCH (drag) updates stage AND order AND writes Activity row
- [ ] Bulk-assign respects tenant scope
- [ ] Filter+sort+paginate still returns correct totals
- [ ] Tests added for each endpoint
