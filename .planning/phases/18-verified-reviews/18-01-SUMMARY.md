---
phase: 18-verified-reviews
plan: 01
subsystem: database
tags: [supabase, postgres, rls, reviews, migration]
requires: []
provides:
  - "sv_review_links, sv_reviews, sv_review_moderation_log, sv_review_link_events tables"
  - "6 service_role-only RPCs: sv_ensure_review_link, sv_review_link_state, sv_submit_review, sv_public_reviews, sv_moderate_review, sv_reissue_review_link"
  - "outbox closed lists extended with review_published_admin and review_hidden"
affects: [18-02, 18-05, 18-07, 18-08, 18-12, 18-13, 18-14]
key-files:
  created:
    - supabase/migrations/20261010000000_sv_reviews.sql
    - src/lib/reviewsMigration.test.ts
decisions:
  - "sv_public_reviews written in language sql (not plpgsql) to avoid OUT-column name conflicts with table columns"
metrics:
  completed: 2026-10-08
---

# Phase 18 Plan 01: Verified reviews migration Summary

Single phase-18 migration: hashed one-shot review links (60-day expiry from the signed acceptance), immutable reviews, append-only moderation log and reissue journal, extended outbox lists, and 6 service_role-only RPCs, pinned by a static test. Not applied (branch push is 18-05, production is 18-15).

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1 + 2 | migration commit | Tables, triggers, RLS, outbox lists and all RPCs written in one file pass, committed together |
| 2 (test) | test commit | `src/lib/reviewsMigration.test.ts` (11 tests) |

`vitest run src/lib/reviewsMigration.test.ts src/lib/migrationLint.test.ts`: 20/20 pass.

## Deviations from Plan

1. **Tasks 1 and 2 committed as migration + test rather than per task.** The migration was written in a single pass; splitting the one file would have been artificial.
2. **sv_public_reviews uses `language sql`** instead of plpgsql: with `returns table (id, ...)` plpgsql OUT variables clash with column names. Still security definer, `search_path = ''`, service_role only.
3. **Acceptance grep `^begin|^commit` returns non-zero** because plpgsql function bodies contain `begin` at line start (same as existing migrations). No transaction-control statements exist; the test asserts `begin;`/`commit;` are absent.
4. Reason-list test does not forbid the literal `'rating'` globally (it appears as a payload key in `jsonb_build_object`); it asserts the reason lists are exactly the four legal reasons.

## Known Stubs

None.

## Self-Check: PASSED

Migration and test files exist; both commits present; tests green.
