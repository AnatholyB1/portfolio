---
phase: 13-document-generation
plan: 08
subsystem: documents
tags: [react-pdf, templates, registry, vitest]
requires: [13-05]
provides:
  - ContractV1, SpecV1, AcceptanceV1 templates
  - TEMPLATES registry and documentElement(snapshot)
  - sampleSpecSnapshot, sampleContractSnapshot, sampleAcceptanceSnapshot fixtures
affects: [13-13]
key-files:
  created:
    - src/lib/documents/pdf/templates/contract/v1/ContractV1.tsx
    - src/lib/documents/pdf/templates/spec/v1/SpecV1.tsx
    - src/lib/documents/pdf/templates/acceptance/v1/AcceptanceV1.tsx
    - src/lib/documents/registry.ts
    - src/lib/documents/render.test.ts
  modified:
    - src/lib/documents/fixtures.ts
key-decisions:
  - "Registry throws unknown_template for missing docType/version; template fixes ship as v2, never edit v1"
requirements-completed: [DOC-01]
duration: 15min
completed: 2026-10-03
---

# Phase 13 Plan 08: Contract, spec, acceptance templates and registry Summary

Fixed-clause contract, six-section spec and acceptance report v1 templates, plus a versioned TEMPLATES registry rendering all five document types, covered by a PDF render and text-extraction test.

## Commits
- 1640824: three templates and fixtures
- b774f78: registry and render test

## Deviations from Plan
- [Rule 1 - Bug] Test compared formatEuros output to normalised PDF text (narrow no-break spaces); wrapped expectation in normalizeText.
- [Rule 1 - Bug] The unpdf import scan flagged testText.ts itself (the test utility); it is excluded from the scan.
- Spec has five stored sections plus the criteria list, which gives the six sections in fixed order.

## Known Stubs
None. The contract header comment keeps the pending legal review flag (blocker in STATE.md) and the phase 14 proof-convention note.

## Verification
`npx tsc --noEmit` clean; `npx vitest run src/lib/documents` 118/118 passing.

## Self-Check: PASSED
