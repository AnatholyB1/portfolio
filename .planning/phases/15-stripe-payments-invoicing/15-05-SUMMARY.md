---
phase: 15-stripe-payments-invoicing
plan: 05
subsystem: ui
tags: [copy, navigation, price-scope, stripe]
requires: []
provides:
  - PROJECT_COPY.payments (portal, admin, statuses, return banner)
  - Paiements nav link at /espace-client/paiements
  - Price-allowed zone src/app/api/stripe
affects: [15-portal, 15-admin, 15-webhook]
tech-stack:
  added: []
  patterns: ["copy functions take pre-formatted amount/date strings; no currency symbol in copy.ts"]
key-files:
  created: []
  modified:
    - src/lib/projects/copy.ts
    - src/lib/projects/copy.test.ts
    - src/lib/priceScope.ts
    - src/lib/priceScope.test.ts
    - src/components/portal/project/ClientNav.tsx
    - src/components/portal/project/portalPage.test.ts
key-decisions:
  - "Copy holds no euro symbol: fee, amounts and bounds are parameters, so the existing no-price copy test keeps passing"
requirements-completed: [PAY-01, PAY-03]
duration: 10min
completed: 2026-10-04
---

# Phase 15 Plan 05: Copy, nav and Stripe price zone Summary

Complete `PROJECT_COPY.payments` French block (portal, admin Facturation, badges, return banner), an active Paiements nav link, and `src/app/api/stripe` declared as a price-allowed zone.

## Tasks
1. Copy block: commit 2a69a53
2. Nav link and price zone: commit dc5316a

## Deviations from Plan
**[Rule 1 - Conflict] Euro amounts in helpers**: UI-SPEC texts such as "Frais Stripe : 0,50 € par remboursement" would fail the existing no-price copy test. Made these functions (`refundHelper(fee)`, `amountRange(min, max)`, `recap(...)`) so callers pass formatted money. Text otherwise word for word.

Keys not literally enumerated in the plan (e.g. `pending.statuses` keys transfer_pending/amount_mismatch/unmatched/failed, `shortKinds`) were named by me; later plans should use these names.

## Verification
`vitest run src/lib/projects src/lib/priceScope.test.ts src/components/portal`: 135 passed.

## Known Stubs
None.

## Self-Check: PASSED
