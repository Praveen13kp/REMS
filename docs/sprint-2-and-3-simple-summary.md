# RELMS — Sprint 2 & Sprint 3 (Simple Summary)

**Date:** 2026-05-13
**Audience:** Anyone new to the project (intern, stakeholder, new dev).
**Goal of this doc:** Explain in plain words what we built in Sprints 2 and 3, how the pieces talk to each other, and what libraries we used. Follow-on to `sprint-0-and-1-simple-summary.md`.

---

## 1. Where we are

After Sprint 0+1 you could:
- Sign up a company and an owner.
- Run an onboarding wizard (branding, team invites, projects, pipeline preview).
- Log in / log out.

**Sprint 2 added Leads + Users management.** Now the team can actually do real work: capture leads, assign them to agents, manage roles.

**Sprint 3 added the Pipeline.** Now leads flow through stages (New → Contacted → Won, etc.), and each lead has a detail page. There's also a Kanban view and a Follow-Ups / My Tasks page.

---

## 2. Sprint 2 — What we built

### 2.1 Leads CRUD (backend + frontend)

A **lead** is a person interested in buying a property. Fields:
- `name`, `phone`, `email`
- `source` (Website, WhatsApp, Walk-in, Referral…)
- `status` (the pipeline stage it's in — defaults to "New")
- `budget`, `requirementType`, `city`, `interestedProjectId`
- `priority` (Hot / Warm / Cold), `score`, `tags[]`
- `assignedToId`, `createdById`, `companyId`
- `lastContactedAt`, `nextFollowUpAt`

**Backend endpoints (`/api/leads`):**
| Method | Path | Who |
|---|---|---|
| `GET` | `/` | List with filters (search, status, source, assignee, project, sort, pagination) |
| `POST` | `/` | Create a lead |
| `GET` | `/:id` | Get one lead |
| `PATCH` | `/:id` | Update fields (but NOT status — that goes through `/transition`) |
| `DELETE` | `/:id` | Soft remove |
| `POST` | `/check-duplicates` | Used by the form on phone/email blur |
| `POST` | `/:id/assign` | Manager / owner reassigns |
| `POST` | `/bulk-assign` | Bulk reassign N leads |
| `POST` | `/auto-assign` | Round-robin to active agents |
| `GET` | `/unassigned` | List unassigned leads |

**Frontend pages:**
- `/leads` — paginated list with filter chips, sort by name/createdAt, bulk delete, tabs (All Leads / My Leads).
- `/leads/new` — full-page form (zod-validated). On phone/email blur it calls `POST /api/leads/check-duplicates` and shows an inline banner if a hard match exists.

### 2.2 Users / Team management

**Backend endpoints (`/api/users`):**
| Method | Path | Who |
|---|---|---|
| `GET` | `/` | List company users + pending invites |
| `POST` | `/invite` | Invite by email + role |
| `GET` | `/invite/:token` | Resolve an invite (used by accept page) |
| `POST` | `/invite/:token/accept` | New user sets their name + password |
| `GET` | `/me` | Current user profile |
| `PATCH` | `/me` | Update own profile |
| `POST` | `/me/change-password` | Self-service password change |
| `GET` | `/workload` | Per-agent active lead count |
| `GET` / `PATCH` | `/:id` | Owner/admin manages one user |

> ⚠️ **Heads-up:** Invites are stored in the DB and a token link is returned to the FE, but **no email is actually sent** today (`nodemailer` is in deps but unused). The OWNER/ADMIN copies the invite link from the Team page and shares it manually.

**Frontend:**
- A team-management table inside onboarding (`Team.jsx`) and in the main app, with invite form + status badges (PENDING / ACTIVE).

### 2.3 Onboarding "finish"

The onboarding wizard from Sprint 1 was wired all the way through. After the user clicks **Finish setup** on the Pipeline step:
- Calls `POST /api/company/me/complete-onboarding`
- Backend flips `Company.onboardingCompleted = true`
- Redirects to `/dashboard`

---

## 3. Sprint 3 — What we built

This is the real "CRM" sprint: pipeline + activity + tasks.

### 3.1 Activity-log helper (BE plumbing)

A tiny module that every service uses to record what happened: lead created, status changed, lead assigned, task completed, etc.

```js
await logActivity(tenantPrisma, {
  leadId, userId,
  type: "STATUS_CHANGE",
  content: "Moved from Contacted to Qualified",
  metadata: { from: "Contacted", to: "Qualified" }
});
```

Activities are read on the **Lead Detail** page as a timeline.

### 3.2 Pipeline stages API

A **PipelineStage** is one column of the funnel (New, Contacted, Qualified, Won, Lost…). Default stages are seeded when a company signs up.

**Endpoints (`/api/pipeline`):**
| Method | Path | What |
|---|---|---|
| `GET` | `/stages` | All stages, sorted by `order` |
| `PATCH` | `/stages/:id` | Rename / change probability |
| `PATCH` | `/stages/reorder` | Drag-drop reorder |
| `GET` | `/board` | Kanban shape — stages with their leads, capped 50 per column |

### 3.3 Lead status transition

Changing a lead's status is **not** a normal `PATCH` — it has rules:
- Records an activity entry automatically.
- If the target stage is `isLost`, a **reason** is required.
- Updates `lastContactedAt`.

```
POST /api/leads/:id/transition
body: { toStatus: "Qualified", reason?: "…" }
```

### 3.4 Tasks module

A **Task** is a to-do attached to a lead or project (e.g. "Call Ramesh on Tuesday").

**Endpoints (`/api/tasks`):**
- `GET /` — list with filters (`assignedToId`, `status`, etc.)
- `POST /` — create
- `POST /:id/complete` — mark done (also logs an activity)
- `GET /:id`, `PATCH /:id`

### 3.5 My Tasks / Follow-Ups page (FE)

`/follow-ups` shows the current user's open follow-ups, bucketed (Today / Overdue / Upcoming). Currently reads from `/api/leads` and buckets client-side using `nextFollowUpAt`; planned to migrate to `/api/tasks`.

### 3.6 Lead Detail page (FE)

`/leads/:id` — the single most important page for an agent. Shows:
- Header card: name, phone, email, source, status badge, assignee
- Activity timeline (auto-populated by every action)
- Quick Actions panel (some buttons stubbed for now — Schedule Follow-Up, Add Note, Log Site Visit, Send Email)
- Reassign modal, status transition control

### 3.7 Kanban board (FE)

`/leads?view=kanban` — visual pipeline.
- One column per stage, lead cards inside.
- **Drag-drop** between columns calls `POST /api/leads/:id/transition` optimistically; reverts on error.
- Drop onto a Lost stage opens a small modal asking for a reason (required by backend).
- Same filters as the Table view (search, assignee, project).

---

## 4. The flow, end-to-end

```
1. AGENT logs in           →  /dashboard (agent view)
2. AGENT opens             →  /leads
3. AGENT toggles to Kanban →  /leads?view=kanban
4. AGENT drags lead from "New" → "Contacted"
                              │
                              └─→ POST /api/leads/:id/transition
                                  └─ updates Lead.status
                                  └─ activity row created
                                  └─ optimistic UI move
5. AGENT clicks the card   →  /leads/:id (Lead Detail)
                              │
                              └─→ GET /api/leads/:id
                              └─→ GET /api/leads/:id/activities (timeline)
6. AGENT marks "Won"       →  /transition with toStatus="Won"
                              └─ stage.isWon = true → counts as revenue
                              └─ activity row created
7. Owner opens /dashboard  →  GET /api/dashboard/owner
                              └─ sees +1 in Converted, revenue updated
```

---

## 5. Libraries we use (and why)

### Backend
| Library | What for |
|---|---|
| **Express 5** | HTTP server |
| **Prisma 6** | Database ORM (Postgres). `tenantPrisma` middleware scopes every query by `companyId`. |
| **better-auth** | Session-cookie auth. Owns `/api/auth/*`. |
| **zod 4** | Request body validation. `safeParse(...).error.issues[0]` — note `issues`, not `errors` (v4 change). |
| **pino** | Structured logging |
| **express-rate-limit, helmet, cors, cookie-parser** | Standard hardening |
| **nodemailer** | Installed but not yet used (email sending pending) |

### Frontend
| Library | What for |
|---|---|
| **React 19 + Vite 8** | App + bundler |
| **react-router-dom 7** | Routing |
| **react-hook-form + @hookform/resolvers + zod** | All forms |
| **zustand** | Auth store (`useAuthStore`) and a few other small stores |
| **axios** | HTTP client (`lib/api.js` with `withCredentials: true`). Interceptor flattens both our backend's `{ ok, error }` shape **and** better-auth's `{ code, message }` shape into a consistent error. |
| **@dnd-kit/core + @dnd-kit/sortable** | Kanban drag-drop (only the inner card is leadpro-styled; the dnd wrappers are headless) |
| **lucide-react** | Icons (avoid the brand icons removed in v1 — use `Globe` / `CodeSquare` instead of `Chrome` / `Github`) |
| **sonner** | Toast notifications |
| **next-themes** | Light/dark theme |
| **chart.js + react-chartjs-2** | Dashboard charts (Sprint 4) |
| **tailwindcss 4** | Used sparingly — we mostly use the leadpro CSS classes from `styles/leadpro.css` (`.card`, `.kpi`, `.lead-card-grid`, etc.) |

### What we **don't** use
- shadcn `Card`, `Dialog`, `Tabs` etc. — leadpro CSS classes win on this project.
- `recharts` — chart.js, not recharts. (We had to undo a recharts attempt in Sprint 4.)
- `useApp()` from leadpro — that was demo plumbing. We use real stores + API services.

---

## 6. Important conventions / gotchas

1. **Status only changes via `/transition`.** Trying to PATCH `status` returns 400.
2. **Reason is required for Lost stages.** The Kanban modal enforces this; backend rejects otherwise.
3. **Multi-tenant isolation.** Every Prisma call goes through `req.tenantPrisma`, which filters by the logged-in user's `companyId`. Never reach for plain `prisma` in business code.
4. **`Lead.budget` is a String.** It might be `"₹50,00,000"` or `"5000000"`. The dashboard service strips non-digits to do revenue math.
5. **`zod v4` uses `error.issues[0]`** — not `error.errors[0]`. Forgetting this turns 400s into 500s silently.
6. **No emails get sent yet.** Invite flow returns a token link only; the OWNER copies it manually. Real SMTP is on the post-MVP list.
7. **The `won` stage name is not hardcoded.** Aggregates look at `PipelineStage.isWon` so renaming the stage doesn't break revenue counting.

---

## 7. Status check

| Sprint | Status |
|---|---|
| Sprint 0 — Foundation | ✅ |
| Sprint 1 — Onboarding | ✅ |
| Sprint 2 — Leads + Users | ✅ |
| Sprint 3 — Pipeline + Kanban + Tasks + Lead Detail | ✅ |
| Sprint 4 — Dashboards (Owner / Manager / Agent) | 🟡 4/16 tasks done (S4-BE-A-01, S4-FE-A-01, S4-FE-A-02, S4-FE-A-03) |
| Reports, Notes, CSV import, Files, Notifications, Super-admin | 🔲 not started |

That's the picture. If you can sign up → onboard → add a lead → drag it across the Kanban → see the dashboard numbers update, the Sprint 2/3 work is doing what it was scoped to do.
