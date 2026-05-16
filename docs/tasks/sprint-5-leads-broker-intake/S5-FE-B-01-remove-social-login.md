# S5-FE-B-01 — Remove GitHub + Microsoft social login

**Owner:** FE dev
**Branch:** `fe/auth/S5-FE-B-01-strip-social`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

Login (and signup if present) currently show Google + GitHub + Microsoft. Product only wants Google. Remove the other two.

## Steps

1. `frontend/src/pages/auth/Login.jsx` — delete GitHub + Microsoft buttons, their click handlers, and unused icon imports (`Github`, `Square`, etc.). Keep Google.
2. Same pass on `frontend/src/pages/auth/Signup.jsx` if those buttons exist there.
3. Re-center the remaining Google button. Make sure dividers ("or continue with") still look right.
4. Manual smoke: `npm run dev`, open `/login`, see only Google button.

## Acceptance criteria

- [ ] No reference to "github" or "microsoft" left in Login.jsx / Signup.jsx
- [ ] Layout doesn't have an empty grid cell / broken flex
- [ ] No unused-import warnings
