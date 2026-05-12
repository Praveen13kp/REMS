# S1-FE-A-03 — Auth pages parity (Login + Forgot + Signup retrofit)

**Owner:** FE-A
**Branch:** `fe/auth/S1-FE-A-03-auth-parity`
**Estimated:** 0.75 day
**Blocks:** —
**Blocked by:** S0-FE-A-01, S1-FE-A-01 (signup), S0-BE-A-02 (better-auth)

## Goal

Bring all three auth pages (Login, Forgot, **Signup**) to parity with the manager's static UI: shared two-column shell (`AuthShell` + `AuthSide`), shadcn primitives throughout. Signup landed in S1-FE-A-01 as a centered single-card layout — retrofit it onto the shared shell in **this** task so the trio is consistent.

## Files to read first

- `frontend/src/pages/auth/Login.jsx`
- `frontend/src/pages/auth/ForgotPassword.jsx`
- `frontend/src/pages/auth/Signup.jsx` (reference for matching styling)
- `frontend/src/stores/authStore.js`
- `_tmp_leadpro/leadpro-realty/src/pages/Login.jsx`
- `_tmp_leadpro/leadpro-realty/src/pages/Forgot.jsx`
- `_tmp_leadpro/leadpro-realty/src/components/AuthSide.jsx`
- `docs/STATIC-UI-MAP.md`

## Steps

1. **`AuthSide` component** — `frontend/src/components/auth/AuthSide.jsx`:
   - Mirrors manager's `AuthSide.jsx`: brand mark, headline, sub-headline, marketing bullets.
   - Pure presentational, no state. Used by Login, Signup, Forgot.
   - Hidden on `<md` (form-only mobile view).

2. **Login page** — `pages/auth/Login.jsx`:
   - Two-column layout: `<AuthSide />` on the right, form card on the left.
   - shadcn `Card` + `Form` (react-hook-form + zod) with fields: email, password (with show/hide toggle via `input-group`), "Remember me" `Checkbox`, "Forgot password?" link.
   - Submit → `authStore.signIn` → redirect to `?from=` or `/dashboard`.
   - Error → `sonner` toast.
   - Link to `/signup` at the bottom.

3. **Forgot password page** — `pages/auth/ForgotPassword.jsx`:
   - Same two-column layout.
   - Single email field + Submit.
   - Calls `authStore.requestPasswordReset({ email })` → success screen ("Check your inbox") with resend timer + back-to-login link.
   - If BE endpoint not ready, stub the store method to log + show success (mark TODO with linked BE task).

4. **Shared shell** — extract `components/auth/AuthShell.jsx` (two-column container with `<AuthSide />` on the right, slot on the left). Login, Forgot, Signup all wrap their form `Card` in `AuthShell`. Below `md`, only the form column renders.

5. **Signup retrofit** — `pages/auth/Signup.jsx` currently uses a centered single-`Card` layout with a raw `<input type="checkbox">`. Update it to:
   - Wrap in `<AuthShell>` so it matches Login/Forgot.
   - Replace the raw checkbox with shadcn `Checkbox` + `Label`.
   - Keep all existing form logic, validation, and submit behavior — this is layout/primitives only, **not** a logic rewrite.

5. **Accessibility** — labels tied to inputs, error messages `aria-live="polite"`, submit button shows loading state via `disabled` + spinner.

## Acceptance criteria

- [ ] Login form submits, redirects to `/dashboard` (or `from`), sets session cookie
- [ ] Wrong credentials show inline error + toast, no console errors
- [ ] Forgot-password form posts and shows success screen
- [ ] Signup still works end-to-end after the retrofit (full regression: company-register call, onboarding redirect, all field validations)
- [ ] All three pages use shadcn `Form`/`Input`/`Button`/`Card`/`Checkbox`/`Label` — zero raw HTML form elements
- [ ] `AuthSide` renders identically on Login, Signup, Forgot
- [ ] Responsive: form-only below `md`, two-column above
- [ ] Keyboard nav works (tab order, enter submits)

## AI prompt template

> I'm on task S1-FE-A-03. Read `frontend/src/pages/auth/{Login,Signup,ForgotPassword}.jsx`, `frontend/src/stores/authStore.js`, the static refs at `_tmp_leadpro/leadpro-realty/src/pages/{Login,Forgot}.jsx` + `_tmp_leadpro/leadpro-realty/src/components/AuthSide.jsx`, and `docs/STATIC-UI-MAP.md`. Restyle Login + Forgot to shadcn and wire them to authStore. Signup is already done — match its shell exactly. Show me the AuthShell extraction decision before writing.

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/Login.jsx`, `Forgot.jsx`, `components/AuthSide.jsx`.
- **Restyle:** shadcn `Card`, `Form`, `Input`, `Button`, `Checkbox`, `Label`, `input-group` (password toggle). No custom CSS classes — Tailwind v4 + shadcn variants only.
- **State:** `useAuthStore`. No `useApp()`.

## Notes for reviewer

- The static UI's "remember me" was cosmetic; better-auth sets a long-lived cookie by default — wire the checkbox to the SDK's `rememberMe` flag if exposed, else mark as cosmetic with a comment.
- Don't roll our own password-reset email — use better-auth's flow if available; if not, leave the BE call stubbed and link the follow-up BE task.
- **Signup retrofit is layout-only.** Do not change validation rules, the `/company/register` payload shape, or the `setUser` + onboarding redirect logic — those are merged and working. Run signup once before opening the PR to confirm zero regression.
