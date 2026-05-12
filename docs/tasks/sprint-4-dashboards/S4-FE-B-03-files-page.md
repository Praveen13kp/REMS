# S4-FE-B-03 — Files page

> **Updated 2026-05-12:** Port `leadpro-realty/src/pages/Files.jsx` directly. Use leadpro classes (`.dropzone`, `.data`, `.table-wrap`, `.table-toolbar`, `.topbar-search`, `.row-actions`, `.kpi-icon`, `.modal-backdrop`, `.modal`). NO shadcn `Dialog`/`Sheet`/`AlertDialog`/`ToggleGroup`/`Progress`. Leadpro's Files page has **table view only** (no grid/list toggle, no preview sheet) — keep it simple to match.

**Owner:** FE-B
**Branch:** `fe/files/S4-FE-B-03-page`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S0-FE-A-02 (app shell). BE upload endpoint optional (stub if missing).

## Goal

Build the Files page from the manager's static UI — a tenant-scoped document library (brochures, agreements, marketing collateral) with upload + folder grouping + search.

## Files to read first

- `_tmp_leadpro/leadpro-realty/src/pages/Files.jsx`
- Backend: `GET/POST /api/files`, `DELETE /api/files/:id` (if not implemented, stub via in-memory store + TODO comment linking the BE follow-up)
- `docs/STATIC-UI-MAP.md`

## Steps

1. **Page header** — `.content-head` with "Files" H1 + subtext "{count} files · {used}GB used of {limit}GB." + "Upload Files" `btn btn-primary` (lucide `Upload`).

2. **Inline dropzone card** — top `.card.mb-4` with `.dropzone` (`UploadCloud` icon, "Drop files to upload", "max 100MB per file · PDF, DOC, XLS, PNG, JPG, MP4"). Click → opens upload modal.

3. **Storage usage card** — `.card.mb-4` with `.card-title` "Storage Usage" + progress bar `<div>` (gradient fill from `--accent-strong` to `--accent`) + `{used}GB used of {limit}GB · {remaining}GB remaining` line.

4. **Files table** — `.table-wrap` with `.table-toolbar` containing `.topbar-search`, then `.data` table: Name (mime-icon `kpi-icon-amber` + filename) / Size (KB) / Uploaded By (avatar + name) / Date / `.row-actions` (Eye preview / Download / Trash2 delete).

5. **Upload modal** — `.modal-backdrop` + `.modal` with `.dropzone` body + Cancel + Upload buttons. Multi-file supported, POST `multipart/form-data` to `/api/files`.

6. **Delete** — `.modal-backdrop` + `.modal` "Delete file?" confirm with `btn-danger`. Author or OWNER/ADMIN only (UI gate + server enforces).

7. **Empty state** — leadpro `.empty-state` (icon + h3 + p + CTA) when no files.

8. **Folder filtering** (extension over leadpro static) — if BE returns folder counts, render a horizontal `.row` of folder pill buttons above the table. Default "All Files".

## Acceptance criteria

- [ ] Upload, list, preview, download, delete all work end-to-end (or stubbed with clear TODOs if BE absent)
- [ ] Search filters by name in current folder
- [ ] Grid/list toggle persists in URL (`?view=grid|list`)
- [ ] Non-image preview falls back to download
- [ ] No console errors

## AI prompt template

> I'm on task S4-FE-B-03. Read the manager's `Files.jsx` and the BE files endpoint contracts (or stub if missing). Build the files page with shadcn primitives. Walk me through the preview Sheet's mime-type branching and the upload progress UX before writing.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/Files.jsx` — port directly. Table view only (no grid toggle, no preview Sheet).
- **Classes:** leadpro CSS only. Modals via `.modal-backdrop` + `.modal`. Icons via `lucide-react` (`FileText`, `Image`, `Sheet`, `File`, `Upload`, `UploadCloud`).
- **State:** `useFileStore` + `fileService` (list/upload/delete/download).

## Notes for reviewer

- If BE isn't ready, store uploads in `useFileStore` in-memory and mark the TODO clearly — do NOT persist to localStorage (would mislead the next dev).
- Be careful with `<iframe>` PDF preview — sandbox attributes + same-origin check.
