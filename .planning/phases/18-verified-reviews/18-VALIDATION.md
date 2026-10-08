---
phase: 18
slug: verified-reviews
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-08
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 18-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 |
| **Config file** | `vitest.config.ts` (unit), `vitest.rls.config.ts` (RLS, real branch, `fileParallelism: false`) |
| **Quick run command** | `npx vitest run src/lib/reviews src/lib/server/reminders src/lib/server/mail src/app/avis` |
| **Full suite command** | `npx vitest run` ; RLS: `npx vitest run -c vitest.rls.config.ts` |
| **Estimated runtime** | ~60 seconds (unit) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full unit suite
- **Before `/gsd:verify-work`:** Unit green + RLS suite green on branch + `tsc`/lint
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| REV-01 | token derive/hash round trip, length bound, generic invalid | unit | `npx vitest run src/lib/reviews/token.test.ts` | ❌ W0 |
| REV-01 | sweep: link at J+7, J+21 same linkId, none after 60 d, none if review/hold/flag off | unit | `npx vitest run src/lib/server/reminders/sweep.test.ts` | extend |
| REV-01 | outbox renders URL from linkId, no `reviewUrl` in payload | unit | `npx vitest run src/lib/server/mail/outbox.test.ts` | extend |
| REV-01 | single use under concurrency, expiry boundary, invalidated link, RLS deny | RLS | `npx vitest run -c vitest.rls.config.ts tests/rls/reviews.rls.test.ts` | ❌ W0 |
| REV-02 | Google link identical for ratings 1..5, no incentive wording, https-only URL | unit | `npx vitest run src/app/avis` | ❌ W0 |
| REV-03 | moderation log append-only, closed reason enum, detail required, admin-only | RLS | `npx vitest run -c vitest.rls.config.ts tests/rls/reviews.rls.test.ts` | ❌ W0 |
| REV-03 | policy page sections; linked from /avis, excerpt, form, footer; sitemap and llms.txt | unit | `npx vitest run src/app/politique-des-avis src/app/sitemap.test.ts src/app/llms.test.ts` | ❌ W0 / extend |
| REV-04 | JSON-LD: no price keys, no AggregateRating, only published non-hidden, `<` escaped | unit | `npx vitest run src/lib/reviews/reviewJsonLd.test.ts` | ❌ W0 |
| Routing | `/avis` public indexable, `/avis/<token>` private noindex | unit | `npx vitest run src/lib/privateRoutes.test.ts src/proxy.test.ts` | extend |
| Scope | priceScope zones updated, public pages import no zone code | unit | `npx vitest run src/lib/priceScope.test.ts` | extend |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/reviews/{token,reviewJsonLd,schema,googleUrl}.test.ts`
- [ ] `tests/rls/reviews.rls.test.ts` + helper `makeDeliveredProject` (reach `acceptance_signed`)
- [ ] Update pinned tests (priceScope zones, privateRoutes, proxy, sitemap, llms)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real review mail received and link works | REV-01 | Needs prod mailbox and `REVIEW_REQUESTS_ENABLED` flip | Owner reviews on the permanent test client, then flips the flag |
| Google Business profile link opens the right profile | REV-02 | Profile must be created by the owner | Click the thank-you button, confirm destination |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
