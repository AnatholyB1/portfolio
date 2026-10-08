---
phase: 18-verified-reviews
plan: 09
subsystem: reviews
tags: [ui, review-form, token-page]
requires: [18-02, 18-03, 18-04, 18-08]
provides: ["/avis/[token] page", ReviewForm, ReviewRatingInput, ReviewThankYou, thankYouFor]
affects: [review collection flow]
key-files:
  created:
    - src/app/avis/[token]/layout.tsx
    - src/app/avis/[token]/page.tsx
    - src/app/avis/[token]/ReviewForm.tsx
    - src/app/avis/[token]/ReviewRatingInput.tsx
    - src/app/avis/[token]/ReviewThankYou.tsx
    - src/app/avis/[token]/reviewForm.css
    - src/app/avis/[token]/page.test.ts
    - src/app/avis/[token]/ReviewThankYou.test.ts
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 09: Review token page Summary

Private `/avis/[token]` page: read-only link check, accessible review form with radiogroup rating, generic invalid card, and a thank-you view whose Google button is identical for ratings 1 to 5.

## Commits
- 821d459: form, rating input, thank-you view and per-rating test
- Task 2: layout, page, CSS, page tests (see git log, "feat(18-09): read-only review token page")

## Behavior
- GET is read-only (force-dynamic, view throttle 60 per 10 min, `getReviewLinkState`); invalid, used, expired and throttled all render the same form-less card.
- ReviewThankYou takes only `googleUrl`; the form reaches success only through `thankYouFor`, with no branch on rating. Google block omitted when URL is null.
- Layout: noindex, no-referrer, portal.css, no Navbar or analytics. AuthCard is not imported (price scope); its markup is reproduced locally.
- Tests: 18 green with priceScope.

## Deviations from Plan
- The form policy link reads "Lire la politique des avis" (UI-SPEC copy); the page test matches it case-insensitively on "politique des avis".
- TDD RED step was not committed separately; test and implementation were written together and verified green.

## Self-Check: PASSED
