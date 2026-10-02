---
phase: 12-conversion-projects-step-engine
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, append-only, outbox]
requires: []
provides:
  - "Phase-12 migration: sv_projects, sv_project_facts, sv_project_fact_notes, sv_client_onboarding, sv_project_files, sv_project_links, sv_project_consents, sv_mail_outbox"
  - "RPCs sv_convert_lead, sv_create_project, sv_post_project_fact, sv_claim_due_mail, sv_client_last_sign_in (service_role only)"
  - "Private bucket sv-project-files (25 MiB, MIME whitelist, no storage policy)"
affects: [12-02, 12-05, 12-11, 12-20]
tech-stack:
  added: []
  patterns: ["append-only tables with deny_mutation row+truncate triggers", "column-level select grants hiding actor ids", "no FK to auth.users from journals"]
key-files:
  created:
    - supabase/migrations/20261004000000_sv_projects_engine.sql
    - src/lib/projectsMigration.test.ts
  modified:
    - src/lib/migrationLint.test.ts
key-decisions:
  - "No current_step column: step derived in TS from typed facts"
  - "Correction = fact_revoked row; reason stored in admin-only sv_project_fact_notes"
  - "Migration NOT applied anywhere (12-05 branch, 12-20 prod)"
requirements-completed: [PORTAL-01, PORTAL-02, PORTAL-04, PORTAL-05, PORTAL-06, MAIL-02, ADM-01]
duration: 15min
completed: 2026-10-03
---

# Phase 12 Plan 01: Projects Engine Migration Summary

Single lint-clean migration holding phase-12 invariants (append-only facts, atomic lead conversion, unique mail key, private bucket), plus static guards.

## Tasks

1. Tables, RLS, helper, bucket, lead_events check extension: commit 5e0f749
2. RPCs (convert, create project, post fact, claim mail, last sign-in): commit 5e0f749 (same file, committed together)
3. Static guards (rule 6 extension + projectsMigration.test.ts): commit b512e99

## Verification

`npx vitest run src/lib/migrationLint.test.ts src/lib/projectsMigration.test.ts`: 15 tests pass. Acceptance greps: 8 tables, 0 cascade/set null/storage objects/current_step outside comments, 26214400 appears twice.

## Deviations from Plan

Tasks 1 and 2 target the same file and were committed as a single commit. SQL behaviour is not executed here (no DB); it is proven on the branch in 12-05/12-11/12-12.

## Known Stubs

None.

## Self-Check: PASSED
