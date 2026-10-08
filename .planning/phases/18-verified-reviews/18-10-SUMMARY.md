---
phase: 18-verified-reviews
plan: 10
subsystem: reviews-public-pages
tags: [reviews, json-ld, seo, home]
requires: [18-03, 18-08]
provides: ["/avis paginated list with Review JSON-LD", "ReviewCard", "AvisExcerpt on home"]
key-files:
  created:
    - src/components/reviews/ReviewCard.tsx
    - src/app/avis/page.tsx
    - src/app/avis/page.test.ts
    - src/components/sections/AvisExcerpt.tsx
    - src/components/sections/AvisExcerpt.test.ts
  modified:
    - src/app/page.tsx
requirements: [REV-03, REV-04]
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 10: Public reviews list and home excerpt Summary

Indexable `/avis` (50 per page via `?page=N`, one Review JSON-LD per displayed review, no aggregate) with a shared ReviewCard, plus a client-side home excerpt between Partners and ContactSection.

## Commits
- bdb4942: ReviewCard and /avis page with tests
- Task 2 commit: AvisExcerpt, home insertion, linkAudit fixes

## Behavior
- /avis reads getPublishedReviews(51, (page-1)*50); invalid page values fall back to 1; empty page > 1 calls notFound(); canonical and title vary by page.
- JSON-LD serialized with buildJsonLdScript only for the displayed slice; hostile bodies stay escaped.
- AvisExcerpt fetches /api/avis/recent, shows at most 3 compact cards, renders nothing on loading, error or empty.
- Verified: 59 tests green (avis page, AvisExcerpt, page, priceScope, linkAudit).

## Deviations from Plan

**1. [Rule 3 - Blocking] linkAudit compatibility**
- Empty-state Realisations link uses `/#work` (the real section id; `#realisations` does not exist).
- Pagination hrefs are computed into variables (`olderHref`, `newerHref`) because linkAudit rejects unknown template-literal hrefs.
- `REVIEWS_PAGE_SIZE` is a local non-exported constant (Next page modules must not export extra names).

**2. Test note:** React SSR emits `dateTime` (camelCase) on `<time>`; the test asserts that form. HTML is case-insensitive.

## Known Stubs
None.

## Self-Check: PASSED
