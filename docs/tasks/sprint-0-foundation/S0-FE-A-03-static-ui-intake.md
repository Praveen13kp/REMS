# S0-FE-A-03 — Static-UI intake (leadpro-realty)

> **Updated 2026-05-12:** **Scope rewritten.** The original task produced `docs/STATIC-UI-MAP.md` mapping leadpro CSS classes to shadcn primitives. That mapping is **obsolete** — we are NOT restyling to shadcn. Instead, `leadpro-realty/` is committed at the repo root as the source of truth, its CSS classes are ported verbatim into `frontend/src/styles/leadpro.css`, and every FE page task ports JSX from `leadpro-realty/src/pages/<Page>.jsx` into `frontend/src/pages/`. No class→component map is needed. This task now reduces to: confirm leadpro-realty structure is understood, port the pure formatter helpers, and ensure leadpro.css is wired.

**Owner:** FE-A
**Branch:** `fe/foundation/S0-FE-A-03-static-ui-intake`
**Estimated:** 0.25 day
**Blocks:** every FE page task (S1-FE-A-01, S1-FE-B-02, S2-FE-B-*, S3-FE-*, S4-FE-A-*, S4-FE-B-*)
**Blocked by:** S0-FE-A-01

## Why this task exists

On 2026-05-10 the manager handed off a static reference build (`leadpro-realty/`). It covers the **full 25-page SOW** (marketing site + admin panel + Phase-4 pages), uses **plain CSS classes** (`.btn`, `.card`, `.kpi`, `.sidebar`, `.topbar`, `.modal`, `.tabs`, `.auth-wrap`, `.public-nav`, etc.) defined in its `src/index.css`, plus **chart.js** and a Context+localStorage seed store.

On 2026-05-12 we locked in: **leadpro-realty is the source of truth**. We port pages 1:1, keep its CSS classes, swap only the state layer (zustand/axios) and validation layer (zod + react-hook-form). No shadcn primitives in ported pages.

## Goal

- Make sure every FE intern knows where the reference build lives and how to port from it.
- Ensure `frontend/src/styles/leadpro.css` is imported globally and contains every class leadpro uses.
- Port leadpro's pure formatter helpers (`fmt`, `roleLabel`, `priorityCls`, `statusCls`) into `frontend/src/lib/format.js`.

## Out of scope

- Producing any class→component mapping doc (obsolete)
- Porting actual pages (each page is a separate sprint task)
- Restyling anything to shadcn (forbidden)

## Steps

### 1. Confirm leadpro-realty structure

- Location: `leadpro-realty/` at repo root (committed, NOT gitignored).
- Skim `leadpro-realty/src/index.css` — note every custom class used.
- Skim `leadpro-realty/src/store.jsx` — understand the `useApp()` shape (we replace this with zustand stores + axios calls).
- Skim `leadpro-realty/src/components/layouts/{AppLayout,PublicLayout}.jsx` and `src/components/{Sidebar,Navbar,ThemeToggle}.jsx`.
- 25 pages live under `leadpro-realty/src/pages/`: Landing, Features, Pricing, Contact, Login, Signup, Forgot, Dashboard, Leads, LeadDetail, LeadEdit, AddLead, Assign, FollowUps, Reports, Files, UsersMgmt, Notifications, Settings, Profile, SuperAdmin, Orgs.

### 2. Verify `frontend/src/styles/leadpro.css`

- Confirm it contains every class leadpro uses (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.card`, `.kpi`, `.sidebar`, `.topbar`, `.modal-backdrop`, `.modal`, `.modal-head`, `.modal-body`, `.modal-foot`, `.tabs`, `.tab`, `.input`, `.select`, `.textarea`, `.auth-wrap`, `.auth-side`, `.public-nav`, `.badge-hot`, `.badge-warm`, `.badge-cold`, `.badge-info`, `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-muted`, etc.).
- Confirm `frontend/src/main.jsx` (or root entry) imports it: `import "./styles/leadpro.css";`.
- CSS vars are namespaced `--lp-*`. Light theme is default; `.dark` class on `<html>` flips to dark.

### 3. Port `frontend/src/lib/format.js`

Pure helper module — no React, no state. Lift directly from leadpro's `src/store.jsx` (or equivalent):

- `fmt.inr(n)` — INR currency formatter
- `fmt.date(d)` — date formatter
- `fmt.ago(d)` — relative time
- `fmt.initials(name)` — avatar initials
- `roleLabel(role)` — role display name
- `priorityCls(priority)` — returns `'badge-hot'` / `'badge-warm'` / `'badge-cold'`
- `statusCls(status)` — returns the matching leadpro badge class

### 4. No smoke-test page

(The original task added `/__ui-check` to verify shadcn primitives. Not needed — leadpro pages are the test.)

## Acceptance criteria

- [ ] `leadpro-realty/` is committed at repo root and NOT gitignored
- [ ] `frontend/src/styles/leadpro.css` contains every leadpro class and is imported globally
- [ ] `frontend/src/lib/format.js` exports `fmt`, `roleLabel`, `priorityCls`, `statusCls`
- [ ] No `STATIC-UI-MAP.md` is created (the old mapping doc is obsolete)
- [ ] No `/__ui-check` route is created

## Notes for reviewer

- The "source of truth" is leadpro-realty's JSX + CSS, not any mapping doc
- Do NOT copy leadpro's `seed()` data, its localStorage persistence, or its `useApp()` Context — replace those with our zustand stores + axios api calls in each per-page task
- If a page task needs a class that isn't in `leadpro.css` yet, port the class from `leadpro-realty/src/index.css` as part of that page's PR
