---
phase: 12
slug: conversion-projects-step-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-03
---

# Phase 12 — Validation Strategy

> Source of truth: `12-RESEARCH.md` § Validation Architecture.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 (env node) |
| **Config file** | `vitest.config.ts` (unit), `vitest.rls.config.ts` (RLS, Supabase branch, `fileParallelism: false`) |
| **Quick run command** | `npx vitest run src/lib/projects src/lib/server/mail src/lib/server/projects src/app/admin src/app/api/cron` |
| **Full suite command** | `npm test` then `npm run test:rls` |
| **Estimated runtime** | ~30 s quick, longer for RLS |

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** full suite (`npm test` + `npm run test:rls`)
- **Before `/gsd:verify-work`:** full suite green
- **Max feedback latency:** ~60 s

## Per-Requirement Verification Map

| Req | Behavior | Test Type | Automated Command | Status |
|-----|----------|-----------|-------------------|--------|
| PORTAL-01 | Atomic conversion, double conversion refused, new/lost refused, admin/member email refused | RLS + unit | `npx vitest run -c vitest.rls.config.ts tests/rls/convert.rls.test.ts` ; `npx vitest run src/lib/server/projects/convert.test.ts` | ⬜ pending |
| PORTAL-02 | Onboarding completeness, write scoped to session client | unit + RLS | `npx vitest run src/lib/projects/onboardingSchema.test.ts` ; `tests/rls/projects.rls.test.ts` | ⬜ pending |
| PORTAL-03 | Current step and "who waits" computed | unit | `npx vitest run src/lib/projects/steps.test.ts` | ⬜ pending |
| PORTAL-04 | Append-only facts, early fact no skip, revocation, idempotence | RLS | `tests/rls/facts.rls.test.ts` | ⬜ pending |
| PORTAL-05 | Private bucket, size/type validation, short signed URL | RLS + unit | `tests/rls/files.rls.test.ts` ; `src/lib/server/projects/files.test.ts` | ⬜ pending |
| PORTAL-06 | Append-only consent, latest state, stale version refused | RLS + unit | `tests/rls/consents.rls.test.ts` | ⬜ pending |
| MAIL-01 | Every event has a rule, templates without price | unit | `npx vitest run src/lib/server/mail/rules.test.ts` | ⬜ pending |
| MAIL-02 | Double enqueue = one row, cron resume, cron secret | unit + RLS | `src/lib/server/mail/outbox.test.ts` ; `src/app/api/cron/mail/route.test.ts` ; `tests/rls/mailoutbox.rls.test.ts` | ⬜ pending |
| ADM-01 | Sort/filter, dormant at 14 days, admin-only read | unit + RLS | `src/lib/projects/blocking.test.ts` ; `tests/rls/projects.rls.test.ts` | ⬜ pending |

## Wave 0 Requirements

- [ ] Migration `20261004000000_sv_projects_engine.sql` applied on the Supabase branch before RLS tests
- [ ] Test files above, helpers `makeProject`/`postFact` in `tests/rls/helpers.ts`, tolerant `cleanup()`
- [ ] `vercel.json` + `CRON_SECRET` (preview and production)
- [ ] No-price / server-only guard extended to new modules

## Manual-Only Verifications

| Behavior | Requirement | Test Instructions |
|----------|-------------|-------------------|
| Real conversion of a test lead, file upload, mail received, cron in preview | PORTAL-01/05, MAIL-02 | Use the permanent test client; owner types login codes |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Wave 0 covers all missing references
- [ ] `nyquist_compliant: true` set once plans pass

**Approval:** pending
