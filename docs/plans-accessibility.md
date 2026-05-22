# Plan Accessibility & Billing Guide

This document is the single source of truth for what each subscription plan
includes, how limits are enforced, and how the lifecycle works (signup →
trial → paid → cancel). It covers both the customer-facing behavior and
the SuperAdmin controls.

> **Source of truth for plan values**: the DB `Plan` table (editable via
> SuperAdmin → Plans). The values in `backend/src/lib/planLimits.js` and
> `frontend/src/lib/planLimits.js` are the seed/fallback values and are
> kept in sync via the seeding migration.

---

## 1. Pricing

| Plan | Monthly | Annual (per-month equivalent) | Annual total | Free trial |
|---|---|---|---|---|
| **Basic** | Free | Free | — | 7 days |
| **Pro** ⭐ Featured | ₹2,499 | ₹1,999 | ₹23,988/yr | — |
| **Enterprise** | ₹8,999 | ₹7,199 | ₹86,388/yr | — |

- All prices in INR. GST is added by Razorpay at checkout where applicable.
- Annual billing saves **20%** versus monthly.
- Internally amounts are stored as **paise** (₹1 = 100 paise). The UI converts
  for display.

---

## 2. Capacity limits

These are hard caps — the backend `planGate` middleware rejects any write
that would push the tenant past the cap with HTTP `402 PLAN_LIMIT_EXCEEDED`.

| Resource | Basic | Pro | Enterprise | Counts |
|---|---|---|---|---|
| **Users** | 3 | 10 | Unlimited | Active users **plus** pending non-broker invites. Brokers don't consume a seat. |
| **Leads** | 200 | 10,000 | Unlimited | Every Lead row in the tenant (regardless of status). |
| **Projects** | 2 | 25 | Unlimited | Every Project row. |
| **File storage** | 500 MB | 5 GB | Unlimited | Sum of `File.sizeBytes` for the tenant. |
| **Integrations** | 0 | Unlimited | Unlimited | Active `IntegrationCredential` rows (FB / IG / Google / IndiaMART / JustDial / Website). |

### CSV import behavior

CSV import is gated by the same lead cap but **truncates** rather than
rejects the whole file:

- BE computes `remainingCapacity = limit − currentCount`.
- The first N valid rows up to `remainingCapacity` are created.
- Subsequent rows return status `SKIPPED` with reason "Plan lead limit
  reached — upgrade to import more".
- The response summary includes a `planCapHit` count so the FE can show a
  banner.

---

## 3. Features

A feature toggle, not a count — locked features return HTTP `402
PLAN_FEATURE_LOCKED` when the tenant tries to use them.

| Feature | Basic | Pro | Enterprise | Notes |
|---|---|---|---|---|
| Kanban pipeline with default stages | ✅ | ✅ | ✅ | The 6 default stages are auto-seeded for every company. |
| Contacts, tasks, notes | ✅ | ✅ | ✅ | Core CRM surface. |
| CSV lead import | ✅ | ✅ | ✅ | Subject to lead cap (see CSV behavior above). |
| File attachments | ✅ | ✅ | ✅ | Within the per-plan storage quota. |
| Email notifications | ✅ | ✅ | ✅ | Lead assignment, status change, etc. |
| Manual lead assignment | ✅ | ✅ | ✅ | Owner/Admin/Manager assigning leads to agents. |
| Activity log per lead | ✅ | ✅ | ✅ | Tenant-scoped. Visible under each lead's detail page. |
| **Custom pipeline stages** | 🔒 | ✅ | ✅ | Default stages remain editable for name/probability, but adding new stages is gated. |
| **Lead aging alerts** | 🔒 | ✅ | ✅ | Scheduler that flags leads stuck >7 days without contact. |
| **Webhook lead intake** | 🔒 | ✅ | ✅ | Inbound webhooks (Sprint 5 + BYO multi-provider). |
| **BYO integrations** | 🔒 | ✅ | ✅ | Facebook Lead Ads, Instagram, Google Ads, IndiaMART, JustDial, Website forms. |
| **Duplicate-lead detection** | 🔒 | ✅ | ✅ | Hard + soft duplicate matching on AddLead and intake. |
| **Agent privacy controls** | 🔒 | ✅ | ✅ | PII masking + IDOR guards for AGENT role. |
| **Audit log** | 🔒 | 🔒 | ✅ | Company-wide audit feed (`/audit-log`). Owner/Admin only. |

🔒 = Locked. The frontend renders a "Pro" badge instead of the action
button. Clicking it opens the global `PlanLimitModal` with an "Upgrade to
Pro" CTA pointing at `/admin/billing`.

---

## 4. Support & onboarding

| | Basic | Pro | Enterprise |
|---|---|---|---|
| Support channel | Community | Email | Priority email + phone |
| Onboarding | Self-serve | Self-serve | Guided session (live walkthrough) |

These are display strings on the pricing card. There's no automated
mechanism — they're commitments the human team makes.

---

## 5. Trial lifecycle (Basic only)

Every new signup lands on the **Basic** plan with `trialEndsAt = createdAt +
7 days`. After the trial expires the company stays on Basic but every
write returns `402 TRIAL_EXPIRED` until upgrade.

```
DAY  EVENT                                           CHANNEL
───  ─────────────────────────────────────────────   ────────────────
 0   Signup → trialEndsAt set                        —
 4   In-app reminder "4 days left"                   Bell
 3   In-app reminder + reminder email                Bell + email
 2   In-app urgency (orange banner)                  Bell + topbar pill
 1   In-app + final reminder email                   Bell + email
 7   Trial ends                                      Banner turns red
 8+  All writes return 402 TRIAL_EXPIRED             Modal pops
```

### Reminder cadence rationale

| Day | In-app | Email |
|---|---|---|
| 4 | ✅ | ❌ |
| 3 | ✅ | ✅ |
| 2 | ✅ | ❌ |
| 1 | ✅ | ✅ |

- **In-app every day** in the last 4 days — cheap, low signal-to-noise.
- **Email only on D-3 and D-1** — high cost (deliverability, spam folder
  risk). D-3 is the "you have time" nudge; D-1 is "act now or lose access".

### Where the trial state surfaces in the UI

| Surface | Component |
|---|---|
| Dashboard header strip | `TrialBanner` (purple → orange ≤2d → red on expiry) |
| Topbar pill (always visible) | `TrialPill` |
| Notification bell | `TRIAL_REMINDER` rows |
| Email inbox | D-3 + D-1 only |
| 402 response modal | `PlanLimitModal` with clock icon |

---

## 6. State machine

```
                ┌────────────────────────────────────────────┐
                │            NEW SIGNUP                      │
                │   subscriptionPlan = BASIC                 │
                │   trialEndsAt = now + 7 days               │
                └───────────────────┬────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  BASIC (trial)        │
                         │  Days 1–7             │
                         │  Full Basic limits    │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┴────────────────────┐
                │                                          │
                ▼ (cycles trial)                           ▼ (cycles upgrade)
   ┌──────────────────────┐                  ┌──────────────────────────┐
   │ BASIC (trial expired) │                  │  Razorpay Checkout       │
   │ All writes blocked    │                  │  (subscription_id flow)  │
   └──────────┬───────────┘                  └──────────┬───────────────┘
              │                                          │
              ▼                                          ▼
        Upgrade pressure                          Webhook arrives:
              │                                  subscription.activated
              │                                          │
              └──────────────►  Upgrade  ◄───────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  PRO or ENTERPRISE    │
                         │  ACTIVE               │
                         │  All limits unlocked  │
                         └──────────┬───────────┘
                                    │
                                    │ User cancels  ────►  drops to BASIC
                                    │
                                    │ Card fails    ────►  HALTED → BASIC on expiry
                                    │
                                    │ End of period ────►  renew (charged event)
```

### Plan flipping rules

- A new company starts on **BASIC** with a 7-day trial (set in
  `company.service.registerCompanyAndOwner`).
- `subscriptionPlan` flips to **PRO/ENTERPRISE** when Razorpay sends
  `subscription.activated`. The plan name comes from the Subscription row
  we created at checkout-start time.
- `subscriptionPlan` flips back to **BASIC** on `subscription.cancelled`,
  `subscription.completed`, or `subscription.expired` — unless the company
  has another ACTIVE subscription (e.g. PRO → ENTERPRISE upgrade in
  flight).
- Cancellation via the UI calls Razorpay's cancel API **and** drops the
  company to BASIC immediately (no waiting for the webhook).

---

## 7. What happens when a limit / lock fires

| State | Backend response | Frontend behavior |
|---|---|---|
| Below cap | Normal write | Normal UX |
| **At cap**, FE pre-flight catches | n/a | `PlanLimitModal` opens immediately; form is never opened |
| **At cap**, BE catches | `402 PLAN_LIMIT_EXCEEDED` | API interceptor dispatches `relms:plan-limit` event → `PlanLimitModal` opens |
| **Feature locked** (e.g. Basic + integrations) | `402 PLAN_FEATURE_LOCKED` | Same modal with lock icon, feature name |
| **Trial expired** | `402 TRIAL_EXPIRED` | Same modal with clock icon, "Your trial has ended" title |

The `PlanLimitModal` always:
- Shows the current usage (e.g. "2 / 2 projects") when it's a cap.
- Shows the locked feature name when it's a feature.
- Has an "Upgrade to {next plan}" button that navigates to `/admin/billing`.
- Has a "Not now" button that just closes (the underlying form, if any, stays).

---

## 8. SuperAdmin overrides

The SuperAdmin (platform admin) has cross-tenant powers that bypass
Razorpay. They're audit-logged in `PlatformAudit`.

| Surface | What it does | Where |
|---|---|---|
| **Edit plan modal** (✏️ on Orgs row) | Set a company's plan to PRO/ENTERPRISE manually. No Razorpay charge. Useful for gifting / support / dispute resolution. | `/admin/orgs` |
| **Trial reset** | Sets `trialEndsAt = now + 7 days` for a Basic company. | `/admin/orgs` (clock icon) |
| **Trial expire** | Sets `trialEndsAt = past`. Triggers the lockdown immediately. Used for QA. | `/admin/orgs` (clock icon) |
| **Suspend / reactivate org** | Blocks all sign-ins for the company's users. | `/admin/orgs` (ban icon) |
| **Cross-tenant user disable** | Disable any user across any company (except other platform admins). | `/admin/users` |
| **View company audit log** | Read-only drill-in to one tenant's Activity feed. | `/admin/orgs` (activity icon) |
| **Edit plan catalogue** | Change name, tagline, prices, limits, features, bullets of BASIC / PRO / ENTERPRISE. | `/admin/plans` |
| **Refunds** | Not built. Use Razorpay dashboard directly. | — |
| **Coupon codes** | Not built. Possible future feature. | — |

### Plan catalogue editing — smart Razorpay sync

When SuperAdmin edits a plan:

| Field changed | Razorpay touched? | Why |
|---|---|---|
| `priceMonthly` or `priceAnnual` | ✅ **Yes** — new Razorpay plan created via `rzp.plans.create`. Old plan ID archived. | Razorpay doesn't allow editing price on an existing plan. |
| `name`, `tagline`, `featured`, `sortOrder` | ❌ No | Display strings only. |
| `limits` (users/leads/projects/storage) | ❌ No | Enforced by `planGate`, not by Razorpay. |
| `features` (toggles) | ❌ No | Enforced by `planGate`. |
| `bullets`, `support`, `onboarding` | ❌ No | Display strings only. |
| `trialDays` | ❌ No | Used at signup time only. |
| `isActive` | ❌ No | Marketing-only flag. |

**Important**: existing subscriptions are tied to the **old** Razorpay
plan ID. They continue to renew at the **old** price until cancelled.
New signups will use the new plan ID at the new price. This is by
design — it's the only way to honor existing customer pricing.

The archived plan IDs are stored as a JSON array on `Plan.archivedRazorpayPlanIds`:

```json
[
  {
    "id": "plan_old_xxxx",
    "billingCycle": "monthly",
    "archivedAt": "2026-05-22T10:00:00Z",
    "replacedBy": "plan_new_yyyy"
  }
]
```

---

## 9. Code map (where each piece lives)

### Backend

| Concern | File |
|---|---|
| Plan catalogue (DB model) | `prisma/schema.prisma` → `model Plan` |
| Plan service (cached reads + smart Razorpay sync) | `src/modules/plan/plan.service.js` |
| Plan admin controller | `src/modules/plan/plan.controller.js` |
| Plan limits constants (shape + helpers) | `src/lib/planLimits.js` |
| Cap + feature enforcement | `src/lib/planGate.js` |
| Trial enforcement | `src/lib/planGate.js` → `assertTrialActive` |
| Trial reminder scheduler | `src/modules/billing/trialReminder.scheduler.js` |
| Trial reminder email | `src/lib/emails/trialReminderEmail.js` |
| Razorpay client (lazy) | `src/modules/billing/razorpay.client.js` |
| Billing service (create / cancel / webhook) | `src/modules/billing/billing.service.js` |
| Per-tenant plan endpoint | `src/modules/billing/billing.controller.js` → `getMyPlan` |
| Public pricing endpoint | `src/modules/billing/billing.controller.js` → `listPlansPublic` |

### Frontend

| Concern | File |
|---|---|
| Plan limits constants (shape + helpers) | `src/lib/planLimits.js` |
| `usePlan` hook | `src/hooks/usePlan.js` |
| Plan limit modal (global) | `src/components/common/PlanLimitModal.jsx` |
| Trial banner (dashboard top) | `src/components/common/TrialBanner.jsx` |
| Trial pill (topbar) | `src/components/common/TrialPill.jsx` |
| Pricing page | `src/components/marketing/PricingSection.jsx` |
| Billing page (Owner / Admin) | `src/pages/admin/Billing.jsx` |
| Razorpay Checkout loader | `src/lib/razorpayCheckout.js` |
| SuperAdmin Plans (edit modal) | `src/pages/superadmin/Plans.jsx` |
| SuperAdmin Subscriptions list | `src/pages/superadmin/Subscriptions.jsx` |
| SuperAdmin Invoices list | `src/pages/superadmin/Invoices.jsx` |
| SuperAdmin Orgs (per-tenant edit + audit) | `src/pages/superadmin/Orgs.jsx` |

### Database migrations relevant to plans

| Migration | Purpose |
|---|---|
| `20260521000000_normalise_plan_codes` | Fold `FREE_TRIAL`/`STARTER`/`PROFESSIONAL` onto `FREE` (later `BASIC`). |
| `20260521010000_add_pending_plan` | Adds `Company.pendingPlan` + `pendingBillingCycle` for signup → checkout intent. |
| `20260521020000_basic_plan_and_trial` | Rename `FREE` → `BASIC` + add `Company.trialEndsAt`. |
| `20260521030000_subscription_payment` | Adds `Subscription` and `Payment` tables. |
| `20260521040000_activity_leadId_optional` | Makes `Activity.leadId` optional so user-mgmt actions can be logged. |
| `20260521050000_plan_table` | Adds `Plan` model and seeds Basic / Pro / Enterprise. |

---

## 10. Razorpay configuration checklist

Before paid plans can actually charge cards, the following must be set up:

### Razorpay dashboard

1. Create the four Plans (one per plan × billing cycle):
   - Pro Monthly — period: monthly, amount: `249900` paise (₹2,499)
   - Pro Annual — period: yearly, amount: `2398800` paise (₹23,988/yr)
   - Enterprise Monthly — period: monthly, amount: `899900` paise (₹8,999)
   - Enterprise Annual — period: yearly, amount: `8638800` paise (₹86,388/yr)

   Note: when SuperAdmin edits a price in `/admin/plans`, new Razorpay
   plans are created automatically — you only need to do this once for
   the initial seed.

2. Configure the webhook:
   - URL: `https://your-domain/api/billing/webhooks/razorpay`
   - Secret: any strong random string (also goes in `.env`)
   - Events: `subscription.activated`, `subscription.charged`,
     `subscription.cancelled`, `subscription.completed`,
     `subscription.expired`, `subscription.halted`, `payment.captured`

### `backend/.env`

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_PRO_ANNUAL=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_ENTERPRISE_MONTHLY=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_ENTERPRISE_ANNUAL=plan_xxxxxxxxxxxx
```

The `RAZORPAY_PLAN_*` env vars are a **fallback** for installations that
haven't moved to the DB-backed plan table. Once you save a price change
through `/admin/plans`, the DB `razorpayPlanIdMonthly` / `Annual` fields
take precedence over the env values.

### Local development

For local testing, Razorpay's test mode + ngrok works well:

1. Use Razorpay test-mode keys (no KYC required).
2. Run `ngrok http 5000` to expose your local backend.
3. Set the webhook URL to the ngrok HTTPS URL + `/api/billing/webhooks/razorpay`.
4. Use the Razorpay test card numbers (any 4111 1111 1111 1111 card works).
