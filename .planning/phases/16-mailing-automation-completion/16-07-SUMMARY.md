---
phase: 16-mailing-automation-completion
plan: 07
subsystem: mail
tags: [unsubscribe, proxy, private-routes, next16, vitest]

requires:
  - phase: 16-mailing-automation-completion
    provides: unsubscribe token helpers (16-02), /api/unsubscribe route (16-06)
provides:
  - /desinscription public confirmation page (GET renders, POST confirms)
  - '/desinscription' registered as private, unprotected route
affects: [16-03 mail footer link, 16-14 verification]

tech-stack:
  added: []
  patterns: [connexion layout/AuthCard reused for a session-free private page]

key-files:
  created:
    - src/app/desinscription/page.tsx
    - src/app/desinscription/layout.tsx
    - src/app/desinscription/page.test.tsx
  modified:
    - src/lib/privateRoutes.ts
    - src/lib/privateRoutes.test.ts
    - src/proxy.ts
    - src/proxy.test.ts
    - next.config.ts
    - src/app/sitemap.test.ts
    - src/app/llms.test.ts

key-decisions:
  - "/desinscription is in PRIVATE_PREFIXES only, never PROTECTED_PREFIXES: no redirect to /connexion"
  - "Invalid, missing token or unset secret all render the same generic message"

requirements-completed: []

duration: 10min
completed: 2026-10-06
---

# Phase 16 Plan 07: Unsubscribe confirmation page Summary

Private, session-free /desinscription page showing the masked address with a POST confirmation form to /api/unsubscribe, noindex and no-referrer, with the webhook and unsubscribe API proven outside the proxy matcher.

## Task Commits

1. Task 1: register route as private/unprotected - 4674a92
2. Task 2: confirmation page - 6980c03

## Deviations from Plan

**1. [Rule 3 - Blocking] proxy.test.ts matcher regex failed on CRLF checkout**
- Working tree uses CRLF so the matcher block regex returned null; normalized line endings when reading src/proxy.ts in the test.
- Files: src/proxy.test.ts

**2. [Rule 2 - Missing critical] next.config.ts noindex headers**
- Existing tests require an X-Robots-Tag source for every PRIVATE_PREFIXES entry; added "/desinscription" to next.config.ts and updated the hard-coded lists in sitemap.test.ts and llms.test.ts.
- Commit: 4674a92

## Known Stubs

None.

## Self-Check: PASSED

Commits 4674a92 and 6980c03 exist; vitest on proxy, privateRoutes, sitemap, llms and desinscription green; tsc clean.
