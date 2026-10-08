---
phase: 18-verified-reviews
plan: 14
subsystem: testing
tags: [supabase, rls, reviews, postgres, vitest]
requires:
  - phase: 18-05
    provides: branch sv-rls-p18 and review helpers
provides:
  - tests/rls/reviews.rls.test.ts (35 tests) proving phase-18 DB guarantees on real Postgres
affects: [18-15]
key-files:
  created: [tests/rls/reviews.rls.test.ts]
metrics:
  completed: 2026-10-08
---

# Phase 18 Plan 14: Reviews RLS suite Summary

One suite, 35 tests, green on sv-rls-p18 (production untouched). Evidence for the 18-15 approval.

## Proven
- Link lifecycle: not_signed; created then existing (same link id on the J+21 call); expires_at equals the PV fact created_at + 60 days; PV backdated 61 days gives expired and no link; 59 days still creates with a future expiry (backdating via a single do-block that disables and re-enables sv_project_facts_no_upd_del, tgenabled asserted 'O').
- Single use: Promise.all of two submissions gives exactly one published and one link_invalid; one review row, used_at set, link invalid, pending review_request skipped with last_error review_filed, one review_published_admin outbox row, ensure then returns reviewed.
- sv_consent_required, body with angle brackets or 19 chars rejected, link stays valid.
- Reissue: old token invalid, new valid, one event row with actor and detail; non-admin gives sv_not_admin.
- Isolation: anon and non-admin read nothing on the four tables, admin can; anon, authenticated and admin sessions cannot execute the six RPCs; sv_private.review_signed_at unreachable for service_role via PostgREST.
- Moderation: hide, review_hidden outbox per member (recipient_kind client), hidden review leaves sv_public_reviews while the row persists, unchanged on repeat, sv_invalid_reason (low_rating, negative), sv_invalid_detail, sv_not_admin, unhide, ordered log.
- Append-only: delete/truncate/update raise for the owner (sv_immutable_table), service_role has no write privilege and cannot insert into sv_reviews, sv_link_immutable on token_hash/expires_at/second used_at.
- Public listing: hidden excluded, newest first, limit clamped to 100, offset 1 skips newest, negative offset behaves as 0.

## Results
- reviews suite alone: 35/35 passed (final run).
- Full `test:rls`: 318/319, one failure `mailoutbox sv_claim_due_mail` (known intermittent flake, unrelated; it moved between runs). No migration bug found.

## Deviations
1. [Rule 3] `npx vitest` unavailable through npm here; ran `./node_modules/.bin/vitest run -c vitest.rls.config.ts` (same as `npm run test:rls`).
2. A first version created users per table in the delete/truncate test and hit the auth sign-in rate limit; replaced by a once-only seed helper.
3. Both tasks live in one file and were committed together in one commit (b46ad71).

## Commits
- b46ad71: test(18-14): phase-18 reviews RLS suite

## Known Stubs
None.

## Self-Check: PASSED
