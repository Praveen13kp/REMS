# S5-BE-A-01 — Multi-tenant email (same email allowed across companies)

**Owner:** BE dev
**Branch:** `be/auth/S5-BE-A-01-multitenant-email`
**Estimated:** 1.5 days
**Blocks:** S5-FE-A-01
**Blocked by:** S5-BE-A-15 (recommended — finish tenant audit first)

## Goal

Today `User.email` is globally unique, which means `agent@gmail.com` can only exist in one company. Real users work for multiple brokerages and need the same email in each tenant. Allow `(companyId, email)` to be unique instead.

## Steps

1. **Schema** (`backend/prisma/schema.prisma`):
   - Remove `@unique` from `User.email`
   - Add `@@unique([companyId, email])` at the model level
   - `SUPER_ADMIN` rows have `companyId = null` — keep them globally unique via a partial index (Postgres: `CREATE UNIQUE INDEX user_superadmin_email_uq ON "User"(email) WHERE "companyId" IS NULL;`)
2. **Migration** — write the migration manually since Prisma won't generate partial indexes. Run on a copy of prod data and verify no duplicate-by-(companyId,email) rows exist.
3. **Auth resolution** — login must now know which tenant to authenticate against:
   - Preferred: subdomain (`acme.app.com` → companyId from `Company.slug`)
   - Fallback: explicit `companySlug` field in the login payload
   - Update `auth.service.js`, `auth.validation.js`, better-auth adapter
4. **Invite + password reset** — both tokens carry `companyId`; lookup is `(companyId, email)`.
5. **Signup** — company-owner signup keeps creating the company first, then the user, no change.
6. **Error mapping** — duplicate `(companyId, email)` → 409 with a clear message.

## Acceptance criteria

- [ ] Migration runs clean on a seeded DB
- [ ] Same email can register in two different companies
- [ ] Login at `/api/auth/login` requires `companySlug` (or subdomain) and rejects ambiguous lookups
- [ ] SUPER_ADMIN email still globally unique
- [ ] Invite + reset flows are tenant-scoped — token from Company A cannot reset a Company B account with the same email
- [ ] curl examples in PR description
