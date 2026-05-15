# How RELMS Works — Complete Project Flow (Plain English)

A walkthrough of the whole Real Estate Lead Management System (RELMS) in simple words. Every page, every flow, every section. Useful for onboarding new teammates, demoing the app, or filing the bug bash report.

---

## 1. What RELMS is (one paragraph)

RELMS is a multi-company SaaS for real-estate brokers. Each company that signs up gets its **own private workspace** — their leads, projects, agents, files, and pipeline are isolated from every other company. Inside a workspace, the owner invites teammates and gives them a role (Manager / Agent). The team captures leads, assigns them to agents, moves them through a sales pipeline (New → Contacted → Won/Lost), logs activities, schedules follow-ups, and tracks performance on dashboards.

```
┌─────────────────────────────────────────────────────────┐
│ The Internet                                            │
│   ┌─────────────┐         ┌──────────────────┐          │
│   │  Browser    │ ──HTTP──│  Vite frontend   │          │
│   │  (React app)│         │  localhost:5173  │          │
│   └─────────────┘         └────────┬─────────┘          │
│                                    │ axios + cookies     
│                           ┌────────▼─────────┐          │
│                           │ Express backend  │          │
│                           │ localhost:5000   │          │
│                           └────────┬─────────┘          │
│                                    │ Prisma             │
│                           ┌────────▼─────────┐          │
│                           │   PostgreSQL     │          │
│                           │ realestate_db    │          │
│                           └──────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Who uses it (the roles)

| Role | What they can do |
|---|---|
| **OWNER** | Created the company at signup. Full power: invite users, run dashboards, see revenue, configure pipeline, delete anything. |
| **ADMIN** | Same as OWNER except can't be the last admin standing. |
| **MANAGER** | Sees the whole team's work; can reassign leads, run team reports. No revenue numbers. |
| **AGENT** | Only sees their own leads + tasks + follow-ups. Personal worklist view. |
| **PLATFORM_ADMIN / SUPER_ADMIN** | Internal to the SaaS host. Sees all companies, can suspend orgs, sees platform stats. Not a tenant role. |

---

## 3. The big journey — from signup to daily use

```
   ┌─────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
   │ Landing │ →  │  Sign up   │ →  │ Onboarding │ →  │ Dashboard  │ →  daily use
   └─────────┘    │ (company)  │    │  wizard    │    │ (role)     │
                  └────────────┘    └────────────┘    └────────────┘
                       │                  │                 │
                       ▼                  ▼                 ▼
                  Creates new        Pipeline stages,   Leads, tasks,
                  company + the      branding, team     follow-ups,
                  first OWNER user   invites, projects  reports, files
```

Day 1 is the wizard. Day 2 onwards is the dashboard + the daily list view of leads and follow-ups.

---

## 4. Page-by-page flow

The frontend is a single-page React app. Every URL maps to one of four layouts:

```
   PublicLayout         AuthLayout         OnboardingLayout      DashboardLayout
   (marketing site)     (login/signup)     (4-step wizard)       (the actual app)
        │                    │                    │                      │
        ▼                    ▼                    ▼                      ▼
   /, /features,        /login, /signup,    /onboarding/welcome,  /dashboard, /leads,
   /pricing, /contact   /forgot-password,   /branding, /team,     /follow-ups, /reports,
                        /accept-invite      /projects, /pipeline  /users-mgmt, /files,
                                                                  /super-admin, /orgs,
                                                                  /profile, /settings
```

### 4.1 Public site (logged-out visitors)

| URL | Page | What it shows | What it does |
|---|---|---|---|
| `/` | **Landing** | Hero, features, testimonials, CTA buttons. | Sells the product. If user is already signed in, redirects to `/dashboard`. |
| `/features` | **Features** | Marketing feature grid. | Static. |
| `/pricing` | **Pricing** | Plan tiers. | Static. |
| `/contact` | **Contact** | Form: name, email, company, message. | POST `/api/public/contact` — saves to `ContactSubmission`. Rate-limited so it can't be spammed. |

### 4.2 Authentication

| URL | Page | What happens |
|---|---|---|
| `/login` | **Sign In** | Email + password → POST `/api/auth/sign-in/email`. On success, better-auth sets a session cookie; the React auth store remembers the user; redirect to `/dashboard`. |
| `/signup` | **Sign Up (company)** | Form for company name + owner email + password + plan. Hits POST `/api/company/register`. Behind the scenes this creates the **Company**, the **OWNER user**, the **9 default pipeline stages**, and signs them in. Redirects to `/onboarding/welcome`. |
| `/forgot-password` | **Forgot password** | Placeholder UI for now — emails reset link in future. |
| `/accept-invite?token=...` | **Accept Invite** (the page we just built) | Reads the token, calls `GET /api/users/invite/:token` to show *"You've been invited to <Company> as <Role>"*. User sets name + password. POST `/api/users/invite/:token/accept` creates their User row (auth.api.signUpEmail), stamps role/companyId/invitedBy, marks invite consumed. Frontend then signs them in and lands them on `/dashboard`. |

#### Auth flow diagram

```
   New visitor              Existing user                Invited teammate
        │                        │                            │
        ▼                        ▼                            ▼
   /signup                   /login                       email click
   POST /company/register    POST /auth/sign-in/email     /accept-invite?token=
   → company + OWNER         → session cookie set         GET /users/invite/:token
   → session cookie set      → redirect /dashboard        POST /users/invite/:token/accept
   → redirect onboarding                                  → signUpEmail + update role
                                                          → sign in
                                                          → redirect /dashboard
```

### 4.3 Onboarding wizard (first-time owner only)

A 4-step wizard the OWNER walks through right after signup. Each step writes to the backend so progress is durable.

| Step | URL | What the owner does | What the backend gets |
|---|---|---|---|
| 1. Welcome | `/onboarding/welcome` | Read intro + click Continue. | Nothing yet. |
| 2. Branding | `/onboarding/branding` | Upload logo, pick brand color, timezone, currency. | PATCH `/api/company/me` (logo URL, brandColor, timezone). |
| 3. Team | `/onboarding/team` | Invite teammates by email + role. Each invite triggers a real Gmail email (via Nodemailer + SMTP). | POST `/api/users/invite` per invitee. Returns inviteLink + emailSent flag. |
| 4. Projects | `/onboarding/projects` | Add first real-estate projects (name, location, type). | POST `/api/projects` per project. |
| 5. Pipeline | `/onboarding/pipeline` | Tweak/rename the 9 default stages, reorder, mark Won/Lost. | PATCH `/api/pipeline/stages/:id` + `/api/pipeline/stages/reorder`. Final "Finish" POSTs `/api/company/me/complete-onboarding`. |

After step 5 the wizard is locked off and the owner is on `/dashboard`.

### 4.4 Dashboard (the home screen after onboarding)

One URL — `/dashboard` — three completely different layouts depending on role:

```
        /dashboard
            │
            ▼
   useAuthStore().user.role  ─┬─► OWNER / ADMIN  →  OwnerDashboard
                              │
                              ├─► MANAGER       →  ManagerDashboard
                              │
                              └─► AGENT         →  AgentDashboard
```

| Dashboard | Audience | KPIs | Charts / Tables |
|---|---|---|---|
| **OwnerDashboard** | OWNER, ADMIN | Total Leads, New This Week, Converted, **Revenue Booked (₹)** | 30-day leads trend, Leads by status, Leads by source, Monthly bookings (6m), Recent leads feed, Top agents leaderboard |
| **ManagerDashboard** | MANAGER (and owners) | Assigned Leads, Pending Follow-ups, Conversion Rate %, Active Agents | Team performance table (per-agent leads, booked, conversion %) |
| **AgentDashboard** | AGENT only | My Leads, Today's Follow-ups, Hot Leads (priority=Hot), Bookings, Leads This Month | My active leads list (up to 8, excludes Won) |

All three hit `/api/dashboard/owner | /manager | /agent`. The backend reads everything via `tenantPrisma` so a manager in Company A never sees Company B's numbers.

### 4.5 Leads — the heart of the app

```
          /leads                /leads/new                /leads/:id
          (list)                (add)                     (detail)
            │                     │                         │
            ▼                     ▼                         ▼
   ┌────────────────┐    ┌────────────────┐       ┌──────────────────┐
   │ Table view OR  │    │ Form with      │       │ Tabs:            │
   │ Kanban view    │    │ name, phone,   │       │ Overview,        │
   │ Filters, search│    │ source, etc.   │       │ Activity,        │
   │ Pagination     │    │ Dedup warning  │       │ Notes (new),     │
   │ Bulk actions   │    │ if phone/email │       │ Tasks            │
   │ Import button  │    │ matches        │       │ Status transitions
   └────────────────┘    └────────────────┘       └──────────────────┘
```

| Page | What's on it | API |
|---|---|---|
| `/leads` (Table) | Sortable table: Name / Phone / Status / Assigned to / Source / Last contact. Filters by status, source, assignee, project. Search across name/phone/email. Bulk select → delete or assign. Two buttons in header: **Import** (CSV) and **Add Lead**. | GET `/api/leads?...` |
| `/leads` (Kanban) | Same page, toggled into a board view. Columns = pipeline stages. Drag a card from "Contacted" → "Qualified" updates the lead status. | GET `/api/pipeline/board`, POST `/api/leads/:id/transition` on drop |
| `/leads/new` | Quick form. As the user types phone/email, runs `/leads/check-duplicates` and warns inline if a lead already exists. | POST `/api/leads` |
| `/leads/:id` | Lead detail: contact info, project of interest, status badge, "Reassign" button. Sub-sections for Activity (immutable history), Notes (editable, hits `/api/notes`), Tasks. Status change requires a reason for "Lost". | GET `/api/leads/:id`, GET `/api/leads/:id/activity`, GET `/api/notes?leadId=...` |
| `/leads/:id/edit` | Full edit form for the lead. | PATCH `/api/leads/:id` |
| **Import modal** | 4-step state machine: pick CSV → preview first 5 rows → upload (progress bar) → result KPIs (Created / Skipped / Errors) with row-by-row details. Sample CSV downloadable from a button. | POST `/api/leads/import` (multipart) |

#### CSV import flow

```
   user clicks Import   ─►   pick .csv file
                                 │
                       ┌─────────┴───────────┐
                       │ papaparse preview   │
                       │ (first 5 rows, count)│
                       └─────────┬───────────┘
                                 │ user clicks "Import"
                                 ▼
                       POST /leads/import (multipart)
                                 │
                       ┌─────────┴───────────┐
                       │ multer→csv-parse    │
                       │ per row:            │
                       │  • zod validate     │
                       │  • dedup phone/email│
                       │  • create lead      │
                       └─────────┬───────────┘
                                 │
                                 ▼
                       { summary: {total,created,skipped,errors},
                         details: [{row,status,message,leadId}, …] }
                                 │
                                 ▼
                          UI shows KPI grid + drill-down table
```

### 4.6 Assign

`/assign` — a queue of leads with no agent. Manager/Owner can:

- **Manual**: pick a lead → pick an agent → assign with optional reason.
- **Auto**: button "Auto-assign N leads" → round-robin across active agents.
- **Bulk**: multi-select → assign all to one agent.

Hits `/api/leads/auto-assign`, `/bulk-assign`, `:id/assign`. Each assignment writes an Activity row + sends a notification to the new owner.

### 4.7 Follow-ups

`/follow-ups` — a date-grouped list of every lead that has a `nextFollowUpAt` set. Grouped buckets:

- **Overdue** (red)
- **Today** (amber)
- **This week** (blue)
- **Later**

Click a lead → goes to its detail page. Click "Mark done" → opens a quick form to log activity + clear or push the next follow-up.

### 4.8 Reports

`/reports` — three tabs:

1. **Sales** — revenue by month, deals by stage, win rate.
2. **Agents** — leaderboard with leads, bookings, conversion %, revenue.
3. **Lead Analytics** — source breakdown, time-to-conversion, lost reasons.

All driven by `GET /api/dashboard/reports` (the agent of which is restricted to OWNER/ADMIN/MANAGER on the backend, though the FE route gate is currently weak — see follow-ups in the audit).

### 4.9 Files

`/files` — a tenant-scoped library: brochures, agreements, marketing collateral.

```
   ┌─ Inline dropzone (drag or click) ─┐
   │  UploadCloud icon + hint text     │
   └───────────────────────────────────┘
   ┌─ Storage Usage card ──────────────┐
   │  Progress bar  used / limit GB    │
   └───────────────────────────────────┘
   ┌─ Files table (search, name/size/uploader/date/actions) ──┐
   │   • Eye = preview (image/PDF in new tab)                 │
   │   • Download = streamed via /:id/download                │
   │   • Trash = delete-confirm modal (owner or admin only)   │
   └──────────────────────────────────────────────────────────┘
```

Upload limit 10 MB per file. Stored on disk under `backend/uploads/<companyId>/general/<hash>.ext` (swap S3 for prod). API: `GET /api/files`, `GET /folders`, `GET /usage`, `POST /` (multipart), `GET /:id/download`, `DELETE /:id`.

### 4.10 Users Management

`/users-mgmt` — owner/admin only. Three tabs:

1. **Active users** — table of accepted users with avatar, name, role badge, status badge, last login, dept. Per-row: Pencil (edit name/role/dept) + UserX/UserCheck (deactivate/reactivate).
2. **Roles & Permissions** — read-only preview of the role matrix.
3. **Pending Invitations** — list of un-accepted invites. Each row has email, role, "Invited" relative time, expiry, and a **Resend** button that POSTs `/api/users/invite/:id/resend`, refreshes the expiry, and re-sends the email via Gmail SMTP.

The big **Invite User** button (top-right) opens a modal: email + name + role + dept → POST `/api/users/invite`. The backend creates an Invite row and fires an HTML invite email through Nodemailer. The frontend also copies the raw `inviteLink` to clipboard as a fallback in case the email is delayed.

### 4.11 Notifications

`/notifications` — bell-icon page. Lists every notification for the current user across types:

- `LEAD_ASSIGNED` — got a lead reassigned to you.
- `LEAD_STATUS_CHANGED` — your lead moved stages.
- `NOTE_ADDED` — someone added a note on your lead.
- `SYSTEM` — generic announcements.

Each row links to the related lead. Tabs: All / Unread / Mentions / System. Bulk actions: Mark all read, Clear all. APIs: `/api/notifications`, `/unread-count`, `/counts`, `/:id/read`, `/read-all`, `/:id` (DELETE), `/` (DELETE = clear all).

The bell badge in the top bar pulls from `/unread-count` every minute.

### 4.12 Profile & Settings

| URL | What |
|---|---|
| `/profile` | Edit own name, phone, dept, avatar. Change password (current + new + confirm). Hits `/api/users/me` and `/api/users/me/change-password`. |
| `/settings` | 13 left-nav tabs. **General / Branding / Appearance** are wired (PATCH `/api/company/me`). **Notifications / Integrations / Email & SMTP / Billing / Roles & Permissions / API Keys** are still UI stubs — they show fake "(stub)" success toasts because their backend endpoints haven't been built. Listed in the audit follow-ups. |

### 4.13 SuperAdmin & Orgs (platform-only)

These two URLs only work for users with `role = PLATFORM_ADMIN` or `SUPER_ADMIN`.

| URL | What |
|---|---|
| `/super-admin` | Platform stats (total companies, total users, active companies, monthly signups), recent signups feed, health card, activity log. Hits `/api/admin/stats|signups/recent|signups/weekly|health|activity`. |
| `/orgs` | Table of every company on the platform with status (Active / Suspended), plan, owner. Admin can suspend / reactivate / delete a company. Hits `/api/admin/companies/*`. Backed by `PlatformAudit` rows so every action is logged. |

Both routes are guarded server-side by the `requirePlatformAdmin` middleware (403 for non-platform users) but the frontend `RoleRoute` wrapping is missing — a non-platform user who knows the URL can land on the page; the page itself will just show 403 errors from the API. Follow-up in the audit.

---

## 5. Cross-cutting flows (the plumbing)

These aren't tied to one page — they run across many.

### 5.1 Multi-tenant isolation

```
   request →  authMiddleware  →  tenantMiddleware
                  │                    │
                  ▼                    ▼
            req.user set         req.tenantPrisma set
            (via better-auth     (Prisma extension that
             session cookie)      auto-injects companyId
                                  on every findFirst/Many/
                                  count/aggregate/etc.)
```

Every tenant-scoped service receives `req.tenantPrisma` and queries normally — the extension silently rewrites every `where` clause to include `companyId: <currentUser's company>`. **No service ever has to remember to filter manually**, and you cannot accidentally read another tenant's data through `findFirst`. The one gotcha (which we fixed today): `findUnique` / `update` / `delete` / `upsert` are NOT auto-scoped; for those you must either pre-validate with `findFirst` first or switch to `updateMany` / `deleteMany`.

### 5.2 Authentication (better-auth)

```
   sign-up / sign-in / accept-invite
                │
                ▼
        auth.api.signUpEmail
        auth.api.signInEmail        (better-auth + Prisma adapter)
                │
                ▼
        Set-Cookie: session
                │
                ▼
   Every later request includes the cookie
   authMiddleware verifies, attaches req.user
```

Roles are stored on the User row (`role` enum). The auth instance has an `additionalFields` config that surfaces `role`, `companyId`, `isActive` on the session payload.

### 5.3 Invite email flow

```
   Owner clicks "Invite"
        │
        ▼
   POST /users/invite { email, role, name }
        │
        ▼
   ┌─────────────────────────────────────┐
   │ Backend                             │
   │  1. Create Invite row (7-day token) │
   │  2. Build inviteLink                │
   │  3. Build HTML+text email           │
   │  4. sendMail() via Nodemailer + SMTP│
   │  5. Return { inviteLink, emailSent }│
   └─────────────────────────────────────┘
        │
        ▼
   Toast: "Invitation emailed to X — link also copied"
        │
        ▼
   Recipient opens email, clicks "Accept invite"
        │
        ▼
   /accept-invite?token=...
   Sign up + role stamp + sign in → /dashboard
```

If SMTP env vars aren't set, the backend falls back to logging the email to console and the toast says "(email not configured)".

### 5.4 The Activity feed

Every meaningful change in the system writes an immutable `Activity` row scoped to a Lead:

- Lead created (`SYSTEM`)
- Status changed (`STATUS_CHANGE`)
- Reassigned (`ASSIGNMENT`)
- Note added (`NOTE`, with `metadata.noteId`)
- Call / email / WhatsApp logged (`CALL`, `EMAIL`, `WHATSAPP`)

The Lead Detail page shows this as a timeline. Notes themselves are mutable, but the activity row pointing to a note is not — even after the note is deleted, the timeline keeps the "Note added" event.

### 5.5 Notifications

Same backend that writes Activity rows can also fire-and-forget a `notify()` call to create a Notification row for the affected user. Today:

- Lead assigned → notify assignee
- Lead status changed → notify assignee  
- Note added → notify assignee (unless the author IS the assignee)

The bell badge polls `/unread-count`.

---

## 6. Tech stack — at a glance

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, react-router-dom v6, zustand (auth store), axios, react-hook-form + zod, lucide-react icons, sonner toasts, papaparse (CSV preview), no shadcn/Tailwind (uses bespoke leadpro CSS) |
| Backend | Node 24, Express, Prisma 6, PostgreSQL, better-auth, multer (uploads), csv-parse, nodemailer (Gmail SMTP), pino logger, helmet, cors, zod |
| Database | Postgres `realestate_db` — 16 models: Company, User, Invite, Session/Account/Verification (better-auth), Lead, Project, Task, PipelineStage, Activity, Note, Notification, PlatformAudit, ContactSubmission, File |
| Dev | nodemon, prisma migrate dev, vite hot-reload |

---

## 7. What's still pending (Sprint 4 sign-off)

Only **S4-shared-01 Bug Bash**: a half-day team activity where each intern walks through the 15-step end-to-end script, compares visually against the leadpro-realty reference, files issues, fixes Sev1s the same day, records a 5-min demo video. By design this is a manual activity, not a code task.

Pre-bash follow-ups worth landing (from the recent audit):

1. Wrap admin-only routes in `<RoleRoute>` on the frontend (`/users-mgmt`, `/super-admin`, `/orgs`, `/reports`, `/assign`, `/projects`).
2. Standardize response envelope to `{ ok: true, data }` everywhere (currently `company.controller.js` and `rbacMiddleware.js` use `{ success: ... }`).
3. Add DB indexes on `Lead.status`, `Note.leadId`, `Activity.leadId/userId`.
4. Replace the 6 stub Settings tabs (Notifications/Integrations/SMTP/Billing/Roles/API Keys) with either real endpoints or a "Coming soon" empty state — they currently show fake success toasts.

---

*Last updated 2026-05-14. Maintained alongside the per-sprint summaries in `docs/sprint-0-and-1-simple-summary.md` and `docs/sprint-2-and-3-simple-summary.md`.*
