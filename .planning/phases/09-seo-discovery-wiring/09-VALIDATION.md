---
phase: 9
slug: seo-discovery-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 9-xx | TBD | TBD | SEO-01 | — | sitemap lists all 9 service slugs + /simulateur, no duplicates | unit | `npx vitest run src/app/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 9-xx | TBD | TBD | SEO-01 | — | llms.txt links all 9 services + /simulateur, no "tarif" | unit (fs read) | `npx vitest run src/app/llms.test.ts` | ❌ W0 | ⬜ pending |
| 9-xx | TBD | TBD | SEO-02 | T-9 JSON-LD injection | catalog built from static copy, serialized via buildJsonLdScript; no price keys | unit | `npx vitest run src/lib/serviceSchema.test.ts src/app/layout.test.ts` | ❌ W0 | ⬜ pending |
| 9-xx | TBD | TBD | SEO-02 | — | `[slug]/layout.tsx` stays Service-free (D-01) | source read | `npx vitest run src/lib/serviceJsonLd.test.ts` | ✅ extend | ⬜ pending |
| 9-xx | TBD | TBD | SEO-03 | — | every internal href/anchor resolves to a route and element id | static | `npx vitest run src/app/linkAudit.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/sitemap.test.ts` — SEO-01
- [ ] `src/app/llms.test.ts` — SEO-01
- [ ] `src/lib/serviceSchema.ts` + `src/lib/serviceSchema.test.ts` — SEO-02
- [ ] `src/app/linkAudit.test.ts` — SEO-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sitemap submitted to Search Console | D-10 | Interactive gcloud re-auth, production deploy required | After deploy: confirm `https://sevalys.com/sitemap.xml` is live, re-auth ADC with write scope, call `submit_sitemap`, then `list_sitemaps` to confirm |
| `hasOfferCatalog` parses in the wild | SEO-02 | Needs the deployed homepage | Run validator.schema.org / Rich Results test on production homepage |
| SEO doc annotated | D-07/D-08 | Prose edit | Read `docs/strategie-seo-geo-llm-2026-09.md` lines 26, 35, 52, 69, 93, 121 for superseded notes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
