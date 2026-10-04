---
phase: 14-electronic-signature
plan: 13
subsystem: signature
tags: [server-actions, signing-context, esign]
requires: [14-03, 14-05, 14-07, 14-08, 14-09, 14-10]
provides: [loadSigningContext, signer server actions]
affects: [client signing page (later plans)]
key-files:
  created:
    - src/lib/server/signature/signingContext.ts
    - src/lib/server/signature/signingContext.test.ts
    - src/app/espace-client/documents/[id]/signer/actions.ts
    - src/app/espace-client/documents/[id]/signer/actions.test.ts
metrics:
  tasks: 2 of 3 executed (Task 3 conditional, skipped)
  completed: 2026-10-04
---

# Phase 14 Plan 13: Signing context and signer actions Summary

Session-bound server layer for the client signing page: one context loader (document, signability, signer match, criteria, signature/seal state, code cooldown) and five server actions (preview link, acceptance, send code, verify code, resume finalization) with a signability re-check before every code RPC.

## Commits
- d27e10a: signing context loader (9 tests)
- 8b7b52b: signer server actions (33 tests)

## Task 3 (apercu route)
Task 3 skipped: PREVIEW_MODE signed_url (14-05-SUMMARY records `PREVIEW_MODE: signed_url`). Neither `apercu/route.ts` nor its test exists; `previewLinkAction` returns a signed URL through `createPreviewUrl`.

## Decisions
- Signability guard: `sendCodeAction` and `verifyCodeAction` load a fresh `loadSigningContext` right after `requireClient` and stop on any non-ok `signable` (wrong_step, replaced, already_signed, not_signable_type) or `signer.matches === false`, before `recordConsent`, `requestSignatureCode`, `verifySignatureCode` or `finalizeSignature`. Reason: SQL `assert_signable_head` does not know the project step gate. Exception: `already_signed` with state `pending_finalization` for the same user goes to `finalizeSignature` (resume), never to `verifySignatureCode`.
- Signer rule per D-04 ruling: member of the client AND signatory name and role non-blank; code e-mail is always `ctx.user.email`; no e-mail accepted from input.
- Loader reads signature/seal/submissions through the RLS client; service_role only for membership, snapshot criteria, consent events and code counters, scoped to the already-authorized document/client.
- Consent is logged once per CONSENT_VERSION (resend detected from `consent_given` events).
- PV code step stays unreachable without a complete, non-refused submission (pre-checked, SQL also enforces).

## Deviations from Plan
- Tests were written together with the implementation in each task (no separate RED commit).
- Messages with no dedicated copy key reuse existing ones: signed -> `success.heading`, unchecked consent -> `consent.helper`, malformed code -> `errors.generic`.

## Known Stubs
None.

## Self-Check: PASSED
Files and commits d27e10a, 8b7b52b verified; vitest (42 tests), tsc and eslint clean on the new files. RLS suites not run (orchestrator owns the test branch).
