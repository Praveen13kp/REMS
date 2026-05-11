# Static-UI Map — leadpro-realty → our stack

> Cheat-sheet for every FE page task. If you find a class or pattern not listed here, amend this file in your PR.

## 1. Source of truth

The static reference build lives at `_tmp_leadpro/leadpro-realty/` (gitignored). It is **layout/intent reference only** — keep its JSX structure as inspiration, but the implementation belongs to **our stack**: React 19 + React Router v7 + Tailwind v4 + shadcn + zustand + axios + sonner + recharts. Do not copy his CSS, his Context store, his localStorage persistence, his `Modal`/`Toaster` implementations, or his marketing pages.

## 2. Decisions locked in

- **Theme:** light is the default (his is dark by default; we keep his light-theme tokens as our baseline).
- **Primitives:** shadcn (`@/components/ui/*`) — already scaffolded.
- **Charts:** **recharts**, not chart.js.
- **Toasts:** **sonner** (`<Toaster />` from `@/components/ui/sonner`) — already wired in `frontend/src/App.jsx`.
- **Modals:** shadcn `<Dialog>` — never roll a custom backdrop.
- **State:** zustand stores (`@/stores/*`) — never `useApp()` / Context+localStorage.
- **HTTP:** axios via `@/lib/api.js` (`withCredentials: true`).
- **Routing:** React Router v7 (his is v6 — adapt loaders/actions accordingly).
- **CSS:** Tailwind v4 utilities + shadcn variants. No `.btn`, `.card`, `.badge-*` classes from his `index.css`.

## 3. Class → component map

| His class | Our shadcn equivalent | Notes |
|---|---|---|
| `btn`, `btn-primary` | `<Button>` (default variant) | |
| `btn-secondary` | `<Button variant="secondary">` | |
| `btn-ghost` | `<Button variant="ghost">` | |
| `btn-danger` | `<Button variant="destructive">` | |
| `btn-icon` | `<Button size="icon" variant="ghost">` | |
| `btn-sm` | `<Button size="sm">` | |
| `card`, `card-pad-0`, `card-title` | `<Card>` + `<CardHeader>`/`<CardTitle>`/`<CardContent>` | |
| `badge-hot`, `badge-warm`, `badge-cold` | `<Badge variant={...}>` via `priorityCls()` in `lib/format.js` | priority tokens centralised |
| `badge-info`, `badge-success`, `badge-warning`, `badge-error`, `badge-muted` | `<Badge variant={...}>` via `statusCls()` in `lib/format.js` | reuse status color map from S2-FE-B-01 |
| `badge-purple` | `<Badge variant="secondary">` (or custom token in S4) | rare — defer custom variant until S4-FE-A-01 |
| `modal-backdrop`, `modal`, `modal-head`, `modal-body`, `modal-foot` | `<Dialog>` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogFooter` | |
| his `<Toaster>` from `store.jsx` | `sonner` (`<Toaster />` already mounted in `App.jsx`) | call via `import { toast } from "sonner"` |
| `kpi-card` (`components/KpiCard.jsx`) | new `<KpiCard>` wrapping `<Card>` | extract during S4-FE-A-01 |
| data table classes | shadcn `<Table>` from `@/components/ui/table.jsx` | wrap with TanStack Table when sort/filter is needed |
| `input`, `select`, `textarea`, `field`, `checkbox` | `<Input>`, `<Select>`, `<Textarea>`, `<Form>` (react-hook-form + zod) | use `@/components/ui/input-group.jsx` for password toggles |
| `row`, `row-between`, `grid`, `grid-2/3/4`, `stack` | Tailwind utilities (`flex`, `grid grid-cols-*`, `gap-*`) | drop the helper classes entirely |
| `mt-2/3/4/6`, `mb-2/4` | Tailwind spacing utilities | direct rewrite |
| sidebar / nav classes | `@/components/ui/sidebar.jsx` (shadcn) | already scaffolded |

Add rows as you discover more.

## 4. State pattern

**His:**
```jsx
const { data, currentUser, toast, setModal } = useApp()
const leads = data.leads
```

**Ours:**
```jsx
import { useAuthStore } from "@/stores/authStore"
import { useLeadStore } from "@/stores/leadStore"
import { toast } from "sonner"

const user = useAuthStore((s) => s.user)
const leads = useLeadStore((s) => s.leads)
toast.success("Saved")
```

Subscribe to one slice per call — never destructure the whole store.

## 5. Helpers worth porting verbatim

Lifted into `frontend/src/lib/format.js` (pure, no state):

- `fmt.inr(n)` — `₹` + `en-IN` locale
- `fmt.date(d)` — `dd Mon yyyy`
- `fmt.dateShort(d)` — `dd Mon`
- `fmt.ago(d)` — relative time (just now / Xm / Xh / Xd / fallback to `dateShort`)
- `fmt.initials(name)` — first letters of first two words, uppercased
- `roleLabel(role)` — pretty role string (`super_admin` → `Super Admin`)
- `priorityCls(priority)` — returns a shadcn `<Badge>` variant for `Hot`/`Warm`/`Cold`
- `statusCls(status)` — returns a shadcn `<Badge>` variant for lead statuses

## 6. Things NOT to copy

- `seed()` — fake data generator. Real data comes from the API.
- `loadState()` / `localStorage` persistence — never persist business data client-side; the session cookie is the only persistent client artifact.
- `Modal` and `Toaster` implementations from `store.jsx` — use shadcn `<Dialog>` and sonner.
- `index.css` (his custom classes & CSS variables) — Tailwind v4 + shadcn tokens replace all of it.
- `uid()` — IDs come from the backend.
- Marketing pages: `Landing.jsx`, `Pricing.jsx`, `Features.jsx`, `Contact.jsx`, `Hero.jsx`, `Footer.jsx`, `PublicLayout.jsx`. **Post-MVP. Reject any PR that adds them.**

## 7. Page-to-task index

| His file | Our task | Notes |
|---|---|---|
| `pages/Dashboard.jsx` | S4-FE-A-01 / 02 / 03 | KPI cards + recharts |
| `pages/Leads.jsx` | S2-FE-B-01 (table) + S3-FE-B-02 (kanban inspiration) | |
| `pages/LeadForm.jsx`, `pages/AddLead.jsx` | S2-FE-B-02 | react-hook-form + zod |
| `pages/LeadDetail.jsx` | S3-FE-B-01 | |
| `pages/UsersMgmt.jsx` | S2-FE-B-03 | |
| `pages/FollowUps.jsx`, `pages/FollowUp.jsx` | S3-FE-A-01 | |
| `pages/Assign.jsx`, `pages/AssignLead.jsx` | folded into S2-FE-B-01/02 | |
| `pages/{Login,Signup,Forgot}.jsx`, `components/AuthSide.jsx` | S1-FE-A-01 | visuals only — auth wiring is from S0-FE-A-01 |
| `components/{Sidebar,Navbar}.jsx`, `components/layouts/AppLayout.jsx`, `components/DashboardLayout.jsx` | S0-FE-A-02 | |
| `pages/{Landing,Pricing,Features,Contact,Home}.jsx`, `components/{Hero,Footer,Pricing,Features,Contact}.jsx` | **post-MVP** | do not implement |
| `pages/{SuperAdmin,Orgs,Files,Notifications,Reports,Settings,Profile}.jsx` | **post-MVP** | do not implement |

## 8. Smoke-test page

A temporary `/__ui-check` route renders one of every mapped primitive so reviewers can confirm the map is real. **It will be removed when S0-FE-A-02 (app shell) lands.** Do not link to it from anywhere.
