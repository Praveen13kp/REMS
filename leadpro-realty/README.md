# LeadPro Realty - Marketing Website

A fully responsive React marketing site for the **LeadPro Realty** multi-tenant SaaS CRM (real estate lead management).

## Stack

- **React 18** + **Vite**
- **Tailwind CSS** with class-based dark mode
- Pure CSS animations (no animation library)

## Features

- Light / dark mode toggle (persisted to `localStorage`, no flash on load)
- Fully responsive: desktop, tablet, mobile (320px - 1920px+)
- Sections: Hero, Features (6 cards), Pricing (monthly/yearly toggle), Contact form, Footer
- Sticky blurred navbar with mobile hamburger menu
- Animated dashboard preview mockup in hero
- Smooth scroll navigation

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/
    Navbar.jsx        - Sticky responsive header + mobile menu
    Hero.jsx          - Headline + animated dashboard mock
    Features.jsx      - 6 feature cards + KPI strip
    Pricing.jsx       - 3 plans + monthly/yearly toggle
    Contact.jsx       - Contact info + form (with success state)
    Footer.jsx        - 4 link columns + socials
    ThemeToggle.jsx   - Sun/moon switch
  context/
    ThemeContext.jsx  - Theme state + localStorage sync
  App.jsx
  main.jsx
  index.css           - Tailwind layers + custom utilities
```

## Customizing

- **Brand colors**: edit `theme.extend.colors.brand` in `tailwind.config.js`
- **Content**: each section is a self-contained component in `src/components/`
- **Theme**: `src/context/ThemeContext.jsx` controls light/dark switching
