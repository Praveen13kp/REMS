# S4-FE-B-03 — Files page

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

1. **Page header** — title + "Upload" `Button` (opens dialog) + search `Input` + view toggle (grid/list).

2. **Folder strip** — horizontal scroll of folder `Card`s with name + count. Click → filter list. "All Files" is the default.

3. **File grid/list**:
   - Grid: icon-by-mime `Card`s (PDF, image, doc, sheet) with name, size, uploader, time.
   - List: `Table` with the same columns + actions (`Download`, `Delete`, `Copy link`).
   - Click a row/card opens a preview `Sheet` (images inline, PDFs in iframe, others "Download to view").

4. **Upload dialog** — drag-drop zone + file picker, multi-file allowed, progress per file. POST `multipart/form-data` to `/api/files`. Refetch on success.

5. **Delete** — `AlertDialog` confirm. Author or OWNER/ADMIN only (UI gate + server enforces).

6. **Empty state** — friendly card with "Upload your first file" CTA.

## Acceptance criteria

- [ ] Upload, list, preview, download, delete all work end-to-end (or stubbed with clear TODOs if BE absent)
- [ ] Search filters by name in current folder
- [ ] Grid/list toggle persists in URL (`?view=grid|list`)
- [ ] Non-image preview falls back to download
- [ ] No console errors

## AI prompt template

> I'm on task S4-FE-B-03. Read the manager's `Files.jsx` and the BE files endpoint contracts (or stub if missing). Build the files page with shadcn primitives. Walk me through the preview Sheet's mime-type branching and the upload progress UX before writing.

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/Files.jsx`.
- **Restyle:** shadcn `Card`, `Table`, `Dialog` (upload), `Sheet` (preview), `AlertDialog` (delete), `Input` (search), `Tabs` / `ToggleGroup` (grid vs list), `Progress` (upload), `Badge` (file type). Icons via `lucide-react` (`FileText`, `FileImage`, `FileSpreadsheet`, `File`).
- **State:** new `useFileStore` + `fileService`. Toasts via `sonner`.

## Notes for reviewer

- If BE isn't ready, store uploads in `useFileStore` in-memory and mark the TODO clearly — do NOT persist to localStorage (would mislead the next dev).
- Be careful with `<iframe>` PDF preview — sandbox attributes + same-origin check.
