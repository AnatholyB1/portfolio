---
phase: 17
slug: admin-forecast-dashboard
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-07
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `17-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit `vitest.config.ts`, RLS `vitest.rls.config.ts`) |
| **Config file** | `vitest.config.ts`, `vitest.rls.config.ts` (existing) |
| **Quick run command** | `rtk vitest run src/lib/server/pilotage` |
| **Full suite command** | `rtk npm test` (then `rtk npm run test:rls` on the dedicated branch) |
| **Estimated runtime** | ~60 seconds (unit), longer for RLS |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/lib/server/pilotage`
- **After every plan wave:** Run `rtk npm test`
- **Before `/gsd:verify-work`:** `rtk npm test` green + `rtk npm run test:rls` green on branch + `rtk npm run build`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| ADM-02 | Migration: 3 tables with RLS, revoke, `deny_mutation`, RPC revoke/grant | unit (static lint) | `rtk vitest run src/lib/migrationLint.test.ts src/lib/pilotageMigration.test.ts` | ❌ W0 |
| ADM-02 | RPC rejects amount <= 0, unknown project, double void; UPDATE/DELETE denied even for `service_role`; non-admin reads nothing | RLS integration | `rtk npm run test:rls -- tests/rls/pilotage.rls.test.ts` | ❌ W0 |
| ADM-02 | Server action: admin guard, zod validation, cents | unit | `rtk vitest run src/app/admin/pilotage/couts/actions.test.ts` | ❌ W0 |
| ADM-03 | Active quote, signed at date (amendment), pipeline, test series excluded | unit | `rtk vitest run src/lib/server/pilotage/quotes.test.ts` | ❌ W0 |
| ADM-03 | Invoiced = net - credit notes (deposit not doubled); collected = paid - cumulative refunds | unit | `rtk vitest run src/lib/server/pilotage/billing.test.ts` | ❌ W0 |
| ADM-03 | Dashboard total equals raw SQL sums over invoices/payments (D-04); total = sum of drill-down items | RLS + unit | `rtk npm run test:rls -- tests/rls/pilotage.rls.test.ts` | ❌ W0 |
| ADM-04 | Monthly/annual unfolding, versions, stop; 6-month cash, overdue, missing balance; margins | unit | `rtk vitest run src/lib/server/pilotage/forecast.test.ts src/lib/server/pilotage/costs.test.ts` | ❌ W0 |
| ADM-05 | Split by source/campaign; "Direct / hors lead"; sum of rows = signed total; source correction reflected | unit + RLS | `rtk vitest run src/lib/server/pilotage/attribution.test.ts` | ❌ W0 |
| UI | Page: admin guard, noindex, columns match loader | unit | `rtk vitest run src/lib/server/pilotage/load.test.ts` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/pilotageMigration.test.ts` — static lint for the new migration (pattern `paymentsMigration.test.ts`)
- [x] `src/lib/server/pilotage/*.test.ts` — stubs for quotes, billing, forecast, costs, attribution, load
- [x] `tests/rls/pilotage.rls.test.ts` — RLS and reconciliation suite on the dedicated branch

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard figures match real invoices on the permanent test client | ADM-03 | Needs production-like data and visual check | Toggle "inclure les tests", compare tiles with the test client's invoices and payments |
| Cash curve readability and accessibility | ADM-04 | Visual | Open `/admin/pilotage` at desktop and mobile widths |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-07 (17-12, release gate green)
