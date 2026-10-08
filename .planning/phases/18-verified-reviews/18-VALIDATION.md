---
phase: 18
slug: verified-reviews
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-08
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 18-RESEARCH.md § Validation Architecture, mapped to the 17 plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 |
| **Config file** | `vitest.config.ts` (unit, collects `src/**/*.test.ts` only — new render tests are `.test.ts` with createElement), `vitest.rls.config.ts` (RLS, real branch, `fileParallelism: false`) |
| **Quick run command** | `rtk vitest run src/lib/reviews src/lib/server/reminders src/lib/server/mail src/app/avis` |
| **Full suite command** | `rtk npm test` ; RLS: `rtk npm run test:rls` |
| **Estimated runtime** | ~60 seconds (unit) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (each listed below)
- **After every plan wave:** full unit suite `rtk npm test`
- **Before `/gsd:verify-work`:** unit green + RLS suite green on sv-rls-p18 (18-14) + `rtk tsc --noEmit`, `rtk lint`, `rtk next build` (18-15 Task 1)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Plan / Task | Requirement | Behavior | Test Type | Automated Command | Wave 0 file created by |
|-------------|-------------|----------|-----------|-------------------|------------------------|
| 18-01 T1 | REV-01, REV-03 | tables, RLS, append-only triggers, outbox lists | static | `rtk vitest run src/lib/migrationLint.test.ts` | existing |
| 18-01 T2 | REV-01, REV-03 | 6 public RPCs service_role-only, private helper/trigger fn not granted, single-use lock, 60-day expiry, pagination | static | `rtk vitest run src/lib/reviewsMigration.test.ts src/lib/migrationLint.test.ts` | 18-01 T2 (`src/lib/reviewsMigration.test.ts`) |
| 18-02 T1 | REV-01 | token derive/hash round trip, length/charset bound, fail-closed secret | unit (TDD) | `rtk vitest run src/lib/reviews/token.test.ts` | 18-02 T1 |
| 18-02 T2 | REV-01 | schema: rating, body, title, bounded first name/initial, markup/link rejection, consent, no opinion filter | unit (TDD) | `rtk vitest run src/lib/reviews/schema.test.ts` | 18-02 T2 |
| 18-03 T1 | REV-04 | JSON-LD: no price keys, no AggregateRating family, hidden excluded, itemReviewed @id, `<` escaped | unit (TDD) | `rtk vitest run src/lib/reviews/reviewJsonLd.test.ts` | 18-03 T1 |
| 18-03 T2 | REV-02 | Google URL https-only guard | unit (TDD) | `rtk vitest run src/lib/reviews/googleUrl.test.ts` | 18-03 T2 |
| 18-04 T1 | REV-01 | `/avis` public indexable, `/avis/<token>` private, robots + noindex header, no recordVisit | unit | `rtk vitest run src/lib/privateRoutes.test.ts src/proxy.test.ts src/app/sitemap.test.ts` | extend existing |
| 18-04 T2 | REV-01 | price zones 15 entries, public review paths outside zones, throttle kinds | unit | `rtk vitest run src/lib/priceScope.test.ts` | extend existing |
| 18-05 T1-T3 | REV-01, REV-03 | branch provisioned, migration pushed, privileges, helpers; earlier suites green | RLS | `rtk npm run test:rls` | 18-05 T3 (helpers) |
| 18-06 T1 | REV-01, REV-03 | new events/dedupe keys vs migration lists, admin alert + hidden notice contents, no Google link in request | unit | `rtk vitest run src/lib/server/mail/rules.test.ts src/lib/server/mail/reminderEmails.test.ts` | extend existing |
| 18-06 T2 | REV-01 | URL rendered from linkId (J+7 = J+21), no reviewUrl payload, missing secret fails | unit | `rtk vitest run src/lib/server/mail` | extend existing |
| 18-07 T1 | REV-01, REV-02 | ensureReviewLink RPC args/outcomes, reviewConfigReady | unit (TDD) | `rtk vitest run src/lib/server/reviews/links.test.ts src/lib/server/mail/flags.test.ts` | 18-07 T1 |
| 18-07 T2 | REV-01 | sweep: link at J+7, same linkId at J+21, none after 60 d, none if reviewed/held/flag off/config invalid | unit (TDD) | `rtk vitest run src/lib/server/reminders` | extend existing |
| 18-08 T1 | REV-04 | single published source (paginated), link state generic invalid | unit (TDD) | `rtk vitest run src/lib/reviews/publicReviews.test.ts src/lib/reviews/linkState.test.ts` | 18-08 T1 |
| 18-08 T2 | REV-01 | submit: single 410 for all invalid links, 400 codes, 429, no rating branch; recent feed max 3 | unit (TDD) | `rtk vitest run src/app/api/avis src/lib/priceScope.test.ts` | 18-08 T2 |
| 18-09 T1 | REV-02 | Google link byte-identical for ratings 1..5, omitted when URL invalid, no incentive wording | unit (TDD) | `rtk vitest run src/app/avis` | 18-09 T1 (`ReviewThankYou.test.ts`) |
| 18-09 T2 | REV-01, REV-03 | token page read-only, generic invalid card, noindex/no-referrer, policy link on form | unit | `rtk vitest run src/app/avis src/lib/priceScope.test.ts` | 18-09 T2 (`page.test.ts`) |
| 18-10 T1 | REV-04, REV-03 | /avis paginated complete list, one JSON-LD per displayed review, no aggregate/price, policy links | unit (TDD) | `rtk vitest run src/app/avis/page.test.ts src/lib/priceScope.test.ts` | 18-10 T1 |
| 18-10 T2 | REV-03 | home excerpt order, null when empty, policy link, no JSON-LD | unit (TDD) | `rtk vitest run src/components/sections/AvisExcerpt.test.ts src/app/page.test.ts src/lib/priceScope.test.ts` | 18-10 T2 |
| 18-11 T1 | REV-03 | policy page 11 sections in order, four reasons, no prohibited words | unit | `rtk vitest run src/app/politique-des-avis src/lib/priceScope.test.ts` | 18-11 T1 |
| 18-11 T2 | REV-03 | footer link, sitemap (+2 URLs), llms.txt lines, no token path | unit | `rtk vitest run src/app/sitemap.test.ts src/app/llms.test.ts src/lib/translations.test.ts src/lib/priceScope.test.ts` | extend existing |
| 18-12 T1 | REV-03 | hide only with 4 legal reasons + detail, unhide, notice sent, admin-only | unit (TDD) | `rtk vitest run src/app/admin/avis/avis.actions.test.ts` | 18-12 T1 |
| 18-12 T2 | REV-03 | dialog and unhide form compile | type check | `rtk tsc --noEmit -p tsconfig.json` | n/a |
| 18-12 T3 | REV-03 | status derivation and history loader, page and nav | unit | `rtk vitest run src/lib/server/reviews/admin.test.ts src/app/admin src/lib/priceScope.test.ts` | 18-12 T3 |
| 18-13 T1 | REV-01 | reissue: hash matches derived token, URL returned once, never logged; link status | unit (TDD) | `rtk vitest run src/app/admin/avis/reissue.actions.test.ts src/lib/server/reviews/linksAdmin.test.ts` | 18-13 T1 |
| 18-13 T2 | REV-01 | reissue card on both pages compiles | type check | `rtk tsc --noEmit -p tsconfig.json` | n/a |
| 18-14 T1 | REV-01 | single use under concurrency, expiry (trigger-disabled backdating), reissue invalidation, isolation | RLS | `rtk npx vitest run -c vitest.rls.config.ts tests/rls/reviews.rls.test.ts` | 18-14 T1 |
| 18-14 T2 | REV-03, REV-04 | moderation closed reasons, append-only incl. service_role, hidden excluded from public RPC, pagination clamp | RLS | `rtk npx vitest run -c vitest.rls.config.ts tests/rls/reviews.rls.test.ts` | 18-14 T2 |
| 18-15 T1 | all | release gate: full unit, tsc, lint, build | gate | `rtk npm test` (+ tsc, lint, build) | n/a |
| 18-15 T3 | all | production schema privileges | read-only SQL | `rtk supabase migration list --linked` | n/a |
| 18-16 T2 | REV-03 | owner-confirmed policy wording | unit | `rtk vitest run src/app/politique-des-avis` | n/a |
| 18-17 T2 | REV-02 | REVIEW_GOOGLE_URL configured | env listing | `rtk vercel env ls` | n/a |

Checkpoint tasks (18-05 T2, 18-15 T2, 18-16 T1/T3, 18-17 T1/T3) record verbatim owner answers; each is adjacent to an automated task, so no 3 consecutive tasks lack automated verification.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files are created test-first inside the plans that need them (no separate Wave 0 plan):

- [x] `src/lib/reviews/{token,schema}.test.ts` — 18-02 (wave 1)
- [x] `src/lib/reviews/{reviewJsonLd,googleUrl}.test.ts` — 18-03 (wave 1)
- [x] `src/lib/reviewsMigration.test.ts` — 18-01 (wave 1)
- [x] Pinned tests updated in the same task as the code: priceScope, privateRoutes, proxy, sitemap (18-04), rules/outbox (18-06), sweep (18-07), sitemap count/llms (18-11)
- [x] `tests/rls/reviews.rls.test.ts` + helpers `makeDeliveredProject` etc. — 18-05 (helpers), 18-14 (suite)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production surfaces respond correctly | REV-01, REV-03 | Needs deployed preview/production | 18-16 T3: curl checks of /avis, /politique-des-avis, /avis/<random>, robots, sitemap, /admin/avis, POST /api/avis |
| Google Business profile link opens the right profile | REV-02 | Profile must be created by the owner | 18-17 T1/T2: owner provides the link; executor checks https guard and HTTP 200 |
| First real review mails | REV-01 | Needs `REVIEW_REQUESTS_ENABLED` flip on production | 18-17 T3: cron counters, linkId payloads, no review_config_invalid. No test review is submitted on production (it would be a non-authentic public review that cannot be deleted) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-08 (planner revision after plan-check)
