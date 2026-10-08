---
phase: 19
slug: ads-preparation
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-08
---

# Phase 19 — Validation Strategy

> Source: 19-RESEARCH.md § Validation Architecture. Rows mapped to plan/task IDs by the planner (2026-10-08).

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 |
| **Config file** | `vitest.config.ts` (unit, `src/**/*.test.ts`), `vitest.rls.config.ts` (branch RLS only, never production) |
| **Quick run command** | `rtk vitest run src/lib/attribution src/lib/ads src/lib/leads src/lib/adsMigration.test.ts` |
| **Full suite command** | `npm test` ; RLS: `npm run test:rls` (branch only, main working tree with gitignored `.env.test.local`) |
| **Estimated runtime** | ~60 seconds (unit) |

## Sampling Rate

- **After every task commit:** quick run command (or the task's `<automated>` command)
- **After every plan wave:** `npm test` + `tsc --noEmit` + lint
- **Before `/gsd:verify-work`:** unit green + RLS suite green on the branch (19-07)
- **Max feedback latency:** 90 seconds

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | Wave 0 file | Plan / Task |
|-------------|----------|-----------|-------------------|-------------|-------------|
| ADS-01 | alias→canonical idempotent, conformity reasons, generator output always conformant, doc drift | unit | `vitest run src/lib/attribution/utm.test.ts` | utm.test.ts (created test-first) | 19-01 T1, T2 |
| ADS-01 | params/cookie/touch round-trip with raw field, eid and size guard | unit | `vitest run src/lib/attribution` | extend params/touch/cookie tests | 19-04 T1, T2 |
| ADS-01 | proxy sets canonical cookies, visit uses canonical source, pre-lead eid | unit | `vitest run src/proxy.test.ts` | extend | 19-05 T1 |
| ADS-01 | `p_source` carries non-conformity and raw values, lead never dropped | unit + RLS | `vitest run src/lib/leads src/app/api/contact src/app/api/simulateur` ; `vitest run -c vitest.rls.config.ts tests/rls/ads.rls.test.ts` | extend ; ads.rls.test.ts | 19-05 T2 ; 19-07 T1 |
| ADS-01 | SQL flag columns, frozen source, correction clears flag, admin view columns | static + RLS | `vitest run src/lib/adsMigration.test.ts src/lib/migrationLint.test.ts` ; RLS suite | adsMigration.test.ts | 19-03 T1 ; 19-07 T1 |
| ADS-01 | link generator admin-only, noindex, French, AdminNav entry, no free destination | unit (source guards) | `vitest run src/components/admin/links src/app/admin` | linksUi.test.ts | 19-08 T1, T2 |
| ADS-01 | "Hors convention" in funnel and leads list | unit | `vitest run src/lib/admin src/components/admin/leads src/app/admin` | extend funnel.test.ts, leadsUi.test.ts | 19-09 T1, T2 |
| ADS-01 | lead detail notice, "Reçu :" raw line | unit (source guards) | `vitest run src/components/admin/leads src/app/admin/leads` | extend leadDetail.test.ts | 19-10 T2 |
| ADS-02 | closed taxonomy, ranks, golden-vector event_id, random pre-lead id | unit | `vitest run src/lib/ads/events.test.ts` | events.test.ts (created test-first) | 19-02 T2 |
| ADS-02 | TS event/rank list equals SQL CHECK, namespace parity, no PII columns, DDL lint | static | `vitest run src/lib/adsMigration.test.ts src/lib/migrationLint.test.ts` | adsMigration.test.ts | 19-03 T2 |
| ADS-02 | uuid_generate_v5 available on the branch (or pgcrypto fallback), golden vector in SQL | branch probe | `supabase db query --db-url $SV_TEST_DB_URL` (recorded) ; `npm run test:rls` | — | 19-06 T3 |
| ADS-02 | golden vector TS == DB event_id, replay idempotent, jump emits all ranks, backward emits nothing, lost does not cancel, value at signed from head quote, null without quote, ranks == stage timestamps | RLS | `vitest run -c vitest.rls.config.ts tests/rls/ads.rls.test.ts` | ads.rls.test.ts | 19-07 T1, T2 |
| ADS-02 | anon/non-admin cannot read or write the journal, service_role cannot insert, update/delete/truncate denied | RLS | same | ads.rls.test.ts | 19-07 T2 |
| ADS-02 | conversions card ladder (4 ranks, tracking, "Valeur manquante") via server-only loader | unit | `vitest run src/lib/server/ads` | conversions.test.ts (created test-first) | 19-10 T1 |
| ADS-01/02 | production privileges, trigger enabled, golden vector in production, Gecko unchanged | read-only SQL | `supabase migration list --linked` + recorded queries | — | 19-11 T1, T3 |

## Wave 0 Requirements

- [x] `src/lib/attribution/utm.test.ts` (19-01), `src/lib/ads/events.test.ts` (19-02), `src/lib/adsMigration.test.ts` (19-03), `tests/rls/ads.rls.test.ts` (19-07): each created test-first in the task that introduces the code under test
- [x] Branch probe for `extensions.uuid_generate_v5` with pgcrypto fallback and owner stop if neither extension exists (19-06 T3); production probe in preflight (19-11 T1)
- [x] Pinned tests updated in the same task as the breaking code: params/cookie/touch (19-04), proxy (19-05 T1), ingest/requestAttribution (19-05 T2), funnel/leadsUi (19-09), leadDetail (19-10), AdminNav guard via linksUi (19-08); mail-list pins untouched (19-03 forbids sv_mail_outbox)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Plan / Task |
|----------|-------------|------------|-------------------|-------------|
| Generated link opens the site and the lead records canonical source | ADS-01 | Needs a real browser landing then a test submission on the permanent test client | Owner opens a generated link (alias edited to Facebook) and submits the simulator with the permanent test identity; lead detail shows meta + "Reçu : Facebook" and the Conversions card | 19-12 T2 |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] No 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] `nyquist_compliant: true` set after the planner maps rows to tasks

**Approval:** planner mapping complete 2026-10-08
