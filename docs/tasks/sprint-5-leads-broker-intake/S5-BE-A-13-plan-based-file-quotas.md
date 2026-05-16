# S5-BE-A-13 — Plan-based file storage quotas

**Owner:** BE dev
**Branch:** `be/file/S5-BE-A-13-plan-quotas`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S5-BE-A-06 (Plan endpoint must exist first, even with stub data)

## Goal

`file.service.js:108` uses a hardcoded `STORAGE_LIMIT_BYTES`. Make it derive from the company's plan.

## Steps

1. Add `storageLimitBytes` to the Plan record (or a `plan.config.storageBytes` JSON field).
2. In `file.service.js`, fetch the company's plan, use that limit instead of the constant.
3. Cache the limit per-request (avoid a DB hit per upload).
4. On exceeded → 413 with the limit + current usage in the response body.

## Acceptance criteria

- [ ] Different plans → different limits enforced
- [ ] 413 response is clear and machine-readable
- [ ] Existing tests still pass
