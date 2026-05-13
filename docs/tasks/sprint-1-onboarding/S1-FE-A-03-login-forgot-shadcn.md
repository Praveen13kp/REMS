# S1-FE-A-03 — Auth pages parity (Login + Forgot)

> **Updated 2026-05-12:** Direction changed. Drop the "-shadcn" suffix from this task — the new stack is leadpro CSS classes, NOT shadcn. Port `leadpro-realty/src/pages/Login.jsx` and `leadpro-realty/src/pages/Forgot.jsx` 1:1 using the `.auth-wrap` / `.auth-side` / `.auth-form` split-screen pattern. Signup retrofit is removed from scope — S1-FE-A-01 owns Signup styling. Use leadpro classes only; raw HTML inputs/buttons with `.input` / `.btn` classes. NO shadcn `Card`/`Form`/`Input`/`Button`/`Checkbox`/`Label`. Keep react-hook-form + zod for validation, `useAuthStore` for state, `sonner` for toasts, `lucide-react` for icons.

**Owner:** FE-A
**Branch:** `fe/auth/S1-FE-A-03-auth-parity`
**Estimated:** 0.75 day
**Blocks:** —
**Blocked by:** S0-FE-A-01, S1-FE-A-01 (signup), S0-BE-A-02 (better-auth)

## Goal

Bring Login + Forgot to parity with the manager's static UI in `leadpro-realty/src/pages/`: shared two-column shell (`AuthShell` wrapping `AuthSide` + form panel) using leadpro CSS classes. Signup is owned by S1-FE-A-01; this task is Login + Forgot only.

## Files to read first

- `frontend/src/pages/auth/Login.jsx`
- `frontend/src/pages/auth/ForgotPassword.jsx`
- `frontend/src/pages/auth/Signup.jsx` (reference — already styled per S1-FE-A-01)
- `frontend/src/stores/authStore.js`
- `frontend/src/styles/leadpro.css`
- `leadpro-realty/src/pages/Login.jsx`
- `leadpro-realty/src/pages/Forgot.jsx`
- `leadpro-realty/src/components/AuthSide.jsx`

## Steps

1. **`AuthSide` component** — `frontend/src/components/auth/AuthSide.jsx`:
   - Mirrors `leadpro-realty/src/components/AuthSide.jsx`: brand mark, headline, sub-headline, marketing bullets.
   - Pure presentational, no state. Used by Login, Signup, Forgot.
   - Hidden on small screens via leadpro's responsive rules in `.auth-side`.

2. **Login page** — `pages/auth/Login.jsx`:
   - Wrap in `<div className="auth-wrap">` → `<AuthSide />` + `<div className="auth-form-wrap"><div className="auth-form">…</div></div>`.
   - Fields use `<div className="field"><label>…</label><input className="input" /></div>`. Password show/hide via `<div className="input-group">` + lucide `Eye`/`EyeOff`.
   - "Remember me" via raw `<input type="checkbox">` styled by leadpro CSS; "Forgot password?" link.
   - Submit `<button className="btn btn-primary">` → `authStore.signIn` → redirect to `?from=` or `/dashboard`.
   - Error → `sonner` toast.
   - Link to `/signup` at the bottom.

3. **Forgot password page** — `pages/auth/ForgotPassword.jsx`:
   - Same `.auth-wrap` split-screen layout.
   - Single email `.field` + `.btn.btn-primary` submit.
   - Calls `authStore.requestPasswordReset({ email })` → success screen ("Check your inbox") with resend timer + back-to-login link.
   - If BE endpoint not ready, stub the store method to log + show success (mark TODO with linked BE task).

4. **Shared shell** — extract `components/auth/AuthShell.jsx` (`.auth-wrap` container with `<AuthSide />` + slot). Login and Forgot wrap content in `AuthShell`. Signup (S1-FE-A-01) uses the same shell.

5. **Accessibility** — labels tied to inputs, error messages `aria-live="polite"`, submit button shows loading state via `disabled` + spinner.

## Acceptance criteria

- [ ] Login form submits, redirects to `/dashboard` (or `from`), sets session cookie
- [ ] Wrong credentials show inline error + toast, no console errors
- [ ] Forgot-password form posts and shows success screen
- [ ] Both pages use leadpro CSS classes (`.auth-wrap`, `.field`, `.input`, `.btn`) — no shadcn primitives
- [ ] `AuthSide` renders identically on Login, Signup, Forgot
- [ ] Responsive: form-only on mobile, two-column on `md+`
- [ ] Keyboard nav works (tab order, enter submits)

## AI prompt template

> I'm on task S1-FE-A-03. Read `frontend/src/pages/auth/{Login,Signup,ForgotPassword}.jsx`, `frontend/src/stores/authStore.js`, the static refs at `_tmp_leadpro/leadpro-realty/src/pages/{Login,Forgot}.jsx` + `_tmp_leadpro/leadpro-realty/src/components/AuthSide.jsx`, and `docs/STATIC-UI-MAP.md`. Restyle Login + Forgot to shadcn and wire them to authStore. Signup is already done — match its shell exactly. Show me the AuthShell extraction decision before writing.

## Static UI reference (updated 2026-05-12)

- **Layout reference:** `leadpro-realty/src/pages/Login.jsx`, `Forgot.jsx`, `components/AuthSide.jsx`.
- **Restyle:** leadpro CSS classes from `frontend/src/styles/leadpro.css` (`.auth-wrap`, `.auth-side`, `.auth-form`, `.field`, `.input`, `.btn`, `.input-group`). NO shadcn primitives.
- **State:** `useAuthStore`. No `useApp()`.
- **Icons:** `lucide-react`.

## Notes for reviewer

- The static UI's "remember me" was cosmetic; better-auth sets a long-lived cookie by default — wire the checkbox to the SDK's `rememberMe` flag if exposed, else mark as cosmetic with a comment.
- Don't roll our own password-reset email — use better-auth's flow if available; if not, leave the BE call stubbed and link the follow-up BE task.
- **Signup retrofit is layout-only.** Do not change validation rules, the `/company/register` payload shape, or the `setUser` + onboarding redirect logic — those are merged and working. Run signup once before opening the PR to confirm zero regression.
