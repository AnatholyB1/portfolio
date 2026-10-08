---
phase: 18-verified-reviews
plan: 12
subsystem: admin-moderation
tags: [admin, moderation, reviews, server-actions]
requires: ["18-01"]
provides:
  - "hideReviewAction, unhideReviewAction (src/app/admin/avis/avis.actions.ts)"
  - "loadAdminReviews, REVIEW_HIDE_REASONS (src/lib/server/reviews/admin.ts)"
  - "/admin/avis page, HideReviewDialog, UnhideReviewForm, AdminNav 'Avis' entry"
affects: [18-13]
key-files:
  created:
    - src/app/admin/avis/avis.actions.ts
    - src/app/admin/avis/avis.actions.test.ts
    - src/app/admin/avis/page.tsx
    - src/lib/server/reviews/admin.ts
    - src/lib/server/reviews/admin.test.ts
    - src/components/admin/reviews/HideReviewDialog.tsx
    - src/components/admin/reviews/UnhideReviewForm.tsx
  modified:
    - src/components/admin/AdminNav.tsx
requirements: [REV-03]
metrics:
  tasks: 3
  completed: 2026-10-08
---

# Phase 18 Plan 12: Admin review moderation Summary

Legality-only moderation at /admin/avis: hide through a native dialog with four closed legal reasons plus a 3-500 character detail, unhide with detail, author notice sent immediately via the outbox, full append-only history displayed.

## Commits
- 8d82659: hide/unhide actions with tests (9 tests; rejects 'low_rating' and 'negative', short/long detail, mail failure still ok)
- 8e74f3b: dialog and unhide form
- Task 3 commit: loader, page, nav entry

## Verification
`vitest run src/lib/server/reviews src/app/admin src/lib/priceScope.test.ts`: 224/224 pass. `tsc --noEmit` clean.

## Deviations from Plan
- Moderation history actor e-mails are read from sv_admins under RLS; the existing policy is self-read only, so other admins' actions may display "Administrateur" instead of an e-mail (falls back gracefully). Not changed (would need a migration, out of scope).
- Company shown is the review's company_name_snapshot, falling back to the client name.
- Worktree needed a node_modules symlink (untracked, not committed).

## Known Stubs
None.

## Self-Check: PASSED
