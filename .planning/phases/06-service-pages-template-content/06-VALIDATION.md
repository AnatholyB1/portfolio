---
phase: 6
slug: service-pages-template-content
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node environment only — no jsdom/React Testing Library configured) |
| **Config file** | `vitest.config.ts` (`environment: 'node'`, `include: ['src/**/*.test.ts']`) |
| **Quick run command** | `npx vitest run <touched-test-file>` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched-test-file>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-XX-XX | TBD | TBD | SVC-01 | — | `services.ts` has exactly 9 entries with unique slugs matching the fixed slug list | unit | `npx vitest run src/data/services.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-01 | — | `translations.ts` `t.services.pages.items` has one entry per `services.ts` index, all 3 locales (fr/en/th), no missing keys | unit | `npx vitest run src/lib/translations.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-02 | T-6-01 | No `price`/`tarif`/`€` substring in any service page content object | unit | `npx vitest run src/lib/translations.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-05 | T-6-01 | `buildFaqJsonLd(faq)` produces valid `FAQPage` shape with non-empty answers | unit | `npx vitest run src/lib/serviceJsonLd.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-05 | T-6-01 | JSON-LD serialization escapes `<` characters (XSS regression guard) | unit | `npx vitest run src/lib/serviceJsonLd.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-06 | — | Word count per service page (fr locale) within ~300-500 word target (D-02) — advisory, warn not fail | unit (advisory) | `npx vitest run src/lib/translations.test.ts` | ❌ W0 | ⬜ pending |
| 06-XX-XX | TBD | TBD | SVC-03 | — | `/services` index links to all 9 `/services/[slug]` paths, no broken hrefs | unit | `npx vitest run src/data/services.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs and plan/wave assignment finalized once gsd-planner produces PLAN.md files.*

---

## Wave 0 Requirements

- [ ] `src/data/services.test.ts` — stubs covering SVC-01, SVC-03 (data integrity: 9 unique slugs, index alignment, no broken index-page links)
- [ ] `src/lib/translations.test.ts` — stubs covering SVC-02, SVC-05, SVC-06 (no-price guard, translation-key completeness across 3 locales, word-count advisory)
- [ ] `src/lib/serviceJsonLd.test.ts` — stubs covering SVC-05 (JSON-LD shape + `<` escaping regression test)
- No framework install needed — Vitest is already configured; new test files follow the existing `prospects-schema.test.ts` pattern (pure-function unit tests, `node` environment, no DOM).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Branding page content explicitly distinguishes scope from Rebranding+Premium | SVC-04 | Content/copy quality judgment, not mechanically checkable | Read the Branding and Rebranding+Premium page copy side by side; confirm the boundary language matches D-07/D-08 (identity-only vs bundled, explicit cross-link present) |
| Each of the 9 pages follows problème→fonctionnement→enjeux→preuve sociale→FAQ→double CTA structure | SVC-02 | Structural/visual review, not a pure data assertion | Visually inspect each rendered `/services/[slug]` page for section order and no price mention |
| FAQ answer is directly citable under H1/H2 per AEO strategy | SVC-05 | Content quality for LLM-citability, subjective | Read each FAQ's first answer block; confirm it stands alone as a citable, self-contained sentence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
