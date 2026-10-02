---
phase: 12-conversion-projects-step-engine
plan: 03
subsystem: projects-validation
tags: [tdd, zod, vitest, copy, consent, file-rules]
requires: []
provides:
  - "offers.ts: OFFER_SLUGS, OFFER_LABELS"
  - "onboardingSchema.ts: block schemas, isOnboardingComplete, blockCompletion, isValidFrVat"
  - "schemas.ts: convertSchema, postFactSchema, revokeFactSchema, linkSchema, uploadRequestSchema, consentSchema"
  - "fileRules.ts: MAX_FILE_BYTES, ALLOWED_FILE_TYPES, sanitizeFilename, validateUpload, formatSize"
  - "consent.ts: PRESENTATION_CONSENT (provisional)"
  - "copy.ts: PROJECT_COPY"
affects: [12-04, portal, admin-projects, conversion]
key-files:
  created:
    - src/lib/projects/offers.ts
    - src/lib/projects/onboardingSchema.ts
    - src/lib/projects/onboardingSchema.test.ts
    - src/lib/projects/schemas.ts
    - src/lib/projects/schemas.test.ts
    - src/lib/projects/fileRules.ts
    - src/lib/projects/fileRules.test.ts
    - src/lib/projects/consent.ts
    - src/lib/projects/copy.ts
    - src/lib/projects/copy.test.ts
key-decisions:
  - "Schema error messages are PROJECT_COPY.errors key names (required, vatFormat, url); UI maps them"
  - "isOnboardingComplete requires societe + signataire + facturation (contact and projet do not block, D-12)"
  - "Offer labels copied from FR translations item names"
requirements-completed: [PORTAL-01, PORTAL-02, PORTAL-05, PORTAL-06]
duration: 8min
completed: 2026-10-03
---

# Phase 12 Plan 03: Validation, Constants and Copy Summary

Client-safe zod schemas, upload whitelist, provisional presentation consent and price-free French copy shared by actions, services and UI.

## Tasks

1. offers + onboardingSchema: RED 06afbdd, GREEN 0999ac8 (13 tests)
2. schemas + fileRules: RED e42039a, GREEN fa3502b (20 tests)
3. consent + copy: RED 2cbabed, GREEN 78f898d (no-price guard)

## Verification

`npx vitest run src/lib/projects` passes (7 files, 69 tests); no tsc errors in src/lib/projects.

## Deviations from Plan

None. State advance/metrics commands were not run separately (see below).

## Known Stubs

None. PRESENTATION_CONSENT text is intentionally provisional (legal review blocker in STATE.md).

## TDD Gate Compliance

test then feat commits present for all three tasks.

## Self-Check: PASSED
