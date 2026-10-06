---
phase: 16-mailing-automation-completion
plan: 05
subsystem: testing
tags: [supabase, rls, branch, migration, helpers]
requires:
  - phase: 16-01
    provides: migration 20261008000000_sv_mail_automation.sql
provides:
  - Supabase branch sv-rls-p16 (ref fcvruekkqrwvaqyrkxys) carrying the phase-16 schema
  - RLS helpers applyResendEvent, recordUnsubscribe, liftSuppression, setReminderHold, blockScope
affects: [16-12, 16-13]
key-files:
  modified: [tests/rls/helpers.ts]
decisions:
  - "Branch sv-rls-p16 created per owner decision; must be deleted in 16-13"
metrics:
  completed: 2026-10-06
---

# Phase 16 Plan 05: Phase-16 test branch and RLS helpers Summary

Created Supabase branch `sv-rls-p16` (project ref `fcvruekkqrwvaqyrkxys`, id 5822d77b-1405-4cca-9101-bb251cba9996, parent ubxllsvanurkwkohzxau), pushed the phase-16 migration to the branch only, and added five RLS helpers.

## Task 1: Branch check
`branches list` showed only `main` (FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY). Decision: NEW BRANCH NEEDED. `.env.test.local` did not exist.

## Task 2: Owner decision
Resolved by the owner in-session on 2026-10-06 (relayed by the orchestrator in the executor prompt): option "create" - create `sv-rls-p16` from production, billed hourly until deleted in 16-13.

## Task 3: Provision, push, helpers
- `supabase branches create sv-rls-p16` reached ACTIVE_HEALTHY. `.env.test.local` written by script (gitignored, `git check-ignore` prints it; contains no production ref; not committed). `SV_TEST_DB_URL` is the session pooler (port 5432); signature variable is `SV_TEST_SIGNATURE_CODE_SECRET`. Credentials were never printed.
- Branch already had phase-15 schema (sv_stripe_events, sv_document_seals present).
- `db push` refused on remote-only history versions. Branch-only repair as in 14-05/15-08: reverted the 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, dry-run then listed only 20261008000000, real push applied it unchanged (no SQL fix).
- Verification on the branch: to_regclass not null for sv_resend_events, sv_mail_suppressions, sv_mail_suppression_lifts, sv_reminder_holds. Privileges all false: service_role insert on sv_mail_suppressions, authenticated select on sv_resend_events, authenticated execute on sv_apply_resend_event. sv_mail_outbox has exactly 2 check constraints mentioning review_request and credit_note_issued (event_type and template).
- Branch-only fixture grant: `grant select, insert, update, delete on public.gecko_admins to service_role` (as in 13-07/14-05/15-08).
- Helpers added to tests/rls/helpers.ts (commit 5fdc228); grep count is 5.
- Production untouched: only `branches list/create/get` touched ref ubxllsvanurkwkohzxau. All db push, repair and queries used SV_TEST_DB_URL (branch ref fcvruekkqrwvaqyrkxys), verified before each apply.

## Deviations from Plan

**1. [Operational] Supabase MCP tools unavailable** - ToolSearch was disabled in this agent, so the Supabase CLI was used (as the plan specifies) instead of MCP tools.

**2. [Operational] Auth rate limit** - first full `test:rls` right after provisioning hit "Request rate limit reached" and the gecko_admins grant was missing; both resolved as in 14-05/15-08.

**3. [Unresolved] `npm run test:rls` did not exit 0 in a full run** - after grant and pause: run A 242/243 (only mailoutbox `sv_claim_due_mail > claims a due pending row once` failed), run B 241/243 (that test plus `consents > admin reads the journal` returned null). mailoutbox.rls.test.ts passes 5/5 in isolation. Failures rotate between runs and neither involves a phase-16 object (same pattern as 15-08 deviation 3); likely accumulated rows on the shared branch affecting claim batches/reads. Left for 16-12 to investigate; not fixed here.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Commit 5fdc228 and helpers exist; .env.test.local ignored.
