---
phase: 10-foundation-auth-isolation
plan: 02
subsystem: database
tags: [postgres, supabase, rls, security-definer, vitest]

requires:
  - phase: 05-prospect-capture-backend
    provides: prospects table and revoke convention
provides:
  - sv_* role/tenant tables with RLS and deny-by-default privileges
  - sv_private helpers (is_admin, client_ids) and role-exclusivity triggers
  - service-role-only RPCs (sv_login_allowed, sv_throttle_hit, sv_session_age_ok, sv_find_auth_user)
  - static migration lint test
  - repo mirror of two prod-only migrations
affects: [10-04, 10-07, 10-12]

tech-stack:
  added: []
  patterns:
    - "revoke-then-grant on shared Supabase project"
    - "static SQL lint with fixture cases proving rules are non-vacuous"

key-files:
  created:
    - supabase/migrations/20261002000000_sv_foundation.sql
    - supabase/migrations/20260921010000_prospects_explicit_deny.sql
    - supabase/migrations/20260921202354_gecko_fix_function_search_path.sql
    - src/lib/migrationLint.test.ts

key-decisions:
  - "Roles live only in sv_admins / sv_client_members tables, never in JWT metadata (D-06)"
  - "Throttle bucket computed with floor(epoch/window) rather than date_bin"

requirements-completed: [FOUND-02, FOUND-03]

duration: 20min
completed: 2026-10-02
---

# Phase 10 Plan 02: Database foundation Summary

**sv_* tables with RLS, select-only grants, private SECURITY DEFINER helpers, role-exclusivity triggers, service-role-only RPCs, idempotent admin seed, and a static migration lint test.**

## Tasks

| Task | Commit |
| ---- | ------ |
| 1. Migration lint test | 3ddad64 |
| 2. Sync prod-only migrations | c29d5ee |
| 3. sv_foundation migration + lint count case | 2c103a1 |

## Deviations from Plan

**1. [Rule 3 - Blocking] prospects_explicit_deny has no recorded SQL in prod**
- **Found during:** Task 2
- **Issue:** `schema_migrations.statements` is null for version 20260921010000.
- **Fix:** Reconstructed an idempotent `drop policy if exists` + `create policy "prospects service_role only"` (ALL, anon/authenticated, using false / with check false) from the read-only `pg_policies` state on prod. Documented in the file header. Version is already in prod history so it is never re-applied there.
- **Commit:** c29d5ee

**2. [Rule 3 - Blocking] No node_modules in worktree**
- Symlinked the main repo `node_modules` (gitignored) to run vitest. Not committed.

## Notes
- Only read-only queries were run against prod. `supabase link` created untracked `supabase/.temp/` (not committed).
- Migration is not yet applied anywhere; branch apply is plan 10-07, prod is 10-12.
- Full suite: 22 files, 337 tests passing.

## Known Stubs
None.

## Self-Check: PASSED
