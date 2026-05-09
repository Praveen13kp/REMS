# S4-FE-B-01 — Notes UI on lead detail

**Owner:** FE-B
**Branch:** `fe/note/S4-FE-B-01-ui`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** S3-FE-B-01, S4-BE-B-02

## Goal

Replace the "Notes" tab placeholder on the lead detail page with a real notes feature.

## Steps

1. In the lead detail page's Notes tab, render a list of notes (newest first) and a textarea + "Add note" button.
2. Notes show: author, time, content, edit/delete buttons (visible only to author or OWNER/ADMIN).
3. Edit is inline (replace card with textarea).
4. Delete confirms via shadcn AlertDialog.

## Acceptance criteria

- [ ] Notes CRUD works
- [ ] Author-only edit/delete enforced (UI gating + server enforces too)
- [ ] New note refreshes activity tab too

## AI prompt template

> I'm on task S4-FE-B-01. Read `frontend/src/pages/admin/LeadDetail.jsx` (from S3-FE-B-01) and the backend `S4-BE-B-02-notes-module.md`. Wire up the notes tab. Should be a small change.
