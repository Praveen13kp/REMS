# RELMS — Full System Flow

A plain-words walkthrough of every page and how the pieces fit together. Updated for the latest build (Subscribe-flow, paid Basic plan, FollowUp history, etc.).

This is meant to be read top-to-bottom; the User Roles below set up the language used everywhere else.

---

## 0. People who use the app

- **Visitor** — anyone on the marketing site, no account.
- **Owner** — the person who signs up the company. Has every permission.
- **Admin** — owner-equivalent for day-to-day; can't touch a few owner-only screens.
- **Manager** — runs a team of agents. Sees the team's work.
- **Agent** — the salesperson, sees only their own leads.
- **Broker** — an outside agent invited to help sell. Has a stripped-down portal.
- **Super Admin** — Bizzfly staff. Sees every company on the platform.

---

## 1. Public pages (no login)

### Landing (`/`)
Marketing home. Hero, features blurb, pricing teaser, testimonials. If you're already logged in, this page bounces you to the dashboard so you don't have to log in again.

### Pricing (`/pricing`)
Three cards — **Basic ₹499/mo · Pro ₹2,499/mo · Enterprise ₹8,999/mo**. Each card has a "7-day free trial included" badge and a toggle for monthly / annual billing (annual gives roughly 20% off). Numbers come straight from the DB so they always match what Billing shows.

### Features (`/features`)
Plain explainer of what the app can do — lead capture, kanban pipeline, reports, integrations. Static page.

### Contact (`/contact`)
Form for non-customers to reach out. Posts to a public endpoint that logs the message internally.

---

## 2. Sign-up & login

### Sign-up (`/signup`)
Three required fields: **company name, email, password** (+ confirm). That's it — we removed the "company type" question because users were dropping off. The user will fill that in later from Profile.

When submitted:
1. A new **Company** is created (status = ACTIVE, trial = 7 days from now).
2. The first user is created as **Owner** of that company.
3. We log them in automatically with a session cookie.
4. **They go to `/signup/welcome`** (not the dashboard — there's a step in between).

### Signup welcome (`/signup/welcome`) — NEW
A friendly "Welcome to LeadPro" screen with two big cards:

- **Start Free Trial** → keeps the default plan (Basic) and jumps straight to onboarding. They can pick a plan later.
- **Subscribe** → opens `/signup/choose-plan` to pick a plan first.

Both ultimately end at the dashboard; the difference is whether they've committed to a plan before they get there.

### Choose plan (`/signup/choose-plan`) — NEW
Lists all three plans with the same monthly/annual toggle as the Pricing page. Each has a "Start 7-day trial" button. Clicking it calls `POST /billing/start-trial`, sets the company's plan + opens a 7-day trial window, then forwards to onboarding. **No payment is collected here** — that happens later from the Billing page when the trial is near ending.

### Login (`/login`)
Standard email + password. Two extra paths:
- **Continue with Google** — OAuth flow. Only works for emails that already exist in our DB (no sign-ups via Google).
- **Multi-company email** — if your email is on multiple companies, we show a "Pick your workspace" screen.

If your company has been **suspended or deleted** by the platform admin, you get a clear red banner ("Account suspended — Contact support to reactivate") instead of a vague error.

### Forgot / Reset password
Standard email-link flow. Link expires in 30 minutes.

### Accept invite (`/accept-invite?token=...`)
The page invitees land on. Shows the inviter, the company, and the role. They set their name + password and become a real user. After this they can log in normally.

---

## 3. Onboarding wizard (first time only)

After signup, every Owner walks through 5 quick steps:

1. **Welcome** — friendly intro.
2. **Branding** — upload company logo, pick a brand color.
3. **Team** — invite the first managers/agents (sends invite emails).
4. **Projects** — add the real-estate projects you sell (name, city, type).
5. **Pipeline** — review and tweak the lead stages (New → Contacted → Site Visit → Negotiation → Booked / Lost).

When the wizard finishes, the company is marked "onboarded" and the wizard is never shown again — they go straight to the dashboard from now on. They can skip steps; nothing is mandatory.

---

## 4. Main tenant app

### Dashboard (`/dashboard`)
Home screen. **Looks different per role:**

- **Owner / Admin** — company-wide KPIs (total leads, conversion %, revenue, top agents, source split).
- **Manager** — their team's stats (their agents' workloads, hot leads, follow-ups due today).
- **Agent** — personal stats (my leads, my tasks today, my pipeline value).

All cards pull from real DB aggregations via `/dashboard/{owner|manager|agent}`. Numbers are not faked.

### Leads (`/leads`)
The heart of the app. Two views toggled at the top:

- **Kanban board** — drag a lead card from one stage to the next. Dropping a lead in **Lost** opens a modal asking "Why is this lead lost?" so a reason is captured. Dropping in **Booked** marks it won.
- **Table view** — sortable rows with filters (source, owner, stage, date, etc.) and CSV export.

Filters are saved in the URL so a manager can share a filtered link with a teammate.

### Lead detail (`/leads/:id`)
Everything about one lead on one page:

- **Header** — name, phone, email, current stage badge, assigned agent.
- **Activity timeline** — every change (stage moves, notes, calls, emails, file uploads) in order.
- **Notes** — free-text notes from the team.
- **Tasks** — to-dos for this lead (call back, send brochure).
- **Files** — PDFs / images attached to this lead.
- **Follow-ups** — scheduled callbacks for this lead (each one is a row in the new FollowUp table).
- **Stage actions** — quick buttons to advance / regress through the pipeline.

### Add lead (`/leads/new`)
Simple form (name, phone, source required; budget/project optional). **Manager+ only** — agents work the leads assigned to them, they don't create their own.

### Assign (`/assign`)
Bulk-assign screen for managers. Unassigned leads on the left, agents on the right with their current workload (so you can distribute fairly). Pick leads → pick agent → assign.

### Follow-Ups (`/follow-ups`) — REBUILT THIS SESSION
A daily action board powered by the new **FollowUp** table.

Three sections, server-side bucketed:
- **Missed** — anything past due (red, urgent).
- **Today** — anything due today.
- **Upcoming** — anything in the future.

Each row has these actions:
- **Call** / **WhatsApp** — direct dial / WA Web link (or auto-dialer for masked agents).
- **Reschedule** — opens a datetime picker, updates the follow-up date.
- **Mark done** — opens a modal that captures **outcome** (Called / No answer / WhatsApp / Emailed / Met / Other) + optional notes. Logs to the lead's activity timeline with the right icon.
- **Cancel** — removes the follow-up entirely.

Every follow-up persists as its own row, so you get history (who called when, with what outcome).

### Tasks (`/tasks`)
Personal to-do list, not tied to a specific lead. Title, due date, priority, done/undone.

### Reports (`/reports`) — REBUILT THIS SESSION
Three tabs:

1. **Sales Analytics** — KPIs (Bookings, Revenue, Avg Deal, Conversion Rate) with **real prior-period deltas** (e.g. "+24% vs prev" is now actually computed, not hardcoded). Plus a **Revenue Trend** line chart (last 6 months, year-aware), **Funnel** by your real pipeline stages, and **Conversion by Project**.
2. **Agent Performance** — per-agent: leads, active, booked, **real call / WhatsApp / Email counts** (pulled from the Activity table, not faked anymore), conversion %, revenue.
3. **Lead Analytics** — Leads by Source (doughnut), Leads by City (bar).

Date-range dropdown at the top — 7 days / 30 days / 90 days / This year — actually filters everything.

Export to CSV for any tab.

### Files (`/files`) — FIXED THIS SESSION
Company-wide document browser. Every file uploaded anywhere (lead attachments, brochures) shows up here.

- **Drag-and-drop or click to upload**. Max 10 MB per file.
- **Storage Usage card** shows actual usage with auto-scaling units — "763 KB used of 500 MB", not "0 GB" rounded down. Progress bar fills with a minimum visible sliver even for tiny uploads.
- **Plan-based storage** — Basic 3 GB, Pro 25 GB, Enterprise unlimited. The bar goes red at 90% with an upgrade nudge.
- Per-file: preview / download / delete (uploader or admin only).

Manager+ only — agents work files inside individual leads.

### Users management (`/users-mgmt`)
Three tabs:

1. **All Users** — your team. Each row shows name, role, dept, **status badge**:
   - **Pending** (yellow) — user accepted invite but hasn't logged in yet.
   - **Active** (green) — has logged in at least once.
   - **Inactive** (red) — manually deactivated.
2. **Roles & Permissions** — read-only matrix of what each role can do.
3. **Pending Invitations** — invites sent that nobody has accepted yet. Resend or cancel.

The **Invite User** button captures name + email + role + dept, creates an Invite row, and emails the link.

### Notifications (`/notifications`) — IMPROVED THIS SESSION
Full notification history.

Triggers: new lead assigned to you, follow-up due, lead moved stages, invite accepted, trial reminders, etc.

The bell icon in the top bar:
- Shows a **red badge with unread count** (caps at "99+").
- Refreshes every 15 seconds + on tab focus.
- A **toast popup** slides in when a brand-new notification arrives, with a "View" button that jumps to the linked record.

Visiting `/notifications` and clicking "Mark all read" zeros out the bell.

### Settings (`/settings`)
Company-wide settings.

- **General** — company name, time zone, currency.
- **Branding** — logo, brand color (same as in onboarding).
- **Integrations panel** — connect Facebook, Instagram, Google, IndiaMART, JustDial, your own website forms. Each has its own setup page with a guided token / webhook URL flow. The **Events Viewer** shows raw payloads coming in (handy for debugging "why didn't this lead show up?").
- **Pipeline** — edit lead stages.
- **Lead sources** — edit your source list.

> **Heads-up**: some Settings tabs (Notification prefs, SMTP, API Keys, Custom Fields, Webhooks) currently show a "Saved" toast without persisting. Treat those as placeholder until wired to BE.

### Profile (`/profile`) — REBUILT THIS SESSION
Your own account.

At the top: **Profile completeness card** with a percentage and a colored progress bar (red < 60%, amber < 90%, green ≥ 90%). Lists which fields are missing right under the bar ("Missing: Phone number · Company type · …") — same idea as LinkedIn's "Complete your profile".

**Personal info** — change name, email, phone, department, photo (avatar upload is still wired to a placeholder for now).

**Company details** — company name + **company type** (the one we removed from signup). Editable for Owner / Admin only; disabled with a "read-only" hint for everyone else.

### Projects (`/projects`)
Your real-estate projects. Each lead can be tagged with one. Edit name, city, type, price band, possession date.

### Billing (`/admin/billing`) — Owner & Admin only
- Current plan + status badge (Trial · 5d left / Active / Trial expired).
- Usage bars (e.g. "23 of 50 users used").
- **All three plans shown side-by-side** with monthly/annual toggle. Annual shows yearly total prominently (matches what Razorpay charges).
- Upgrade / downgrade buttons → Razorpay checkout.
- Invoice history.

A **trial banner** appears at the top of every page while the trial is active. It changes color when ≤ 2 days remaining and red when expired.

### Audit Log (`/audit-log`) — Owner & Admin only (Enterprise plan)
Every important action: user invited, lead reassigned, settings changed, integration connected, etc. Filter by user, action, date. Locked on Basic/Pro — they see an Enterprise upgrade prompt.

---

## 5. Broker portal (`/broker`)
A stripped-down workspace for outside brokers. They see only leads assigned to them across all brokerages that invited them. They can change stage and add notes. No reports, no team mgmt, no settings, no billing. One broker login can switch between multiple brokerages.

---

## 6. Super Admin (Bizzfly staff)

Login at `/superadmin/login` — completely separate from tenant login. After login the sidebar is platform-only:

### Platform overview (`/admin`)
Health metrics: total companies, MRR, active trials, new signups this week, churned accounts.

### Organisations (`/admin/orgs`) — UPDATED THIS SESSION
List of every company on the platform. Each row has:
- Plan badge, trial status, user/lead counts.
- **Edit** — change plan / status (Active / Suspended).
- **Reset trial / Expire trial** — testing helpers.
- **View users** 👥 → opens `/admin/orgs/:id/users` (drill-in to that company's users).
- **View audit log** → that company's audit trail.
- **Suspend** — instantly kills all sessions of users in that company. They can't log in (banner says "Account suspended").
- **Delete** — sets company to DELETED, kills sessions, **frees up user email addresses** so the original owner can sign up again with the same email.

### Company users (`/admin/orgs/:id/users`) — NEW
Drill-in users table scoped to one company. Filter by role, status, search. Activate/deactivate from row actions. Back-to-Orgs link at the top.

### Plans (`/admin/plans`)
The three plans (Basic, Pro, Enterprise) — Bizzfly can edit names, prices, limits, features, bullets here. Changing the price automatically creates a new Razorpay plan ID (existing subs keep paying at the old archived price).

### Subscriptions (`/admin/subscriptions`)
Every active subscription with renewal dates.

### Invoices (`/admin/invoices`)
Every invoice across every company.

### Audit Log (`/admin/audit-log`)
Every super-admin action (who suspended which company, who changed prices).

---

## 7. Common UI

### Top bar (every authenticated page)
- **Trial pill** — shows days left when on trial, hidden after subscription.
- **Theme toggle** — light / dark.
- **Notification bell** — with unread badge + toast popups.
- **Profile avatar** — opens a menu (My Profile / Settings / Sign out).

### Sidebar
Items change per role:
- **Agent** — Dashboard, Leads, Follow-Ups, Tasks, Notifications, Settings, Profile.
- **Manager** — adds Assign, Projects, Reports, Files.
- **Owner / Admin** — adds User Management, Billing, Audit Log.
- **Super Admin** — completely different: Platform Admin, Organisations, Plans, Subscriptions, Invoices, Audit Log.

### Plan-limit modal
Pops up anywhere when you try an action your plan doesn't cover (inviting beyond the seat cap, connecting a paid integration on Basic, etc.). Has an "Upgrade" button that deep-links to Billing.

### Toasts
Bottom-right slide-ins. Green = success, red = error, blue = info.

---

## 8. Key flows end-to-end

### A lead's journey
1. A prospect fills your Facebook ad form (or website, IndiaMART, walk-in…).
2. The integration webhook fires → BE creates a Lead row + activity entry, tagged with the source.
3. A bell notification goes to the manager (with a popup toast).
4. Manager opens the Assign page → assigns to Agent Ravi.
5. Ravi sees the lead on his Dashboard + a bell badge increments.
6. Ravi opens Lead Detail, schedules a follow-up call → row in FollowUp table.
7. Tomorrow morning the follow-up shows in Ravi's Follow-Ups "Today" bucket.
8. Ravi calls, opens "Mark done" modal, picks "Called — spoke to lead", adds notes.
9. Activity timeline gets a CALL entry; `lastContactedAt` is stamped.
10. Ravi drags the kanban card from New → Contacted → Site Visit → Booked.
11. Booking is captured with budget — feeds into Reports' Revenue + Avg Deal Size.

### Trial → Subscribe
1. Day 1 — Owner signs up. Trial timer starts at 7 days. A welcome notification fires.
2. Day 5 — "**2 days left**" notification + email.
3. Day 6 — "**Your trial ends tomorrow**" notification + email.
4. Day 7+ — trial banner turns red. Every gated write (new lead, new user, etc.) returns 402 and the Plan-Limit modal opens with an Upgrade button.
5. Owner clicks Upgrade → Razorpay checkout → pays → webhook flips `Subscription.status = ACTIVE`.
6. Trial banner disappears. All gates open.

### Suspended company
1. Super Admin clicks **Suspend** on the Orgs row.
2. BE: sets `Company.status = SUSPENDED`, **deletes every Session** for users of that company.
3. Any user in that company on any device: next click → 403 with `COMPANY_SUSPENDED` → FE redirects to `/login?suspended=1` → toast "This account is suspended."
4. They try to log in fresh → blocked with a red inline banner.
5. Super Admin flips status back to ACTIVE → users can log in again on next try.

### Deleted company
Same as Suspended, plus the **users' emails are released** (mangled to `deleted-<userId>@deleted.invalid`). The original Owner can sign up again with the same email for a fresh company.

---

## 9. What's still rough (honest list)

For day-to-day work, the system is solid. A few rough edges worth knowing:

- **Settings page** — most "advanced" tabs (Notification prefs, SMTP, API Keys, Custom Fields, Webhooks) currently show "Saved" without actually persisting. Use main Settings (General, Branding, Integrations, Pipeline) — those are real.
- **Profile photo upload** — button is a placeholder; doesn't actually upload yet.
- **Auto-dialer** on Follow-Ups is a stub for now — masked-PII view triggers it but no call is placed. Direct call / WhatsApp buttons do work.
- **Old `Team.jsx` page** is orphaned and will be deleted; use `/users-mgmt` instead.
- **Public footer links** (Changelog, Roadmap, Blog, Careers) and newsletter form are placeholders.

Everything in **bold** above (real flows, real data, plan-gated, tenant-isolated) is production-ready for friendly beta.
