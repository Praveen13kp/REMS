# S2-FE-B-03 — User Management page (renamed from "Team")

> **Updated 2026-05-12:** Renamed from "Team" to **User Management** to match the leadpro nav. Source page is `leadpro-realty/src/pages/UsersMgmt.jsx`. Recommended route: `/users-mgmt` (matches leadpro sidebar). Keep `/team` as a redirect to `/users-mgmt` so any existing sidebar links keep working. Shadcn primitives are NOT used.

**Owner:** FE-B
**Branch:** `fe/users/S2-FE-B-03-users-mgmt`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S0-FE-A-02, S1-BE-A-02

## Goal

A page where OWNER/ADMIN/MANAGER manage teammates: see active users, see pending invites with copyable links, change roles, deactivate users, send new invites. Includes a simple **role matrix** card describing what each role can do (port the explanatory section from `UsersMgmt.jsx`).

## Files to read first

- `leadpro-realty/src/pages/UsersMgmt.jsx` — source page to port
- `frontend/src/pages/admin/Team.jsx` (existing placeholder; will be renamed to `UsersMgmt.jsx`)
- Backend: `GET /api/users`, `POST /api/users/invite`, `PATCH /api/users/:id`

## Steps

1. **Page** — `pages/users/UsersMgmt.jsx` (route `/users-mgmt`):
   - `.content-head` with title "User Management" + "Invite User" button (OWNER/ADMIN only)
   - Leadpro `.tabs` strip: "Active" | "Pending invites"
   - Search input (`.topbar-search`) above the table
   - Active table (`.table-wrap` > `<table className="data">`): Avatar (`.avatar`), Name, Email, Role (inline `.select` for OWNER/ADMIN to change), Status (Active/Inactive — use a leadpro toggle/badge), Last login, Actions (`.btn-icon` Pencil edit + UserX deactivate)
   - Pending table: Email, Role, Invited by, Sent on, Invite link (copyable), Resend (stub for MVP), Cancel
   - Show a tooltip on the role select: "Cannot demote the last owner"
   - **Role matrix card** — small `.card` below the table summarising Owner / Admin / Manager / Agent / Viewer capabilities (port from leadpro). Optional Edit User dialog uses leadpro `.modal-backdrop` + `.modal`.

2. **Invite modal** — `components/users/InviteUserModal.jsx`:
   - leadpro `.modal-backdrop` + `.modal` (NOT shadcn `Dialog`).
   - Fields (react-hook-form + zod): Full name, Email, Role select (ADMIN/MANAGER/AGENT — no OWNER option), Department (optional input).
   - Inputs use `.input`, `.select`, `.label`.
   - Submit → POST → toast with "Invite link copied" + auto-copy to clipboard.

3. **Role change** — inline select on the active table → PATCH; optimistic update; revert on error toast (e.g., "Cannot demote the last owner").

4. **Deactivate** — confirm dialog → PATCH `{isActive: false}`; row moves out of active table.

## Acceptance criteria

- [ ] Active and Pending tabs both populate correctly
- [ ] Invite flow works end-to-end with copyable link
- [ ] Role change persists; failure toast on last-owner case
- [ ] Deactivate persists
- [ ] AGENT cannot see this page (route guard from FE-A's role mapping; if AGENT lands here, redirect or 403)

## AI prompt template

> I'm on task S2-FE-B-03. Read this spec, `frontend/src/pages/admin/Team.jsx`, and the backend endpoints from `S1-BE-A-02-user-invite.md`. Build the team page with two tabs and the invite dialog. Show me the table column lists and the invite dialog form first.

## Notes for reviewer

- The "copy invite link" UX is critical for MVP since email isn't actually sent
- Verify the AGENT route block (sidebar already hides it but route should also reject)

## Static UI reference (updated 2026-05-12 — supersedes 2026-05-10)

- **Source page:** `leadpro-realty/src/pages/UsersMgmt.jsx`. Port markup + classes 1:1.
- **Markup/classes:** `.content-head`, `.card`, `.tabs`, `.table-wrap`, `<table className="data">`, `.topbar-search`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-ghost`, `.modal-backdrop`, `.modal`, `.avatar`, `.badge`, `.input`, `.select`, `.label`.
- **Do NOT use:** shadcn `Tabs`, `Table`, `Select`, `Switch`, `Dialog`, `Button`, `Alert`.
- **Forms:** react-hook-form + zod inside the invite/edit modals.
- **Scope:** include the `dept` column (leadpro shows it) but keep it nullable/optional in the API contract; skip `mgrId` until S4+.
- **State:** new `useUserStore` (zustand) + `services/userService.js`. No `useApp()`.
- **Icons:** lucide-react (`UserPlus`, `Pencil`, `UserX`, `UserCheck`, `Trash2`, `Search`).
- **Theme:** light default; dark via `.dark` class.
