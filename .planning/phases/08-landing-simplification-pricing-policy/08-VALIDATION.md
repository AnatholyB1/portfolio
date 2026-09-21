---
phase: 8
slug: landing-simplification-pricing-policy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, `include: ['src/**/*.test.ts']` (note: `.test.tsx` is not included — no component-render testing in this repo; all existing tests are logic/string/JSON assertions) |
| **Quick run command** | `rtk npx vitest run src/lib/translations.test.ts src/data/services.test.ts` |
| **Full suite command** | `rtk npm run test` (→ `vitest run`) |
| **Estimated runtime** | ~5-10 seconds (node environment, no browser/jsdom startup) |

---

## Sampling Rate

- **After every task commit:** Run `rtk npx vitest run <touched test file>`
- **After every plan wave:** Run `rtk npm run test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green, plus manual grep sweep: `rtk grep -rn "€\|prix\|tarif" src/app src/components src/lib/translations.ts` (excluding `demo/`, `api/crm/`)
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | PRIX-01 | — | No price/tariff string in `t.landing.*` (any locale) | unit (regex) | `rtk npx vitest run src/lib/translations.test.ts -t "landing"` | ❌ W0 — extend existing describe block | ⬜ pending |
| 08-01-02 | 01 | 0 | PRIX-01 | — | No `priceRange` field in global JSON-LD | unit (source-string) | `rtk npx vitest run src/app/layout.test.ts` | ❌ W0 — new file, mirrors `services.test.ts` pattern | ⬜ pending |
| 08-01-03 | 01 | 0 | PRIX-02 | — | No price token in `/calculateur-roi` page source | unit (source-string) | `rtk npx vitest run src/app/calculateur-roi/page.test.ts` | ❌ W0 — new file | ⬜ pending |
| 08-01-04 | 01 | 1 | LANDING-01 | — | Section order in `page.tsx` matches problèmes→services→fonctionnement→enjeux→preuve→CTA | manual | manual review during `/gsd:verify-work` | — | ⬜ pending |
| 08-01-05 | 01 | 1 | LANDING-02 | — | Every landing CTA `href` resolves to `/simulateur`, `#contact`, `tel:`, or `mailto:` | unit (source-string) | `rtk npx vitest run src/app/page.test.ts` | ❌ W0 — new file, exact assertion list depends on CTA-destination decisions | ⬜ pending |
| 08-01-06 | 01 | 1 | LANDING-03 | — | Feuillette/Gecko Cabane/Les Folies Temps Danse render in `Realisations.tsx` | N/A | already covered structurally, no test needed (untouched by this phase) | ✅ | n/a |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/translations.test.ts` — add a `describe('translations.landing — no pricing language (PRIX-01)')` block covering `t.landing.problems` (new), `t.landing.phone` (post-teaser-trim), `t.landing.work` (post-bridge-rewrite)
- [ ] `src/app/layout.test.ts` — new file, source-string assertion that `priceRange` is absent (mirrors `services.test.ts`'s `readFileSync` pattern)
- [ ] `src/app/calculateur-roi/page.test.ts` — new file, source-string assertions for removed fields/tokens (`prixMensuel`, `setup`, `€`, `ratioSocle`, `amortissementMois`)
- [ ] `src/app/page.test.ts` — new file, asserting every landing CTA `href` matches the agreed-upon allowed destination set (final list depends on how the planner resolves the CTA-destination open questions from RESEARCH.md)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing section sequence (problèmes → aperçu services → fonctionnement → enjeux → preuve sociale → CTA) | LANDING-01 | Section order is a JSX array; a source-string test could assert import order but wouldn't catch semantic/content mismatches (e.g. does "fonctionnement" actually explain how the service works?) | During `/gsd:verify-work`, visually walk `src/app/page.tsx` rendered output top-to-bottom and confirm each of the 6 steps is represented by a distinct, correctly-ordered section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
