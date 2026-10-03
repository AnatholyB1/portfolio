---
phase: 13-document-generation
plan: 06
subsystem: mail
tags: [mail, outbox, documents, email]
requires: ["13-02"]
provides:
  - document_issued mail event, template, rule and dedupe key
  - buildDocumentIssuedEmail builder
  - buildPortalDocumentsUrl
affects: [mail engine]
key-files:
  created:
    - src/lib/server/mail/documentIssuedEmail.ts
    - src/lib/server/mail/documentIssuedEmail.test.ts
  modified:
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
    - src/lib/server/mail/urls.ts
decisions:
  - "Closed-list drift test parses the phase-13 migration constraints and compares them to MAIL_EVENTS and the template set"
metrics:
  tasks: 2
  completed: 2026-10-03
---

# Phase 13 Plan 06: Document issued e-mail Summary

French, price-free "document issued" e-mail wired into the code-defined mail engine (rule document_issued -> client, delay 0), with a dedupe key matching the SQL RPC key and a test pinning TS closed lists to the migration.

## Commits
- 7d08135: documentIssuedEmail builder and tests
- b094a38: rules, dedupe key, buildMail case, portal documents URL, closed-list test

## Verification
`rtk vitest run src/lib/server/mail` 51 passed; `rtk npx tsc --noEmit` clean.

## Deviations from Plan
- outbox.test.ts was touched (it already tests buildMail), so the buildMail case test lives there. It was not listed in files_modified.

## Known Stubs
None.

## Self-Check: PASSED
