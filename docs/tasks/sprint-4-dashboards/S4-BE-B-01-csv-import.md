# S4-BE-B-01 — Lead CSV import endpoint

**Owner:** BE-B
**Branch:** `be/lead/S4-BE-B-01-csv`
**Estimated:** 0.5 day
**Blocks:** S4-FE-B-02
**Blocked by:** S2-BE-B-02 (dedup)

## Goal

Bulk import leads from a CSV. Returns a per-row report (created / skipped-duplicate / error).

## Steps

### 1. Endpoint — `POST /api/leads/import`

Accepts `multipart/form-data` with `file` field (use `multer` already in deps). Auth: OWNER/ADMIN/MANAGER.

### 2. Parser

Use `csv-parse` (add as dep). Required columns: `name`, `phone`. Optional: `email`, `source`, `requirementType`, `budget`, `city`, `interestedProjectName` (resolved to id by name lookup), `assignedToEmail` (resolved to id by email lookup), `notes`, `tags` (semicolon-separated).

### 3. Behavior

For each row:
- Validate required + format (zod per row)
- Run dedup; if hard match → skip with reason
- Else create lead
- Collect result `{row: 5, status: "CREATED"|"SKIPPED"|"ERROR", message?, leadId?}`

Return `{summary: {total, created, skipped, errors}, details: [...]}`.

Cap at 5000 rows per upload (return 413 if more).

### 4. Sample CSV

Add `backend/docs/sample-leads.csv` so the FE can offer a download.

## Acceptance criteria

- [ ] Endpoint accepts CSV upload
- [ ] Returns per-row report
- [ ] Dedup applied
- [ ] >5000 rows rejected
- [ ] Sample file exists

## AI prompt template

> I'm on task S4-BE-B-01. Read `backend/src/modules/lead/lead.service.js` (esp. dedup) and check `multer` config. Build the import endpoint with `csv-parse`. Show me the row-validation schema and the per-row processing loop first.

## Notes for reviewer

- Stream the CSV — don't load 5000 rows into memory at once if possible
- If a row references an unknown projectName, set `interestedProjectId = null` (don't fail the row)
