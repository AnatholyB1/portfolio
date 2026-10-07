---
phase: 17-admin-forecast-dashboard
plan: 02
subsystem: pilotage
tags: [billing, periods, url-params, vitest, cents]
requires: []
provides:
  - "periods.ts: Europe/Paris civil-date period and horizon helpers"
  - "params.ts: whitelisted dashboard URL parameters and pilotageHref"
  - "billing.ts: invoiced, collected, unpaidInvoices, billingAnomalies, sumByProject with reconciliation items"
affects: [17-04, 17-07, 17-08, 17-09, 17-12]
tech-stack:
  added: []
  patterns: ["pure modules in integer cents", "Aggregate { totalCents, items } reconciliation", "hasOwnProperty whitelists"]
key-files:
  created:
    - src/lib/server/pilotage/periods.ts
    - src/lib/server/pilotage/periods.test.ts
    - src/lib/server/pilotage/params.ts
    - src/lib/server/pilotage/params.test.ts
    - src/lib/server/pilotage/billing.ts
    - src/lib/server/pilotage/billing.test.ts
  modified: []
key-decisions:
  - "invoiced, collected and unpaidInvoices take a trailing includeTests=false argument (additive to the contract) so test series are excluded by default"
  - "pilotageHref emits cle whenever projectId is set, page only when detail is set and page > 1"
  - "HT conversion for standard VAT uses a single documented ratio round(ttc*excl/incl) (assumption A4)"
requirements-completed: []
duration: 15min
completed: 2026-10-07
---

# Phase 17 Plan 02: Pilotage periods, params and billing Summary

Pure, tested helpers for the dashboard: Paris-civil-date periods, whitelisted URL parameters, and invoiced/collected aggregation immune to the deposit double count, cumulative refund and test-series traps.

## Tasks

| Task | Commits |
|------|---------|
| 1 periods.ts and params.ts | RED test commit, then feat commit |
| 2 billing.ts | RED test commit, then feat commit |

41 Vitest tests pass under src/lib/server/pilotage; tsc reports no errors in the new files.

## Deviations from Plan

None in behavior. One additive API choice: optional `includeTests` trailing parameter on `invoiced`, `collected`, `unpaidInvoices` (default false), because the contract signatures carried no test filter while the behavior required one. Callers may also use the exported `filterInvoices`.

## Known Stubs

None.

## Self-Check: PASSED
