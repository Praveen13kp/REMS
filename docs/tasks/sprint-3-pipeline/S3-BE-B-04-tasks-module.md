# S3-BE-B-04 — Tasks module (CRUD + assigned-to-me)

> **Updated 2026-05-12:** UI consumer is `leadpro-realty/src/pages/FollowUps.jsx` (renamed from "My Tasks" → "Follow-Ups", see S3-FE-A-01). The page groups by **Today / Missed / Upcoming** (3 buckets, not 4) and **derives them from `lead.nextFollowUp`**, NOT from a separate Task table. Each row needs:
>
> - customer name + phone + avatar (lead)
> - projectName
> - nextFollowUp date (used as "due")
> - lastContactedAt / updatedAt (used as "Last Contact")
> - status + priority badges
> - quick-action buttons (call, whatsapp)
>
> **Schema gap flagged:**
> - `Lead.nextFollowUp` / equivalent field — confirm this exists on `Lead`. If not, either add it or back the Follow-Ups page with the `Task` table (filter `dueAt` into today/missed/upcoming).
> - leadpro has no "Completed" bucket — but our Task model has `COMPLETED` status. Keep `POST /:id/complete` and surface in our UI as an additional bucket beyond leadpro scope, OR back FollowUps with a `Task.completedAt` filter.
>
> TL to decide: **Tasks-as-backing-table for follow-ups** vs **lead.nextFollowUp field**. Current task spec assumes a Task table; FE FollowUps page in leadpro reads from leads. Reconcile before implementation.

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
