# RELMS — Sprint 0 & Sprint 1 (Simple Summary)

**Date:** 2026-05-12
**Audience:** Anyone new to the project (intern, stakeholder, new dev).
**Goal of this doc:** Explain in plain words what we built in the first two sprints, why we built it, which libraries we used, and how the pieces talk to each other.

For the deep technical record, see `sprint-0-summary.md` and `sprint-1-summary.md`.

---

## 1. What is this project?

**RELMS** (Real Estate Lead Management System) is a multi-tenant SaaS web app.

- A real estate company signs up → gets their own private workspace.
- Inside the workspace, the team manages **Leads**, **Projects** (inventory), **Pipeline stages**, and **Tasks**.
- Different roles see different things: **OWNER**, **ADMIN**, **MANAGER**, **AGENT**.

Sprints 0 and 1 only build the **foundation + onboarding**. Real lead/pipeline/dashboard work comes in Sprints 2–4.

---

## 2. Sprint 0 — "Build the platform" (foundation)

**Window:** 2026-05-09 → 2026-05-11
**Goal:** Set up the skeleton so feature sprints can just "drop pages and APIs in".

### What we built (in simple words)

| Piece | What it does |
|---|---|
| **Backend folder structure** | One folder per feature (`modules/company`, `modules/lead`, etc.) instead of mixed `controllers/routes/services` folders. Easier to find things. |
| **Real authentication** | Replaced the old "plaintext password" code with `better-auth`. Now passwords are hashed, sessions live in cookies, and login/signup are battle-tested. |
| **Tenant isolation** | Built `tenantPrisma` — a Prisma wrapper that **automatically** adds `companyId` to every query. This means Company A can never accidentally see Company B's data. |
| **Database schema + seed** | Designed the tables (Company, User, Lead, Project, Task, Activity, Note, PipelineStage) and wrote a `seed.js` script so devs can populate demo data. |
| **Frontend shell** | Built the app shell: login page, dashboard layout, sidebar (role-aware), navbar with theme toggle, route guards. |
| **Static-UI map** | The manager gave us a static HTML/CSS design. We mapped every CSS class to a `shadcn` component so all later pages look consistent. |
| **Logger + env validation + error handler** | `pino` for logs, `zod` to validate `.env` on boot, central error middleware that returns a standard JSON shape. |

### Why this had to come first

If we'd jumped straight to "build leads page", every later task would have rewritten the same boilerplate (auth, tenancy, layouts). Doing it once means Sprint 2+ tasks are just "add a route, add a page".

---

## 3. Sprint 1 — "Let a real company sign up and start working" (onboarding)

**Window:** 2026-05-11 → 2026-05-12
**Goal:** A brand-new company can self-sign-up, invite teammates, and create projects — without any "TODO" pages.

### What we built

| Piece | What it does |
|---|---|
| **Company self-registration** | `/signup` page → fills company name + owner details + password → backend creates Company + Owner User + default 7-stage pipeline in one transaction. |
| **Onboarding wizard** | After signup, owner walks through Welcome → Branding (logo, brand color) → Team invites → Dashboard. |
| **User invite + accept** | Owner/Admin invites teammates by email. They click the email link → set a password → land in the app. |
| **Project CRUD** | Owner/Admin/Manager can create, edit, delete real estate projects (inventory). Agents can only view. |
| **Login / Signup / Forgot-password pages** | Polished to match the manager's static design — purple theme, two-column layout, password strength meter. |

### What is intentionally **NOT** in Sprint 1

- Lead management → Sprint 2
- Pipeline / Kanban → Sprint 3
- Real dashboards with numbers, Notes, Tasks, Files, Notifications → Sprint 4
- Public marketing site & contact form → spec written, build deferred

---

## 4. The three layers (separate explanation)

The app is split into three layers. Each one has a clear job.

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND  (React + Vite)                 │
│   - What the user sees and clicks                            │
│   - Forms, tables, routes, role-based menus                  │
│   - Talks to backend over HTTP (axios) with cookies          │
└───────────────────────────────┬──────────────────────────────┘
                                │  HTTPS + cookie
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     BACKEND  (Express + Node)                │
│   - Receives requests, checks login + role                   │
│   - Validates input with zod                                 │
│   - Talks to DB through Prisma (tenantPrisma wrapper)        │
│   - Returns JSON: { ok: true, data } or { ok: false, error } │
└───────────────────────────────┬──────────────────────────────┘
                                │  SQL via Prisma
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     DATABASE  (PostgreSQL)                   │
│   - Tables: Company, User, Account, Session, Invite,         │
│     Project, Lead, PipelineStage, Task, Activity, Note       │
│   - Every tenant table has a companyId column                │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Frontend (React app — `frontend/`)

**Job:** Show pages, collect form data, send requests, handle role-based UI.

**What lives here:**

- **Pages** (`src/pages/`) — Login, Signup, Forgot, Onboarding (Welcome/Branding/Team), Dashboard, Projects, Leads, Team.
- **Layouts** (`src/layouts/`) — `AuthLayout` (no sidebar), `DashboardLayout` (sidebar + navbar), `OnboardingLayout`.
- **Route guards** — `ProtectedRoute` (must be logged in), `RoleRoute` (must have allowed role).
- **Auth store** (`src/stores/authStore.js`) — keeps the logged-in user in memory using **zustand**.
- **API client** (`src/lib/api.js`) — one **axios** instance with `withCredentials: true` so the cookie flows on every call.

**Libraries used and why:**

| Library | Why |
|---|---|
| **React 19** | UI framework |
| **Vite** | Fast dev server + builder |
| **React Router 7** | Page navigation |
| **Tailwind CSS 4** + **shadcn** + **Radix** | Styling + ready-made accessible components (Button, Dialog, Table, etc.) |
| **axios** | HTTP requests; auto-sends cookie |
| **zustand** | Tiny state library for the logged-in user |
| **react-hook-form** + **zod** | Forms with validation. Same `zod` schemas can be reused on backend. |
| **sonner** | Toast notifications |
| **next-themes** | Light/dark/system theme toggle |
| **lucide-react** | Icons |
| **date-fns** + **react-day-picker** | Date formatting + date picker |

### 4.2 Backend (Express API — `backend/`)

**Job:** Authenticate the user, scope data to their company, validate input, talk to DB, return JSON.

**Folder layout (modules-only):**

```
src/
  modules/
    company/   { routes, controller, service, validation }
    user/      { routes, controller, service, validation }
    project/   { routes, controller, service, validation }
    lead/      ...
  middleware/  authMiddleware, tenantMiddleware, rbacMiddleware, errorMiddleware
  lib/         auth.js (better-auth), tenantPrisma.js, env.js, logger.js, ApiError.js
  config/      prisma.js (Prisma client singleton)
  routes/      index.js (mounts all modules under /api)
```

**Request lifecycle (every protected request):**

```
HTTP request
  → cookie-parser            (read cookies)
  → CORS + helmet            (security)
  → pino-http                (log it)
  → /api/auth/*  ← better-auth handles its own routes
  → authMiddleware           (decode cookie → req.user)
  → tenantMiddleware         (build req.tenantPrisma scoped to companyId)
  → rbacMiddleware           (check role)
  → module controller        (business logic)
  → service                  (Prisma queries via req.tenantPrisma)
  → response: { ok: true, data: ... }
  → errorMiddleware          (if anything throws, return { ok: false, error })
```

**Libraries used and why:**

| Library | Why |
|---|---|
| **Express 5** | HTTP framework |
| **better-auth** | Signup, login, sessions, password hashing — done right, no rolling our own |
| **Prisma 6** | Type-safe ORM + migrations |
| **pg** | PostgreSQL driver |
| **zod** | Validate request bodies + `.env` |
| **pino** + pino-http + pino-pretty | Structured logs |
| **helmet**, **cors**, **cookie-parser** | Security + cookie auth across origins |
| **nodemailer** | Send invite emails |
| **dotenv** | Load `.env` |
| **cloudinary** + **multer** | File uploads (installed, used in Sprint 4) |

### 4.3 Database (PostgreSQL via Prisma)

**Job:** Store all data. Enforce that every tenant table has a `companyId` so multi-tenancy is real.

**Key tables (after Sprint 0+1):**

| Table | What it holds |
|---|---|
| `Company` | One row per customer company. Brand, plan, onboarding state. |
| `User` | All people. Has `companyId` + `role` (OWNER/ADMIN/MANAGER/AGENT). |
| `Account` | better-auth — hashed passwords, OAuth links. |
| `Session` | better-auth — active login sessions. |
| `Verification` | better-auth — email verification / password reset tokens. |
| `Invite` | Invite tokens for team members. |
| `Project` | Real estate projects (inventory leads are tagged against). |
| `Lead` | Customer leads (filled in Sprint 2). |
| `PipelineStage` | 7-stage default pipeline per company (used in Sprint 3). |
| `Task` | Follow-ups on leads (Sprint 3). |
| `Activity` | Audit / timeline log (Sprint 3). |
| `Note` | Free-text notes attached to leads (Sprint 4). |

**Why a `companyId` on every tenant table?**
Because RELMS is multi-tenant: many companies share one database. The `tenantPrisma` wrapper automatically adds `where: { companyId }` to every query, so a developer can't accidentally leak data between companies.

**Migrations applied so far:** 3 (init, add OWNER role, better-auth + relations).

---

## 5. End-to-end flow chart — "New customer signs up"

```
 ┌─────────────────────┐
 │   User opens         │
 │   /signup            │
 └─────────┬────────────┘
           │ fills form
           ▼
 ┌──────────────────────────────────────────────┐
 │  FRONTEND  (Signup.jsx)                      │
 │   react-hook-form + zod validate locally     │
 │   axios POST /api/company/register           │
 └─────────┬────────────────────────────────────┘
           │  (cookie not set yet)
           ▼
 ┌──────────────────────────────────────────────┐
 │  BACKEND   /api/company/register             │
 │   zod validates body                         │
 │   Prisma transaction:                        │
 │     1) Company.create                        │
 │     2) better-auth signUpEmail → User+Account│
 │     3) User.update role=OWNER, companyId     │
 │     4) PipelineStage.createMany x 7          │
 │   better-auth issues session cookie          │
 └─────────┬────────────────────────────────────┘
           │  Set-Cookie: better-auth.session=...
           ▼
 ┌──────────────────────────────────────────────┐
 │  DATABASE  (PostgreSQL)                      │
 │   New rows in Company, User, Account,        │
 │   Session, PipelineStage                     │
 └─────────┬────────────────────────────────────┘
           │  response { ok: true, data: { user } }
           ▼
 ┌──────────────────────────────────────────────┐
 │  FRONTEND                                    │
 │   authStore.setUser(user)                    │
 │   navigate('/onboarding/welcome')            │
 └─────────┬────────────────────────────────────┘
           ▼
 ┌──────────────────────────────────────────────┐
 │  Onboarding wizard                           │
 │    Welcome → Branding (PATCH /company/me)    │
 │             → Team    (POST /users/invite x N)│
 │             → Finish  (onboardingCompleted)  │
 └─────────┬────────────────────────────────────┘
           ▼
 ┌─────────────────────┐
 │   /dashboard         │
 │   (logged in, ready) │
 └─────────────────────┘
```

---

## 6. End-to-end flow chart — "Logged-in user creates a project"

```
USER clicks "New project"
    │
    ▼
FRONTEND  Projects.jsx
    Dialog form (react-hook-form + zod)
    axios POST /api/projects   (cookie auto-attached)
    │
    ▼
BACKEND   /api/projects (POST)
    cookie-parser
    → authMiddleware       (cookie → req.user)
    → tenantMiddleware     (req.tenantPrisma scoped by companyId)
    → rbacMiddleware       (OWNER / ADMIN / MANAGER only)
    → project.controller   → project.service
        req.tenantPrisma.project.create({ data })
        ▼ Prisma adds companyId automatically
    │
    ▼
DATABASE  INSERT INTO "Project" (..., companyId) VALUES (...)
    │
    ▼
BACKEND   { ok: true, data: project }
    │
    ▼
FRONTEND  toast.success("Project created")
          refetch list / optimistic insert
```

---

## 7. Conventions (the team agreed on these)

These are the rules every new piece of code must follow:

1. **One folder per feature.** Code lives in `backend/src/modules/<feature>/`. No top-level `controllers/` or `routes/` folders.
2. **Never import Prisma directly in a feature service.** Always use `req.tenantPrisma`. This guarantees `companyId` scoping.
3. **Response shape is fixed.**
   - Success: `{ ok: true, data: ... }`
   - Error: `{ ok: false, error: { code, message, details? } }`
4. **Auth is owned by `better-auth`.** Don't write custom login/signup. The only wrapper is `/api/company/register` (because it does Company + User in one transaction).
5. **Static-UI parity.** If the manager's static design has a counterpart page, mirror its layout + copy, but use `shadcn` components — not the static's hand-written CSS.
6. **`.env` is validated with `zod` on boot.** If a required var is missing, the backend refuses to start.

---

## 8. Where to look next

| You want to… | Read… |
|---|---|
| Start a Sprint 2 task | `docs/tasks/sprint-2-leads/` + `docs/design/lead-module.md` |
| Understand which shadcn component replaces which static CSS class | `docs/STATIC-UI-MAP.md` |
| See the full technical history of Sprint 0 | `docs/sprint-0-summary.md` |
| See the full technical history of Sprint 1 | `docs/sprint-1-summary.md` |
| Pipeline design (used in Sprint 3) | `docs/design/pipeline-module.md` |

---

## 9. Status as of 2026-05-12

- ✅ Backend boots cleanly, all 3 migrations applied.
- ✅ Frontend builds without warnings.
- ✅ Owner can sign up → onboard → invite team → create projects.
- ✅ Auth pages styled to match the static reference.
- ⏳ Public marketing site + public contact form — specs written, build deferred.
- 🚀 **Ready to start Sprint 2 (Leads).**
