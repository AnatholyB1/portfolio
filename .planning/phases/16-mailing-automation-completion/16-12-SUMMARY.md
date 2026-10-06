---
phase: 16-mailing-automation-completion
plan: 12
subsystem: testing
tags: [supabase, rls, postgres, suppressions, resend, reminders]
requires:
  - phase: 16-05
    provides: branch sv-rls-p16 and RLS helpers
provides:
  - tests/rls/mailautomation.rls.test.ts (29 tests) proving phase-16 SQL guarantees on the branch
affects: [16-13]
key-files:
  created: [tests/rls/mailautomation.rls.test.ts]
decisions:
  - "Append-only is proven with real error text (permission denied for service_role, sv_immutable_table for the owner), not a generic error regex"
metrics:
  completed: 2026-10-06
---

# Phase 16 Plan 12: Phase-16 RLS and RPC suite Summary

One suite of 29 tests proves isolation, append-only journals, idempotent Resend events, block scopes, admin alerts, RPC privileges, reminder hold and the deposit reminder skip on credit note, on branch sv-rls-p16.

## Results
- `.env.test.local` verified to contain no production ref (ubxllsvanurkwkohzxau); target is the branch (fcvruekkqrwvaqyrkxys).
- `npm run test:rls -- tests/rls/mailautomation.rls.test.ts`: 29/29 passed.
- Full `npm run test:rls` (after commit): 20 files, 272/272 passed, exit 0.

Coverage: zero rows for client A/B, plain user, Gecko admin and anon on the four tables; sv admin reads suppressions, lifts and holds and zero rows of sv_resend_events; PostgREST update/delete rejected for service_role on all four tables; DB-level update/delete/truncate rejected for service_role (permission denied) and the table owner (sv_immutable_table, or the FK error for truncate on the two referenced tables); the five RPCs refuse anon, plain and admin authenticated clients; non-admin actor gets sv_not_admin on lift and hold; outbox accepts review_request, rejects unknown event type and template; duplicate event -> 'duplicate' with one row; Transient/Undetermined -> 'ignored' with row recorded and no suppression; scopes marketing/all/none, case and whitespace normalisation, sv_invalid_reason, already_lifted, recorded/already unsubscribe; masked admin alert on permanent bounce, none for unknown-address complaint, alert with clientName for a member address; hold suspend/unchanged/resume with document_reminder skipped (last_error reminder_hold) and payment_reminder untouched; full credit note skips deposit d3/d7/admin d14 reminders.

## Flaky 16-05 failures: investigation
Finding: pre-existing, state-dependent flakiness, not a phase-16 regression.
- sv_claim_due_mail (migration 20261004000000, untouched by the phase-16 migration, which only rebuilds the two outbox check constraints) claims at most 50 rows, ordered by created_at (oldest first). The test "claims a due pending row once" inserts one new row and expects it in the first batch.
- sv_mail_outbox is never cleaned (append-only test data on the shared branch). Measured on the branch after the runs: 60 due pending rows (34 document_issued, 6 document_signed, 6 document_signed_admin, 5 client_invited, 4 mail_suppression_admin, others), more than the 50 cap, so a new row can fall outside the first batch. Each full run drains up to 50 backlog rows into 'sending', which is why results rotate between runs and the test passes in isolation or right after a drain.
- The consents "admin reads the journal" failure was not reproduced in the final runs (full suite green); it was not investigated further. It is likely the same shared-state/rate-limit family (16-05 also hit an auth rate limit), but this is not proven.
- No test was weakened or skipped. Risk to flag: this suite adds a few due rows per run (alerts and invoice mails, about 8), slightly growing the backlog. Remedy for 16-13 or a later hardening: the branch is deleted in 16-13, or the claim test could drain the backlog first. Not changed here.

## Deviations from Plan
**1. [Rule 1 - Bug in own test] Vacuous dbQuery assertions** - first draft used multi-statement SQL and a generic error regex; direct CLI check showed multi-statement is refused ("cannot insert multiple commands") and truncate failed on an FK for the wrong reason. Rewritten with single-statement DO blocks and specific error matches (permission denied / sv_immutable_table). Both tasks live in one file and were committed together in one commit rather than two.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
tests/rls/mailautomation.rls.test.ts exists; commit created on master.
