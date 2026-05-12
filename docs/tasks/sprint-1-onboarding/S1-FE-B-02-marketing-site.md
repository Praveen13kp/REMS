# S1-FE-B-02 — Public marketing site (Landing / Pricing / Features / Contact)

**Owner:** FE-B
**Branch:** `fe/public/S1-FE-B-02-marketing`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S0-FE-A-01 (routing/api client), S0-FE-A-03 (static-ui map)

## Goal

Build the public-facing site so unauthenticated visitors land somewhere real before they sign up. Mirrors the manager's `PublicLayout` + four pages.

## Files to read first

- `_tmp_leadpro/leadpro-realty/src/components/layouts/PublicLayout.jsx`
- `_tmp_leadpro/leadpro-realty/src/components/{Navbar,Footer,Hero,Features,Pricing,Contact}.jsx`
- `_tmp_leadpro/leadpro-realty/src/pages/{Landing,Pricing,Features,Contact}.jsx`
- `frontend/src/App.jsx` (current route tree)
- `docs/STATIC-UI-MAP.md`

## Steps

1. **`PublicLayout`** — `frontend/src/layouts/PublicLayout.jsx`:
   - Top `Navbar` (brand, links, "Log in" / "Get started" buttons), `<Outlet />`, then `Footer`.
   - Sticky transparent → solid on scroll.
   - Mobile drawer via shadcn `Sheet`.

2. **Routing** — add public routes in `App.jsx` above the auth layer:
   - `/` → `Landing`, `/pricing` → `Pricing`, `/features` → `Features`, `/contact` → `Contact`.
   - Move the existing `/` → `/dashboard` redirect inside `ProtectedRoute` only, so logged-out users see `Landing`.
   - Authenticated users hitting `/` get redirected to `/dashboard` (read `useAuthStore` in `Landing` or use a small `RedirectIfAuthed` wrapper).

3. **Landing** — `pages/public/Landing.jsx`:
   - `Hero` section (headline, sub, CTA buttons → `/signup`, `/features`).
   - Feature grid (3–6 `Card`s with icon + title + blurb).
   - Social-proof strip (logos placeholder).
   - Pricing teaser (3 plan `Card`s) linking to `/pricing`.
   - Final CTA band.

4. **Pricing** — `pages/public/Pricing.jsx`:
   - Three plan `Card`s side-by-side on `md+`, stacked on mobile.
   - Highlight the middle plan with `Badge` "Popular".
   - Feature checklist per plan using lucide `Check` / `X` icons.
   - "Talk to sales" → `/contact`.

5. **Features** — `pages/public/Features.jsx`:
   - Long-form grid of feature blocks (icon + heading + paragraph).
   - Anchor links from `Landing`.

6. **Contact** — `pages/public/Contact.jsx`:
   - Two-column: contact form (name/email/message via shadcn `Form` + zod) on left, contact info card on right.
   - Submit posts to `POST /api/public/contact` if BE ready; else stub with `sonner` toast + log.

7. **SEO basics** — set `<title>` and `<meta name="description">` per route via `react-helmet-async` (or vanilla `useEffect` document.title if helmet isn't already installed).

## Acceptance criteria

- [ ] All four public routes render with shared `PublicLayout`
- [ ] Navbar links work; mobile drawer opens
- [ ] Authed user visiting `/` is redirected to `/dashboard`
- [ ] Unauthed user visiting `/dashboard` stays on `Landing` until they sign in
- [ ] Pricing/Features/Contact have no broken links or console errors
- [ ] Lighthouse mobile score ≥ 85 on `Landing`
- [ ] No raw HTML form elements — shadcn `Form` everywhere

## AI prompt template

> I'm on task S1-FE-B-02. Read the manager's `PublicLayout`, `Navbar`, `Footer`, `Hero`, `Features`, `Pricing`, `Contact` components and the four pages, plus `frontend/src/App.jsx` and `docs/STATIC-UI-MAP.md`. Restyle to shadcn (`Card`, `Button`, `Badge`, `Sheet` for mobile menu, `Form`/`Input`/`Textarea` for contact). Show me the route-tree change and the auth-redirect strategy before writing.

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/components/layouts/PublicLayout.jsx`, plus the four pages and their hero/feature/pricing/contact components.
- **Restyle:** shadcn `Card`, `Button`, `Badge`, `Sheet` (mobile nav), `Form` + `Input` + `Textarea` (contact), `Separator`. Icons via `lucide-react`. No `.hero`, `.feature-grid`, `.pricing-card` CSS classes from his `index.css`.
- **State:** no global stores. `useAuthStore` only for the `/` redirect check.

## Notes for reviewer

- Don't ship images from the manager's `dist/` — use lucide icons + simple Tailwind gradients for hero artwork until design provides real assets.
- The contact form's BE endpoint is optional for MVP — stub with `sonner` toast and a `TODO(BE)` if `POST /api/public/contact` doesn't exist yet.
