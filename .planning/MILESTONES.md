# Milestones

## v1.1 Extension de l'offre & refonte commerciale (Shipped: 2026-10-01)

**Phases completed:** 5 phases, 27 plans, 67 tasks

**Key accomplishments:**

- 9 pages de service dédiées, sans prix (`/services/[slug]`) et un index `/services`, chacune avec FAQPage JSON-LD et bloc de réponse citable
- Simulateur de diagnostic (`/simulateur`) : questionnaire à branchement, recommandation de 2 à 4 services, jauge visuelle, capture de prospect avec consentement RGPD
- Backend prospects : table Supabase dédiée, RLS insert-only, protection anti-spam, notification email Resend
- Landing recomposée (problèmes, services, méthode, enjeux, preuve sociale) et politique « aucun prix nulle part » appliquée au site entier, calculateur ROI compris
- Découverte SEO/GEO : sitemap et `llms.txt` complétés, `OfferCatalog` schema.org (9 `Service`), audit de liens automatisé, sitemap soumis à Search Console
- Refonte du design après livraison : vraies captures clients, un rythme par section, simulateur avant l'explication, menu mobile et barre diagnostic

**Timeline:** 12 jours (2026-09-20 → 2026-10-01)

Known deferred items at close: 4 (see STATE.md Deferred Items)

---

## v0.1 — Foundation (existing codebase, pre-GSD)

**Shipped:** Before 2026-05-15
**Phases:** Not formally tracked

What was built:

- Next.js portfolio with i18n (fr/en/th)
- Hero, About, Projects (StarkDisplay), Services, Partners, Contact, Footer sections
- Three.js visual layer (FloatingShapes, Scene)
- /services page
- /mentions-legales legal page
- VAPI phone agent promo sections
- /demo CRM dashboard with Supabase Realtime
- CRM API routes (products, stock, orders)
- /demo/feuillette branded pitch page

---

## v1.0 — Visual Redesign (Selenium Phase 02)

**Shipped:** 2026-05-18
**Phases:** 1-4 | **Plans:** 21 | **Timeline:** 3 days (2026-05-15 → 2026-05-18)
**Commits:** 95 | **Files changed:** 39 | **Code delta:** +2,868 / -3,005 lines

### Delivered

Complete visual rebrand from freelance-era portfolio to Selenium Phase 02 agency identity. Every page now uses the new design system. Landing and services pages fully rebuilt. Feuillette pitch page untouched.

### Key Accomplishments

1. Global design system established — CSS vars, 3 Google fonts, custom cursor, scroll-reveal, cinema intro, ClientProviders pattern for ssr:false
2. 8 freelance-era components deleted + 342 dead translation lines removed
3. Full landing page rebuilt — 3D icosphere hero, manifeste, réalisations, scroll-driven phone agent, partners ticker, contact form, navbar + footer
4. Full services page rebuilt — 9 sections with GSAP methodology scroll-rail, 4 pricing packs, 3 maintenance tiers, 8 upsell cards
5. /mentions-legales + /demo rethemed — CSS vars applied, Supabase wiring byte-for-byte preserved
6. QA all pass — feuillette diff clean, zero freelance SEO keywords, 900px responsive, reduced-motion CSS guards active

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 29 requirements marked complete

### Known Deferred Items at Close

Documentation lag: 26/29 REQUIREMENTS.md checkboxes were unticked (only DS-05, I18N-01, I18N-02 were checked during execution). All requirements confirmed complete via ROADMAP.md and SUMMARY files. Not functional gaps.

Deferred to v1.1+: Footer nav labels not wired to i18n (t.nav.*); CinemaIntro/CustomCursor missing JS-level prefers-reduced-motion guards (cosmetic, non-blocking).
