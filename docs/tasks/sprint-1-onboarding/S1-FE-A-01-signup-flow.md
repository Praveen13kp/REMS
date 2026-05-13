# S1-FE-A-01 — Company signup page + post-signup redirect to onboarding

> **Updated 2026-05-12:** Direction changed. The manager-provided static UI at `leadpro-realty/` is now the source of truth. The signup form logic (POST `/api/company/register`, authStore wiring, onboarding redirect) is already merged and working — this task is now a **restyle-only** pass: port `leadpro-realty/src/pages/Signup.jsx` 1:1 using leadpro CSS classes (`.auth-wrap`, `.auth-side`, `.auth-form`, `.input`, `.btn`, `.field`, `.input-group`) from `frontend/src/styles/leadpro.css`. Do NOT use shadcn `Card` / `Input` / `Button` / `Checkbox`. Keep react-hook-form + zod for validation; render plain `<input className="input" />` etc. Note: leadpro Signup does NOT collect `companyType` or `city` — keep our extra fields (they're required by BE-A-01) but match leadpro's two-column `.grid .grid-2` field layout.

**Owner:** FE-A
**Branch:** `fe/auth/S1-FE-A-01-company-signup`
**Estimated:** 1 day
**Blocks:** S1-FE-A-02 (onboarding wizard)
**Blocked by:** S0-FE-A-01, S1-BE-A-01

## Goal

The current Signup page only collects user fields. Replace it with a two-step (or one-page, your call) form that collects company + owner details and calls `POST /api/company/register`.

## Files to read first

- `frontend/src/pages/auth/Signup.jsx` (current state — logic stays, restyle only)
- `frontend/src/stores/authStore.js`
- `frontend/src/lib/api.js`
- `frontend/src/styles/leadpro.css` (ported leadpro classes — source of truth)
- `leadpro-realty/src/pages/Signup.jsx` (layout reference — port exactly)
- `leadpro-realty/src/components/AuthSide.jsx` (split-screen pattern)

## Steps

1. **Replace** the existing `Signup.jsx` with a `react-hook-form` + `zod` form covering:
   - Company section: `companyName`, `companyType` (select with the 4 options), `city`
   - Owner section: `ownerName`, `ownerEmail`, `ownerPhone`, `password`, `confirmPassword`
   - Terms checkbox
2. **Validation** — zod schema, password strength (>=8, has letter+number), confirmPassword match.
3. **Submit** — `await api.post("/company/register", payload)`. On success, set the user in `authStore` from the response, navigate to `/onboarding/welcome` (FE-A will build this in S1-FE-A-02).
4. **Errors** — show field-level errors from server (409 duplicate email maps to the email field), generic via `sonner` toast.
5. **UI** — port `leadpro-realty/src/pages/Signup.jsx`:
   - Wrap in `<div className="auth-wrap">` with `<AuthSide />` on one side and `<div className="auth-form-wrap"><div className="auth-form">…</div></div>` on the other.
   - Field markup: `<div className="field"><label>…</label><input className="input" /></div>`.
   - Two-column field rows: `<div className="grid grid-2" style={{ gap: '0 12px' }}>…</div>`.
   - Password show/hide via `<div className="input-group">` + lucide `Eye`/`EyeOff`.
   - Submit: `<button className="btn btn-primary" type="submit">` with spinner state.
   - Link "Already on LeadPro? Sign in" → `/login`.
   - Do NOT use shadcn `Card` / `Input` / `Button` / `Checkbox` / `Dialog`. Raw HTML with leadpro classes only.
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

## Static UI reference (updated 2026-05-12)

- **Layout reference:** `leadpro-realty/src/pages/Signup.jsx` + `leadpro-realty/src/components/AuthSide.jsx`.
- **Restyle:** leadpro CSS classes from `frontend/src/styles/leadpro.css` (`.auth-wrap`, `.auth-side`, `.auth-form`, `.field`, `.input`, `.select`, `.btn`, `.btn-primary`, `.input-group`, `.grid`, `.grid-2`). NO shadcn primitives.
- **State:** keep using `useAuthStore` from S0-FE-A-01. Do not introduce his `useApp()` Context.
- **Theme:** light default; dark via `.dark` class on `<html>`.
- **Icons:** `lucide-react`.
