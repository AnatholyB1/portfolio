---
phase: 14-electronic-signature
plan: 07
subsystem: signature
tags: [otp, hmac, resend, ip-capture]
requires: ["14-04"]
provides: [requestIp, buildSignatureCodeEmail, newSignatureCode, signatureCodeHmac, requestSignatureCode, verifySignatureCode]
affects: [14-13]
key-files:
  created:
    - src/lib/server/signature/clientIp.ts
    - src/lib/server/signature/clientIp.test.ts
    - src/lib/server/mail/signatureCodeEmail.ts
    - src/lib/server/mail/signatureCodeEmail.test.ts
    - src/lib/server/signature/codes.ts
    - src/lib/server/signature/codes.test.ts
decisions:
  - "Code e-mail sent directly via Resend (idempotencyKey = codeId), never through sv_mail_outbox"
  - "Fail closed with not_configured before any RPC when SV_SIGNATURE_CODE_SECRET or RESEND_API_KEY is missing"
metrics:
  tasks: 2
  files: 6
  completed: 2026-10-04
---

# Phase 14 Plan 07: Signature code service Summary

Server-only one-time code lifecycle: crypto.randomInt 6-digit code, HMAC-SHA256 bound to document and user sent to SQL, direct Resend delivery with a link-free template, validated x-forwarded-for IP capture.

## Commits
- Task 1: 1f9c327 (clientIp, signatureCodeEmail)
- Task 2: codes.ts and tests (second feat commit on this branch)

## Notes
- Raised SQL codes are mapped to short app codes (superseded, already_signed, not_signable, not_member, signatory_incomplete, consent_missing, acceptance_missing, acceptance_refused).
- signatureCodeEmail reuses escapeHtml and LOGIN_FOOTNOTE_COLOR from loginCodeEmail.
- verifySignatureCode also fails closed with not_configured if the secret is missing.

## Deviations from Plan
None - plan executed as written. Pre-existing tsc error in src/lib/signature/verifyChain.test.ts is out of scope.

## Known Stubs
None.

## Self-Check: PASSED
All six files exist; 20 tests pass; grep acceptance checks return 0.
