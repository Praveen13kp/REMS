# S3-BE-B-04 — Tasks module (CRUD + assigned-to-me)

**Owner:** BE-B
**Branch:** `be/task/S3-BE-B-04-crud`
**Estimated:** 0.5 day
**Blocks:** S3-FE-A-01 (My Tasks page)
**Blocked by:** S0-BE-A-04

## Goal

Tasks let agents track follow-ups (call back, send brochure, schedule visit). Tasks can be standalone or attached to a lead.

## Steps

### 1. Module — `backend/src/modules/task/`

### 2. Endpoints (under `/api/tasks`, all authenticated)

- `GET /` — list. Query: `assignedToId` (defaults to me for AGENT), `status`, `leadId`, `dueBefore`, `page`, `pageSize`. Sort by dueAt asc.
- `POST /` — body: `{title, description?, assignedToId?, leadId?, dueAt?}`. Defaults `assignedToId = me`, `status = PENDING`.
- `GET /:id`
- `PATCH /:id` — update title, description, dueAt, status, assignedToId. Only assignee or OWNER/ADMIN/MANAGER can edit.
- `DELETE /:id` — only assignee or OWNER/ADMIN.
- `POST /:id/complete` — sets `status = COMPLETED`, writes Activity (if leadId is set) of type `SYSTEM` content "Task completed: <title>".

### 3. Validation

`title` 2–200 chars, `dueAt` must be future or current, `leadId` must belong to same company (tenantPrisma handles this).

## Acceptance criteria

- [ ] Five endpoints + complete endpoint
- [ ] AGENT defaults to seeing only own tasks
- [ ] Completing a task writes an Activity if attached to a lead
- [ ] curl examples

## AI prompt template

> I'm on task S3-BE-B-04. Read the Task model in schema, `backend/src/modules/lead/`, and the activity helper from S3-BE-A-01. Build the task module. Show me the validation rules and the AGENT scoping logic first.
