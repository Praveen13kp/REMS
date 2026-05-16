# S5-FE-B-02 — Pricing section on Landing page

**Owner:** FE dev
**Branch:** `fe/marketing/S5-FE-B-02-pricing-section`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** —

## Goal

Landing page is missing a Pricing section. We already have `pages/public/Pricing.jsx` as a standalone route — port that content into a section on Landing so visitors see pricing without an extra click.

## Steps

1. Read `frontend/src/pages/public/Pricing.jsx` — note tier cards, CTA buttons, feature lists.
2. Extract the tier-card markup into a reusable `<PricingSection />` component (under `components/marketing/`) — both pages will import it.
3. Embed `<PricingSection />` in `Landing.jsx`, placed above the footer / final CTA.
4. Keep `/pricing` route working — it just renders `<PricingSection />` inside a page shell.
5. Make sure the section has a `#pricing` anchor so the navbar link can scroll to it.

## Acceptance criteria

- [ ] Landing page shows pricing tiers between the existing hero/features section and the footer
- [ ] Standalone `/pricing` route still works and is visually identical
- [ ] `#pricing` anchor scrolls smoothly from the navbar
- [ ] No duplicate JSX between Landing.jsx and Pricing.jsx — both use the shared component
