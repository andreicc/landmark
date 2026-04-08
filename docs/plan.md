# Landmark Real Estate — Website Plan

## Overview

Presentation website for **Landmark**, a real estate brand. Simple, modern, UX-friendly. No backend.

## Pages

1. **Homepage** — Hero, features, CTA, featured projects
2. **About Us** — Brand story, mission/vision, team, milestones
3. **Contact Us** — Form (Formspree), Google Map, office info, socials
4. **Projects** — Filterable grid, image gallery/lightbox

## Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| HTML/CSS/JS | From Sketch MCP export | Design-driven, no manual coding of layouts |
| Build tool | Vite (optional) | Hot-reload, image optimization, minification |
| Contact form | Formspree | Free tier, no backend needed |
| Deployment | Vercel | Connected to dedicated Git repo |
| Version control | Git | New repo, initialized for this project |

## Decisions

- **HTML source:** Pulled page-by-page from Google Sketch via MCP
- **CSS/Brand assets:** Extracted from Sketch export (colors, fonts, images)
- **Contact form:** Formspree (50 submissions/month free tier)
- **Deployment:** Vercel connected to dedicated Git repo
- **Responsive:** Mobile-first (320px → 1440px+)
- **Images:** WebP with JPEG fallback via `<picture>`, lazy-loaded
- **Animations:** CSS transitions + Intersection Observer (no libraries)

## File Structure

```
Landmark/
├── docs/
│   └── plan.md
├── index.html              # Homepage
├── about.html              # About Us
├── contact.html            # Contact Us
├── projects.html           # Projects / Portfolio
├── vite.config.js          # Multi-page config (if using Vite)
├── package.json
├── public/
│   ├── favicon.ico
│   ├── og-image.jpg
│   ├── robots.txt
│   └── sitemap.xml
└── src/
    ├── css/
    │   ├── variables.css   # Design tokens from Sketch
    │   ├── reset.css       # Modern CSS reset
    │   ├── typography.css  # Fonts, type scale
    │   ├── layout.css      # Grid/flex, container
    │   ├── components/     # header, footer, hero, card, form, gallery, button
    │   └── pages/          # home, about, contact, projects
    ├── js/
    │   ├── main.js         # Mobile nav, scroll animations
    │   ├── contact-form.js # Formspree validation + AJAX submit
    │   └── gallery.js      # Lightbox for project images
    └── assets/
        ├── images/         # logo, hero/, projects/, about/, icons/
        └── fonts/          # Self-hosted if needed
```

## Workflow

### Phase 1: Scaffold
- Initialize Git repo
- Set up Vite project (or plain static structure)
- Create CSS foundation (reset, variables, layout)
- Shared header/footer structure

### Phase 2: Import from Sketch
- Pull Homepage HTML from Sketch MCP → clean up → integrate
- Pull About Us HTML from Sketch MCP → clean up → integrate
- Pull Projects HTML from Sketch MCP → clean up → integrate
- Pull Contact Us HTML from Sketch MCP → clean up → integrate
- Extract brand assets (logo, colors, fonts, images) from Sketch exports

### Phase 3: Enhance
- Formspree contact form integration (validation + AJAX submit)
- Mobile navigation (hamburger menu toggle)
- Project gallery lightbox
- Scroll animations (Intersection Observer)
- Responsive testing across breakpoints

### Phase 4: Ship
- SEO: unique title/description per page, Open Graph, Twitter Cards
- Schema.org JSON-LD (RealEstateAgent, LocalBusiness)
- Generate sitemap.xml and robots.txt
- Lighthouse audit (target 90+ all categories)
- Accessibility audit (WCAG AA, keyboard nav, alt text)
- Push to Git repo
- Connect Vercel to repo and deploy
- Custom domain + SSL

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| 320px+ | Mobile (base styles) |
| 480px+ | Mobile landscape |
| 768px+ | Tablet |
| 1024px+ | Desktop |
| 1440px+ | Wide desktop |

## Contact Form (Formspree)

- Fields: Name, Email, Phone, Message, Project Interest (dropdown)
- Client-side validation before submit
- AJAX submission via `fetch()` to Formspree endpoint
- Success/error feedback inline
- Honeypot field for spam prevention
- Fallback: email + phone displayed prominently on page

## SEO Checklist

- [ ] Unique `<title>` per page
- [ ] Unique `<meta name="description">` per page
- [ ] Open Graph tags (title, description, image, url)
- [ ] Twitter Card tags
- [ ] Schema.org JSON-LD (RealEstateAgent, LocalBusiness)
- [ ] Semantic HTML (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`)
- [ ] `sitemap.xml` with all pages
- [ ] `robots.txt` allowing crawlers
- [ ] Canonical URLs
- [ ] All images have descriptive `alt` text

## Success Criteria

- [ ] All 4 pages match Sketch mockups
- [ ] Fully responsive 320px → 1440px+
- [ ] Contact form delivers to client email via Formspree
- [ ] Lighthouse Performance 90+
- [ ] Lighthouse Accessibility 95+
- [ ] All images optimized (WebP, lazy-loaded)
- [ ] Loads under 3s on 3G
- [ ] SEO meta + Schema.org on all pages
- [ ] Deployed on Vercel with SSL
- [ ] Works on Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome
