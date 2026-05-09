# S1-FE-A-02 — Onboarding wizard (steps 1–2)

**Owner:** FE-A
**Branch:** `fe/onboarding/S1-FE-A-02-wizard`
**Estimated:** 1 day
**Blocks:** S2-FE-A-01 (continues wizard)
**Blocked by:** S1-FE-A-01, S1-BE-A-02

## Goal

After registration, the OWNER lands on a guided wizard. Build steps 1 and 2 in this task; steps 3–4 in S2-FE-A-01.

- Step 1: Company branding — logo URL (paste link for MVP, no upload), brand color, timezone, currency
- Step 2: Invite teammates — table of teammates added so far, "Add" form with email + role select

## Files to read first

- `frontend/src/App.jsx` (route tree from S0)
- `frontend/src/stores/authStore.js`
- Backend endpoints: `PATCH /api/company/me`, `POST /api/users/invite`, `GET /api/users`
- `frontend/src/components/ui/{progress,form,input,select,table,dialog}.jsx`

## Steps

1. **New route group** in `App.jsx` (FE-A's file):
   ```
   /onboarding/welcome
   /onboarding/branding   ← step 1
   /onboarding/team       ← step 2
   ```
   Wrap them in a `<OnboardingLayout />` that shows a step indicator (shadcn `Progress` or custom dots) and a centered card.

2. **Welcome page** — heading, "Let's set up Acme Realty in 4 steps", "Get started" button → `/onboarding/branding`.

3. **Step 1 — Branding** (`pages/onboarding/Branding.jsx`):
   - Form: logoUrl (URL input + preview), brandColor (color picker — `<input type="color">` is fine), timezone (select with 5–10 common options), currency (select: INR, USD, AED).
   - Submit → `PATCH /api/company/me` → next step.
   - "Skip for now" link → next step (saves blank/defaults).

4. **Step 2 — Team** (`pages/onboarding/Team.jsx`):
   - Top: "Add teammate" form (email + role select: ADMIN/MANAGER/AGENT) → `POST /api/users/invite`.
   - Below: table of pending invites + active users (from `GET /api/users`). Show invite link in a copyable input next to each pending invite (since email isn't sent in MVP).
   - "Continue" button → `/onboarding/projects` (S2-FE-A-01 builds this route).
   - "Skip" link → same.

5. **Onboarding gating logic** — in `OnboardingLayout`, if `user.companyId` company has `onboardingCompleted === true`, redirect to `/dashboard`. Otherwise render the wizard.

6. **`useCompany` hook** — `frontend/src/hooks/useCompany.js` — fetches `/api/company/me`, exposes `{company, refetch, isLoading}`. Used by the wizard and later by Settings.

## Acceptance criteria

- [ ] Three onboarding routes exist and render inside `OnboardingLayout`
- [ ] Step indicator shows current step
- [ ] Branding form persists changes via PATCH
- [ ] Team step can invite via POST and shows pending invites with copyable links
- [ ] Skipping a step doesn't break the flow
- [ ] If user navigates to `/onboarding/*` after completion, redirected to `/dashboard`

## AI prompt template

> I'm on task S1-FE-A-02. Read this spec, `frontend/src/App.jsx`, the backend endpoint contracts from `docs/tasks/sprint-1-onboarding/S1-BE-A-01-*.md` and `S1-BE-A-02-*.md`. Build the OnboardingLayout, Welcome, Branding, and Team pages. Use shadcn primitives. Show me the route additions to App.jsx and the layout component first; I'll approve before you build the step pages.

## Notes for reviewer

- Verify `/api/users/invite` response includes the invite link (UI depends on it for MVP)
- The "currently in step X of 4" indicator should match the route, not local state
