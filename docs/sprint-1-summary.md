# Sprint 1 — Onboarding Summary

**Sprint window:** 2026-05-11 → (close date)
**Branch state at close:** `docs/tasks/full-ui-scope-shadcn` (open PR into `main`)
**Status:** ✅ Core onboarding flow shipped. Two task specs were added late (public contact form, marketing site) and are intentionally **deferred to a later sprint** — they're not blockers for S2.

This is the post-sprint record for Sprint 1. Read this before opening any Sprint 2 task.

---

## 1. Goal of Sprint 1

Take a freshly bootstrapped, empty platform (Sprint 0 output) and let a real company self-sign-up and get to work:

- A company OWNER can create their workspace from `/signup` in one form.
- That OWNER lands in a multi-step onboarding wizard (branding, team invites), then drops onto the dashboard.
- The OWNER can invite ADMIN / MANAGER / AGENT teammates and they can accept via emailed link.
- The OWNER / ADMIN / MANAGER can manage Projects (the inventory leads will later be tagged against).
- Auth pages (Login / Signup / Forgot) match the manager's static UI so the product looks like one cohesive app, not a Sprint 0 skeleton.

No lead / pipeline / dashboard data flows here — those are Sprint 2/3/4.

The success measure: a brand-new user can land on `/signup`, end up logged in, see their company name on the navbar, invite a teammate, and create a project — without hitting any backend stub or "TODO".

---

## 2. Task list & flow

Tasks live under `docs/tasks/sprint-1-onboarding/`. Sequencing:

```
S1-BE-A-01  Company self-registration            ──┐
                                                    ├── enables S1-FE-A-01 (signup form)
S1-BE-A-02  User invite + accept                 ──┴── enables S1-FE-A-02 (onboarding wizard team step)
S1-BE-B-01  Project CRUD                            ── enables S1-FE-B-01 (projects page)

S1-FE-A-01  Signup flow (company-register form)     ── waits on S1-BE-A-01
S1-FE-A-02  Onboarding wizard (welcome/brand/team)  ── waits on S1-BE-A-02 + S1-FE-A-01
S1-FE-A-03  Login/Forgot/Signup shadcn parity       ── parallel, no blockers; landed last
S1-FE-B-01  Projects page (table + create dialog)   ── waits on S1-BE-B-01

S1-BE-A-03  Public contact form  ── spec only, build deferred
S1-FE-B-02  Marketing site       ── spec only, build deferred
```

### 2.1 What each task delivered

#### S1-BE-A-01 — Company self-registration
`backend/src/modules/company/`. `POST /api/company/register` accepts `{ companyName, companyType, city, ownerName, ownerEmail, ownerPhone, password }` (validated via `zod` in `company.validation.js`) and, inside one Prisma transaction:

1. Creates the `Company` row (`type`, `city`, default `timezone="Asia/Kolkata"`, `currency="INR"`, `subscriptionPlan="FREE_TRIAL"`).
2. Creates the OWNER `User` via better-auth's `signUpEmail` API (which hashes the password and writes the `Account` row).
3. Patches the new user with `role=OWNER` and `companyId`.
4. Seeds the **default 7-stage pipeline** for that company (`PipelineStage` rows: New → Contacted → Interested → Site Visit → Negotiation → Booked / Lost).
5. Issues a better-auth session cookie in the response.

Handles `409` on duplicate owner email and returns server-side field validation errors mapped per field for the signup form.

`GET /api/company/me` and `PATCH /api/company/me` (OWNER/ADMIN only via `requireRole`) round out the module.

**Why first:** every other Sprint 1 user-facing path assumes a Company + OWNER User already exist.

#### S1-BE-A-02 — User invite & accept
`backend/src/modules/user/`. Adds:

- `POST /api/users/invite` (OWNER/ADMIN) — body `{ email, role }`. Creates an `Invite` row with a random `token`, 7-day `expiresAt`, and queues an email via `nodemailer` containing the accept link (link points at the FE at `/invite/:token`).
- `GET /api/users/invite/:token` (public) — returns `{ email, role, companyName }` so the FE can pre-fill the accept form without auth.
- `POST /api/users/invite/:token/accept` (public) — body `{ name, password }`. Creates the better-auth user, attaches the role and `companyId` from the invite, marks the invite `acceptedAt`, and signs them in.
- `GET /api/users/me`, `GET /api/users/`, `GET /api/users/:id`, `PATCH /api/users/:id` — list/detail/update for the team page (role-gated via `requireRole`).

**Why before the wizard:** the onboarding wizard's "team" step calls `POST /invite` for each row.

#### S1-BE-B-01 — Project CRUD
`backend/src/modules/project/`. Full CRUD at `/api/projects`:

- `GET /` and `GET /:id` — list and detail, tenant-scoped via `tenantPrisma` (everyone in the company can read).
- `POST /` (OWNER/ADMIN/MANAGER) — create. Fields: `name`, `location`, `type` (RESIDENTIAL / COMMERCIAL / PLOT / VILLA / MIXED), `priceRange`, `reraNumber`, `possessionDate`, `description`, `coverImageUrl`.
- `PATCH /:id` (OWNER/ADMIN/MANAGER) — update.
- `DELETE /:id` (OWNER/ADMIN only) — delete.

All routes go through `authMiddleware` + `tenantMiddleware` first (router-level), so `req.tenantPrisma` is the only data access path used inside services.

#### S1-FE-A-01 — Signup flow
`frontend/src/pages/auth/Signup.jsx` posts to `/api/company/register`. On success it stuffs the returned user into `useAuthStore.setUser(user)` and redirects to `/onboarding/welcome`. On `409` it field-mounts the error on `ownerEmail`. On other 4xx with a `fields` object it maps each entry to the matching form field via `react-hook-form`'s `setError`.

#### S1-FE-A-02 — Onboarding wizard
Three pages under `frontend/src/pages/onboarding/` rendered inside `OnboardingLayout`:

- `Welcome.jsx` — greeting + "Let's set up your workspace" CTA → goes to `/onboarding/branding`.
- `Branding.jsx` — `PATCH /api/company/me` with optional logo URL + brand colour.
- `Team.jsx` — repeated "email + role" rows; each row hits `POST /api/users/invite`. "Skip for now" is allowed. Final action sets `onboardingCompleted=true` on the company and redirects to `/dashboard`.

#### S1-FE-A-03 — Login / Forgot / Signup shadcn parity
The last Sprint 1 task. Brought all three auth pages to visual parity with the manager's `_tmp_leadpro/leadpro-realty` static reference while keeping our better-auth + zustand wiring untouched. Details:

- Shared two-column shell extracted into `components/auth/AuthShell.jsx` with the brand panel (`AuthSide.jsx`) on the LEFT.
- `AuthSide` uses the manager's verbatim copy — "LeadPro Realty" brand + four feature bullets.
- **Login** — added the cosmetic OAuth row (Google / Microsoft / GitHub buttons that toast "demo only" because better-auth OAuth isn't wired), the "or sign in with email" divider, required-asterisk labels, and an arrow icon on the submit button. The manager's "demo accounts (any password works)" info box was deliberately **omitted** — that claim is false under better-auth.
- **Signup** — heading + sub-link rearranged, fields reordered to mirror the static (Company / Owner → Type / City → Email → Phone → Password → Confirm), required asterisks, password strength meter (0–4 based on length / upper / digit / symbol).
- **Forgot** — required asterisk on Email, button label "Send Reset Link". The success state is an inline "Check your inbox" card with a back-to-sign-in link instead of the static's toast + auto-redirect (better UX, and the BE endpoint is still stubbed pending a better-auth password-reset task).
- **Shell theme** — `index.css` primary / accent / ring tokens switched from neutral greyscale to the purple hue (`oklch(0.609 0.196 293.5)`) the manager uses, both light and dark. Navbar + Sidebar rebranded to "RELMS" with the same colored logo mark used in `AuthSide`.

Also added the missing shadcn primitives the auth pages import: `components/ui/checkbox.jsx`, `components/ui/label.jsx`.

#### S1-FE-B-01 — Projects page
`frontend/src/pages/admin/Projects.jsx`. shadcn `DataTable` with columns name / location / type / possession / actions. OWNER/ADMIN/MANAGER see a "New project" button that opens a shadcn `Dialog` with the project form; AGENTs see the table only (no create/edit/delete affordances). Edit/delete actions hit `PATCH /:id` and `DELETE /:id`. Optimistic updates via `react-hook-form` + `sonner` toasts on success/error.

---

## 3. Deferred (spec only, not built)

These two task specs were authored late in the sprint and pushed to a future slot — they don't block any Sprint 2 work.

- **S1-BE-A-03 public contact form** — public, unauthenticated `POST /api/public/contact` that drops a `Lead` row (or a Contact entity) for an anonymous website visitor. Needs a captcha / rate-limit story before we ship it.
- **S1-FE-B-02 marketing site** — public landing / pricing / features / contact pages under a separate `PublicLayout`. Distinct skill from the admin app; can run on its own branch later without coupling to the dashboard work.

---

## 4. Flow walkthroughs

### 4.1 New customer signup → onboarding → dashboard

```
1. User opens /signup
2. Fills Signup form (Company + Owner + Password)
   → POST /api/company/register
        ├─ tx: Company.create
        ├─ tx: better-auth signUpEmail (creates User + Account + hashed password)
        ├─ tx: User.update set role=OWNER, companyId
        ├─ tx: PipelineStage.createMany (7 default stages)
        └─ better-auth issues session cookie
3. FE: setUser(user) in zustand → navigate('/onboarding/welcome')
4. /onboarding/welcome → /onboarding/branding (PATCH /company/me) → /onboarding/team
5. /onboarding/team: each row → POST /api/users/invite (nodemailer fires email per invite)
6. "Finish" → PATCH /company/me { onboardingCompleted: true } → navigate('/dashboard')
```

### 4.2 Team invite acceptance

```
1. Invited user clicks link in email: <FRONTEND>/invite/<token>
2. FE: GET /api/users/invite/:token → { email, role, companyName }
3. User submits name + password
   → POST /api/users/invite/:token/accept
        ├─ better-auth signUpEmail (creates User + Account)
        ├─ User.update role + companyId from Invite row
        ├─ Invite.update acceptedAt = now()
        └─ better-auth issues session cookie
4. FE: setUser → navigate based on role (OWNER/ADMIN/MANAGER → /dashboard, AGENT → /leads)
```

### 4.3 Login

```
1. User opens /login, submits email + password
2. authStore.signIn({ email, password })
     → better-auth client signIn (POST /api/auth/sign-in/email)
     → session cookie set; getSession() returns user
3. setUser(user) → navigate('?from' || '/dashboard')
4. Subsequent requests carry the better-auth cookie automatically (axios withCredentials)
5. Every tenant-scoped backend handler reads req.user.companyId via authMiddleware → tenantMiddleware
```

### 4.4 Project create

```
1. OWNER/ADMIN/MANAGER on /projects clicks "New project"
2. Dialog form submits → POST /api/projects
3. Route chain: authMiddleware → tenantMiddleware → rbacMiddleware("OWNER","ADMIN","MANAGER")
4. Service uses req.tenantPrisma.project.create({ data }) — companyId is auto-stamped by the Prisma extension
5. Response → toast.success + table refetch (or optimistic insert)
```

---

## 5. Libraries

### 5.1 Backend (`backend/package.json`)

| Library | Purpose in Sprint 1 |
|---|---|
| `express` ^5 | HTTP framework, route mounting in `src/routes/index.js` |
| `better-auth` ^1.6 | Owns `/api/auth/*` (sign-up, sign-in, sign-out, get-session), password hashing, session cookies |
| `@prisma/client` + `prisma` ^6 | ORM + migrations; `tenantPrisma` extension scopes every query by `companyId` |
| `pg` | PostgreSQL driver under Prisma |
| `zod` ^4 | Request validation schemas in every `<module>.validation.js` |
| `cookie-parser` | Parses better-auth's session cookie before middleware reads it |
| `cors` | Allows the FE origin to send credentials |
| `helmet` | Standard security headers |
| `dotenv` | `.env` → `process.env` (DATABASE_URL, BETTER_AUTH_SECRET, SMTP creds, FRONTEND_URL) |
| `pino` + `pino-http` + `pino-pretty` | Structured request and error logs |
| `nodemailer` | Sends invite emails in S1-BE-A-02 |
| `cloudinary` + `multer` + `multer-storage-cloudinary` | Wired but **not used yet** in Sprint 1 — present for the Sprint 4 files module |
| `nodemon` (dev) | Auto-restart on file change |

### 5.2 Frontend (`frontend/package.json`)

| Library | Purpose in Sprint 1 |
|---|---|
| `react` ^19 + `react-dom` + `vite` ^8 | App + dev server + production build |
| `react-router-dom` ^7 | Route table in `App.jsx`; nested layouts for Auth / Onboarding / Dashboard |
| `axios` ^1 | `lib/api.js` instance with `withCredentials: true` so the better-auth cookie flows on every request |
| `zustand` ^5 | `stores/authStore.js` — `user`, `fetchSession`, `signIn`, `signOut`, `setUser` |
| `react-hook-form` ^7 + `@hookform/resolvers` + `zod` ^4 | Every form (Signup, Login, Forgot, Onboarding, Project create) validates via zod resolvers |
| `tailwindcss` ^4 + `@tailwindcss/vite` + `tw-animate-css` | Styling; Tailwind v4 token system in `index.css` |
| `radix-ui` + `class-variance-authority` + `clsx` + `tailwind-merge` + `shadcn` + `cmdk` | shadcn primitives (Button, Input, Label, Checkbox, Select, Dialog, DataTable, Sidebar, Toast) |
| `lucide-react` | Iconography (Building2, Eye, EyeOff, ArrowRight, Chrome, Github, MailCheck, etc.) |
| `sonner` ^2 | Toast notifications (`<Toaster />` in `App.jsx`) |
| `next-themes` ^0.4 | Light / dark theme provider |
| `@fontsource-variable/geist` | Primary UI typeface |
| `date-fns` ^4 + `react-day-picker` ^9 | Possession-date picker in the Project form |
| `eslint` + plugins (dev) | Lint |

**Charts (`recharts`) are intentionally absent** — they land with the Sprint 4 dashboards. The manager's static used `chart.js`; we're porting to `recharts` when we get there (decision logged in `memory/project_static_ui.md`).

---

## 6. Schema additions in this sprint

Sprint 1 used the schema as it landed at the end of Sprint 0 — no migration was authored in Sprint 1 itself. The relevant tables exercised here:

- `Company` — created in `/company/register`, patched in onboarding (`branding`, `onboardingCompleted`).
- `User` — created via better-auth, patched with `role` + `companyId`.
- `Account` — better-auth writes the hashed password row here.
- `Session` — better-auth writes/reads the active session.
- `Invite` — created by `/users/invite`, consumed by `/users/invite/:token/accept`.
- `PipelineStage` — seeded x7 on company creation; will be consumed by Sprint 3 (Kanban).
- `Project` — full CRUD; `companyId` enforced by `tenantPrisma`.

If Sprint 2 needs schema changes (likely on `Lead`), that migration will be authored under `backend/prisma/migrations/` in the lead sprint, not retroactively here.

---

## 7. Conventions reinforced this sprint

These were locked down in Sprint 0; Sprint 1 was the first sprint where every new module had to follow them, so they're worth re-stating:

- **Module-per-feature only.** No top-level `controllers/`, `routes/<feature>.js`, or `validations/`. Each module ships its own `{controller, service, routes, validation}.js`.
- **No direct `prisma` imports inside feature services.** All tenant-scoped reads/writes go through `req.tenantPrisma` (which is set by `tenantMiddleware` after `authMiddleware` resolves `req.user`).
- **Response envelope.** Success: `{ ok: true, data }`. Error: `{ ok: false, error: { code, message, details? } }`. The FE `lib/api.js` interceptor unwraps `data` on success and throws an `{ status, message, fields, code }` object on failure for `react-hook-form` to consume.
- **Auth flows belong to better-auth.** Don't roll bespoke `/login` / `/signup` handlers. The only "auth-adjacent" custom endpoint is `/api/company/register`, which wraps `auth.api.signUpEmail` inside a transaction so the User + Company are created atomically.
- **Static UI parity.** When a manager-static counterpart exists under `_tmp_leadpro/leadpro-realty/`, mirror its layout and copy; restyle to shadcn; never copy his CSS class names or his `useApp()` state.
- **Single-owner files.** `prisma/schema.prisma`, `frontend/src/App.jsx`, `Sidebar.jsx`, `lib/api.js`, `stores/authStore.js` — edited by their owner role only.

---

## 8. Problems hit & how we fixed them

- **Backend crash on boot:** `project.routes.js` imported `rbacMiddleware` as a default export, but the middleware module exports `{ rbacMiddleware, requireRole }` (named). Destructured the import — server boots. (Commit `8b125f1`.)
- **Login/Signup/Forgot didn't visually match the manager's static.** Side panel was on the wrong side, OAuth row + dividers + required asterisks + password strength meter were missing, branding said "Real Estate" / "RELMS" instead of "LeadPro Realty" on the auth side. Resolved end-to-end in S1-FE-A-03 (commits `9dbaef2`, `9fbfd8a`).
- **Session not picked up on first paint after signup.** `authStore.fetchSession()` is fired in `App.jsx`'s effect, but the signup flow now calls `setUser(user)` directly from the `/company/register` response so the user lands on `/onboarding/welcome` without a second roundtrip.

---

## 9. What's NOT in Sprint 1

Reject any PR claiming to add these as "small additions" during S1 — they belong elsewhere:

- **Leads.** No `Lead` CRUD, no lead list page beyond the placeholder. That's Sprint 2.
- **Pipeline / Kanban.** PipelineStage rows are seeded, but no stage-transition UI. Sprint 3.
- **Dashboards with real numbers.** The Dashboard route renders an `EmptyState` — three role-aware dashboards land in Sprint 4 against the `/api/dashboard/*` aggregate endpoints.
- **Activities, Notes, Tasks, Files, Notifications.** All Sprint 4.
- **Public marketing site, public contact form.** Specs exist (S1-FE-B-02, S1-BE-A-03), build deferred.
- **AI lead scoring, OAuth providers, WhatsApp / SMS, billing, RLS, SSO.** Out of MVP entirely.

---

## 10. File map (Sprint 1 deliverables)

**Backend**
```
backend/src/modules/company/
  company.routes.js        POST /register, GET /me, PATCH /me
  company.controller.js
  company.service.js       registerCompanyAndOwner (tx)
  company.validation.js
backend/src/modules/user/
  user.routes.js           POST /invite, GET /invite/:token, POST /invite/:token/accept, GET /me, GET /, GET /:id, PATCH /:id
  user.controller.js
  user.service.js
  user.validation.js
backend/src/modules/project/
  project.routes.js        GET, GET /:id, POST, PATCH /:id, DELETE /:id
  project.controller.js
  project.service.js
  project.validation.js
backend/src/middleware/    authMiddleware, tenantMiddleware, rbacMiddleware (already from S0)
backend/src/lib/auth.js    better-auth instance (already from S0)
```

**Frontend**
```
frontend/src/pages/auth/
  Login.jsx
  Signup.jsx
  ForgotPassword.jsx
frontend/src/components/auth/
  AuthShell.jsx
  AuthSide.jsx
frontend/src/pages/onboarding/
  Welcome.jsx
  Branding.jsx
  Team.jsx
frontend/src/pages/admin/
  Projects.jsx
frontend/src/components/projects/
  (project form + table column defs)
frontend/src/components/ui/
  checkbox.jsx, label.jsx   (added in S1-FE-A-03)
frontend/src/stores/authStore.js   (uses signIn/signOut/fetchSession/setUser from S0)
frontend/src/lib/api.js            (S0; consumed throughout S1)
frontend/src/index.css             (primary/accent/ring switched to purple in S1-FE-A-03)
```

---

## 11. Ready for Sprint 2?

Checklist:

- [x] OWNER can self-sign-up and reach `/dashboard` end-to-end
- [x] Invited teammates can accept and sign in
- [x] OWNER/ADMIN/MANAGER can create/edit/delete projects; AGENT can read
- [x] Auth pages match the static reference; primary hue + branding consistent across the shell
- [x] Backend boots cleanly; FE builds without warnings
- [ ] Run `npm run db:seed` if you want demo data before opening Sprint 2 lead tasks (still optional — leads will be created by hand during dev)

Sprint 2 (`docs/tasks/sprint-2-leads/`) starts on `Lead` CRUD with deduplication, source tracking, and assignment — backed by the same `tenantPrisma` + `requireRole` plumbing this sprint relied on.
