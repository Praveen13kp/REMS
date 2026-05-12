# S4-FE-B-01 — Notes UI on lead detail

> **Updated 2026-05-12:** Heads-up — `leadpro-realty/src/pages/LeadDetail.jsx` does **not** have a dedicated Notes tab. It renders a single notes string inside an inline `<div className="card" style={{ background: 'var(--surface-2)' }}>` block within "Lead Information" (line ~82), plus a "Add Note" `nav-item` button in Quick Actions (line ~120) that only toasts. Since BE S4-BE-B-02 ships full CRUD, **add a Notes section** below "Lead Information" using the same `.card` + `.field` + `.textarea` + `.card` (per-note) pattern leadpro uses elsewhere. Modal confirms use `.modal-backdrop` + `.modal`. NO shadcn `AlertDialog`/`Textarea`/`Card`.

**Owner:** FE-B
**Branch:** `fe/note/S4-FE-B-01-ui`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** S3-FE-B-01, S4-BE-B-02

## Goal

Replace the "Notes" tab placeholder on the lead detail page with a real notes feature.

## Steps

1. Add a "Notes" `.card` to `frontend/src/pages/LeadDetail.jsx` below "Lead Information". Inside: `.card-title` "Notes", then a `.field` with `<textarea className="textarea">` + "Add note" `btn btn-primary`. Below: list of notes (newest first), each as a nested `.card` with `background: var(--surface-2)` containing avatar `.avatar.sm`, author name, `fmt.ago(createdAt)`, body text, and `.row-actions` (Pencil + Trash2 from lucide).
2. Edit: clicking Pencil swaps content for a `<textarea className="textarea">` + Save/Cancel inline.
3. Delete: opens `.modal-backdrop` + `.modal` confirm with Cancel + Delete (`btn-danger`).
4. Author/OWNER/ADMIN gate on edit/delete actions (both UI and server-enforced).

## Acceptance criteria

- [ ] Notes CRUD works
- [ ] Author-only edit/delete enforced (UI gating + server enforces too)
- [ ] New note refreshes activity tab too

## AI prompt template

> I'm on task S4-FE-B-01. Read `frontend/src/pages/admin/LeadDetail.jsx` (from S3-FE-B-01) and the backend `S4-BE-B-02-notes-module.md`. Wire up the notes tab. Should be a small change.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/LeadDetail.jsx` (no Notes tab in leadpro — extend pattern with a new `.card`).
- **Classes:** leadpro CSS (`.card`, `.field`, `.textarea`, `.row`, `.row-actions`, `.btn`, `.avatar`, `.modal-backdrop`, `.modal`). No shadcn.
- **State:** `useNotesStore` + `noteService` (create/update/delete). Author/role gating via `useAuthStore`.
