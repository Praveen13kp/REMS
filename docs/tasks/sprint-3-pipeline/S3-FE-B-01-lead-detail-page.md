# S3-FE-B-01 — Lead detail page

> **Updated 2026-05-12:** Source of truth is `leadpro-realty/src/pages/LeadDetail.jsx`. **leadpro's LeadDetail has NO tabs** — it's a two-column layout with cards. The original spec called for Overview/Activity/Notes/Tasks/Files tabs; that's dropped to match leadpro. Activity/Tasks/Files surfacing on this page is deferred — TL to decide whether to add an Activity panel on the right side later.

**Owner:** FE-B
**Branch:** `fe/lead/S3-FE-B-01-detail`
**Estimated:** 1 day
**Blocks:** S4-FE-B-01 (notes UI lives here)
**Blocked by:** S2-FE-B-01, S3-BE-A-01, S3-BE-B-02

## Goal

Port `leadpro-realty/src/pages/LeadDetail.jsx` 1:1 into `frontend/src/pages/LeadDetail.jsx`. Wire to live backend endpoints.

## Source of truth

- **Page to port:** `leadpro-realty/src/pages/LeadDetail.jsx`
- Backend endpoints: `GET /api/leads/:id`, `POST /api/leads/:id/transition` (S3-BE-B-02), `POST /api/leads/:id/assign` (S2-BE-B-03), `PATCH /api/leads/:id` (S2-BE-B-01), `GET /api/leads/:id/activity` (S3-BE-A-01 — fetch but not necessarily displayed yet, see notes)

## Stack rules (enforce strictly)

- **Styling:** leadpro CSS classes only — `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.card-title`, `.badge`, `.badge-muted`, `.avatar`, `.avatar.lg`, `.row`, `.stack`, `.grid`, `.grid-2`, `.content-head`, `.field`, `.input`, `.select`, `.textarea`, `.nav-item`, `.text-muted`, `.text-sm`, `.text-xs`. NOT shadcn primitives.
- **No shadcn:** no `Card`, `Tabs`, `Badge`, `Select`, `Dialog`, `Avatar` components from shadcn in this file.
- **Status change UI:** clickable badges (one per status) inside a Status & Workflow card — NOT a dropdown. Match leadpro exactly.
- **Reassign UI:** opens a modal (leadpro `.modal-backdrop` + `.modal`) with a `<select className="select">` of agents. NOT a shadcn Dialog.
- **Delete confirmation:** same modal pattern.
- **Forms:** react-hook-form + zod for the edit dialog (handled by S2-FE-B-02 LeadFormDialog — also port to leadpro classes when that gets reworked).
- **Icons:** lucide-react. leadpro imports: `Phone, MessageSquare, Pencil, CalendarPlus, StickyNote, MapPin, Mail, Trash2, UserCog, SearchX`.

## Steps

1. **Route** — request FE-A to add `/leads/:id` to `App.jsx`.

2. **Page** — `frontend/src/pages/LeadDetail.jsx`:
   - **Header (`.content-head`):** back link "← Back to leads", lead name (h1), `phone · email` subtitle. Right side row: Call (`.btn-secondary`, opens `tel:`), WhatsApp (`.btn-secondary`, opens `https://wa.me/<digits>`), Edit (`.btn-primary`, opens LeadFormDialog from S2-FE-B-02).
   - **Body:** `<div className="grid" style="gridTemplateColumns: 2fr 1fr; gap: 16">`.
   - **Left column (`.stack`):**
     - **Lead Information card** — `.grid.grid-2` of `<Row k v />` rows: Project, Budget (formatted INR), Source, City, Created, Last Updated, AI Score (with progress bar `var(--accent)` fill at `score%`), Next Follow-Up. Notes section below as a nested card on `var(--surface-2)`.
     - **Status & Workflow card** — wrapped row of clickable badges, one per pipeline stage, current status uses `statusCls(s)`, others use `.badge-muted`. On click → call `POST /api/leads/:id/transition` with `toStatus`. If target is `isLost`, prompt inline reason via modal before sending.
   - **Right column (`.stack`):**
     - **Assigned Agent card** — avatar `.lg` + name + email + dept; "Reassign" button opens modal with agent select. If unassigned, show "Not assigned yet." + "Assign Agent" primary button.
     - **Quick Actions card** — `.stack` of `.nav-item` rows: Schedule Follow-Up, Add Note, Log Site Visit, Send Email, Delete Lead (last is `var(--error)`). Stubs for now where backend isn't ready — wire what's available.

3. **Status change UX** — clicking a badge fires transition immediately. For `isLost`/`Lost`, open a small leadpro modal with a `.input` reason field before submitting. On success, refetch lead; toast via our toast helper.

4. **Reassign UX** — modal with `.select` listing `agents = users.filter(role === 'agent' && active)`. Submit → `POST /api/leads/:id/assign`. Refetch.

5. **Delete UX** — modal with "Permanently delete <name>?" + Cancel/Delete (danger) actions. On confirm → `DELETE /api/leads/:id`, navigate back to `/leads`.

6. **State** — `useLeadStore` single-lead selector + `services/leadService.js`. No `useApp()`. Replace leadpro's `data.users` lookup with our users store/fetch.

## Acceptance criteria

- [ ] Visual parity with `leadpro-realty/src/pages/LeadDetail.jsx` (no tabs, two-column, cards)
- [ ] Zero shadcn imports in this file
- [ ] Status badge row works; transition endpoint called; Lost prompts for reason
- [ ] Reassign modal works
- [ ] Edit button opens LeadFormDialog from S2-FE-B-02
- [ ] Delete modal works
- [ ] Click-to-call (`tel:`) and WhatsApp (`wa.me`) links work

## AI prompt template

> I'm on task S3-FE-B-01. Read `leadpro-realty/src/pages/LeadDetail.jsx` and port it 1:1 into `frontend/src/pages/LeadDetail.jsx`. Use leadpro CSS classes (already in `frontend/src/styles/leadpro.css`), NOT shadcn. Replace `useApp()` with our zustand store + axios. Wire transitions to `POST /api/leads/:id/transition`. Show me the layout sketch first.

## Notes for reviewer

- No tabs — different from older spec. Activity timeline is deferred to a later task.
- Status & Workflow card uses clickable badges, not a dropdown.
- Lost-reason prompt is the only place that intercepts a status click.
- All modals use leadpro `.modal-backdrop` + `.modal` classes, not shadcn `Dialog`.
