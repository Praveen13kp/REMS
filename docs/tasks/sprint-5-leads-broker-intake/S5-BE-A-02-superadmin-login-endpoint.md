# S5-BE-A-02 — Separate SUPER_ADMIN login endpoint

**Owner:** BE dev
**Branch:** `be/auth/S5-BE-A-02-superadmin-login`
**Estimated:** 0.25 day
**Blocks:** S5-FE-B-03
**Blocked by:** —

## Goal

Right now SUPER_ADMIN logs in via the same `/api/auth/login` as tenant users. We want a distinct entry point so the marketing login form never accidentally authenticates a platform admin.

## Steps

1. Add `POST /api/auth/superadmin/login` in `auth.routes.js`.
2. Controller calls a new `auth.service.superadminLogin({ email, password })`:
   - looks up only rows where `role = SUPER_ADMIN` and `companyId IS NULL`
   - rejects everything else with 401
3. Update existing `POST /api/auth/login` to reject SUPER_ADMIN rows (return 401 — "use the admin portal").
4. Stricter rate limit on the superadmin route (e.g. 5/min/IP).
5. Audit-log every successful + failed attempt with IP + UA.

## Acceptance criteria

- [x] Hitting `/api/auth/superadmin/login` with a regular user → 401
- [x] Hitting `/api/auth/login` with a SUPER_ADMIN → 401 (middleware on `POST /api/auth/sign-in/email` rejects SUPER_ADMIN & PLATFORM_ADMIN)
- [x] Audit log row for each attempt — `PlatformAudit` entries for `SUPER_ADMIN_LOGIN` / `SUPER_ADMIN_LOGIN_FAILED`
- [x] curl examples in PR
