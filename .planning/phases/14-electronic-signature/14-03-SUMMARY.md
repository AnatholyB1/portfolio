---
phase: 14-electronic-signature
plan: 03
subsystem: signature
tags: [signature, legal-texts, zod, tdd, pure-domain]
requires: []
provides:
  - "src/lib/signature/consentText.ts: CONSENT_VERSION, CONSENT_TEXTS, PROOF_CLAUSE, CERTIFICATE_MENTIONS, CERTIFICATE_METHOD"
  - "src/lib/signature/signable.ts: checkSignable, signerMatches, maskEmail"
  - "src/lib/signature/acceptance.ts: acceptanceAnswersSchema, summarizeAnswers, ACCEPTANCE_STATUSES"
  - "src/lib/signature/certificate.ts: buildCertificateData, pdfSafe, CertificateData"
affects: [14-09, 14-10, 14-13, 14-14, 14-16]
tech-stack:
  added: []
  patterns: ["pure client-safe modules", "versioned legal text constants"]
key-files:
  created:
    - src/lib/signature/consentText.ts
    - src/lib/signature/signable.ts
    - src/lib/signature/acceptance.ts
    - src/lib/signature/certificate.ts
    - src/lib/signature/consentText.test.ts
    - src/lib/signature/signable.test.ts
    - src/lib/signature/acceptance.test.ts
    - src/lib/signature/certificate.test.ts
  modified: []
key-decisions:
  - "Legal texts v1 are provisional (legal review blocker); any change must be a new version"
  - "Signer rule: session user is client member AND signatory name+role present"
  - "Certificate formatting uses Intl formatToParts with an explicit template so output never contains U+202F"
metrics:
  duration: "~15 min"
  completed: 2026-10-04
---

# Phase 14 Plan 03: Signature domain rules Summary

Pure, tested domain rules for e-signature: one versioned legal-text module, signability check chained on the existing step engine, D-04 signer rule, per-criterion acceptance validation, and a deterministic font-safe certificate data builder.

## Tasks

| Task | Commits |
|------|---------|
| 1 consent texts + signability | c7be6f1 (test), b1fa60d (feat) |
| 2 acceptance + certificate | f02894b (test), feat commit following it |

24 tests pass under `vitest run src/lib/signature`; `tsc --noEmit` clean.

## Deviations from Plan

**1. [Rule 1 - Bug] summarizeAnswers typing** - parameter typed as `{status}[]` rejected object literals with extra keys in tests; made it generic over `T extends { status }`. Fixed in the Task 2 feat commit.

Otherwise the plan was executed as written. Worktree base was reset to 9a8b3cb at startup per the branch check.

## Known Stubs

None. Texts are intentionally provisional (legal review pending, tracked in STATE blocker).

## Self-Check: PASSED
