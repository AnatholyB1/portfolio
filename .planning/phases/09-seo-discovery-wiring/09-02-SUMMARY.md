---
phase: 09-seo-discovery-wiring
plan: 02
subsystem: seo
tags: [json-ld, schema-org, offercatalog, vitest]
requires: []
provides:
  - price-free OfferCatalog with 9 Service nodes in global ProfessionalService JSON-LD
affects: [09-seo-discovery-wiring]
tech-stack:
  added: []
  patterns: [pure JSON-LD builder, source-text layout guard tests]
key-files:
  created: [src/lib/serviceSchema.ts, src/lib/serviceSchema.test.ts]
  modified: [src/app/layout.tsx, src/app/layout.test.ts]
key-decisions:
  - "Service provider references #organization, areaServed FR, no per-Service serviceType (would need new copy)"
  - "Root JSON-LD serialized via buildJsonLdScript to escape '<'"
requirements-completed: [SEO-02]
duration: 4min
completed: 2026-10-01
---

# Phase 9 Plan 02: Service OfferCatalog JSON-LD Summary

Root layout ProfessionalService now carries `hasOfferCatalog` with 9 distinct, price-free Service nodes built by the pure `buildServiceCatalogJsonLd` from services data and French copy, serialized with `<` escaping.

## Tasks
1. Builder (TDD): `test(09-02)` d456df7, `feat(09-02)` 7d74fda
2. Layout wiring: `feat(09-02): wire hasOfferCatalog into global JSON-LD`

## Deviations from Plan
None - plan executed exactly as written. Verification: vitest src/app src/lib src/data 324 passed; tsc clean.

## Self-Check: PASSED
