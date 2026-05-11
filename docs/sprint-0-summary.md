# Sprint 0 — Foundation Summary

**Sprint window:** 2026-05-09 → 2026-05-11
**Branch state at close:** `sprint-0-flow-check` (pending commit + PR into `main`)
**Status:** ✅ All foundation tasks complete; both apps boot/build cleanly; database migrated.

This document is the post-sprint record: what we built, why, in what order, the problems we hit, how we fixed them, and the libraries each side depends on. Read this before opening any Sprint 1 task.

---

## 1. Goal of Sprint 0

Lay down the *platform* every later sprint will sit on:

- A clean backend folder layout (module-per-feature) so feature work in S1–S4 has obvious homes.
- Real auth (no plaintext passwords), with sessions and cookies wired end-to-end.
- A tenant-scoped data layer so every multi-tenant model gets the right `companyId` automatically.
- A working frontend shell (route guards, layouts, sidebar) so page work in S1–S4 is just "drop a page in".
- A schema + seed that other interns can develop against.

No business features ship in S0. The success measure is: an intern can pick up any S1 page/endpoint task and have everything they need already in place.

---

## 2. Task list & flow

Tasks live under `docs/tasks/sprint-0-foundation/`. They were sequenced so blocks come first:

```
S0-BE-A-01  Backend folder restructure          ──┐
                                                  ├── enables every BE task
S0-BE-A-02  Switch auth to better-auth         ───┘── enables S0-BE-A-04, S0-FE-A-01
S0-BE-A-03  Tenant Prisma + env + logger + errors  ── enables every feature module
S0-BE-A-04  Schema cleanup + seed script           ── enables S1+ FE/BE pages
S0-BE-B-01  Prep: lead/pipeline design doc         ── parallel; no blockers

S0-FE-A-01  API client + auth store + route guards ── waits on S0-BE-A-02
S0-FE-A-02  Dashboard shell + sidebar + theme      ── waits on S0-FE-A-01
S0-FE-A-03  Static-UI intake + STATIC-UI-MAP doc   ── parallel after S0-FE-A-01
S0-FE-B-01  Prep: component plan doc               ── parallel; no blockers
```

### 2.1 What each task delivered

#### S0-BE-A-01 — Backend folder restructure
The repo had drifted into two parallel patterns: a classic `controllers/` + `routes/` + `validations/` split *and* a `modules/<feature>/` layout. We chose **modules-only**. Net effect:

- Kept: `src/modules/<feature>/<feature>.{controller,service,routes,validation}.js`, `src/middleware/` for cross-cutting, `src/lib/` for platform code, `src/config/` for client singletons, `src/routes/index.js` as the API mount point.
- Deleted: `src/controllers/`, `src/routes/authRoutes.js`, `src/routes/adminRoutes.js`, `src/validations/`, `src/services/`, `src/config/auth.js`.
- Added empty placeholder folders so Sprint 1/2 owners know where to put company, user, project, pipeline, activity, task, note modules.

**Why this comes first:** every other backend task assumes "feature code lives at `modules/<feature>/`". Fixing the layout after S0-BE-A-02 / -03 would have meant rewriting their import paths.

#### S0-BE-A-02 — Switch auth to better-auth
The original codebase had a hand-rolled signup/login that stored **plaintext passwords** in the `User` table and did nothing more than `findUnique` on email. Replaced wholesale with `better-auth`:

- `src/lib/auth.js` exports a lazily-initialised better-auth instance with the Prisma adapter, email+password enabled, and `trustedOrigins` pointing at the frontend.
- `server.js` mounts `app.all("/api/auth/{*any}", handler)` so every `/api/auth/...` route is owned by better-auth (sign-up, sign-in, sign-out, get-session, etc).
- `src/middleware/authMiddleware.js` validates the session cookie via `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` and attaches `req.user` + `req.session`.
- `app.js` has a custom JSON-body skip for `/api/auth/*` (better-auth wants the raw body) — everything else gets `express.json()`.
- The schema gained the `Session`, `Account`, and `Verification` tables better-auth needs, plus extra `User` fields via better-auth's `additionalFields` config (role, phone, isActive).

#### S0-BE-A-03 — Tenant Prisma + env + logger + errors
The platform primitives every later module depends on:

- **`src/lib/env.js`** — zod-validated env loading. Schema requires `DATABASE_URL` (url), `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL` (url), `FRONTEND_URL` (url), with sane defaults for `NODE_ENV` and `PORT`. Process exits fast on missing/invalid values.
- **`src/lib/logger.js`** — pino. Pretty in dev, JSON in prod. Wired via `pino-http` middleware in `app.js`.
- **`src/lib/tenantPrisma.js`** — Prisma `$extends` that injects `companyId` into every `where` clause (reads, updateMany, deleteMany) and every `data` payload (create, createMany) for the tenant-scoped models: `User`, `Lead`, `Project`, `Task`, `Activity`, `Note`, `PipelineStage`. Non-tenant models (e.g. `Company`) pass through unchanged. `findUnique`/`update`/`delete`/`upsert` are intentionally *not* intercepted because Prisma rejects a `where` clause that combines a unique field with non-unique extras — services must use `findFirst` / `updateMany` / `deleteMany` for tenant-scoped writes.
- **`src/lib/ApiError.js`** — typed error class with `statusCode`, `message`, `details`.
- **`src/middleware/errorMiddleware.js`** — central handler that formats every error as `{ ok: false, error: { code, message, details? } }` and logs via pino.
- **`src/middleware/tenantMiddleware.js`** — runs after `authMiddleware`, reads `req.user.companyId`, attaches `req.tenantPrisma`.

**Success-response envelope convention:** `{ ok: true, data }`. Documented for all later sprints.

#### S0-BE-A-04 — Schema cleanup + seed
Added the models we know S1–S3 need without breaking the existing init migration:

- `Company` gained branding, locale, plan, onboarding fields.
- `User` gained `phone`, `isActive`, `invitedById` (self-relation), `image`, `emailVerified`.
- `Role` enum gained `OWNER` (now the default for the first user of a new company).
- `Project` gained `description`, `reraNumber`, `possessionDate`, `coverImageUrl`, `updatedAt`.
- `Lead` gained `requirementType`, `city`, `interestedProjectId`, `score`, `tags String[]`, `lastContactedAt`, `createdById`, `tags`.
- New: `PipelineStage`, `Activity` (with `ActivityType` enum), `Note`.
- `Task` gained `dueAt`, `leadId`, `projectId`, `updatedAt`.
- A `seed.js` script (idempotent) and `db:migrate` / `db:seed` / `db:reset` scripts in `package.json`.

#### S0-BE-B-01 — Prep: lead/pipeline design doc
BE-B (returning later) read the SOW and produced `docs/design/` notes for the lead and pipeline modules so Sprint 2 work can start from a shared spec. No code; just docs.

#### S0-FE-A-01 — API client + auth store + route guards
The frontend's "every page assumes this" layer:

- **`src/lib/api.js`** — axios instance with `baseURL: VITE_API_URL || "http://localhost:4000/api"` and `withCredentials: true` (critical — better-auth uses cookies). Response interceptor unwraps to `res.data` and rejects with `err.response.data.error` so callers get the envelope.
- **`src/stores/authStore.js`** — zustand store with `{ user, status, fetchSession, signIn, signUp, signOut }`. Calls `/auth/get-session` on app boot; `signIn` / `signUp` hit `/auth/sign-in/email` / `/auth/sign-up/email`.
- **`src/components/common/ProtectedRoute.jsx`** — shows a spinner while `status === "loading"`, redirects to `/login?from=...` when `unauthenticated`, renders `<Outlet />` otherwise.
- **`src/components/common/RoleRoute.jsx`** — wraps a sub-tree and renders 403 unless `user.role` is in `allowedRoles`.
- **`src/App.jsx`** — `ThemeProvider` (next-themes) + the route tree: auth routes under `AuthLayout`, dashboard routes under `ProtectedRoute → DashboardLayout`, `/` → `/dashboard`, `*` → `/dashboard`. `fetchSession()` runs once on mount.
- **`frontend/.env.example`** — `VITE_API_URL=http://localhost:4000/api` checked in.

#### S0-FE-A-02 — Dashboard shell, sidebar, theme
The authenticated app shell:

- **`layouts/DashboardLayout.jsx`** uses shadcn's `SidebarProvider` + `SidebarInset`, renders `<AppSidebar />` + `<Navbar />` + `<main><Outlet /></main>`.
- **`components/common/Sidebar.jsx`** reads `useAuthStore().user.role` and shows a role-specific menu from `utils/constants.ROLE_MENU_ITEMS` (OWNER/ADMIN/MANAGER/AGENT). Active route highlighted via `useLocation`.
- **`components/common/Navbar.jsx`** has the company name, theme toggle (light/dark/system), avatar dropdown with Sign-out wired to `authStore.signOut`.
- **`components/common/PageHeader.jsx`** + **`EmptyState.jsx`** — reusable shells every placeholder page renders inside.
- The four placeholder pages (`Dashboard`, `Leads`, `Projects`, `Team`) all render a PageHeader + EmptyState describing which sprint will fill them in.

#### S0-FE-A-03 — Static-UI intake + STATIC-UI-MAP
The manager handed over a static reference build (`leadpro-realty.zip`) with plain-CSS classes and a Context-based store. Rather than re-decide "what's the shadcn equivalent of `btn-secondary`?" in every page task, this task produced:

- **`docs/STATIC-UI-MAP.md`** — class-to-shadcn-primitive cheat sheet, decision log (light theme default, recharts for charts, sonner for toasts, shadcn Dialog for modals), state-pattern translation table, page-to-task index, list of things NOT to copy.
- **`frontend/src/lib/format.js`** — ported `fmt.{inr,date,ago,initials}`, `roleLabel`, `priorityCls`, `statusCls` as pure helpers.
- **`/__ui-check`** — temporary smoke-test page rendering one of every mapped primitive. Will be deleted once S1 page work confirms the map holds.
- `_tmp_leadpro/` added to `.gitignore`.

#### S0-FE-B-01 — Prep: component plan
FE-B produced a component-plan doc so Sprint 2 page tasks know which shadcn primitives to reach for. Docs only.

---

## 3. Problems we hit and how we resolved them

### 3.1 The silent merge-concat incident
**Symptom:** After merging two Sprint 0 PRs into `main` back-to-back, `node --check app.js` failed with *Identifier 'app' has already been declared.* `git status` had reported "no conflict".

**Cause:** PR #5 added the *real* better-auth + tenantPrisma + middleware implementation. PR #6 (FE branch) had earlier added *stub* versions of the same three middleware files at the same paths. When `main` was auto-merged into the FE branch, the stub blocks and the real-implementation blocks occupied non-overlapping line ranges in each file. Git's line-based merge happily took "both sides", producing a file that was syntactically broken but conflict-free.

**Files affected (across two cleanup passes):**
- Pass 1: `backend/src/{app.js, middleware/authMiddleware.js, middleware/errorMiddleware.js, routes/index.js, routes/adminRoutes.js}`
- Pass 2 (discovered when this doc's parent audit ran): `backend/src/config/prisma.js`, `backend/package.json` (duplicate `@prisma/client` and `prisma` keys, v6 vs v7), `backend/prisma/migrations/20260511055114_add_better_auth/migration.sql` (rewrote already-existing tables), `frontend/src/App.jsx`, `frontend/src/layouts/DashboardLayout.jsx`, all four `frontend/src/pages/admin/*.jsx` files.

**Resolution:** For every duplicated file, kept the richer/correct version and deleted the stub. Verification: `node --check` on every backend `.js` file, `prisma validate` on the schema, `vite build` on the frontend.

**Lesson saved to memory:** after any multi-author merge, do not trust `git status` — run `node --check` + `prisma validate` + `vite build` and grep for duplicate `function X(`, `const X =`, `export default`, `module.exports`.

### 3.2 Frontend parallel-branch duplicates
Separately from the merge-concat: two branches had built two complete versions of the same feature.

- Two auth stores: `src/store/authStore.js` (mocked Jane Doe, always authenticated) vs `src/stores/authStore.js` (real better-auth wiring). Navbar and Sidebar were importing the *mocked* one.
- Two route trees: `src/routes/AppRoutes.jsx` + `src/routes/ProtectedRoutes.jsx` (using mocked store) vs the route tree inside `App.jsx` (using real store + better ProtectedRoute).
- Two API clients: `src/lib/api.js` (working axios instance) vs empty `src/services/api.js`.
- Several empty placeholder files: `services/{api,authService,leadService}.js`, `hooks/useLeads.js`, `store/{leadStore,uiStore}.js`, `components/common/{Footer,Loader}.jsx`, `utils/{formatDate,helpers,permissions}.js`, `layouts/MainLayout.jsx`.

**Resolution:** Kept the canonical (better-auth-wired) versions, deleted the duplicates and empty placeholders, repointed Navbar/Sidebar imports to `@/stores/authStore`. Also discovered Sidebar referenced `location.pathname` without importing `useLocation` — added the import.

### 3.3 Lead module was wide open
The committed `modules/lead/*` had no auth middleware, imported `prisma` directly (bypassing `tenantPrisma`), and didn't pass `companyId` on create (which the schema requires, so every create would have failed).

**Resolution:** Added `authMiddleware` + `tenantMiddleware` to the lead router. Rewrote the service to take `tenantPrisma` as an argument and use `findFirst` / `updateMany` / `deleteMany` (because tenantPrisma intentionally doesn't intercept findUnique/update/delete — see §3.5). Rewrote the controller to use `next(err)` + ApiError + the `{ ok, data }` envelope.

### 3.4 Prisma schema validation errors
After cleanup, `prisma validate` flagged three issues:

- `Lead.createdBy User? @relation("CreatedLeads", ...)` had no opposite field on `User`. Fixed by adding `createdLeads Lead[] @relation("CreatedLeads")` on `User`.
- `Lead.notes String?` collided with the new `notes Note[]` relation (same name). Dropped the scalar — the `Note` model fully replaces it.
- `Project.tasks Task[]` had no opposite field on `Task`. Added `projectId String?` + `project Project? @relation(...)` on `Task`.

### 3.5 The tenantPrisma findUnique gotcha
Prisma's `$extends` lets you intercept queries and inject `companyId` into the `where` clause. But Prisma rejects a `findUnique` whose where combines a unique-only field (`id`) with non-unique extras (`companyId`). So injecting `companyId` would make every `findUnique` throw.

**Resolution:** `tenantPrisma` only intercepts read operations Prisma allows non-unique extras on (`findFirst`, `findFirstOrThrow`, `findMany`, `count`, `aggregate`, `groupBy`) plus `updateMany` / `deleteMany` / `createMany`. Services that need to scope a `findUnique` instead call `findFirst({ where: { id } })`. Documented at the top of `tenantPrisma.js`.

### 3.6 Postgres won't let new enum values be used in the same migration
When the cleanup added `OWNER` to the `Role` enum *and* set it as the new column default in one migration, Postgres rejected it on the shadow database: *unsafe use of new value "OWNER" of enum type "Role" — new enum values must be committed before they can be used.*

**Resolution:** Split the migration in two:

1. `20260511091800_add_owner_role` — only `ALTER TYPE "Role" ADD VALUE 'OWNER';`
2. `20260511091801_s0_better_auth_and_relations` — everything else, including `ALTER COLUMN "role" SET DEFAULT 'OWNER'`.

### 3.7 Migration history was broken before the cleanup ran
The branch carried a `20260511055114_add_better_auth` migration that tried to `CREATE TABLE "User"` (etc.) for tables the `init` migration had already created. It had never been applied to the dev DB and never could be — the shadow database would always fail. Deleted it and let `prisma migrate dev --create-only` generate a clean diff migration, then split that as per §3.6.

### 3.8 Backend wouldn't start after migration: weak `BETTER_AUTH_SECRET`
Env validation in `lib/env.js` enforces `BETTER_AUTH_SECRET.length >= 32`. The `.env` had a 19-char placeholder. Replaced with a 64-char base64url secret generated by `crypto.randomBytes(48).toString('base64url')`.

### 3.9 Frontend network error on signup
Backend was running on `PORT=5000` (set in `.env`), but the frontend's axios instance defaulted to `http://localhost:4000/api`. Created `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`.

Also noticed `backend/.env` had `CLIENT_URL` but `lib/env.js` validates `FRONTEND_URL`. Renamed in `.env` so CORS and `trustedOrigins` read the configured value instead of the default.

---

## 4. Libraries we picked

### Backend (`backend/package.json`)

| Library | Role | Why this one |
|---|---|---|
| **express** ^5 | HTTP server | Sprint-0 was scoped to a Node/Express monolith; v5 is the current stable. |
| **better-auth** ^1.6 | Auth (sign-up, sign-in, sessions, password reset later) | Hashes passwords, manages sessions/cookies, ships email verification + password reset hooks. Replaces the plaintext-password implementation we had. |
| **@prisma/client** ^6.19 + **prisma** ^6.19 | ORM + migrations | Type-safe queries, `$extends` for the tenant interceptor, first-class Postgres support, migration tooling. |
| **pg** ^8 | Postgres driver (used implicitly by Prisma) | — |
| **zod** ^4 | Env + payload validation | Schema-first validation that doubles as TypeScript types if/when we migrate. |
| **pino** ^10 + **pino-http** ^11 + **pino-pretty** ^13 | Structured logging | Fast, structured JSON in prod, pretty output in dev. |
| **cors** ^2 | CORS with credentials | Required for cookie auth from a different origin (`localhost:5173` → `localhost:5000`). |
| **helmet** ^8 | Default security headers | One-liner hardening. |
| **cookie-parser** ^1 | Read better-auth's session cookie | better-auth handles writes; we just need parsing. |
| **dotenv** ^17 | Load `.env` into `process.env` | Standard. |
| **nodemailer** ^8 | Outbound email (for password reset, invites — wired in S1) | — |
| **cloudinary** ^1 + **multer** + **multer-storage-cloudinary** | File uploads (project images, lead docs — wired in S2/S3) | Pre-installed; not yet used in S0. |
| **nodemon** ^3 (dev) | Auto-restart in dev | — |

**Removed during cleanup:** `morgan` (replaced by `pino-http`), `@prisma/adapter-pg` v7 (the package.json listed it but `node_modules` was on Prisma 6 — kept Prisma 6 consistently).

### Frontend (`frontend/package.json`)

| Library | Role | Why this one |
|---|---|---|
| **react** ^19 + **react-dom** ^19 | UI runtime | Current major. |
| **react-router-dom** ^7 | Routing | v7 is the merged Remix/RR Router. We use Routes + Outlet + Navigate. |
| **vite** ^8 + **@vitejs/plugin-react** | Dev server + bundler | Fast HMR, ES-modules, integrates with Tailwind v4 plugin. |
| **tailwindcss** ^4 + **@tailwindcss/vite** + **tw-animate-css** | Styling | Tailwind v4's vite plugin replaces the old PostCSS config; the static-UI map mandates shadcn over hand-written CSS. |
| **shadcn** ^4 + **radix-ui** + **class-variance-authority** + **clsx** + **tailwind-merge** | Component primitives | shadcn for the design language; radix powers the underlying behaviour; cva + clsx + tailwind-merge for variant composition. |
| **axios** ^1 | HTTP client | `withCredentials: true` for better-auth cookies; response interceptor unwraps the envelope. |
| **zustand** ^5 | State (auth, leads later, UI later) | Tiny, no boilerplate, plays well with React 19. |
| **react-hook-form** ^7 + **@hookform/resolvers** ^5 + **zod** ^4 | Forms + validation | Same zod schemas the backend will consume in S1+. |
| **sonner** ^2 | Toasts | One `<Toaster />` in `App.jsx`; `toast.success("...")` anywhere. Replaces the static-UI build's hand-rolled `<Toaster>`. |
| **lucide-react** ^1 | Icons | Tree-shakable; what shadcn ships with. |
| **next-themes** ^0.4 | Light/dark/system theme toggle | Drives the `class` attribute on `<html>`; integrates with Tailwind's `dark:` variants. |
| **date-fns** ^4 | Date formatting | `fmt.date`, `fmt.ago` in `lib/format.js`. |
| **react-day-picker** ^9 | Date input | Used by shadcn's `Calendar` primitive. |
| **@fontsource-variable/geist** ^5 | UI font | Self-hosted; matches the static reference's typography. |
| **cmdk** ^1 | Command palette primitive | Backs shadcn's `<Command>` (search/typeahead — used in S2+). |

**Deferred but planned:**
- **recharts** — for KPI cards / charts in S4. Documented in `STATIC-UI-MAP.md`; not yet installed.

---

## 5. Current verified state

- ✅ `node --check` clean on every backend JS file.
- ✅ `prisma validate` passes.
- ✅ `prisma migrate status` → "Database schema is up to date" (3 migrations applied).
- ✅ `prisma generate` produces Prisma Client v6.19.3.
- ✅ `vite build` produces a working production bundle.
- ⏳ Cleanup commit + PR from `sprint-0-flow-check` into `main` — pending.
- ⏳ `npm run db:seed` — pending; demo data not yet loaded.

---

## 6. Read this before starting Sprint 1

- **Auth is real.** Don't write a parallel signup; call `useAuthStore().signUp` (FE) or better-auth's API (BE).
- **Tenancy is automatic** if you use `req.tenantPrisma`. Importing `prisma` directly in a feature service is a bug.
- **Response envelope** is `{ ok: true, data }` / `{ ok: false, error: { code, message, details? } }`. The FE axios interceptor already unwraps `error` — throw `ApiError` in controllers and call `next(err)`.
- **Sidebar items** are role-keyed in `frontend/src/utils/constants.js`. Add new menu entries there.
- **Static-UI map** at `docs/STATIC-UI-MAP.md` tells you which shadcn primitive replaces which static-build class. Don't re-derive.
- **Empty module folders** (`company`, `user`, `project`, `pipeline`, `activity`, `task`, `note`) under `backend/src/modules/` are where Sprint 1+ feature code goes. Use the lead module as the template.
