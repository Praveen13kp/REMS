# S0-BE-A-01 — Backend folder restructure

**Owner:** BE-A
**Branch:** `be/foundation/S0-BE-A-01-restructure`
**Estimated:** 0.5 day
**Blocks:** every other backend task in S0/S1
**Blocked by:** none

## Goal

Standardize the backend on the **module-per-feature** pattern. The current repo has both `src/controllers/`, `src/routes/`, `src/validations/` AND `src/modules/auth/`, `src/modules/lead/`. We're keeping only the modules pattern.

## Files to read first

- `backend/src/app.js`
- `backend/src/routes/index.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/routes/adminRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/modules/auth/*` (all files)
- `backend/src/modules/lead/*` (all files)
- `backend/src/middleware/*` (all files)
- `docs/CONTRIBUTING.md` § 2 Backend conventions

## Steps

1. **Decide what to keep** — `src/modules/<feature>/` is the pattern. The existing `modules/auth/` already has `auth.controller.js`, `auth.service.js`, `auth.routes.js`, `auth.validation.js`. Keep these.
2. **Delete** the duplicate top-level scaffolding:
   - `backend/src/controllers/` (entire folder)
   - `backend/src/routes/authRoutes.js`
   - `backend/src/routes/adminRoutes.js`
   - `backend/src/validations/` (entire folder)
   - `backend/src/services/` (entire folder, just `.gitkeep`)
3. **Keep** `backend/src/routes/index.js` as the API root mount point — but it should only `require` from `src/modules/*/`.
4. **Keep** `backend/src/middleware/` for cross-cutting middleware (auth guard, RBAC, error handler). These are not feature-specific.
5. **Keep** `backend/src/utils/` and `backend/src/config/`.
6. **Create empty placeholder folders** with `.gitkeep` for upcoming modules so other interns know where to add code:
   - `backend/src/modules/company/`
   - `backend/src/modules/user/`
   - `backend/src/modules/project/`
   - `backend/src/modules/pipeline/`
   - `backend/src/modules/activity/`
   - `backend/src/modules/task/`
   - `backend/src/modules/note/`
7. **Update `routes/index.js`** to require module routes via `require("../modules/<feature>/<feature>.routes")`. Comment out routes for modules that don't exist yet.
8. **Verify** the server still starts cleanly: `cd backend && npm run dev`. The `/` and `/api/auth/...` endpoints should still respond.

## Acceptance criteria

- [ ] No top-level `src/controllers/`, `src/services/`, or `src/validations/` folders remain
- [ ] `src/routes/` contains only `index.js` (no per-feature route files)
- [ ] All feature code lives under `src/modules/<feature>/`
- [ ] `src/middleware/` still exists with `authMiddleware.js`, `rbacMiddleware.js`, `errorMiddleware.js`
- [ ] Empty module folders exist for company, user, project, pipeline, activity, task, note
- [ ] Server starts without errors (`npm run dev`)
- [ ] Existing auth endpoints (`POST /api/auth/signup`, `POST /api/auth/login`) still respond (even if they'll be replaced in S0-BE-A-02)

## AI prompt template

> I'm working on task S0-BE-A-01. Read `docs/CONTRIBUTING.md` and `docs/tasks/sprint-0-foundation/S0-BE-A-01-restructure-backend.md`. Then read every file under `backend/src/`. Summarize what currently exists, identify which files duplicate functionality between `src/controllers/` and `src/modules/auth/`, and propose a delete-list and a final folder tree before making any changes. Wait for my approval before deleting or moving files.

## Notes for reviewer (manager)

- Diff should be mostly deletions + a small edit to `routes/index.js`
- No new dependencies
- No schema changes
