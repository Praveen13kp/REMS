# S3-FE-A-01 — My Tasks page + task creation dialog

**Owner:** FE-A
**Branch:** `fe/task/S3-FE-A-01-my-tasks`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S3-BE-B-04

## Goal

A page where users see their tasks (today, upcoming, overdue). Reusable TaskDialog component used by this page AND the lead detail page (S3-FE-B-01).

## Files to read first

- Backend: `GET /api/tasks`, `POST /api/tasks`, `POST /api/tasks/:id/complete`
- `frontend/src/components/ui/{tabs,dialog,form,calendar,popover}.jsx`

## Steps

1. **Route** — add `/tasks` to App.jsx, link from sidebar (FE-A owns both).

2. **Page** — `pages/admin/Tasks.jsx`:
   - Tabs: Overdue, Today, Upcoming, Completed
   - Each tab is a list of tasks: title, due time, lead link (if attached), checkbox to complete, edit icon
   - "New Task" button → opens TaskDialog
   - Completed tab shows past 7 days only

3. **TaskDialog** — `components/tasks/TaskDialog.jsx`:
   - Props: `open`, `onOpenChange`, `task?` (edit mode), `defaultLeadId?` (when opened from lead detail)
   - Fields: title, description, dueAt (date + time), assignedToId (visible to OWNER/ADMIN/MANAGER), leadId (autocomplete from `/api/leads`)
   - Submit → POST or PATCH

4. **Inline complete** — checkbox on each task row → POST `/tasks/:id/complete`. Optimistic.

5. **`useTasks` hook** — wraps fetch + complete.

## Acceptance criteria

- [ ] Page renders four tabs with correct data
- [ ] Create task works
- [ ] Complete task works (and writes activity if attached to lead)
- [ ] Dialog reusable from lead detail page

## AI prompt template

> I'm on task S3-FE-A-01. Read this spec and the backend `S3-BE-B-04-tasks-module.md`. Add the route + sidebar entry, build the Tasks page, and the reusable TaskDialog. Show me the component file layout first.

## Notes for reviewer

- TaskDialog is shared with FE-B's lead detail page — keep its API stable

## Static UI reference (added 2026-05-10)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/FollowUps.jsx` — closest analogue (his "follow-ups" ≈ our "tasks"). Use for list grouping (overdue/today/upcoming), row layout, and complete-on-checkbox pattern.
- **Restyle:** shadcn `Tabs`, `Checkbox`, `Dialog`, `Calendar`, `Popover`, `Form`. Follow `docs/STATIC-UI-MAP.md` (S0-FE-A-03).
- **Terminology:** our schema uses "Task" not "Follow-up" — keep our names in code/UI; the static is reference only.
- **State:** `useTaskStore` + `services/taskService.js`. No `useApp()`.
