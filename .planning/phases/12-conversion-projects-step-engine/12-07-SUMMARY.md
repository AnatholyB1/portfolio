---
phase: 12-conversion-projects-step-engine
plan: 07
subsystem: admin-conversion
tags: [conversion, server-action, supabase-auth, compensation]
requires: [12-01, 12-03, 12-04, 12-06, 12-08]
provides:
  - convertLead(input, actor): ConvertResult
  - convertLeadAction(prev, formData): ConvertState
affects: [12-14]
tech-stack:
  added: []
  patterns: [auth-user compensation around atomic RPC, guard-first server action]
key-files:
  created:
    - src/lib/server/projects/convert.ts
    - src/lib/server/projects/convert.test.ts
  modified:
    - src/app/admin/leads/actions.ts
    - src/app/admin/leads/actions.test.ts
key-decisions:
  - "All business writes live in sv_convert_lead; the service only creates and, on failure, deletes the auth user"
  - "Mail failure and onboarding sync failure never roll back the conversion"
requirements-completed: [PORTAL-01, MAIL-01, MAIL-02]
metrics:
  duration: ~15min
  completed: 2026-10-03
---

# Phase 12 Plan 07: Lead conversion service and action Summary

One guarded admin action converts a qualified lead (checks the e-mail, creates the auth user, runs sv_convert_lead, sends the invitation) with deleteUser compensation if the RPC fails.

## Tasks

1. convertLead service - commit e8ce2e6 (22 tests)
2. convertLeadAction - commit 50d6bf6 (31 tests in the actions file, 7 new)

## Deviations from Plan

- The plan referenced PROJECT_COPY `emailUsed`; the actual key is `conversion.emailTaken` (used). `not_convertible` maps to `conversion.statusNotAllowed`.
- Test fixtures use the real offer slug `site-vitrine`.
- The form field for the company source is `companySource` as specified (the older invite form uses `company_source`); 12-14 UI must post `companySource`.

No auth gates. No stubs. `rtk tsc` clean. RPC behaviour on the test branch is verified in 12-12.

## Self-Check: PASSED
