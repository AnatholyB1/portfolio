---
phase: 19-ads-preparation
plan: 05
subsystem: attribution
tags: [proxy, utm, leads, ingest]
requires: [19-02, 19-04]
provides:
  - proxy arrival touches with canonical params, raw values and pre-lead event id
  - RequestAttribution.utm { nonconformity, raw }
  - sv_ingest_lead p_source with nonconformity and raw keys
key-files:
  modified:
    - src/proxy.ts
    - src/proxy.test.ts
    - src/lib/leads/requestAttribution.ts
    - src/lib/leads/requestAttribution.test.ts
    - src/lib/leads/ingest.ts
    - src/lib/leads/ingest.test.ts
decisions:
  - RPC signature unchanged; the extra data travels inside the p_source jsonb (deploy-order safe)
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 19 Plan 05: Capture path wiring Summary

Proxy arrival touches now carry canonical UTM params, the audit raw values and a random pre-lead event id (`newPreLeadEventId`); lead ingest forwards the non-conformity reasons and raw values to the RPC through `p_source`, so no lead is ever dropped for a non-conformant UTM.

## Commits
- 781b56c: proxy arrival touch (parseAttrParamsWithRaw, eid, raw)
- c6fc495: requestAttribution assessment and ingest p_source keys

## Deviations from Plan
- Worktree was reset to the required base commit 55725eb at start.
- No test helper constructed a RequestAttribution literal, so no other test files needed updating.
- RED phase was not run separately; tests and code were written together and verified green.

## Deferred Issues
- Full suite has one failure outside this plan: `src/lib/pilotageMigration.test.ts` (phase 17 migration static check, day-rate regex matches a migration comment). Not touched by this plan.
- `rtk npm test` therefore does not exit 0 globally because of that pre-existing failure; targeted suites (proxy, leads, api/contact, api/simulateur) and `tsc --noEmit` are green.

## Self-Check: PASSED
