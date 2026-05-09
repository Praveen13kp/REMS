# S4-FE-B-02 — CSV import UI

**Owner:** FE-B
**Branch:** `fe/lead/S4-FE-B-02-import-ui`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S4-BE-B-01

## Goal

A button on the leads page → "Import CSV" → opens a dialog where the user uploads a file, sees a preview, clicks Import, then sees a result report.

## Steps

1. Add "Import" button in the leads page header next to "New Lead".
2. `components/leads/ImportDialog.jsx`:
   - Step 1: file picker + "Download sample CSV" link (`/api/leads/import/sample` if BE provides; else a static file shipped in `frontend/public/sample-leads.csv`).
   - Step 2: confirm screen showing file name, row count (parse client-side with `papaparse` for preview).
   - Step 3: result screen — summary cards (Created/Skipped/Errors) + collapsible details table.
3. Submit uploads file via `multipart/form-data` POST.
4. After import, refetch leads list.

## Acceptance criteria

- [ ] User can download sample, upload, see preview, import, see report
- [ ] Errors don't block reading the result screen
- [ ] Big files (5000+) get blocked with backend's 413 surfaced clearly

## AI prompt template

> I'm on task S4-FE-B-02. Read `S4-BE-B-01-csv-import.md` for the response shape. Build the import dialog with three steps. Use papaparse for preview only. Show me the dialog state machine first.
