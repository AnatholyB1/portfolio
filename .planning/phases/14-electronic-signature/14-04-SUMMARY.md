---
phase: 14-electronic-signature
plan: 04
subsystem: database
tags: [postgres, supabase, rls, hash-chain, otp, signature]
requires:
  - phase: 13-document-generation
    provides: sv_project_documents, sv_document_snapshots, sv_issue_document, outbox closed lists
  - phase: 12-conversion-projects-step-engine
    provides: sv_post_project_fact, deny_mutation pattern
provides:
  - "Single migration 20261006000000_sv_signature.sql: 6 tables, hash-chain functions, 11 public RPCs, outbox extension, signed-document guard"
  - "Static guard test src/lib/signatureMigration.test.ts"
affects: [14-05, 14-11, 14-12, 14-18]
tech-stack:
  added: []
  patterns:
    - "Append-only chain with no insert grant, insertion through security definer function under advisory lock"
    - "Counter paths return jsonb failures so the transaction commits the attempt counter"
key-files:
  created:
    - supabase/migrations/20261006000000_sv_signature.sql
    - src/lib/signatureMigration.test.ts
  modified: []
key-decisions:
  - "Failed code sends stay in sv_signature_codes (invalidated send_failed) so they count in the hourly quota (RESEARCH A4)"
  - "sv_seal_document and sv_submit_acceptance require a non-blank admin email and raise sv_invalid_admin_email otherwise"
  - "Acceptance answer for a delivered criterion must carry no note; reserved/refused need a note of 3 to 1000 chars"
  - "sv_log_code_send_failed logs the event with actor_kind system"
requirements-completed: [SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05]
duration: 25min
completed: 2026-10-04
---

# Phase 14 Plan 04: Signature migration Summary

One SQL migration carries every database guarantee of the signing protocol: per-document hash chain that even service_role cannot rewrite or fork, HMAC-only OTP codes with a row-locked attempt counter, atomic seal + fact + outbox, and a signed-document guard on sv_issue_document.

## Tasks

| Task | Commit | Content |
| ---- | ------ | ------- |
| 1 | 0c1a76d | Tables (events, codes, acceptance submissions/responses, signatures, seals), RLS, deny triggers, genesis/link hash, append_signature_event, guards, trail RPCs, static test |
| 2 | 334e2de | Outbox extension, sv_submit_acceptance, sv_request_signature_code, sv_log_code_send_failed, sv_verify_signature_code, sv_seal_document, sv_issue_document signed guard, test extension |

## Verification

`rtk vitest run src/lib/signatureMigration.test.ts src/lib/migrationLint.test.ts src/lib/documentsMigration.test.ts`: 38 passed. Task 2 diff against the Task 1 commit is 814 added lines and 0 removed lines; the part-1 marker is present once. 11 public functions, 11 service_role grants. Behavioural proof (migration is not executed here) follows on the branch in 14-05, 14-11, 14-12.

## Deviations from Plan

- Worktree base was `c4b02c5` instead of the expected `9a8b3cb`; reset to the expected base as the startup check requires.
- Added small internal helpers not listed in the plan: `sv_private.lock_document_project` (project lock first) and `sv_private.assert_client_member` (membership without the signatory-completeness check, used by the open and download log RPCs).
- `sv_log_document_opened` and `sv_log_seal_downloaded` accept actor kinds client and admin only; a client actor must be a project member.

No stubs. No threat flags beyond the plan's threat model.

## Self-Check: PASSED

- supabase/migrations/20261006000000_sv_signature.sql: FOUND
- src/lib/signatureMigration.test.ts: FOUND
- Commits 0c1a76d and 334e2de: FOUND
