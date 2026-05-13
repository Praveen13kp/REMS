# S4-FE-B-02 — CSV import UI

> **Updated 2026-05-12:** Confirmed leadpro-realty has NO CSV import flow (`AddLead.jsx` is form-only; no flow in Leads.jsx or Settings either). Build fresh using leadpro modal pattern: `.modal-backdrop` + `.modal` with multi-step content (`idle → preview → uploading → result`). Use leadpro `.dropzone`, `.btn`, `.input`, `.data` table, `.kpi-grid` for the result summary tiles. NO shadcn `Dialog`/`Progress`/`Alert`.

**Owner:** FE-B
**Branch:** `fe/lead/S4-FE-B-02-import-ui`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-BE-B-01

## Goal

A button on the leads page → "Import CSV" → opens a dialog where the user uploads a file, sees a preview, clicks Import, then sees a result report.

## Steps

1. Add "Import" `btn btn-secondary` in the Leads page `.content-head` next to "Add Lead".
2. `components/leads/ImportModal.jsx` — renders inside the global `.modal-backdrop` / `.modal` host:
   - Step 1 (`idle`): `.dropzone` (lucide `UploadCloud` icon) + file `<input type="file" className="input">` + "Download sample CSV" link to `/sample-leads.csv` (static in `frontend/public/`).
   - Step 2 (`preview`): file name, row count (parse client-side with `papaparse` for preview), first 5 rows in `.data` table.
   - Step 3 (`uploading`): progress bar (manual `<div>` with width % — leadpro storage-usage bar pattern from Files.jsx is the model).
   - Step 4 (`result`): `.kpi-grid` of 3 KpiCards (Created green, Skipped amber, Errors red) + collapsible `.data` details table.
3. Submit via `multipart/form-data` POST to `/api/leads/import`.
4. After import, `useLeadStore.refetch()` and toast.

## Acceptance criteria

- [ ] User can download sample, upload, see preview, import, see report
- [ ] Errors don't block reading the result screen
- [ ] Big files (5000+) get blocked with backend's 413 surfaced clearly

## AI prompt template

> I'm on task S4-FE-B-02. Read `S4-BE-B-01-csv-import.md` for the response shape. Build the import dialog with three steps. Use papaparse for preview only. Show me the dialog state machine first.

## Static UI reference (updated 2026-05-12)

- **Layout reference:** No CSV import in leadpro-realty — design fresh with leadpro classes only. Button placement: next to "Add Lead" in Leads page `.content-head`.
- **Classes:** leadpro `.modal-backdrop`, `.modal`, `.dropzone`, `.btn`, `.input`, `.data`, `.kpi-grid`, `.card`. No shadcn.
- **State:** local `useState` state machine inside the modal (`idle → preview → uploading → result`). Final step calls `useLeadStore.refetch()`.
