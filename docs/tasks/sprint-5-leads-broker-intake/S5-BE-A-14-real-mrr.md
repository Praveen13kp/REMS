# S5-BE-A-14 — Real MRR calculation

**Owner:** BE dev
**Branch:** `be/admin/S5-BE-A-14-mrr`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** S5-BE-A-06 (Plan model)

## Goal

`admin.service.js:31` has `const mrr = activeCompanies * 0;` — fake. Compute real MRR from the Plan model.

## Steps

1. For each active company, look up its plan's monthly price (`plan.monthlyCents`).
2. Sum across companies → MRR in cents.
3. Annualize for ARR if desired.
4. Cache for 5 minutes.

## Acceptance criteria

- [ ] MRR returned by `/api/admin/stats` is non-zero in a seeded environment with paying tenants
- [ ] Free-tier companies contribute 0
- [ ] Unit test covering a 3-company mix
