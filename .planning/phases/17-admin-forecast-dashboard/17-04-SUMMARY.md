---
phase: 17-admin-forecast-dashboard
plan: 04
subsystem: pilotage
tags: [costs, forecast, cash-projection, margins, vitest, cents]
requires: ["17-02"]
provides:
  - "costs.ts: versioned recurring cost unfolding, voidable project costs, current balance, registers"
  - "forecast.ts: projectMargin, remainingToInvoice, globalMargin, realizedMargin, cashProjection"
affects: [17-07, 17-11]
tech-stack:
  added: []
  patterns: ["pure modules in integer cents", "append-only rows with version/stop/void", "Number.isSafeInteger guards"]
key-files:
  created:
    - src/lib/server/pilotage/costs.ts
    - src/lib/server/pilotage/costs.test.ts
    - src/lib/server/pilotage/forecast.ts
    - src/lib/server/pilotage/forecast.test.ts
  modified: []
key-decisions:
  - "Applicable recurring version ordered by (month of starts_on, id), matching the sv_stop_recurring_cost RPC"
  - "Overdue inflows (due date earlier than current month or null) land in the current month and are also counted in overdueInflowCents"
  - "Starting balance rolls forward collected items, past project costs and elapsed recurring months since the balance date"
requirements-completed: []
duration: 12min
completed: 2026-10-07
---

# Phase 17 Plan 04: Costs and forecast Summary

Pure, tested cost model (monthly and yearly recurring series with versions, stops and voids) and the margin and 6-month cash projection rules (D-05 to D-10).

## Tasks

| Task | Commits |
|------|---------|
| 1 costs.ts | RED test commit, then feat commit |
| 2 forecast.ts | RED test commit, then feat commit |

88 Vitest tests pass under src/lib/server/pilotage.

## Deviations from Plan

None in behavior. The costs.ts header says "aucun taux journalier" instead of "TJM" so the acceptance grep for day-rate terms returns 0.

## Known Stubs

None.

## Self-Check: PASSED
