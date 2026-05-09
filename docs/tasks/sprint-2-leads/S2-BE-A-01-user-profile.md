# S2-BE-A-01 — User profile endpoint + onboarding completion

**Owner:** BE-A
**Branch:** `be/user/S2-BE-A-01-profile`
**Estimated:** 0.5 day
**Blocks:** S2-FE-A-01 (onboarding step 3-4 needs `markComplete`)
**Blocked by:** S1-BE-A-02

## Goal

Small but necessary endpoints that the FE needs in S2: update own profile, change password, mark onboarding complete.

## Steps

### 1. Endpoints

- `PATCH /api/users/me` — update own profile (`name`, `phone`). Cannot update `email` or `role` here.
- `POST /api/users/me/change-password` — body: `{currentPassword, newPassword}`. Use better-auth's password change API. On success, invalidate other sessions (better-auth has a helper).
- `POST /api/company/me/complete-onboarding` — OWNER/ADMIN only. Sets `onboardingCompleted = true`.

### 2. Wire & validate

zod schemas. Standard route conventions.

## Acceptance criteria

- [ ] All three endpoints work
- [ ] Wrong current password on change-password returns 400
- [ ] Non-OWNER/ADMIN trying to complete onboarding returns 403
- [ ] curl examples

## AI prompt template

> I'm on task S2-BE-A-01. Read `backend/src/lib/auth.js` and the better-auth password-change docs. Add the three endpoints under the existing user and company modules. Show me the change-password flow first (which better-auth function to call).

## Notes for reviewer

- Don't roll your own password verification — better-auth provides this
