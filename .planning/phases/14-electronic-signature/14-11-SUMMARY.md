---
phase: 14-electronic-signature
plan: 11
subsystem: testing
tags: [supabase, rls, vitest, otp, consent, acceptance]
requires: [14-05]
provides:
  - tests/rls/signature.rls.test.ts with otp, concurrency, consent and acceptance suites (14 tests)
key-files:
  created: [tests/rls/signature.rls.test.ts]
requirements-completed: [SIGN-01, SIGN-02, SIGN-05]
completed: 2026-10-04
---

# Phase 14 Plan 11: OTP, consent and acceptance RLS suites Summary

Four suites prove the phase-14 SQL rules on branch sv-rls-p14: code counter and lock, expiry, send rate limits, 20-parallel concurrency, consent preconditions, and PV (acceptance) refusal and reserves through to the seal.

## Commits
- 17778a0: otp, rate limit and concurrency suites
- 4a9604b: consent and acceptance suites

## Coverage
- otp: 4 wrong codes give remaining 4,3,2,1; 5th gives locked; right code afterwards gives no_code; attempts = 5. Plain code never stored (64 hex HMAC). Expired code refused, invalidated, code_expired link written. Right code signs, signature row exists, second verify gives already_signed. too_soon (retry_after_s > 0) and hourly_cap at the 6th send.
- concurrency: 20 parallel wrong verifications give attempts = 5, 5 code_failed links, 1 code_locked.
- consent: missing consent, other version, payload/version mismatch (sv_invalid_payload), non-member (sv_not_client_member), incomplete signatory (sv_signatory_incomplete), exact consent payload stored in the link.
- acceptance: sv_acceptance_missing, sv_acceptance_mismatch, sv_invalid_answer, refusal creates the admin outbox row (dedupe `acceptance_refused:<id>`), one response link per criterion plus one refused link, code and second submission blocked. Reserves sign; the fact acceptance_signed is absent after signing and posted (actor_kind client) only by sv_seal_document; document_signed outbox per distinct member plus one admin row; acceptance_submission_id matches.

No SQL bug found in the migration; no test was weakened.

## Deviations from Plan
None in code. The "unlocks the next step" claim is covered by the acceptance_signed fact being posted by the seal (the step engine itself is app-level, not asserted here).

## Notes
- First full `test:rls` run (right after the new suite) had one failure in mailoutbox.rls.test.ts (`sv_claim_due_mail` limit 50 did not return its row), a pre-existing test sensitive to other due outbox rows on the shared branch; the immediate rerun was fully green (16 files, 167 tests). Candidate for hardening in a later plan, left untouched (out of scope).
- Backdating uses `dbQuery` on the branch only.
- `tsc --noEmit` clean.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
tests/rls/signature.rls.test.ts exists; commits present.
