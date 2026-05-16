# S5-FE-B-03 — Separate `/superadmin/login` page

**Owner:** FE dev
**Branch:** `fe/auth/S5-FE-B-03-superadmin-login`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S5-BE-A-02

## Goal

Distinct login page for platform admins, separate URL, no company field, minimal branding.

## Steps

1. New route `/superadmin/login` → new component `pages/superadmin/SuperAdminLogin.jsx`.
2. UI: just email + password + sign-in. No "forgot password" link, no social buttons, no signup link. Different background (e.g. dark) so it's visually unambiguous.
3. On submit POST `/api/auth/superadmin/login`. On success store session and redirect to `/superadmin`.
4. Remove SUPER_ADMIN handling from the normal `Login.jsx` (it should never end up there now).
5. Do NOT link to this page from any public nav. It's only memorized / bookmarked.

## Acceptance criteria

- [ ] `/superadmin/login` renders, works
- [ ] Wrong credentials → field-level error, no console 500
- [ ] No link to the page from `/`, `/login`, `/signup`, or footer
- [ ] Regular `/login` no longer accepts SUPER_ADMIN emails
