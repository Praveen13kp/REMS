# S5-BE-A-15 — Tenant isolation audit

**Owner:** BE dev
**Branch:** `be/security/S5-BE-A-15-tenant-audit`
**Estimated:** 1 day
**Blocks:** S5-BE-A-01 (recommended)
**Blocked by:** —

## Goal

Before we let the same email live in multiple companies, prove that every API route enforces companyId properly. A bug here becomes a cross-tenant data leak.

## Steps

1. List every route under `/api/*` (use `grep '\.routes\.js'` and read each).
2. For each, verify:
   - Uses `tenantPrisma(req)` (or equivalent helper), not raw `prisma`
   - Any `where: { id }` lookup is wrapped with `companyId: req.companyId`
   - Public endpoints (intake, contact, signup) explicitly don't claim a session companyId
3. Add an integration test: log in as Company A, attempt to GET / PATCH / DELETE a Company B resource by ID → must 404 (NOT 403, to avoid id-enumeration).
4. Add a route-level lint rule or unit test that fails if a controller imports `prisma` directly instead of `tenantPrisma`.

## Acceptance criteria

- [x] Audit report committed as `docs/security/tenant-isolation-2026-05.md` listing every route + verdict
- [x] All routes pass the cross-tenant probe
- [x] CI test in place to catch future raw `prisma` imports in controllers
- [ ] Audit report committed as `docs/security/tenant-isolation-2026-05.md` listing every route + verdict
- [ ] All routes pass the cross-tenant probe
- [ ] CI test in place to catch future raw `prisma` imports in controllers
