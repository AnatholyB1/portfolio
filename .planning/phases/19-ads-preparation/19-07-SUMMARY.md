---
phase: 19-ads-preparation
plan: 07
subsystem: testing
tags: [supabase, rls, conversions, uuidv5, vitest]
requires:
  - phase: 19-02
    provides: eventIdFor
  - phase: 19-06
    provides: branch sv-rls-p19 with the phase-19 migration
provides:
  - tests/rls/ads.rls.test.ts (20 tests) proving ADS-01 and ADS-02 database guarantees on real Postgres
affects: [19-11]
key-files:
  created: [tests/rls/ads.rls.test.ts]
metrics:
  completed: 2026-10-08
---

# Phase 19 Plan 07: Ads RLS suite Summary

One suite, 20 tests, green on sv-rls-p19 on the first run. No migration bug found, so the migration file and its sha256 are unchanged: `825bd45ec1ac3e831355feaf1e2357c99b033147ddfd5560595498bf83d82127` (19-11 compares against it). Production untouched.

## Proven
- Capture (ADS-01): flagged p_source stores only the closed-list code (`source_unknown`, `bogus` dropped) and `source_raw` limited to the two UTM keys; key-less or conformant p_source gives null/null; a returning contact leaves the existing lead's flags alone; direct update raises `sv_source_frozen`; `sv_correct_lead_source` clears the flag, keeps `source_raw`, journals `cleared_nonconformity ['source_unknown']` with `from.source` 'tiktok'; admin reads the flag from `sv_leads_admin_v`, a plain user gets no row.
- Ladder (ADS-02): a new lead has exactly one `lead_submitted` row (rank 1, event_id equals TS `eventIdFor`, occurred_at equals created_at, source columns equal to the lead, null value, no PII keys). SQL golden vector returns `c2906e05-76be-58a0-b812-a56ec50f0a76`. Jump new -> signed emits lead_submitted, lead_qualified, rdv_booked, quote_sent, deal_signed with TS-equal ids, the lead's stage timestamps, and source_event_id equal to the jump's status_changed event. Backward move, replay and same-status repeat add nothing (5 rows throughout). Step-by-step gives the same five names. Click ids: gclid 'AbC' captured, none gives null. Parity: for every lead of the suite, emitted ranks equal {1} plus 2/3/4 for each non-null stage timestamp.
- Value (D-11): chain-head quote (revision 2, 150000) gives `value_cents` 150000 and `'EUR'`, other rows null; signed without a project or quote gives null/null; string total and negative total give null.
- Lost: one `lead_lost` row (rank null, id `eventIdFor(lead,'lead_lost',source_event_id)`), earlier rows kept; lost -> qualified -> lost gives a second `lead_lost` with a distinct id and no `lead_qualified` duplicate.
- Isolation and append-only: anon and plain user read nothing, admin reads; service_role insert fails with permission denied, update and delete fail; owner update, delete and truncate raise `sv_immutable_table`.

## Results (for 19-11)
- ads suite alone: 20/20 passed.
- Full `test:rls` (23 files, 339 tests): run 1 had 337 passed, 2 failed; run 2 had 338 passed, 1 failed. Every failure is in `mailoutbox sv_claim_due_mail` and the failing test moves between runs. A third isolated run of mailoutbox alone also failed one test (4 of 5 passed). The ads suite and all other 21 files are green in each run.
- Likely cause (not a phase-19 migration defect): `sv_claim_due_mail` claims a bounded batch, and due pending outbox rows accumulate on the throwaway branch across suites (`sv_issue_document` enqueues mails that nothing claims), so the test's own rows fall outside the batch. This is the known mailoutbox flake already seen in 18-14, but it is now more frequent on this branch. It does not touch phase-19 objects. Not fixed here (out of scope, logged for the owner); a drain of pending rows on the branch, or deleting the branch in 19-12, clears it.

## Deviations from Plan
1. [Rule 3] `npx vitest` replaced by `./node_modules/.bin/vitest run -c vitest.rls.config.ts` (same as `npm run test:rls`).
2. Both tasks live in one file and were committed together in one commit (832c471).
3. The plan allowed one documented mailoutbox flake rerun; the flake persisted on two reruns, see Results.

## Deferred Issues
- mailoutbox `sv_claim_due_mail` instability on the branch (see Results), pre-existing mechanism.

## Commits
- 832c471: test(19-07): phase-19 ads RLS and behaviour suite

## Known Stubs
None.

## Threat Flags
None. The suite uses unique e-mails per run, never touches "Test E2E Sèvalys", and dbQuery refuses the production ref.

## Self-Check: PASSED
