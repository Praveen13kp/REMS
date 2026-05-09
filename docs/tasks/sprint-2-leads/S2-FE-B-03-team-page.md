# S2-FE-B-03 — Team page (user list + invite UI)

**Owner:** FE-B
**Branch:** `fe/team/S2-FE-B-03-team-page`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S0-FE-A-02, S1-BE-A-02

## Goal

A page where OWNER/ADMIN/MANAGER manage teammates: see active users, see pending invites with copyable links, change roles, deactivate users, send new invites.

## Files to read first

- `frontend/src/pages/admin/Team.jsx` (placeholder)
- Backend: `GET /api/users`, `POST /api/users/invite`, `PATCH /api/users/:id`

## Steps

1. **Page** — `pages/admin/Team.jsx`:
   - Header + "Invite teammate" button (OWNER/ADMIN only)
   - Tabs: "Active" | "Pending invites"
   - Active table: Avatar, Name, Email, Role (select inline for OWNER/ADMIN to change), Status (Active/Inactive toggle), Last login, Actions (Deactivate)
   - Pending table: Email, Role, Invited by, Sent on, Invite link (copyable), Resend (stub for MVP), Cancel
   - Show a tooltip on the role select explaining "Cannot demote the last owner"

2. **Invite dialog** — `components/team/InviteDialog.jsx`:
   - Email + Role select (ADMIN/MANAGER/AGENT — no OWNER option)
   - Submit → POST → toast with "Invite link copied" + auto-copy to clipboard

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
