---
phase: 17-admin-forecast-dashboard
plan: 05
subsystem: admin-pilotage
tags: [zod, server-actions, service-role-rpc, append-only, cents]
requires:
  - phase: 17-01
    provides: five sv_* cost and balance RPCs
provides:
  - zod schemas with French messages and signed euro-to-cents parsing
  - server-only service_role RPC wrappers for costs and balance
  - five guarded append-only server actions (CostFormState contract for 17-11)
affects: [17-11]
tech-stack:
  added: []
  patterns: [requireAdmin first then zod then wrapper, hasOwnProperty code-to-message map]
key-files:
  created:
    - src/lib/server/pilotage/costSchemas.ts
    - src/lib/server/pilotage/costSchemas.test.ts
    - src/lib/server/pilotage/adminCosts.ts
    - src/app/admin/pilotage/couts/actions.ts
    - src/app/admin/pilotage/couts/actions.test.ts
key-decisions:
  - "costSchemas.ts has no server-only so client forms can reuse labels and copy"
  - "Extra COST_COPY entries (alreadyVoided, alreadyStopped, noteInvalid) added for mapped codes"
metrics:
  tasks: 2
  files: 5
  completed: 2026-10-07
---

# Phase 17 Plan 05: Costs write path Summary

Five admin server actions (add/version recurring cost, stop, add project cost, void, balance readjustment) that call requireAdmin first, validate with zod (euros to integer cents, negative balances allowed) and write only through server-only service_role RPC wrappers; no update or delete path.

## Tasks

| Task | Commits | Description |
| ---- | ------- | ----------- |
| 1 | e7708d2 (RED), 816fbf7 (GREEN) | costSchemas.ts, adminCosts.ts, 16 schema tests |
| 2 | 9e8c711 (RED), 05d59b9 (GREEN) | actions.ts and 127-test pilotage suite green, tsc clean |

## Deviations from Plan

None - plan executed as written. Additional RPC codes (amount, label) were also mapped to their French messages.

## Known Stubs

None.

## Self-Check: PASSED
