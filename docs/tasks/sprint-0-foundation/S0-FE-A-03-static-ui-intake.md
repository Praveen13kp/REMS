# S0-FE-A-03 — Static-UI intake & shadcn token map

**Owner:** FE-A
**Branch:** `fe/foundation/S0-FE-A-03-static-ui-map`
**Estimated:** 0.5 day
**Blocks:** every FE page task that references a static counterpart (S0-FE-A-02, S1-FE-A-01, S2-FE-B-*, S3-FE-*, S4-FE-A-*)
**Blocked by:** S0-FE-A-01

## Why this task exists

On 2026-05-10 the manager handed off a static reference build (`leadpro-realty.zip`, unzipped under `_tmp_leadpro/leadpro-realty/`). It covers the **full SOW** (marketing site + admin panel + extra Phase-4 pages), uses **plain CSS classes** (`btn-secondary`, `badge-hot`, `card`, `modal-backdrop`, etc.) defined in its `src/index.css`, plus **chart.js** and a Context+localStorage store.

Our app uses **shadcn / Tailwind v4 / zustand / axios / sonner / recharts**. We agreed to keep his JSX as a *layout/intent reference* (option B) and restyle every page to our stack. That decision burns intern-time if every page task re-decides "what's the shadcn equivalent of `btn-secondary`?" — so we produce the answer once, here.

## Goal

Deliver `docs/STATIC-UI-MAP.md` — a single cheat-sheet every FE page task can point at, plus a thin "primitives smoke-test" page so we know the mapped components actually render.

## Out of scope

- Porting actual pages (those land in their own sprint tasks)
- Marketing site (Landing/Pricing/Features/Contact) — deferred to post-MVP
- His extra pages (SuperAdmin, Orgs, Files, Notifications, Reports, Invoices) — deferred to post-MVP
- Chart library swap implementation (just document the choice: **recharts**)

## Steps

### 1. Read the static build

- Unzipped at `_tmp_leadpro/leadpro-realty/` (do NOT commit this folder — add to `.gitignore` if not already).
- Skim `src/index.css` to enumerate every custom class used across pages.
- Skim `src/store.jsx` to understand the `useApp()` shape — every page reads from it.
- Skim `src/components/layouts/{AppLayout,PublicLayout}.jsx` and `src/components/{Sidebar,Navbar}.jsx`.

### 2. Produce `docs/STATIC-UI-MAP.md`

Sections:

1. **Source of truth** — one paragraph: his build is reference-only; our stack is the implementation.
2. **Decisions locked in** — light theme default; shadcn primitives; recharts; sonner toasts; shadcn `Dialog` for modals; React 19 + Router v7 + Tailwind v4 (his is 18/v6/v3).
3. **Class → component map** — a table:
   | His class | Our shadcn equivalent | Notes |
   |---|---|---|
   | `btn`, `btn-primary` | `<Button>` (default variant) | |
   | `btn-secondary` | `<Button variant="secondary">` | |
   | `btn-ghost` | `<Button variant="ghost">` | |
   | `btn-icon` | `<Button size="icon" variant="ghost">` | |
   | `card` | `<Card><CardContent>` | |
   | `badge-hot`, `badge-warm`, `badge-cold` | `<Badge variant="destructive">` / `secondary` / `outline` | priority color tokens — define in `lib/constants.js` |
   | `badge-info`, `badge-success`, `badge-warning`, `badge-error`, `badge-muted` | `<Badge>` with status color tokens | reuse status color map from S2-FE-B-01 |
   | `modal-backdrop`, `modal`, `modal-head`, `modal-body`, `modal-foot` | `<Dialog>` + `DialogHeader` / `DialogContent` / `DialogFooter` | |
   | his `<Toaster>` from `store.jsx` | `sonner` (`<Toaster />` from `@/components/ui/sonner`) | already wired in `App.jsx` |
   | `kpi-card` (`components/KpiCard.jsx`) | new `<KpiCard>` wrapping `<Card>` | extract during S4-FE-A-01 |
   | data table classes | shadcn `<Table>` from `components/ui/table.jsx` | |
   | form inputs | `<Input>`, `<Select>`, `<Textarea>`, `<Form>` (react-hook-form) | |
   Add rows as you discover more.
4. **State pattern** — show before/after snippet: his `const { data, currentUser } = useApp()` ↔ our `const user = useAuthStore(s => s.user); const leads = useLeadStore(s => s.leads)`.
5. **Helpers worth porting verbatim** — his `fmt.inr`, `fmt.date`, `fmt.ago`, `fmt.initials`, `roleLabel`, `priorityCls`, `statusCls`. Move these to `frontend/src/lib/format.js` (pure functions, no state).
6. **Things NOT to copy** — his `seed()` function, his localStorage persistence, his `Modal`/`Toaster` implementations, his CSS, his marketing pages.
7. **Page-to-task index** — quick lookup so each task knows its reference file:
   - `pages/Dashboard.jsx` → S4-FE-A-01/02/03
   - `pages/Leads.jsx` → S2-FE-B-01 (and Kanban inspiration for S3-FE-B-02)
   - `pages/LeadForm.jsx` → S2-FE-B-02
   - `pages/LeadDetail.jsx` → S3-FE-B-01
   - `pages/UsersMgmt.jsx` → S2-FE-B-03
   - `pages/FollowUps.jsx` → S3-FE-A-01
   - `pages/{Login,Signup,Forgot}.jsx`, `components/AuthSide.jsx` → S1-FE-A-01 (visuals only; auth wiring stays from S0-FE-A-01)
   - `components/{Sidebar,Navbar}.jsx`, `components/layouts/AppLayout.jsx` → S0-FE-A-02
   - All `Landing/Pricing/Features/Contact/PublicLayout/Orgs/SuperAdmin/Files/Notifications/Settings/Profile/Reports` → **post-MVP**, do not implement.

### 3. Port `lib/format.js`

Pure helper module — no React, no state. Lifted directly from his `store.jsx` `fmt`/`roleLabel`/`priorityCls`/`statusCls`.

### 4. Tiny smoke page (delete before merge of S0-FE-A-02)

Add a temporary `/__ui-check` route rendering one of every mapped primitive (Button variants, Badge variants, Card, Dialog, Table, Input, Select, Sonner toast). This is just to verify the map is real — remove when S0-FE-A-02 lands the actual shell.

## Acceptance criteria

- [ ] `docs/STATIC-UI-MAP.md` committed with all sections above
- [ ] `frontend/src/lib/format.js` exports `fmt`, `roleLabel`, `priorityCls`, `statusCls`
- [ ] `_tmp_leadpro/` is gitignored
- [ ] `/__ui-check` page renders every mapped primitive without errors (will be removed by S0-FE-A-02)
- [ ] No production code outside `lib/format.js` and the smoke page is touched

## Notes for reviewer

- The map is a living doc — later page tasks WILL find new classes; PR-amend it freely
- Do not copy `seed()` data; never persist business data in localStorage
- Marketing site stays deferred; if anyone files a PR adding `Landing.jsx`, reject
