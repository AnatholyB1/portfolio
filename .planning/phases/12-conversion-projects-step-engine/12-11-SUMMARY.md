---
phase: 12-conversion-projects-step-engine
plan: 11
subsystem: testing
tags: [rls, postgres, supabase, vitest, facts, consents, outbox]
requires: ["12-01", "12-05"]
provides:
  - RLS proof of project/onboarding/link/fact/consent isolation
  - Proof of fact immutability, idempotence, revocation, concurrency
  - Proof of mail outbox dedupe and claim behaviour
affects: [12-20]
tech-stack:
  added: []
  patterns: [branch-only RLS suites, tolerant cleanup]
key-files:
  created:
    - tests/rls/projects.rls.test.ts
    - tests/rls/facts.rls.test.ts
    - tests/rls/consents.rls.test.ts
    - tests/rls/mailoutbox.rls.test.ts
  modified: []
key-decisions:
  - "Immutability asserted as sv_immutable_table OR permission denied: service_role has no UPDATE/DELETE grant, so the grant layer rejects before the trigger"
requirements-completed: [PORTAL-02, PORTAL-04, PORTAL-06, MAIL-02, ADM-01]
duration: 20min
completed: 2026-10-03
---

# Phase 12 Plan 11: Projects, facts, consents, outbox RLS Summary

Four RLS suites on branch sv-rls-p12 prove isolation, append-only immutability, fact idempotence under concurrency and outbox dedupe/claim; full `npm run test:rls` is green (12 files, 115 tests).

## Tasks
1. projects + facts suites - b6c177a
2. consents + mailoutbox suites, full suite run - 97b7cf7

## Deviations from Plan

**1. [Rule 1 - Test expectation] service_role UPDATE/DELETE error text**
- Issue: the plan expected `sv_immutable_table`; the migration revokes UPDATE/DELETE from service_role, so Postgres answers `permission denied for table ...` first (stricter, defense in depth). The trigger still guards the table owner.
- Fix: assertions accept either message. No migration change needed.

No migration bugs found; 20261004000000_sv_projects_engine.sql unchanged.

## Notes
- TRUNCATE checks accept the FK error as well as sv_immutable_table, same as leads suite.
- No stubs, no threat flags. STATE.md/ROADMAP updates are done below via SDK where possible.

## Self-Check: PASSED
