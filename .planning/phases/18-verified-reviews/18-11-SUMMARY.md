---
phase: 18-verified-reviews
plan: 11
subsystem: reviews-public-pages
tags: [policy, seo, sitemap, llms, footer]
requires: [18-04]
provides: ["/politique-des-avis page", "footer links Avis and Politique des avis", "sitemap and llms.txt entries for /avis and /politique-des-avis"]
affects: [18-16, 18-17]
key-files:
  created:
    - src/app/politique-des-avis/page.tsx
    - src/app/politique-des-avis/page.test.ts
  modified:
    - src/components/layout/Footer.tsx
    - src/app/sitemap.ts
    - src/app/sitemap.test.ts
    - public/llms.txt
    - src/app/llms.test.ts
decisions:
  - "Footer labels are hardcoded French (policy is FR only); no translation parity change needed"
requirements: [REV-03]
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 11: Politique des avis Summary

Indexable French policy page with 11 sections (D-12), linked from the footer, listed in sitemap and llms.txt, with no token path exposed.

## Commits
- 4ee55da: policy page and source test
- Task 2 commit: footer link, sitemap (count now 5 + services + 3), llms.txt and pinned tests

## Verification
Vitest green: politique-des-avis, priceScope, sitemap, llms, translations (96 tests across runs).

## Deviations from Plan
None. The worktree was reset to the specified base commit before starting.

## Notes
The retention wording (RESEARCH A4) is used verbatim; the owner confirms it in 18-16. The /avis page itself is built by another plan; the sitemap entry points at it.

## Known Stubs
None.

## Self-Check: PASSED
