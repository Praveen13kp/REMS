# S4-BE-A-03 — Platform-admin endpoints (SuperAdmin & Orgs)

**Owner:** BE-A
**Branch:** `be/admin/S4-BE-A-03-platform-endpoints`
**Estimated:** 0.5 day
**Blocks:** S4-FE-A-06
**Blocked by:** S0-BE-A-02 (better-auth), S0-BE-A-04 (schema), S1-BE-A-01 (company model)

## Goal

Cross-tenant endpoints used by `PLATFORM_ADMIN` to monitor and manage all companies on the system. Skips the tenant Prisma helper — these routes intentionally read across tenants.

## Role

Add `PLATFORM_ADMIN` to the Role enum if not already present. Seed one platform-admin user in `S0-BE-A-04` seed script (mark with a TODO if seed already merged — add via a new mini-seed).

## Middleware

`backend/src/middleware/requirePlatformAdmin.js` — rejects with `403` unless `req.user.role === "PLATFORM_ADMIN"`. Mount before `/api/admin/*`.

## Endpoints under `/api/admin`

- `GET /stats` — `{ totalCompanies, activeCompanies, totalUsers, newSignups7d, newSignups30d }`
- `GET /companies?status=&plan=&search=&page=&pageSize=` — list of companies with `{ id, name, plan, status, userCount, leadCount, createdAt }`
- `GET /companies/:id` — full detail incl. owner contact
- `PATCH /companies/:id` — `{ status?, plan?, notes? }` (status ∈ `ACTIVE | SUSPENDED`)
- `GET /signups/recent?limit=20` — recent company signups for the overview dashboard
- `GET /signups/weekly?weeks=12` — `[{ week, count }]` for the chart

All queries use the **raw** `prisma` client (no `tenantPrisma`) since this is intentionally cross-tenant. Be careful — never expose tenant data to the wrong tenant elsewhere.

## Audit

Every `PATCH /companies/:id` writes a `PlatformAudit` row (or reuses the Activity table with a `PLATFORM` scope flag — your call, document choice in the PR):

```prisma
model PlatformAudit {
  id          String   @id @default(cuid())
  actorId     String
  action      String   // e.g. COMPANY_SUSPENDED
  targetId    String
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

## Acceptance criteria

- [ ] `PLATFORM_ADMIN` role exists; seed creates one user
- [ ] `requirePlatformAdmin` middleware blocks non-platform-admins with 403
- [ ] All 6 endpoints work; PATCH writes an audit row
- [ ] No tenant Prisma helper used here (and unit/manual test confirms a regular OWNER cannot reach `/api/admin/*`)
- [ ] curl examples in the PR

## AI prompt template

> I'm on task S4-BE-A-03. Read `backend/prisma/schema.prisma`, the better-auth setup from S0-BE-A-02, and the tenantPrisma helper from S0-BE-A-03 (so you know what NOT to use here). Add the PLATFORM_ADMIN role, the middleware, the 6 endpoints, and the audit model. Keep it short — most endpoints are simple aggregates.

## Notes for reviewer

- The whole point of this module is cross-tenant access — that's why it skips tenantPrisma. Triple-check the middleware is mounted before all routes, and that no other route file accidentally imports from here.
- Don't ship impersonation ("log in as") — defer.
- Suspending a company should NOT cascade-delete; setting `status=SUSPENDED` is enough. FE can show a banner.
