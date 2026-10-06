---
phase: 16-mailing-automation-completion
plan: 09
subsystem: mail
tags: [admin, reminders, server-action, vitest]

requires:
  - phase: 16-mailing-automation-completion
    provides: sv_reminder_holds, sv_set_reminder_hold RPC (16-01)
provides:
  - currentHold / heldProjectIds (pure) and loadReminderHold
  - setReminderHoldAction (admin-only suspend/resume)
  - ReminderHoldCard on the admin project sheet
affects: [16-11 sweep, 16-14 verification]

tech-stack:
  added: []
  patterns: [append-only journal with latest-id-wins state derivation]

key-files:
  created:
    - src/lib/server/reminders/holds.ts
    - src/lib/server/reminders/holds.test.ts
    - src/app/admin/projets/reminderHold.actions.ts
    - src/app/admin/projets/reminderHold.actions.test.ts
    - src/components/admin/projects/ReminderHoldCard.tsx
  modified:
    - src/app/admin/projets/[id]/page.tsx
    - src/components/admin/projects/projectSheetUi.test.ts

key-decisions:
  - "Separate 'use server' module rather than growing actions.ts"
  - "Page loads the hold with loadSignatureViews in one Promise.all; null renders 'État des relances indisponible.'"

requirements-completed: []

duration: 6min
completed: 2026-10-06
---

# Phase 16 Plan 09: Reminder hold Summary

Admins can suspend and resume a project's automatic reminders from the project sheet, with state derived from the append-only hold journal and an admin-only action calling sv_set_reminder_hold.

## Task Commits

1. Task 1: hold helpers and action - 0862036
2. Task 2: card on project sheet - d633214

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Commits 0862036 and d633214 exist; holds and action tests (12) and src/components/admin/projects (51) green; tsc clean.
