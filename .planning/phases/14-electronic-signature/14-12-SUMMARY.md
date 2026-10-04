---
phase: 14-electronic-signature
plan: 12
subsystem: testing
tags: [supabase, rls, vitest, hash-chain, tamper, golden-vector]
requires: [14-02, 14-05]
provides:
  - tests/rls/signatureChain.rls.test.ts (append-only, chain, tamper, isolation, seal-atomic, frozen; 22 tests)
  - golden vector from the branch frozen in src/lib/signature/verifyChain.test.ts
key-files:
  created: [tests/rls/signatureChain.rls.test.ts]
  modified: [src/lib/signature/verifyChain.test.ts]
requirements-completed: [SIGN-03, SIGN-04]
completed: 2026-10-04
---

# Phase 14 Plan 12: Signature chain RLS suite and golden vector Summary

The trail is shown append-only, tamper-evident, isolated and SQL/TS consistent on branch sv-rls-p14. `npm run test:rls`: 17 files, 189 tests green. `vitest run src/lib/signature`: 72 green. `tsc --noEmit` clean.

## Commits
- c9e7cba: golden vector frozen in verifyChain.test.ts (`it.todo` count 0)
- db1fa1f: signatureChain.rls.test.ts

## Coverage
- append-only: update/delete refused (permission denied or sv_immutable_table) for service_role, a member and anon on the five append-only tables; update/delete and truncate guard triggers present (pg_trigger); direct INSERT into sv_signature_events and sv_document_seals refused for service_role.
- chain: full export has opened, consent, code_sent, signed, sealed, seal_downloaded and passes verifyChainExport (count, headHash equal to last link, equal to SQL head_hash); 20 concurrent appends from 20 admin actors give seq 1..20 and an intact chain in SQL and TS.
- tamper (branch only, single `DO` block disabling then re-enabling the trigger, re-enable asserted via tgenabled = 'O'): payload edit at seq 2 gives SQL broken_at 2 and TS brokenAtSeq 2 / link_hash; deleting seq 3 gives broken_at 4 and TS seq gap at 4.
- isolation: client A reads links, signature, seal (allowed columns) and acceptance rows; storage_path is permission denied; sv_signature_codes unreadable; client B, anon and a Gecko admin read zero rows of all signature tables; admin reads all.
- seal-atomic: unsigned gives sv_signature_missing; bad path gives sv_invalid_path with no seal, fact or link; valid seal posts the fact, second gives sv_already_sealed with unchanged facts; contract_signed posted manually first gives fact_changed false.
- frozen: replacing a signed document gives sv_document_signed; replacing an unsigned, refused PV still works.

## Golden vector
Document id `70c38cc4-516e-4d89-9f1e-4bb03d74caef` (branch sv-rls-p14), 5 links (document_opened admin with ip null, consent_given, code_sent, signed, sealed with actorId null and ip null), head `080e0e51...a57fa1cb`. Verified by the TS verifier; one changed payload character or a changed ip breaks it at the right seq. The pasted vector contains a test e-mail address on the throwaway branch only.

## Deviations from Plan
- Chain test uses `sv_log_document_opened` with `p_ip null` for the null-ip case; the plan's wording about "printing the JSON once" was done with a temporary, uncommitted probe test (removed).
- Added a seq-gap tamper test (deleted link) beyond the plan.
- `supabase db query` rejects multi-statement input, so tampering uses one `DO` block (still a single transaction).

No SQL bug found in the migration; no test was weakened.

## Notes
- Branch maintenance (not a code change): `mailoutbox.rls.test.ts` (`sv_claim_due_mail`, limit 50) failed twice once the branch held more than 50 due pending outbox rows (accumulated by the phase-14 suites, noted in 14-11). I marked pending/sending outbox rows on the branch as `sent` via dbQuery, after which the full suite passed. It will recur as the rows accumulate; the mailoutbox test should be hardened (claim by id, or isolate) in a later plan. Left untouched here (out of scope).
- Sign-in rate limits: runs were spaced; no failure.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
tests/rls/signatureChain.rls.test.ts exists; commits c9e7cba and db1fa1f present.
