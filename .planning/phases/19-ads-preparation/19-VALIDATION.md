---
phase: 19
slug: ads-preparation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-08
---

# Phase 19 — Validation Strategy

> Source: 19-RESEARCH.md § Validation Architecture. The planner maps each row to plan/task IDs.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 |
| **Config file** | `vitest.config.ts` (unit, `src/**/*.test.ts`), `vitest.rls.config.ts` (branch RLS only, never production) |
| **Quick run command** | `rtk vitest run src/lib/attribution src/lib/ads src/lib/leads src/lib/adsMigration.test.ts` |
| **Full suite command** | `npm test` ; RLS: `npm run test:rls` (branch only) |
| **Estimated runtime** | ~60 seconds (unit) |

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** `npm test` + `tsc --noEmit` + lint
- **Before `/gsd:verify-work`:** unit green + RLS suite green on the branch
- **Max feedback latency:** 90 seconds

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | Wave 0 file |
|-------------|----------|-----------|-------------------|-------------|
| ADS-01 | alias→canonical idempotent, conformity reasons, generator output always conformant | unit | `vitest run src/lib/attribution/utm.test.ts` | utm.test.ts |
| ADS-01 | params/cookie/touch round-trip with raw field and size guard | unit | `vitest run src/lib/attribution` | extend |
| ADS-01 | proxy sets canonical cookies, visit uses canonical source | unit | `vitest run src/proxy.test.ts` | extend |
| ADS-01 | `p_source` carries non-conformity and raw values, lead never dropped | unit + RLS | `vitest run src/lib/leads` ; RLS suite | extend |
| ADS-01 | link generator admin-only, noindex, French, AdminNav entry | unit | `vitest run src/app/admin src/components/admin` | new |
| ADS-02 | TS event/rank list equals SQL CHECK, no PII columns, DDL lint | static | `vitest run src/lib/adsMigration.test.ts src/lib/migrationLint.test.ts` | adsMigration.test.ts |
| ADS-02 | golden vector TS == DB event_id, replay idempotent, jump emits all ranks, lost does not cancel, value at signed from head quote | RLS | `vitest run -c vitest.rls.config.ts tests/rls/ads.rls.test.ts` | ads.rls.test.ts |
| ADS-02 | anon/non-admin cannot read or write the journal, update/delete/truncate denied | RLS | same | ads.rls.test.ts |

## Wave 0 Requirements

- [ ] `src/lib/attribution/utm.test.ts`, `src/lib/ads/events.test.ts`, `src/lib/adsMigration.test.ts`, `tests/rls/ads.rls.test.ts`
- [ ] Branch probe for `extensions.uuid_generate_v5` with fallback
- [ ] Update pinned tests listed in 19-RESEARCH.md

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generated link opens the site and the lead records canonical source | ADS-01 | Needs a real browser landing then a test submission on the permanent test client | Owner opens a generated link and submits the simulator on the test client |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] No 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] `nyquist_compliant: true` set after the planner maps rows to tasks

**Approval:** pending
