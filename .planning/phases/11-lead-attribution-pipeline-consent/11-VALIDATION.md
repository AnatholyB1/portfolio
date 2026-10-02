---
phase: 11
slug: lead-attribution-pipeline-consent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-02
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source of truth for the per-requirement map: `11-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 (node env) |
| **Config file** | `vitest.config.ts` (unit, `src/**/*.test.ts`); `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, real Supabase test branch) |
| **Quick run command** | `npx vitest run src/lib/attribution src/lib/consent src/lib/server/leads src/proxy.test.ts src/app/api` |
| **Full suite command** | `npm test` and `npm run test:rls` (branch) |
| **Estimated runtime** | ~30 s quick, longer for RLS suite |

No DOM test library: UI contracts (equal buttons, dialog attributes, no `cookies()` in root layout) are enforced by source-guard tests (pattern: `layout.test.ts`, `privateShells.test.ts`).

---

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** `npm test` + `npm run test:rls` on the branch + `npm run lint`
- **Before `/gsd:verify-work`:** full suites green, `rls:canary` (weaken a policy → suite red → restore)
- **Max feedback latency:** 30 seconds (unit)

---

## Per-Task Verification Map

Task IDs are assigned by the planner; each task's `<acceptance_criteria>` must cite one command from this table.

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| LEAD-01 | Param whitelist (8 keys, ≤200, lowercase), click ids dropped without consent | unit | `npx vitest run src/lib/attribution/params.test.ts` | ❌ W0 |
| LEAD-01 | Arrival rules; first-touch write-once, last-touch overwritten | unit | `npx vitest run src/proxy.test.ts` | rewrite |
| LEAD-01 | Click ids absent from cookies without consent | unit | `npx vitest run src/lib/attribution/cookie.test.ts` | ❌ W0 |
| LEAD-02/03/04/06/07/08 | Source immutability + correction reason, journal immutability, erase keeps counts, 9-month dedupe + concurrency, backfill/purge, status RPC, funnel view | RLS/DB | `npx vitest run -c vitest.rls.config.ts tests/rls/leads.rls.test.ts` | ❌ W0 |
| LEAD-05 | Simulator route order parse → spam → zod → ingest → email | unit | `npx vitest run src/app/api/simulateur/route.test.ts` | rewrite |
| LEAD-05 | Contact route guards + best-effort ingest | unit | `npx vitest run src/app/api/contact` | ❌ W0 |
| LEAD-06/08 | Migration lint, `security_invoker` view, purge job name | static | `npx vitest run src/lib/migrationLint.test.ts` | exists, extend |
| LEAD-07 | Admin actions call `requireAdmin` first | unit | `npx vitest run src/app/admin/leads/actions.test.ts` | ❌ W0 |
| LEAD-09 | PostHog config by consent state | unit | `npx vitest run src/lib/consent/posthogConfig.test.ts` | ❌ W0 |
| LEAD-09 | Consent route + log table | unit + RLS | `src/app/api/consent/route.test.ts`, `tests/rls/consent.rls.test.ts` | ❌ W0 |
| LEAD-09 | Equal buttons, dialog a11y attrs, no ad tag, no `cookies()` in root layout | source guard | `npx vitest run src/components/consent/consentContract.test.ts` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] Supabase test branch + `.env.test.local` (absent today)
- [ ] Stubs: `src/lib/attribution/params.test.ts`, `cookie.test.ts`, `src/lib/consent/posthogConfig.test.ts`, `src/components/consent/consentContract.test.ts`, `src/app/api/consent/route.test.ts`, `src/app/api/contact/*.test.ts`, `src/app/admin/leads/actions.test.ts`
- [ ] `tests/rls/leads.rls.test.ts`, `tests/rls/consent.rls.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard-only pass through consent modal, focus trap, focus return | LEAD-09 | No DOM test lib | Tab/Shift-Tab/Enter in browser at 1440px and 390px, FR/EN/TH |
| LCP/CLS on `/` unchanged | LEAD-09 | Needs real browser | Lighthouse before/after |
| No `ph_*` cookie/localStorage before Accept | LEAD-09 | Real browser storage | DevTools Application tab on a fresh profile |
| `Set-Cookie` on a UTM landing | LEAD-01 | Real response headers | `curl -I` / DevTools with `?utm_source=test` |
| Admin leads list, funnel, lead detail on the permanent test fixtures | LEAD-07/08 | Visual + auth | Logged in as `contact@sevalys.com` on production, phone width included |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
