---
phase: 09-seo-discovery-wiring
plan: 03
subsystem: seo
tags: [vitest, link-audit, docs]
requires: [09-01]
provides:
  - persistent internal link and anchor audit (SEO-03)
  - SEO strategy doc reconciled with no-price policy
affects: [09-seo-discovery-wiring]
key-files:
  created: [src/app/linkAudit.test.ts]
  modified: [docs/strategie-seo-geo-llm-2026-09.md]
key-decisions:
  - "Route table derived by fs walk of src/app; ids scoped to page plus its @/components imports so orphan ids do not mask dead anchors"
requirements-completed: [SEO-03, SEO-02]
duration: 6min
completed: 2026-10-01
---

# Phase 9 Plan 03: Link Audit and SEO Doc Reconciliation Summary

Vitest audit proves every internal href (all src tsx incl. Navbar/Footer, projects.ts, llms.txt, sitemap) resolves to a real route and hash, with negative fixtures; 6 stale price passages in the SEO doc annotated in place.

## Tasks
1. Link audit: `test(09-03)` a667833
2. Doc annotations: `docs(09-03)` 819cd21

## Deviations from Plan

**1. [Rule 1 - Plan miscount] Non-slug route threshold**
- Plan asked for at least 8 non-slug routes; the app has exactly 7 (/, /services, /simulateur, /calculateur-roi, /demo, /demo/feuillette, /mentions-legales).
- Fix: threshold set to 7. No broken links found; no source links changed.

Verification: full vitest 332 passed; tsc clean.

## Self-Check: PASSED
