# Channel Partner Dashboard

A guide to how the Channel Partner (CP) workspace works in LeadPro — for product, demos, and onboarding new partners.

---

## What a Channel Partner is

A **Channel Partner** is an independent broker/agent who works with **multiple companies** at the same time. One login, many workspaces. Examples: a real-estate broker who places leads with several builders; a referral partner who funnels enquiries to multiple developers.

Unlike a tenant user (Owner, Manager, Agent), a CP:

- Has `User.companyId = NULL` — they don't "belong" to any one company
- Is linked to companies via `CompanyChannelPartner` rows (status: `INVITED`, `ACTIVE`, or `REVOKED`)
- Sees a dedicated workspace at `/cp` with its own sidebar and theming
- Can switch between companies they're linked to via the **Company Switcher** in the top-left

---

## Roles in the system

| Role | Where they live | Sees |
|---|---|---|
| OWNER / MANAGER / AGENT | One company (`companyId` set) | Their company's data only |
| **CHANNEL_PARTNER** | No company (`companyId = NULL`) | Data from every company they're linked to, scoped by Company Switcher |
| SUPER_ADMIN | Platform level | All tenants |

---

## Layout

When a user signs in with role `CHANNEL_PARTNER` they're routed to `/cp` and rendered inside [`CpLayout`](../frontend/src/layouts/CpLayout.jsx) — a separate shell from the tenant dashboard.

### Sidebar (left)

| Section | Route | What it shows |
|---|---|---|
| Dashboard | `/cp` | 7 KPI cards, per-company breakdown, recent activity |
| **Private Leads** | `/cp/private` | Leads the CP captured in their private pool (no company attached) |
| My Leads | `/cp/my-leads` | Leads the CP sourced and shared with the active company |
| Shared Leads | `/cp/shared` | Leads the active company assigned to the CP |
| Companies | `/cp/companies` | Every company they're linked to + switch action |
| Follow-ups | `/cp/follow-ups` | Due Today / Overdue / Upcoming buckets |
| Activities | `/cp/activities` | Timeline of recent changes |
| Notifications | `/cp/notifications` | Bell feed across all companies, mark-all-read |
| Deals | `/cp/deals` | Won / Lost tabs + win-rate KPI |
| Commission | `/cp/commission` | **Coming soon** — financial schema not built |
| Chat | `/cp/chat` | **Coming soon** — internal messaging not built |
| Documents | `/cp/documents` | **Coming soon** — storage decision pending |
| Analytics | `/cp/analytics` | Per-company lead volume + conversion rates |
| Profile | `/cp/profile` | Editable name + phone |
| Settings | `/cp/settings` | Theme toggle + notification info |

### Top navbar

- **Company Switcher** (top-left): logo, name, dropdown with all ACTIVE companies. Selection is sticky via `localStorage` + a `PATCH /channel-partner/default-company` so it survives logout and device switches.
- Global search input
- Theme toggle (light/dark, `next-themes`)
- Bell icon with **unread badge** (poll every 60s via `/notifications/unread-count`)
- Sign-out

---

## The three lead categories

This is the most important concept for understanding the dashboard.

| Tab | Who created the lead | DB filter | Real-world example |
|---|---|---|---|
| **Private Leads** | The CP themselves, no company attached yet | `channelPartnerId = cp.id AND companyId IS NULL` | Walk-in client, no builder picked yet |
| **My Leads** | The CP, shared with the **active company** | `channelPartnerId = cp.id AND companyId = activeCompany` | You shared a private lead with Demo Realty |
| **Shared Leads** | The **company** assigned the lead to the CP | `assignedToId = cp.id AND companyId = activeCompany` | Demo Realty's manager assigned a Facebook lead to you |

### Why the split

- **Private Leads** are *yours*. The company side never sees them. You decide which company (or companies) to share with later.
- **My Leads** is your placed-with-company book. You control how much detail the company sees (visibility levels below).
- **Shared Leads** is work the company is paying you to close. The company is the source of truth.

---

## Visibility levels

The CP and the Company each control what the *other side* sees on the leads they own. Three levels (`Lead.visibility` enum):

| Level | Effect |
|---|---|
| `FULL` | The counterparty sees the full lead (name, phone, email, everything) |
| `PARTIAL` | Phone masked as `+91 99990 XXXXX`; email masked as `j****e@example.com`; name + city remain |
| `ANONYMOUS` | Same masking PLUS the name is replaced with `"Anonymous Lead"` |

**The source always sees full data.** Masking only fires for the counterparty.

### CP → Company

When the CP creates or shares a lead with a company, they pick the visibility level in the modal. The company sees the masked version.

### Company → CP

When an Owner/Manager clicks **Share with Channel Partner** on a lead detail page, they pick the visibility level. The CP sees the masked version.

Backend logic lives in [`leadPrivacy.maskLeadForRole`](../backend/src/modules/lead/leadPrivacy.js):

```js
if (lead.channelPartnerId && viewerUserId !== lead.channelPartnerId) {
  return applyVisibility(lead, lead.visibility); // company viewing CP-sourced
}
if (role === "CHANNEL_PARTNER") {
  return applyVisibility(lead, lead.visibility); // CP viewing company-sourced
}
```

---

## The three core flows

### Flow 1 — Capturing a private lead (no company yet)

1. CP signs in to `/cp`.
2. Sidebar → **Private Leads** → **Add Private Lead**.
3. Modal shows fields (Name, Phone, Email, City, Requirement, Budget, Priority) — no company picker, no visibility selector.
4. Submit → lead is created with `companyId = NULL`, `channelPartnerId = cp.id`.
5. Lead now appears in **Private Leads** tab. No company can see it.

**Backend:** `POST /channel-partner/leads` body `{ ..., visibleToCompany: false }`.

### Flow 2 — CP shares a lead with a company

1. From **Private Leads** (or **My Leads**) → click **Share** on the row.
2. Modal: pick a company from the CP's active companies + visibility level.
3. Submit → backend:
   - Creates a `ChannelPartnerShare` row binding the lead to that company
   - If the source lead was private (`companyId = NULL`), creates a duplicate Lead row in the target company; the original stays private (so the CP can re-share to other companies independently)
   - Fires a `LEAD_CREATED` bell notification to the company's Owner + Manager

**Backend:** `POST /channel-partner/leads/:id/share` body `{ companyId, visibility }`.

### Flow 3 — Company sends a lead to a CP

1. Owner/Manager opens any lead in their own pipeline (e.g. `/leads/123`).
2. Right rail → **Share with Channel Partner** button (next to Reassign).
3. Modal: pick an active CP linked to the company + visibility level (Full / Partial / Anonymous).
4. Submit → backend:
   - Sets `lead.assignedToId = cp.id`
   - Stamps `lead.visibility` with the chosen level
   - Upserts a `ChannelPartnerShare` row (auditable + revocable)
   - Logs an `ASSIGNMENT` activity on the lead
   - Fires a `LEAD_ASSIGNED` bell notification to the CP (deep-link: `/cp/leads/:id`)
5. CP sees the lead in **Shared Leads** tab when that company is active.

**Backend:** `POST /channel-partners/:id/share-lead` body `{ leadId, visibility }`.

### Flow 4 — Status updates sync in real time (well, near-real-time)

When the CP changes a lead's status (e.g., New → Contacted):

1. `PATCH /channel-partner/leads/:id/status`
2. Backend updates the lead, logs a `STATUS_CHANGE` activity, fires a `LEAD_STATUS_CHANGED` notification to every Owner + Manager in the company that owns the lead.
3. The company sees the update on the lead detail page; the bell badge updates on next poll (60s).

Note: today the FE polls; the bell unread count refreshes every 60 seconds. WebSocket-based instant sync is on the roadmap but not built yet.

---

## Views inside leads pages

All three lead tabs (Private, My Leads, Shared) support the same three views via a toggle in the toolbar:

- **Table** (default) — modern CRM-style table with rounded corners, sticky headers, hover rows, Hot/Warm/Cold/VIP priority tags, inline visibility selector per row, and quick-action chips (Call via `tel:`, WhatsApp via `wa.me`, Email via `mailto:`).
- **Kanban** — drag-and-drop pipeline board reusing the existing `KanbanBoard` component. Dragging a card to a new column fires the status-change notification.
- **Calendar** — month view of follow-ups, reusing `LeadsCalendar`.

The selected view is sticky via the `?view=` URL parameter.

---

## Lead Workspace page

`/cp/leads/:id` is the unified per-lead view. Four tabs:

1. **Overview** — status dropdown + lead details (priority, budget, city, requirement, follow-up date)
2. **Activity** — full timeline of changes (status, notes, assignments, system events)
3. **Notes** — add inline notes visible to the company
4. **Sharing** — table of every company this lead is shared with, status (ACTIVE/REVOKED), per-share visibility selector

Top of page: quick action buttons (Call / WhatsApp / Email) using whatever the CP can see based on visibility level.

---

## Notifications

Notifications are **user-scoped, not tenant-scoped** — CP receives notifications from every linked company in a single unified inbox. The bell icon in the topbar polls `/notifications/unread-count` every 60 seconds.

Notification types relevant to CPs:

- `LEAD_ASSIGNED` — a company shared a lead with you
- `LEAD_STATUS_CHANGED` — someone (company-side) updated a lead you're working on
- `LEAD_CREATED` — a CP-sourced lead just landed in the company's pipeline (fired *to* the company)
- `TASK_STATUS_CHANGED` — task progress

Clicking a notification deep-links to the relevant lead workspace.

---

## Owner-side: Channel Partners admin page

For Owners/Managers to manage their connected CPs: `/admin/channel-partners`

Features:

- KPI row: Active partners / Shared leads / Deals closed / Avg conversion
- "Top performer" callout card with best CP by deals won
- Table per partner with stats (shared leads, deals won, deals lost, conversion %)
- Per-row **Revoke** action — flips status to `REVOKED` and revokes all active shares (CP can't see the company's leads anymore)
- **Reactivate** action for previously-revoked partners

Backend: `GET /api/channel-partners`, `POST /api/channel-partners/:id/revoke`, `POST /api/channel-partners/:id/reactivate`.

---

## Database model

### Tables

| Table | Purpose |
|---|---|
| `User` | CP users have `role = CHANNEL_PARTNER` and `companyId = NULL` |
| `CompanyChannelPartner` | Many-to-many: which CPs are linked to which companies. Status: INVITED / ACTIVE / REVOKED |
| `Lead` | `channelPartnerId` field set when the lead was sourced by a CP. `visibility` enum drives masking. `companyId` is nullable so private leads can live without one. |
| `ChannelPartnerShare` | One row per (lead, company) share. Tracks visibility + status. Lets a single lead be shared with many companies with independent revoke. |

### Schema highlights

```prisma
enum Role { OWNER MANAGER AGENT CHANNEL_PARTNER ... }
enum LeadVisibility { FULL PARTIAL ANONYMOUS }
enum ChannelPartnerStatus { INVITED ACTIVE REVOKED }

model Lead {
  // ... existing fields
  companyId         String?         // nullable — private leads have NULL
  channelPartnerId  String?         // set when the lead was sourced by a CP
  visibility        LeadVisibility  @default(FULL)
}

model CompanyChannelPartner {
  channelPartnerId  String
  companyId         String
  status            ChannelPartnerStatus
  joinedAt          DateTime?
  @@unique([channelPartnerId, companyId])
}

model ChannelPartnerShare {
  leadId            String
  companyId         String
  channelPartnerId  String
  visibility        LeadVisibility   @default(FULL)
  status            ChannelPartnerStatus @default(ACTIVE)
  @@unique([leadId, companyId])
}
```

---

## API surface

### CP-facing (`/api/channel-partner/*`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/companies` | List of companies this CP is linked to |
| PATCH | `/default-company` | Persist last-selected company |
| GET | `/dashboard?companyId=…` | KPI counts + recent activity for one company |
| GET | `/leads?scope=shared\|own\|private` | Leads list, scoped |
| GET | `/leads/:id` | Lead detail (includes share rows) |
| POST | `/leads` | Add new lead. Optional `companyId` + `visibility` |
| POST | `/leads/:id/share` | Share a private lead with a company |
| POST | `/leads/:id/unshare` | Remove a lead from one specific company |
| PATCH | `/leads/:id/status` | Update status (notifies company) |
| PATCH | `/leads/:id/visibility` | Change visibility on a single share |

### Owner-facing (`/api/channel-partners/*`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List CPs linked to this company + stats |
| GET | `/:id` | One CP detail + their leads/activities |
| POST | `/:id/revoke` | Kill the link + active shares |
| POST | `/:id/reactivate` | Reverse a revoke |
| POST | `/:id/share-lead` | Send one of the company's leads to this CP |

---

## What's deferred (not in the codebase yet)

The Channel Partner dashboard ships with shells for these but they're labelled **"Coming soon"** in the UI:

- **Internal Chat** between CP and company (Message model + threads + WebSocket — not built)
- **Commission tracking** (financial schema + payout records + monthly reports — not built)
- **Documents vault** (storage decision + per-CP folder structure — not built)
- **Real-time WebSocket sync** (today everything is poll-based at 60s intervals)
- **Approval workflow** for share requests (currently shares are immediate)
- **Partner ratings/reviews**
- **Company-side visibility for inbound CP leads in the Leads table** (the mask is applied but the FE doesn't surface "this lead came from a CP with visibility=PARTIAL" as a badge)

---

## Demo accounts

| Email | Role | Workspace | Password |
|---|---|---|---|
| `broker@demo.com` | CHANNEL_PARTNER | Demo Realty + Skyline Partners | `Demo@1234` |
| `owner@demo.com` | OWNER | Demo Realty | `Demo@1234` |
| `manager@demo.com` | MANAGER | Demo Realty | `Demo@1234` |
| `agent@demo.com` | AGENT | Demo Realty | `Demo@1234` |

Seed script: [`backend/scripts/seed-demo-accounts.js`](../backend/scripts/seed-demo-accounts.js). Re-run after any DB reset.

---

## Quick demo script

A 4-minute walk-through that hits every major feature:

1. **Login as `broker@demo.com`** — lands on `/cp` Dashboard. Show KPI cards, company switcher in top-left, per-company breakdown.
2. **Switch company** — pick Skyline Partners → entire dashboard re-fetches. Show the same flow then switch back.
3. **Private capture** — Sidebar → Private Leads → **Add Private Lead** → fill a walk-in lead → save. Show it lives in private pool.
4. **Share** — From Private Leads, click **Share** → pick Demo Realty + visibility PARTIAL → submit.
5. **Verify company-side mask** — Logout, login as `owner@demo.com` → open that lead → phone shows masked.
6. **Company sends a lead back** — Owner picks any lead → right rail → **Share with Channel Partner** → pick Demo Broker + ANONYMOUS visibility.
7. **CP sees masked** — Logout, login as `broker@demo.com` → bell notification appears → click → Shared Leads tab → lead is there with name = "Anonymous Lead".
8. **Kanban + status** — Switch the leads view to Kanban → drag a card from Contacted to Qualified → toast confirms, notification fires to company side.
9. **Owner-side admin** — Logout, login as owner → sidebar → **Channel Partners** → see Demo Broker with conversion stats → **Revoke** demo → CP loses access → **Reactivate**.

That hits every shipped feature in under 5 minutes.
