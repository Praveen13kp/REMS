# S5-FE-B-04 — Fix Leads UI (Kanban + Table + Quick Actions)

**Owner:** FE dev
**Branch:** `fe/lead/S5-FE-B-04-fix-ui`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S5-BE-A-03

## Goal

Make every interactive piece of the leads experience actually work and feel responsive.

## Steps

1. `admin/Leads.jsx` table:
   - Row-action menu items (view / edit / delete / reassign / change status)
   - Bulk-action bar (assign, delete, change status)
   - Filter chips reflect URL state
2. KanbanBoard:
   - Drag-drop calls the stage-transition endpoint (optimistic update + rollback on error)
   - "Closed Lost" drop prompts for a reason before the PATCH
   - Cards refetch after invite/assign
3. `LeadDetail.jsx` Quick Actions:
   - Log a call → POST activity (CALL)
   - Add a note → existing notes module
   - Change status → PATCH with reason if needed
   - Reassign agent → user picker
   - Schedule task → opens task-create dialog
4. Every action shows a toast on success / error. No silent failures.
5. Smoke-test in the browser: create a lead, run each quick action, verify activity log + Kanban refresh.

## Acceptance criteria

- [ ] Every button in row menu + bulk bar + quick actions does the right thing or shows an error toast
- [ ] Kanban drag failures roll back the card position
- [ ] Activity log entry appears after each action
- [ ] No `console.error` left under normal flow
