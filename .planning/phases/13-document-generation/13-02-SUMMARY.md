---
phase: 13-document-generation
plan: 02
subsystem: database
tags: [supabase, migration, rls, append-only, outbox, storage]
requires: []
provides:
  - sv_project_documents and sv_document_snapshots (append-only)
  - sv_issue_document RPC (service_role only)
  - private bucket sv-documents
  - document_issued outbox event and template
affects: [13-06, 13-07, 13-09, 13-13, 13-16]
tech-stack:
  added: []
  patterns: [replacement chain instead of status, constraint swap by definition scan]
key-files:
  created:
    - supabase/migrations/20261005000000_sv_documents.sql
    - src/lib/documentsMigration.test.ts
  modified:
    - src/lib/migrationLint.test.ts
key-decisions:
  - "Replacement validation uses IS DISTINCT FROM so a non-null replaces against an empty chain is rejected"
requirements-completed: [DOC-02, DOC-03]
duration: 15min
completed: 2026-10-03
---

# Phase 13 Plan 02: Documents migration Summary

Append-only documents and admin-only snapshots with a replacement chain, private PDF bucket, outbox closed-list extension and a transactional service_role-only issue RPC. The migration is not applied to any database.

## Tasks
1. Migration 20261005000000_sv_documents.sql (commit f96464b)
2. documentsMigration.test.ts plus APPEND_ONLY_TABLES update (second commit, test(13-02))

Verification: documentsMigration, migrationLint and projectsMigration tests pass (28 tests).

## Deviations from Plan

**1. [Rule 1 - Bug] Null-safe replaces check**
- **Issue:** The planned condition `(head is null and replaces is null) or head.id = replaces` evaluates to NULL (no exception) when head is null and p_replaces is non-null, letting a bogus replaces through.
- **Fix:** `if v_head_id is distinct from p_replaces then raise sv_document_replaces_mismatch`.
- **Files:** supabase/migrations/20261005000000_sv_documents.sql

Also: worktree HEAD was behind the expected base and was reset to a0b6fe6 per the startup check; `npm ci` run in the worktree.

## Known Stubs
None.

## Self-Check: PASSED
