# S1-FE-A-01 — Company signup page + post-signup redirect to onboarding

**Owner:** FE-A
**Branch:** `fe/auth/S1-FE-A-01-company-signup`
**Estimated:** 1 day
**Blocks:** S1-FE-A-02 (onboarding wizard)
**Blocked by:** S0-FE-A-01, S1-BE-A-01

## Goal

The current Signup page only collects user fields. Replace it with a two-step (or one-page, your call) form that collects company + owner details and calls `POST /api/company/register`.

## Files to read first

- `frontend/src/pages/auth/Signup.jsx`
- `frontend/src/stores/authStore.js`
- `frontend/src/lib/api.js`
- `frontend/src/components/ui/{form,input,select,button,card}.jsx`

## Steps

1. **Replace** the existing `Signup.jsx` with a `react-hook-form` + `zod` form covering:
   - Company section: `companyName`, `companyType` (select with the 4 options), `city`
   - Owner section: `ownerName`, `ownerEmail`, `ownerPhone`, `password`, `confirmPassword`
   - Terms checkbox
2. **Validation** — zod schema, password strength (>=8, has letter+number), confirmPassword match.
3. **Submit** — `await api.post("/company/register", payload)`. On success, set the user in `authStore` from the response, navigate to `/onboarding/welcome` (FE-A will build this in S1-FE-A-02).
4. **Errors** — show field-level errors from server (409 duplicate email maps to the email field), generic via `sonner` toast.
5. **UI**:
   - Use shadcn `Card` for the form container
   - Two-column layout on desktop, single-column mobile
   - Submit button shows spinner while loading
   - Link "Already have an account? Sign in" → `/login`
6. **Add `companyType` enum to a shared FE constants file** — `frontend/src/lib/constants.js` exports `COMPANY_TYPES`, mirrored from backend.

## Acceptance criteria

- [ ] Form validates client-side and server-side
- [ ] Successful signup logs the user in (cookie set, store populated) and redirects to `/onboarding/welcome`
- [ ] Server errors render in the UI without crashes
- [ ] Mobile-responsive
- [ ] Manual test: register a new company, refresh, still authenticated, lands on onboarding

## AI prompt template

> I'm on task S1-FE-A-01. Read `frontend/src/pages/auth/Signup.jsx` (current state), `frontend/src/stores/authStore.js`, `frontend/src/lib/api.js`, and the backend's `POST /api/company/register` endpoint contract from `docs/tasks/sprint-1-onboarding/S1-BE-A-01-company-registration.md`. Build the new Signup page using react-hook-form + zod and shadcn Form components. Show me the zod schema and form layout before writing the JSX.

## Notes for reviewer

- The route `/onboarding/welcome` won't exist until S1-FE-A-02 — that's fine, the redirect will land on the protected layout's not-found which 404s back to dashboard. S1-FE-A-02 makes it real.
- Don't store the password anywhere — pass straight to API, never to the store
