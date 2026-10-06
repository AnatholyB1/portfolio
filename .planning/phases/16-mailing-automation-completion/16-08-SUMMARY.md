---
phase: 16-mailing-automation-completion
plan: 08
subsystem: mail
tags: [admin, suppression, rls, server-action, vitest]

requires:
  - phase: 16-mailing-automation-completion
    provides: sv_mail_suppressions, sv_mail_suppression_lifts, sv_lift_suppression RPC (16-01)
provides:
  - /admin/emails suppression list page
  - liftSuppressionAction (admin-only, reasoned reactivation)
  - loadSuppressions / toSuppressionView
affects: [16-14 verification]

tech-stack:
  added: []
  patterns: [RLS-scoped admin read plus service-role RPC write behind requireAdmin]

key-files:
  created:
    - src/lib/server/mail/suppressionAdmin.ts
    - src/lib/server/mail/suppressionAdmin.test.ts
    - src/app/admin/emails/page.tsx
    - src/app/admin/emails/actions.ts
    - src/app/admin/emails/actions.test.ts
    - src/components/admin/mail/LiftSuppressionForm.tsx
  modified:
    - src/components/admin/AdminNav.tsx

key-decisions:
  - "Lift is a new journal row via sv_lift_suppression; the original suppression row stays visible with status Réactivée"
  - "Non-numeric id returns the generic error, bad reason length returns the reason message; neither reaches the RPC"

requirements-completed: []

duration: 8min
completed: 2026-10-06
---

# Phase 16 Plan 08: Admin suppression view Summary

Admin-only /admin/emails page listing suppressed addresses (cause, fr-FR date, blocked flows, status) with a reasoned reactivation action backed by the append-only lift journal.

## Task Commits

1. Task 1: loader and lift action - 96d9f62
2. Task 2: page, lift form, nav entry - 88181fd

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Commits 96d9f62 and 88181fd exist; vitest on src/components/admin and src/app/admin (232) green; tsc clean.
