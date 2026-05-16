# S5-FE-A-01 — Login UI company picker

**Owner:** TL-FE
**Branch:** `fe/auth/S5-FE-A-01-company-picker`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S5-BE-A-01

## Goal

Once BE allows the same email in multiple companies, the login UI must let the user say *which* company they're logging into.

## Steps

1. `Login.jsx`: add a "Company" input (slug field) above email. Or implement a two-step form: email → "we found N companies for this email, pick one" → password.
2. Update `authStore` / `services/authService.js` to send `companySlug` (or `companyId`) along with email/password.
3. If the app is deployed under per-tenant subdomains, auto-fill the company field from `window.location.hostname` and lock it.
4. Update `AcceptInvite.jsx` — the invite token already encodes the company, no UI change needed but verify it still works.
5. `ForgotPassword.jsx` — add the company field so the reset link is tenant-scoped.

## Acceptance criteria

- [ ] User can log into Company A and Company B with the same email
- [ ] Wrong company + right email = clean error, not a 500
- [ ] Subdomain auto-fills the field when present
- [ ] Forgot-password email goes to the correct tenant account
