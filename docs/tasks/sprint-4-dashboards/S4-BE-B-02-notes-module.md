# S4-BE-B-02 — Notes module

**Owner:** BE-B
**Branch:** `be/note/S4-BE-B-02-crud`
**Estimated:** 0.25 day
**Blocks:** S4-FE-B-01
**Blocked by:** S0-BE-A-04

## Goal

Notes are richer free-text remarks attached to a lead, distinct from the immutable activity log.

## Steps

### Endpoints under `/api/notes`

- `GET /?leadId=...` — list notes for a lead, newest first
- `POST /` — body: `{leadId, content}`. Auth: anyone with access to the lead.
- `PATCH /:id` — only the original author or OWNER/ADMIN.
- `DELETE /:id` — only the original author or OWNER/ADMIN.

Notes operations also write Activity rows of type `NOTE` so the timeline references them. (Don't duplicate content; reference noteId in activity metadata.)

## Acceptance criteria

- [ ] CRUD works
- [ ] Activity row written on create with `metadata: { noteId }`
- [ ] Author-only edit/delete enforced
- [ ] curl examples

## AI prompt template

> I'm on task S4-BE-B-02. Read `backend/prisma/schema.prisma` (Note model) and the activity helper from S3-BE-A-01. Build CRUD with author-or-admin gating and activity logging. Short PR.
