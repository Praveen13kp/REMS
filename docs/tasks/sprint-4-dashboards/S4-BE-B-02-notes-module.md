# S4-BE-B-02 — Notes module

> **Updated 2026-05-12:** Verified against `leadpro-realty/src/pages/LeadDetail.jsx`. Leadpro has **no Notes tab** — only a single inline notes string on the lead (`l.notes`) and an "Add Note" quick-action button that toasts. FE (S4-FE-B-01) is extending leadpro with a real Notes section, so the BE module ships **as specified** — no UI-driven changes needed. One note: include `author: { id, name, avatar? }` in `GET /?leadId=...` response so FE can render the avatar + name strip without a separate user lookup.

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

## Notification side-effect (added 2026-05-11)

On `POST /` (new note), fire-and-forget `notify()` (helper from S4-BE-A-02) to the lead's `assignedToId` (skip if note author IS the assignee) with type `NOTE_ADDED`, link `/leads/<leadId>?tab=notes`, body `"<author.name> added a note on <lead.name>"`. Wrap in try/catch. If S4-BE-A-02 hasn't landed, leave a `// TODO(S4-BE-A-02): notify()` comment.

## Acceptance criteria

- [ ] CRUD works
- [ ] Activity row written on create with `metadata: { noteId }`
- [ ] Author-only edit/delete enforced
- [ ] Notification emitted to lead's assignedTo on note create (or TODO marker)
- [ ] curl examples

## AI prompt template

> I'm on task S4-BE-B-02. Read `backend/prisma/schema.prisma` (Note model) and the activity helper from S3-BE-A-01. Build CRUD with author-or-admin gating and activity logging. Short PR.
