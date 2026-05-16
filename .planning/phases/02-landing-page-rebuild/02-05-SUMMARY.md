---
phase: 02-landing-page-rebuild
plan: "05"
subsystem: layout / page-assembly
tags: [navbar, footer, page-assembly, seo, i18n, wave-3]
dependency_graph:
  requires:
    - 02-01 (translations.ts — t.nav.manifeste, t.nav.work, t.landing.footer keys)
    - 02-03 (HeroSection, Manifeste, Realisations)
    - 02-04 (PhoneAgent, Partners, ContactSection)
    - Phase 1 (useReveals, LanguageContext)
  provides:
    - src/components/layout/Navbar.tsx (rebuilt — absolute hrefs, lang switcher, new nav keys)
    - src/components/layout/Footer.tsx (rebuilt — Wordmark block + footer bar)
    - src/app/page.tsx (complete landing page — 7 sections, useReveals, no freelance imports)
    - src/app/layout.tsx (agency SEO metadata — no freelance/hire keywords)
  affects:
    - src/app/services/page.tsx (imports Navbar and Footer — automatically uses rebuilt versions)
tech_stack:
  added: []
  patterns:
    - Absolute anchor hrefs (/#manifeste, /#work, /#contact) for cross-page anchor navigation from /services
    - LANGS array + LANGS.map() pattern for lang switcher (no flag objects — minimal)
    - t.landing.footer namespace for Footer i18n (built, legal, rights)
    - metadata export in layout.tsx only (not page.tsx — Next.js forbids metadata in Client Components)
key_files:
  created: []
  modified:
    - src/components/layout/Navbar.tsx
    - src/components/layout/Footer.tsx
    - src/app/page.tsx
    - src/app/layout.tsx
decisions:
  - "metadata export removed from page.tsx — Next.js App Router forbids export const metadata in Client Components; SEO lives in layout.tsx only"
  - "Absolute hrefs (/#manifeste) used in Navbar and Footer — relative hrefs (#manifeste) fail when navigating from /services"
  - "LANGS array is Lang[] (no label/flag objects) — minimal lang switcher matching mockup, not the old emoji-flag design"
  - "Footer uses t.landing.footer (not t.footer) — new landing namespace from 02-01 separates old and new footer translations"
metrics:
  duration: "~5 min"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
  files_created: 0
---

# Phase 2 Plan 5: Navbar + Footer Rebuild + page.tsx Assembly Summary

Rebuilt Navbar with absolute anchor hrefs and fr/en/th lang switcher, rebuilt Footer with Wordmark block linking to /services and footer bar, and rewrote page.tsx to assemble all 7 new sections with useReveals(). Updated layout.tsx to agency SEO positioning — no freelance/hire keywords. npm run build exits 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rebuild Navbar.tsx and Footer.tsx | e72f128 | src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx |
| 2 | Rewrite page.tsx and update layout.tsx metadata | 7c92c62 | src/app/page.tsx, src/app/layout.tsx |

## Verification Results

- `npm run build` → exits 0, all 12 static pages generated, zero TypeScript or module errors
- `grep "/#manifeste" Navbar.tsx` → 1 match (absolute href confirmed)
- `grep "/#work" Navbar.tsx` → 1 match
- `grep "lang-switch" Navbar.tsx` → 1 match
- `grep "LANGS.map" Navbar.tsx` → 1 match
- `grep "t.landing.footer" Footer.tsx` → 1 match
- `grep "wordmark" Footer.tsx` → 2 matches (wordmark + wordmark-link + wordmark-row)
- `grep "/mentions-legales" Footer.tsx` → 1 match
- `grep "freelance" layout.tsx` → no match (PASS)
- `grep "hire" layout.tsx` → no match (PASS)
- `grep "Agence digitale" layout.tsx` → 3 matches (title, OG title, siteName)
- `grep "'use client'" page.tsx` → 1 match (first line)
- `grep "useReveals" page.tsx` → 2 matches (import + call)
- `grep "HeroSection" page.tsx` → 2 matches (import + JSX)

## Deviations from Plan

None — plan executed exactly as written. Navbar, Footer, page.tsx, and layout.tsx all match the plan's action blocks verbatim.

## Known Stubs

None. All i18n keys (t.nav.manifeste, t.nav.work, t.landing.footer.built, t.landing.footer.legal) are populated in translations.ts from plan 02-01. All 6 section components resolve real data.

## Threat Flags

- T-02-10 mitigated: layout.tsx metadata has no "hire", "freelance", "Iron Man" — agency positioning confirmed
- T-02-11 accepted: page.tsx is 'use client' with no metadata export — Next.js build enforces this at compile time (build passed)

## Self-Check: PASSED

- `src/components/layout/Navbar.tsx` — FOUND (modified)
- `src/components/layout/Footer.tsx` — FOUND (modified)
- `src/app/page.tsx` — FOUND (modified)
- `src/app/layout.tsx` — FOUND (modified)
- Commit e72f128 — FOUND (feat(02-05): rebuild Navbar and Footer)
- Commit 7c92c62 — FOUND (feat(02-05): rewrite page.tsx)
