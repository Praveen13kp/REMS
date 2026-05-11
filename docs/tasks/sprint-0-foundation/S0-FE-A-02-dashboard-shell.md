# S0-FE-A-02 — Dashboard shell, sidebar, layout polish

**Owner:** FE-A
**Branch:** `fe/foundation/S0-FE-A-02-shell`
**Estimated:** 0.5 day
**Blocks:** every page rendered inside `DashboardLayout`
**Blocked by:** S0-FE-A-01

## Goal

Make the authenticated app shell feel real: working sidebar with role-based menu, top bar with user menu, theme toggle, page container.

## Files to read first

- `frontend/src/layouts/DashboardLayout.jsx`
- `frontend/src/components/common/{Sidebar,Navbar}.jsx`
- `frontend/src/components/ui/sidebar.jsx` (shadcn)
- `frontend/src/index.css`

## Steps

1. **DashboardLayout** — use shadcn's `SidebarProvider` + `Sidebar` + content area. Persist sidebar collapsed state in localStorage.
2. **Sidebar** — reads `useAuthStore().user.role` and shows different menu items:
   - `OWNER`/`ADMIN`: Dashboard, Leads, Projects, Team, Settings
   - `MANAGER`: Dashboard, Leads, Projects, Team (read-only)
   - `AGENT`: Dashboard, My Leads, Projects (view), My Tasks
   - Use `lucide-react` icons. Active route gets accent color.
3. **Navbar** — top bar with: company name (from user), search input (non-functional placeholder for now, ok), notifications icon (placeholder), theme toggle (`next-themes`), avatar dropdown with "Profile" + "Sign out".
4. **Theme** — wrap `App` in `ThemeProvider` from `next-themes` (already installed). Default to `system`. Toggle from navbar.
5. **Page container** — every routed page renders inside a consistent `<main>` with padding, max-width, and a page-header slot. Create `frontend/src/components/common/PageHeader.jsx` taking `title`, `description`, `actions`.
6. **Empty state placeholders** — for the `Dashboard`, `Leads`, `Projects`, `Team` pages, render a friendly empty state with a `lucide-react` icon and "Coming soon — being built in Sprint X" text. The actual content arrives in later sprints.

## Acceptance criteria

- [ ] Sidebar shows different items based on role
- [ ] Navbar has theme toggle that actually flips colors (light/dark/system)
- [ ] Avatar dropdown contains a working "Sign out" that calls `authStore.signOut`
- [ ] `PageHeader` component is reusable
- [ ] All four placeholder pages render without errors
- [ ] No console warnings

## AI prompt template

> I'm on task S0-FE-A-02. Read this task spec, `frontend/src/layouts/DashboardLayout.jsx`, `frontend/src/components/common/{Sidebar,Navbar}.jsx`, and `frontend/src/components/ui/sidebar.jsx` (the shadcn primitive). Build a role-aware sidebar, a navbar with theme toggle and user menu, and a `PageHeader` component. Use `next-themes` for theme. Walk me through the role-to-menu mapping before writing.

## Notes for reviewer

- This is the LAST task FE-A does that touches the shared sidebar — after this, FE-B requesting a new menu item must go through FE-A
- Test theme toggle in all three states (light/dark/system)

## Static UI reference (added 2026-05-10)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/components/{Sidebar,Navbar}.jsx`, `src/components/layouts/AppLayout.jsx`, `src/components/ThemeToggle.jsx` — use for menu structure, role-to-item mapping, and information density only.
- **Restyle:** port JSX intent to **shadcn primitives** (already planned in step 1). Do NOT copy his hand-rolled CSS — follow `docs/STATIC-UI-MAP.md` from S0-FE-A-03 for the class→component map.
- **Theme:** **light default** (overrides his dark default). Use `next-themes` as already specced.
- **State:** read role from `useAuthStore`, not from his `useApp()` Context.
- **Out of scope:** his `PublicLayout` / marketing site — deferred post-MVP.
