---
phase: 9
slug: seo-discovery-wiring
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-01
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (env node, include `src/**/*.test.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app src/lib src/data` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app src/lib src/data`
- **After every plan wave:** Run `npx vitest run` and `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | SEO-01 | — | sitemap lists 9 service slugs + /simulateur, no duplicates | unit | `npx vitest run src/app/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | SEO-01 | — | llms.txt links 9 services + /simulateur, no "tarif" | unit (fs read) | `npx vitest run src/app/llms.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | SEO-02 | T-9 JSON-LD injection | pure builder, no price keys, D-01 guard | unit | `npx vitest run src/lib/serviceSchema.test.ts src/lib/serviceJsonLd.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 1 | SEO-02 | T-9 JSON-LD injection | layout serialized via buildJsonLdScript, hasOfferCatalog wired, no priceRange | source read | `npx vitest run src/app/layout.test.ts` | ✅ extend | ⬜ pending |
| 9-03-01 | 03 | 2 | SEO-03 | — | every internal href/anchor resolves to a route and id | static | `npx vitest run src/app/linkAudit.test.ts` | ❌ W0 | ⬜ pending |
| 9-03-02 | 03 | 2 | SEO-02 | — | SEO doc stale price passages annotated, originals preserved | grep | greps in 09-03-PLAN.md Task 2 acceptance criteria | ✅ | ⬜ pending |
| 9-04-01 | 04 | 3 | SEO-01 | — | full suite, typecheck and build green pre-deploy | suite | `npx vitest run && npx tsc --noEmit` | ✅ | ⬜ pending |
| 9-04-02 | 04 | 3 | SEO-01 | gcloud write scope | human deploy + transient write-scope re-auth | manual-only | see Manual-Only table | n/a | ⬜ pending |
| 9-04-03 | 04 | 3 | SEO-01 | gcloud write scope | submit_sitemap then list_sitemaps confirms | manual-only | proxy: `curl -s https://sevalys.com/sitemap.xml \| grep -c "<loc>"` returns 15 | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/app/sitemap.test.ts` — SEO-01
- [x] `src/app/llms.test.ts` — SEO-01
- [x] `src/lib/serviceSchema.ts` + `src/lib/serviceSchema.test.ts` — SEO-02
- [x] `src/app/linkAudit.test.ts` — SEO-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sitemap submitted to Search Console | D-10 | Interactive gcloud re-auth, production deploy required | After deploy: confirm `https://sevalys.com/sitemap.xml` is live, re-auth ADC with write scope, call `submit_sitemap`, then `list_sitemaps` to confirm |
| `hasOfferCatalog` parses in the wild | SEO-02 | Needs the deployed homepage | Run validator.schema.org / Rich Results test on production homepage |
| SEO doc annotated | D-07/D-08 | Prose edit | Read `docs/strategie-seo-geo-llm-2026-09.md` lines 26, 35, 52, 69, 93, 121 for superseded notes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-01
