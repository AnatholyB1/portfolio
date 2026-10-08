---
phase: 19-ads-preparation
plan: 10
subsystem: admin-leads
tags: [ads, attribution, conversions, admin]
requires: [19-01, 19-02]
provides:
  - loadLeadConversions, conversionLadder (server-only, RLS client)
  - ConversionsCard (read-only conversions ladder)
  - Hors convention notice and raw lines in AttributionCard
key-files:
  created:
    - src/lib/server/ads/conversions.ts
    - src/lib/server/ads/conversions.test.ts
    - src/components/admin/leads/ConversionsCard.tsx
  modified:
    - src/components/admin/leads/AttributionCard.tsx
    - src/components/admin/leads/leads.css
    - src/app/admin/leads/[id]/page.tsx
    - src/components/admin/leads/leadDetail.test.ts
metrics:
  completed: 2026-10-08
---

# Phase 19 Plan 10: Lead detail conversions and non-conformity Summary

Lead detail now shows a "Hors convention" notice with French reasons, "Reçu : {raw}" lines under Source/Support, and a read-only Conversions card (Lead/Qualifié/RDV/Signé ladder with event_id, "Non atteint", Signé value or "Valeur manquante", plus "Suivi" tracking) fed by a server-only RLS loader.

## Commits
- Task 1: feat(19-10) conversions loader, ladder and card
- Task 2: 40d061b feat(19-10) notice, raw lines and page wiring

## Deviations from Plan
None. The plan was executed as written. Notes:
- NONCONFORMITY_LABELS is exported from src/lib/attribution/utm.ts (19-01), and the card imports it from there.
- `.pt-lead-dim` was undefined in the CSS, so I added it alongside the other new classes.
- The conversions loader keeps `import 'server-only'` as its first line, as the acceptance criteria require.

## Verification
- Targeted vitest (server/ads, priceScope, admin/leads) passes; `tsc --noEmit` is clean.
- Full suite: 1 pre-existing failure in src/lib/pilotageMigration.test.ts (day-rate regex on a migration, unrelated). Logged in deferred-items.md. A consent test also timed out once under load and passes in isolation.

## Known Stubs
None.

## Self-Check: PASSED
