# UI Features — Simple Guide

A plain-words walkthrough of every screen in RELMS and what happens behind the scenes when you click around. Written for someone who has never opened the code — no jargon, no Prisma talk.

> Roles you'll see mentioned:
> - **Owner / Admin** — the company's bosses. Full access.
> - **Manager** — runs a team of agents.
> - **Agent** — the salesperson chasing leads.
> - **Broker** — an outside agent invited to help sell.
> - **Super Admin** — Bizzfly staff. Sees every company.

---

## 1. Public pages (no login)

### Landing page (`/`)
The marketing home page. Logged-out visitors see hero, features, pricing teaser, contact CTA. If you're already logged in, it bounces you to your dashboard instead.

### Features (`/features`), Pricing (`/pricing`), Contact (`/contact`)
Static info pages. Pricing shows the live plan list pulled from the database so prices match whatever Super Admin has set.

---

## 2. Sign-up & login

### Sign-up (`/signup`)
Where a new company registers. The form asks for company name + owner name + email + password. When you submit:
1. A new **Company** row is created.
2. The first user is created as the **Owner** of that company.
3. You're logged in automatically and dropped into the onboarding wizard.

### Login (`/login`)
Standard email + password. Behind the scenes:
- We look up every user with that email (one email may exist in multiple companies if Super Admin allowed it).
- We try the password against each. The one that matches wins.
- If the password matches users in two companies → we show a "pick your workspace" screen.
- On success we set a session cookie and stamp `lastLoginAt` so admins can see when you last signed in.

### Forgot / Reset password
Click forgot → enter email → we email a reset link → click link → set a new password. Link expires after a short window.

### Accept invite (`/accept-invite?token=…`)
Opened from the invite email. Shows the inviter, the company, your role. You set a name + password and a User row gets created. After this you can log in normally.

---

## 3. Onboarding wizard (first-time owner)

Right after sign-up the owner is walked through 5 screens:

1. **Welcome** — quick intro.
2. **Branding** — upload company logo, pick a brand color. Stored on the company row.
3. **Team** — invite your first managers/agents (sends invite emails).
4. **Projects** — add the real-estate projects you sell (name, city, type).
5. **Pipeline** — review the lead stages (New → Contacted → Site Visit → Negotiation → Booked / Lost). You can rename or reorder.

When done the company is marked "onboarded" and the wizard never shows again.

---

## 4. Main app (tenant users)

### Dashboard (`/dashboard`)
The home screen after login. **Looks different per role:**
- **Owner / Admin**: company-wide KPIs — total leads, conversions, revenue, top agents, source breakdown.
- **Manager**: their team's stats — their agents' workloads, hot leads, follow-ups due today.
- **Agent**: personal stats — my leads, my tasks today, my pipeline value.

Cards pull from one `/dashboard` API that returns the right slice based on who's logged in.

### Leads (`/leads`)
The heart of the app. Two views toggled at the top:
- **Kanban board** — drag a lead card from one stage to the next. Dropping a lead in **Lost** opens a small modal asking "why is this lead lost?" so you must record a reason. Dropping in **Booked** marks it won.
- **Table view** — same leads as rows with sortable columns, filters (source, owner, stage, date), and CSV export.

Each row links to the lead's detail page.

Filters are saved in the URL so you can share a filtered link with a teammate.

### Lead detail (`/leads/:id`)
Everything about one lead on one page:
- **Header**: name, phone, email, current stage badge, assigned agent.
- **Activity timeline**: every change (stage moves, notes, calls, emails) in order.
- **Notes**: free-text notes from the team.
- **Tasks**: things to do for this lead (call back, send brochure).
- **Files**: PDFs / images attached to the lead.
- **Follow-ups**: scheduled callbacks. They show up on the Follow-ups page when due.

Edit, reassign, or change stage from the action buttons at the top.

### Add lead (`/leads/new`)
A simple form. Manager+ only — agents can't create leads, they only work the ones assigned to them. Required fields are name, phone, source, project. Optional: budget, requirement notes.

### Assign (`/assign`)
Bulk-assign screen for managers. Shows unassigned leads on the left and the team's agents on the right with their current workload. Pick leads → pick agent → assign. Used to spread fresh leads across the team fairly.

### Follow-ups (`/follow-ups`)
A daily to-do list. Shows every scheduled callback or meeting due today / overdue / upcoming. Tick one to mark it done; click to jump to the lead.

### Tasks (`/tasks`)
General to-do list, not tied to a lead. Personal task manager.

### Reports (`/reports`)
Charts and tables. Lead source performance, conversion funnel, agent leaderboard, revenue by project, monthly trends. Date-range picker on top filters everything.

### Files (`/files`)
Company-wide document browser. Every file uploaded anywhere (lead attachments, brochures) shows up here. Search, filter by type, download. Manager+ only.

### Users management (`/users-mgmt`)
The screen we just fixed. Three tabs:
1. **All Users** — your team. Each row shows name, role, dept, status badge (Active / Inactive / **Pending** until they log in for the first time), last login, created date. Edit, deactivate, or delete from the row actions.
2. **Roles & Permissions** — read-only matrix showing what each role can do. Editing comes in a later sprint.
3. **Pending Invitations** — invites you've sent that no one has accepted yet. Resend or cancel.

The "Invite User" button opens a small form (name, email, role, dept). On submit we create an Invite row and email the link. They click the link → fill the accept form → become a real user.

### Notifications (`/notifications`)
The bell in the top bar opens a popover; this page is the full history. Notifications include: new lead assigned to you, follow-up due, lead moved stages, invite accepted, etc. Click one to jump to the source.

### Settings (`/settings`)
Company-wide settings — split into sub-sections:
- **General**: company name, address, time zone.
- **Branding**: logo, color (same as onboarding).
- **Integrations**: connect Meta (Facebook + Instagram lead ads), Google (Forms / Sheets / Ads), IndiaMART, JustDial, your own website forms. Each connection has its own setup page that walks you through pasting the right token / webhook URL. There's also an **Events Viewer** that shows raw payloads coming in — handy for debugging "why didn't this lead show up?".
- **Pipeline**: edit your lead stages.
- **Lead sources**: edit the source list (Facebook, Walk-in, Referral…).

### Profile (`/profile`)
Your own account. Change name, phone, photo, password. Doesn't affect anyone else.

### Projects (`/projects`)
The real-estate projects you sell. Each lead belongs to one project. Edit name, city, type (residential / commercial / plot), price band.

### Billing (`/admin/billing`) — Owner & Admin only
- Your current plan and what it includes.
- Usage bars (e.g. "23 of 25 users used").
- Upgrade / downgrade buttons → take you to Razorpay checkout.
- Invoice history.
- A "trial ending in X days" banner at the top of the app when applicable.

When you hit a plan limit anywhere in the app (try to invite a 26th user on a 25-user plan, say), a modal pops up telling you to upgrade and deep-links here.

### Audit log (`/audit-log`) — Owner & Admin only
A searchable list of every important action: user invited, lead reassigned, settings changed, integration connected, etc. Filter by user, action, date.

---

## 5. Broker portal (`/broker`)
A stripped-down workspace for outside brokers. They see only leads assigned to them (across whichever brokerages invited them) and can update stage / add notes. No reports, no team mgmt, no settings. One broker login can switch between multiple brokerages they work with.

---

## 6. Super Admin (Bizzfly staff)

Login at `/superadmin/login` — separate from tenant login. After login:

- **Dashboard** (`/admin`) — platform health: total companies, MRR, active trials, churned accounts.
- **Organizations** (`/admin/orgs`) — every company on the platform. Click one to see their plan, billing, usage, audit log.
- **Subscriptions** (`/admin/subscriptions`) — every active subscription with renewal dates.
- **Invoices** (`/admin/invoices`) — every invoice across every company.
- **Plans** (`/admin/plans`) — define the plans (Starter, Pro, Enterprise) — features, limits, prices. Tenant pricing pages read from here.
- **Platform users** (`/admin/users`) — Bizzfly staff accounts (super admin team).
- **Platform audit log** (`/admin/audit-log`) — every super-admin action (who suspended which company, who changed prices).
- **Company audit log** (`/admin/orgs/:id/audit-log`) — drill into one company's audit trail for support.

---

## 7. Stuff that runs everywhere

### Top bar
- **Search** — global search jumps to leads / users matching the query.
- **Notification bell** — popover of recent unread; red dot = unread count.
- **Theme toggle** — light / dark.
- **Account menu** — Profile / Sign out.

### Sidebar
Different menu items per role (an agent doesn't see "Audit Log" or "Billing"). Active route is highlighted.

### Plan-limit modal
Pops up anywhere in the app when you try an action your plan doesn't cover (e.g. inviting a user past the cap, connecting a paid integration on the free plan). Has an "Upgrade" button that takes you to Billing.

### Toasts
The little notifications that slide in from the bottom-right when you save / delete / something fails. Green = success, red = error.

---

## How a lead actually travels

Helpful to picture the full flow:

1. A prospect fills your Facebook ad form (or website form, IndiaMART, walk-in, etc.).
2. The integration webhook fires → backend creates a Lead row tagged with the source.
3. A notification ("New lead from Facebook") goes to the Manager and admins.
4. Manager opens the Assign page → assigns to Agent Ravi.
5. Ravi sees the lead on his Dashboard + gets a bell notification.
6. Ravi opens Lead detail, calls the prospect, drags the card from **New → Contacted**.
7. Ravi schedules a follow-up for tomorrow → shows up on his Follow-ups page tomorrow morning.
8. After a site visit, drags to **Site Visit** → **Negotiation** → **Booked** (or **Lost** with a reason).
9. The whole journey is visible in the lead's timeline and counted in Reports.

Every step is also recorded in the Audit Log so the Owner can see who did what.
