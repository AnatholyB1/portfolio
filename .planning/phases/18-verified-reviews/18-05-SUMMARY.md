---
phase: 18-verified-reviews
plan: 05
subsystem: testing
tags: [supabase, rls, branch, migration, helpers]
requires:
  - phase: 18-01
    provides: migration 20261010000000_sv_reviews.sql
provides:
  - Supabase branch sv-rls-p18 (ref sllyjcwecebdwqcdhnaj) carrying the phase-18 schema
  - RLS helpers testReviewToken, makeDeliveredProject, ensureReviewLinkForTest, reviewLinkState, submitReview, moderateReview, reissueReviewLink, publicReviews
affects: [18-14, 18-15, 18-16]
key-files:
  modified: [tests/rls/helpers.ts]
decisions:
  - "Branch sv-rls-p18 created per owner decision; must be deleted in 18-16"
metrics:
  completed: 2026-10-08
---

# Phase 18 Plan 05: Phase-18 test branch and RLS helpers Summary

Created Supabase branch `sv-rls-p18` (ref `sllyjcwecebdwqcdhnaj`, id 4175225a-13a4-4add-8249-6026170891fe, parent ubxllsvanurkwkohzxau), pushed the phase-18 migration to the branch only, and added eight RLS helpers.

## Task 1: Branch check
`branches list` showed only `main` (FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY). Decision: NEW BRANCH NEEDED. `.env.test.local` did not exist. No create/delete/db command run in this task.

## Task 2: Owner decision
Answered by the owner on 2026-10-08, verbatim: "Create branch sv-rls-p18 (Recommended)". Relayed by the orchestrator in the executor prompt.

## Task 3: Provision, push, helpers
- `supabase branches create sv-rls-p18` reached ACTIVE_HEALTHY. `.env.test.local` written by script (gitignored, `git check-ignore` prints it, no production ref in it, never printed or committed). `SV_TEST_DB_URL` is the session pooler (port 5432). Both `SV_TEST_SIGNATURE_CODE_SECRET` and `SV_SIGNATURE_CODE_SECRET` set to the same 32-byte local random hex.
- Branch already had the phase-17 schema (sv_reminder_holds present, last version 20261009000000).
- `db push` refused on remote-only history. Branch-only repair (16-05 procedure): reverted the 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, dry-run listed only 20261010000000, real push applied it unchanged (no SQL fix).
- Migration sha256 as pushed (18-15 compares it): `36e55b3605ddab9899c399c86e5c1cfed9ca8007dea008932084c65708b686e3`
- Verification on the branch: to_regclass not null for sv_review_links, sv_reviews, sv_review_moderation_log, sv_review_link_events. Privileges all false: service_role insert on sv_reviews, anon select on sv_reviews, authenticated execute on sv_submit_review(...), anon execute on sv_public_reviews(integer, integer). sv_mail_outbox has exactly 1 event_type check and 1 template check containing review_hidden.
- Branch-only fixture grant: `grant select, insert, update, delete on public.gecko_admins to service_role` (as in earlier phases).
- Helpers added to tests/rls/helpers.ts; the acceptance grep count is 7 (plus testReviewToken, a non-async export).
- `npm run test:rls`: first run 1 failure (mailoutbox `sv_claim_due_mail > claims a due pending row once`, the same rotating flake documented in 16-05 deviation 3, unrelated to phase 18); second full run green: 21 files, 284 tests passed.
- Production untouched: only `branches list/create/get` touched ref ubxllsvanurkwkohzxau. All repair, push and queries used the branch DB URL (ref sllyjcwecebdwqcdhnaj).

## Deviations from Plan

**1. [Operational] Known mailoutbox flake** on the first full RLS run; second run green. Not fixed (pre-existing, out of scope).

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Helpers present (grep 7), `.env.test.local` ignored, helpers commit made.
