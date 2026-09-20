---
phase: 7
slug: diagnostic-simulator
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.11 |
| **Config file** | `vitest.config.ts` — `include: ['src/**/*.test.ts']` (`.ts` only, not `.tsx` — pure logic must live in `.ts` files) |
| **Quick run command** | `npx vitest run src/lib/simulateur` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10-20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/simulateur`
- **After every plan wave:** Run `npm run test` (full suite — also regression-guards the untouched `src/app/api/simulateur/route.test.ts` and `src/lib/prospects-schema.test.ts`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | SIMU-01 | — | `nextQuestionId(answers)` returns the correct next question id given prior answers, `null` once done | unit | `npx vitest run src/lib/simulateur/questions.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 0 | SIMU-02 | — | `computeRecommendedServices(answers)` always returns 2-4 unique slugs, never all 9, ties broken by fixed `PRIORITY_ORDER` | unit | `npx vitest run src/lib/simulateur/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 0 | SIMU-03 | — | `computeVisualScore(answers)` returns a number in [0,100]; the assembled POST payload never includes a score field | unit | `npx vitest run src/lib/simulateur/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | SIMU-04 | — | Contact-capture UI is unreachable before the last question and unavoidable before the result step (step-order assertion) | unit | `npx vitest run src/lib/simulateur/wizardSteps.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | SIMU-05 | V5 | Wizard's submit handler refuses to call `fetch` unless `consentementRgpd` checkbox state is `true` (server side already covered by existing `route.test.ts`) | unit | `npx vitest run src/lib/simulateur/*.test.ts` | ✅ (server) / ❌ W0 (client) | ⬜ pending |
| 07-02-03 | 02 | 1 | SIMU-06 | — | No price string appears anywhere in `t.simulateur.*` copy | unit/content-lint | `npx vitest run src/lib/simulateur/content.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | SIMU-07 | — | Result screen exposes exactly one CTA concept with two channels (tel + écrire), not two competing CTAs | manual | n/a — UAT checklist item | n/a | ⬜ pending |
| 07-03-02 | 03 | 2 | SIMU-08 | — | `/simulateur` renders a `FAQPage` JSON-LD script tag server-side, reusing `buildFaqJsonLd`/`buildJsonLdScript` verbatim | unit/integration | `npx vitest run src/app/simulateur/layout.test.ts` (if extracted) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs above are placeholders pending the planner's actual plan/wave breakdown — the planner will confirm final IDs.*

---

## Wave 0 Requirements

- [ ] `src/lib/simulateur/questions.ts` + `questions.test.ts` — question bank + `nextQuestionId`
- [ ] `src/lib/simulateur/scoring.ts` + `scoring.test.ts` — `computeRecommendedServices`, `computeVisualScore`
- [ ] `src/lib/simulateur/priorityOrder.ts` — fixed `PRIORITY_ORDER` (D-07 tiebreak)
- [ ] Confirm whether Phase 6 left a reusable "no price string" content-lint helper to extend for SIMU-06, or write one fresh
- [ ] No new test framework/config install needed — vitest already configured, picks up `src/**/*.test.ts` automatically

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Result screen offers exactly one CTA concept (two channels: appeler/écrire), not two competing CTAs | SIMU-07 | JSX/visual composition, not pure logic | Load `/simulateur`, complete the wizard, confirm the result screen shows a single "nous contacter" action framed with call + write channels, no separate/competing CTA |
| Gauge animates on reveal and respects `prefers-reduced-motion` | D-12 (CONTEXT.md) | Visual/motion behavior | Load result screen with OS reduced-motion enabled and disabled; confirm animation only plays when motion is not reduced |
| `/simulateur` reads as an explanatory pillar page, not a bare form | SIMU-08 | Subjective content/structure judgment | Visually confirm intro/explainer section + FAQ block surround the wizard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
