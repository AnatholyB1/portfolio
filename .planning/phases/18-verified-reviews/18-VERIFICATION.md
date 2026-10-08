---
phase: 18-verified-reviews
verified: 2026-10-08T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "First scheduled cron run after REVIEW_REQUESTS_ENABLED=true (2026-10-09 06:00 UTC)"
    expected: "No review_config_invalid log; reminders counters recorded; any queued review_request has linkId and https reviewUrl (0 eligible projects at flip, so likely nothing queued)"
    why_human: "Time-based; CRON_SECRET redacted so no manual call was possible"
  - test: "First real delivered project (PV signed): request mail -> form -> thank-you with Google button"
    expected: "Single-use link works once then shows generic invalid message; Google button opens the Sevalys profile"
    why_human: "Needs real production data; no test review may be submitted on production (non-deletable)"
---

# Phase 18: Verified reviews - Verification Report

**Goal:** Each delivered client can leave a verified review, published unfiltered, usable for SEO without a star promise.
**Re-verification:** No. Initial verification.

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Signed-PV client gets a unique single-use link expiring in 60 days (REV-01) | VERIFIED | `supabase/migrations/20261010000000_sv_reviews.sql`: `sv_ensure_review_link` returns `not_signed` without `acceptance_signed` fact, expiry `v_signed + 60 days`; unique partial index allows one active link per project; `sv_submit_review` locks the link row, rejects used/invalidated/expired links and sets `used_at`; `token_hash` is a sha256 hex check. `src/lib/reviews/token.ts` derives the token by HMAC and stores only sha256. `sweep.ts` calls `ensureReviewLink`; `outbox.ts` builds `reviewUrl`. Reissue invalidates the old link and is journaled in `sv_review_link_events`. |
| 2 | Google Business link offered whatever the rating (REV-02) | VERIFIED | `ReviewThankYou.tsx` has no rating prop and renders the same anchor for every rating. `ReviewThankYou.test.ts` asserts byte-identical markup for ratings 1 to 5. `googleUrl.ts` fails closed unless the URL is https without credentials. `REVIEW_GOOGLE_URL` is configured in production (18-17). |
| 3 | Admin can hide only for legality, with a logged reason; "Politique des avis" page exists (REV-03) | VERIFIED | `sv_review_moderation_log` CHECK limits reason to 4 legal values and requires detail of 3 to 500 chars. It is append-only (`deny_mutation` on update, delete, truncate). `sv_reviews` is immutable. `sv_moderate_review` requires an admin and is service_role only. `/politique-des-avis` page exists with a test, linked from Footer, `/avis`, the form and the home excerpt, and listed in sitemap and `llms.txt`. |
| 4 | Published reviews feed JSON-LD `Review` with no price keys and no star promise, test-guarded (REV-04) | VERIFIED | `reviewJsonLd.ts` emits Review nodes only and filters hidden ones. `reviewJsonLd.test.ts` bans price, offers, aggregateRating, ratingCount and reviewCount keys and the string "AggregateRating". `/avis` serializes through `buildJsonLdScript`. `reviewRating` appears only inside each Review, which is by design (D-04). |

**Score:** 4/4

## Decisions D-01..D-15

Spot-checked in the code: D-01/D-02 (the SQL checks on rating, body length and consent), D-05 (immediate publication, admin alert queued, pending requests skipped), D-06/D-07 (closed reasons, hide notice queued to client members), D-09 (hashed single-use token, reissue), D-10, D-11 (flag and `review_request` template wired via `flags.ts`, `rules.ts` and `outbox.ts`), D-12/D-13, D-15 (RLS on all 4 new tables, admin-only select, RPCs service_role only, `tests/rls/reviews.rls.test.ts` exists). No contradiction found.

## Behavioral Spot-Checks

`vitest run` on `src/lib/reviews`, `src/app/avis`, `src/app/admin/avis`, `src/app/api/avis`, `src/app/politique-des-avis` and `src/components`: 36 files, 294 tests, all pass.

## Requirements Coverage

| Req | Status |
|-----|--------|
| REV-01 | SATISFIED |
| REV-02 | SATISFIED |
| REV-03 | SATISFIED |
| REV-04 | SATISFIED |

No orphaned requirements.

## Anti-Patterns

None blocking. The working tree has uncommitted favicon files, which are unrelated to this phase.

## Human / Time-Based Verification

1. **First cron run, 2026-10-09 06:00 UTC.** Check for `review_config_invalid` logs, the reminders counters, and that any queued `review_request` carries a `linkId` and an https `reviewUrl`. Production had 0 eligible projects when the flag was enabled, so nothing is expected to be queued. This is not a failure.
2. **First real delivered project.** Walk through request mail, form and Google button. No test review may be submitted on production because it would be an unremovable non-authentic public review.

## Gaps Summary

No gaps. Code, tests and production configuration (per the 18-15, 18-16 and 18-17 summaries, not re-verified here) meet the 4 success criteria. Only the time-based items above remain.

_Verifier: Claude (gsd-verifier)_
