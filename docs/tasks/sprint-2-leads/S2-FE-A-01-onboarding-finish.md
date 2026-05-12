# S2-FE-A-01 — Onboarding wizard steps 3–4 + completion

**Owner:** FE-A
**Branch:** `fe/onboarding/S2-FE-A-01-finish`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S1-FE-A-02, S1-BE-B-01, S2-BE-A-01

## Goal

Finish the wizard:
- Step 3: First project — minimal form (name, location, type) → creates a Project
- Step 4: Pipeline preview (read-only — show the 9 default stages so user knows what to expect; "Customize later in Settings")
- Final: "All set" screen → calls `complete-onboarding` → redirects to `/dashboard`

## Files to read first

- `frontend/src/pages/onboarding/*` (from S1-FE-A-02)
- Backend endpoints: `POST /api/projects`, `GET /api/pipeline/stages` (won't exist till S3-BE-B-01 — for now hardcode the 9 default stage names client-side from a constant), `POST /api/company/me/complete-onboarding`

## Steps

1. **`/onboarding/projects`** (`pages/onboarding/Projects.jsx`):
   - Single project form: name, location, type
   - Submit → POST to `/api/projects` → next
   - Skip option (no project created)

2. **`/onboarding/pipeline`** (`pages/onboarding/Pipeline.jsx`):
   - Read-only preview: 9 stage cards in a row with name + probability % from a constant in `lib/constants.js`
   - "Continue" button → POSTs `complete-onboarding` then navigates to `/dashboard`

3. **Update progress indicator** in `OnboardingLayout` to handle 4 steps + completion.

## Acceptance criteria

- [ ] Step 3 creates a project (or skip works)
- [ ] Step 4 shows pipeline preview
- [ ] Completion endpoint called; user redirected to /dashboard
- [ ] After completion, /onboarding/* redirects back to /dashboard (gate from S1-FE-A-02 still works)

## AI prompt template

> I'm on task S2-FE-A-01. Read `frontend/src/pages/onboarding/*` from S1-FE-A-02 and the backend endpoint contracts from S2-BE-A-01 and S1-BE-B-01. Add Projects and Pipeline steps. The pipeline preview pulls from a hardcoded constant for now since the backend stages endpoint isn't ready until S3.

## Notes for reviewer

- The hardcoded stage list must match `DEFAULT_STAGES` on the backend exactly — otherwise users see different names later

## Static UI reference (added 2026-05-11)

- **Layout reference:** Onboarding is bespoke — no direct page in the manager's zip. Reuse the `OnboardingLayout` shell from S1-FE-A-02 (stepper + side panel). For the Projects step, mirror the field layout from his `LeadForm.jsx` (label-over-input, two-column on md+) for visual consistency. For the Pipeline preview, render the 9 stages as a horizontal `Card` row similar to how his `Dashboard.jsx` lays out `KpiCard`s.
- **Restyle:** shadcn `Card`, `Form` (react-hook-form + zod), `Input`, `Select`, `Button`, `Badge`. Stage probability shown via `Badge variant="secondary"`.
- **State:** zustand `useOnboardingStore` (from S1-FE-A-02) + `projectService.create`. No `useApp()`.
