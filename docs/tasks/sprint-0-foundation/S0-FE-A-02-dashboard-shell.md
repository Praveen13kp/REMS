# S0-FE-A-02 — Dashboard shell, sidebar, layout polish

> **Updated 2026-05-12:** **Superseded — wire-up only.** `frontend/src/layouts/DashboardLayout.jsx` was rewritten 2026-05-12 to match `leadpro-realty/src/components/layouts/AppLayout.jsx` 1:1, including the sidebar, topbar, theme toggle, and page container. Leadpro CSS classes (`.sidebar`, `.topbar`, `.btn`, `.btn-icon`, etc.) are ported into `frontend/src/styles/leadpro.css`. Do **not** rebuild this with shadcn `Sidebar` / `Navbar` primitives. Remaining work for this task is only: confirm the shell reads role from `useAuthStore`, confirm theme toggle flips `.dark` on `<html>` via `next-themes`, and confirm the "Sign out" item calls `authStore.signOut`. If all three are already true on disk, this task is **done** — append a note to the PR and move on.

**Owner:** FE-A
**Branch:** `fe/foundation/S0-FE-A-02-shell`
**Estimated:** 0.5 day (now ~0.1 day — verification only)
**Blocks:** every page rendered inside `DashboardLayout`
**Blocked by:** S0-FE-A-01

## Goal (revised)

Verify the leadpro-ported `DashboardLayout` is correctly wired to our auth store + theme system. No restyling; no shadcn primitives in the shell.

## Files to read first

- `frontend/src/layouts/DashboardLayout.jsx` (already ported from leadpro)
- `frontend/src/styles/leadpro.css` (class definitions: `.sidebar`, `.topbar`, `.btn`, etc.)
- `leadpro-realty/src/components/layouts/AppLayout.jsx` (reference)
- `leadpro-realty/src/components/{Sidebar,Navbar,ThemeToggle}.jsx` (reference)
- `frontend/src/stores/authStore.js`

## Steps

1. **Verify role-aware sidebar** — `DashboardLayout` (or the Sidebar it renders) reads `useAuthStore().user.role` and shows the menu items leadpro uses:
   - `OWNER` / `ADMIN`: Dashboard, Leads, Projects, Team, Reports, Files, Notifications, Settings
   - `MANAGER`: Dashboard, Leads, Projects, Team (read-only)
   - `AGENT`: Dashboard, My Leads, Projects (view), My Tasks
   - `SUPER_ADMIN`: SuperAdmin, Orgs
   Use `lucide-react` icons matching leadpro.
2. **Verify topbar** — company name (from user), search input (placeholder), notifications icon (placeholder), theme toggle, avatar dropdown with "Profile" + "Sign out". All rendered with leadpro classes (`.topbar`, `.btn-icon`), NOT shadcn primitives.
3. **Verify theme toggle** — flips `.dark` class on `<html>` via `next-themes`. Light is default. Leadpro vars are `--lp-*` namespaced.
4. **Verify Sign out** — calls `authStore.signOut`, then navigates to `/login`.
5. **PageHeader** — if leadpro has an equivalent (`.page-head`, `.page-title`), use that markup directly in pages. Do NOT create a shadcn-flavored `<PageHeader>` component if leadpro just renders raw markup.

## Acceptance criteria

- [ ] Sidebar shows role-correct items (uses leadpro classes, lucide icons)
- [ ] Topbar uses `.topbar` markup with theme toggle, avatar menu
- [ ] Theme toggle flips `.dark` on `<html>` (light default, `next-themes`)
- [ ] Avatar "Sign out" calls `authStore.signOut`
- [ ] No shadcn `Sidebar` / `Navbar` / `Button` primitives in the shell
- [ ] No console warnings

## AI prompt template

> I'm on task S0-FE-A-02 (now verification-only). Read `frontend/src/layouts/DashboardLayout.jsx`, `frontend/src/styles/leadpro.css`, and the leadpro reference at `leadpro-realty/src/components/layouts/AppLayout.jsx`. Confirm the shell is wired to `useAuthStore` for role, `next-themes` for theme, and `authStore.signOut` for the sign-out action. If anything is missing, fix only that — do NOT restyle.

## Notes for reviewer

- The shell is now leadpro-class-based; reject any PR that re-introduces shadcn `Sidebar` / `Dialog` / `Button` in the shell
- Test theme toggle: clicking it should add/remove `.dark` on `<html>` and persist via `next-themes`
