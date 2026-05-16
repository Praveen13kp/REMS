# S5-shared-02 — CSV import polish (BE + FE)

**Owner:** BE dev + FE dev (pair)
**Branch:** `feat/csv-import-polish-S5-shared-02`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** —

## Goal

CSV import shipped in Sprint 4 but is rough. Make it production-quality.

## Steps

### BE (`lead.import.service.js`)
1. Return per-row results: `[{ row: N, status: "created"|"updated"|"skipped"|"error", message? }]`
2. Add dry-run mode: `?dryRun=true` returns the result map without writing
3. Summary in response: `{ created, updated, skipped, errors }`

### FE (csv-import UI)
1. Before commit, show the dry-run summary + per-row preview (first 20 errors visible, full list downloadable as CSV)
2. After commit, show the same summary + offer "download error report"

## Acceptance criteria

- [ ] Dry-run never writes
- [ ] Error CSV downloadable
- [ ] Bad row doesn't abort the whole import (row-level errors, not request-level)
