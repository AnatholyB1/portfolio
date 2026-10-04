---
phase: 14-electronic-signature
plan: 06
subsystem: mail
tags: [outbox, email, signature]
requires: [14-04]
provides:
  - "buildDocumentSignedEmail, buildDocumentSignedAdminEmail, buildAcceptanceRefusedAdminEmail"
  - "document_signed, document_signed_admin, acceptance_refused in MAIL_EVENTS / MAIL_RULES / MailTemplate / dedupeKey / buildMail"
key-files:
  created:
    - src/lib/server/mail/documentSignedEmail.ts
    - src/lib/server/mail/documentSignedEmail.test.ts
  modified:
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
requirements-completed: [SIGN-04, SIGN-05]
completed: 2026-10-04
---

# Phase 14 Plan 06: Post-signature e-mails Summary

Client confirmation, admin signature alert and admin PV refusal alert are rendered by the outbox engine, with closed lists in parity with the 20261006000000 SQL check constraints.

## Tasks

| Task | Commit |
|------|--------|
| 1 templates (escaped, no amount/attachment/signed link) | ca3c17e |
| 2 rules, dedupe helpers, buildMail cases, parity test on the phase-14 migration | see git log (feat(14-06) wire) |

`vitest run src/lib/server/mail`: 62 tests pass.

## Deviations from Plan

None in behavior. The genitive ("du devis") is derived from the article-bearing label by a small function rather than a map keyed per label, so unknown labels degrade to "de {label}".

## Deferred Issues

Pre-existing `tsc` error in `src/lib/signature/verifyChain.test.ts` (plan 14-02, unrelated); not touched.

## Known Stubs

None.

## Self-Check: PASSED
