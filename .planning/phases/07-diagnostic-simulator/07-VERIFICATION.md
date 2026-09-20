---
phase: 07-diagnostic-simulator
verified: 2026-09-21T01:00:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 07: Diagnostic Simulator Verification Report

**Phase Goal:** A visitor can self-qualify through a branching questionnaire and receive a personalized, price-free service recommendation, while being captured as a prospect under RGPD-compliant consent.
**Verified:** 2026-09-21T01:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visitor answers a branching questionnaire (3-5 questions), site-reliability question skipped when no online presence (SIMU-01) | ✓ VERIFIED | `src/lib/simulateur/questions.ts` — 5 questions, `site-fiabilite.showIf` returns false when `presence-en-ligne === 'inexistante'`; `wizardSteps.ts`'s `buildStepSequence` recomputes on every answer change; `Wizard.tsx` derives `steps` from `answers` with no separate skip logic. `questions.test.ts` (25 assertions) and `wizardSteps.test.ts` cover this. Live-browser checkpoint (07-06-SUMMARY.md #2) confirmed skip + restore + answer preservation on back-nav. |
| 2 | Result is 2-4 recommended services, never all 9, deterministic tiebreak (SIMU-02) | ✓ VERIFIED | `scoring.ts::computeRecommendedServices` clamps to 2-4 via `PRIORITY_ORDER` tiebreak/padding; `scoring.test.ts` asserts the clamp for empty/single/all-selected answer sets, determinism, and the D-08 standalone-maintenance path. `submit.ts`'s exact-key-set assertion also proves `servicesRecommandes.length` 2-4 end to end. |
| 3 | Visual 0-100 gauge, inverted severity, never leaves the browser (SIMU-03) | ✓ VERIFIED | `scoring.ts::computeVisualScore` inverts average severity, `secteur` excluded; `gauge.ts`/`ScoreGauge.tsx` render it with GSAP count-up and a `prefers-reduced-motion` branch that skips the tween; `submit.ts`'s `EXPECTED_PAYLOAD_KEYS` (8 keys, no `score`/`gauge`) proves it is never POSTed. `wizardContract.test.ts` asserts `computeVisualScore` is called only in the result-render region, never inside `handleSubmit`. |
| 4 | Contact-capture step reachable only after the last applicable question, before result (SIMU-04) | ✓ VERIFIED | `wizardSteps.ts::buildStepSequence` places exactly one `contact` step after all question steps and before `result`; `Wizard.tsx` renders branches purely off `steps[clampedStepIndex]`, no hardcoded index. `wizardContract.test.ts` asserts no literal step-order array exists in source. Live checkpoint confirmed no contact form before the last question. |
| 5 | Unticked-by-default RGPD consent gate with Art. 13 mentions (12-month retention), submission impossible without it (SIMU-05) | ✓ VERIFIED | `Wizard.tsx`: `useState(false)` for consent, never `defaultChecked`; submit button `disabled` delegates to `canSubmit`; `buildProspectPayload` throws on `consent !== true`; server's `z.literal(true)` is the real boundary. `translations.ts` `fr/en/th.simulateur.contact.rgpdMentions` each carry 5 rows stating controller identity, purpose, legal basis, "12 mois"/12-month retention, and rights incl. CNIL. `translations.test.ts` asserts Art.13 completeness and locale parity (25/25 passing). Live checkpoint confirmed unticked box, visible mentions, disabled→enabled transition. |
| 6 | No price/tariff/currency/free-of-charge language anywhere in simulator copy, any locale (SIMU-06) | ✓ VERIFIED | `translations.test.ts`'s `SIMU_PRICE_PATTERN` (stricter than SVC-02's guard) scans the serialized `simulateur` block per locale — passing. `wizardContract.test.ts` re-asserts the same pattern against the Wizard component source. Live checkpoint (#7) confirmed no price/currency copy on any screen. |
| 7 | Result screen offers a single action via two channels (call/write), non-clickable service cards (SIMU-07) | ✓ VERIFIED | `Wizard.tsx` result branch renders `<article>` cards with no `href`/`onClick`, and exactly one `tel:` + one `mailto:` anchor both styled `btn-primary`. `wizardContract.test.ts` asserts exactly one of each link and zero `href="/services/` occurrences. |
| 8 | `/simulateur` is a citable pillar page (intro above wizard, FAQ below), FAQPage JSON-LD, indexable (SIMU-08) | ✓ VERIFIED | `src/app/simulateur/layout.tsx` (Server Component) emits `metadata` with `robots: {index:true, follow:true}`, canonical `/simulateur`, and a server-rendered `<script type="application/ld+json">` via `buildFaqJsonLd`/`buildJsonLdScript` (escapes `<`). `page.tsx` renders hero → direct-answer → intro (3 paragraphs) → `<Wizard/>` → FAQ (`<details>`, always-in-DOM `<p>`) → Footer, in that source order. `layout.test.ts` (8 assertions) + `npm run build` confirm `/simulateur` is a real static route (not a 404), and `/services` + `/services/[slug]` CTAs point at `href="/simulateur"`. Live checkpoint confirmed pillar reading and CTA repair. |

**Score:** 8/8 truths verified

### CR-01 Fix Verification (Critical finding from 07-REVIEW.md)

The code review's Critical finding — the honeypot `<input name="website">` was rendered but its value never reached the submitted payload, permanently disabling the server's `isSpamSubmission` honeypot check — was fixed in commit `68ba67d` and is confirmed present in the current codebase:

- `src/components/simulateur/Wizard.tsx:54` declares `honeypotRef = useRef<HTMLInputElement>(null)`, attached to the honeypot `<input ref={honeypotRef} ... />` (line 284).
- `handleSubmit` (line 88) passes `website: honeypotRef.current?.value ?? ''` into `buildProspectPayload`.
- `src/lib/simulateur/submit.ts::buildProspectPayload` forwards `input.website ?? ''` verbatim into the payload (line 80), and validates a website-normalized *copy* against `prospectSchema` (line 95) so a bot-filled value doesn't throw client-side — then returns the real, unmodified payload (line 96) so the actual honeypot value reaches the wire.
- `src/app/api/simulateur/route.ts:27` calls `isSpamSubmission(raw)` on the raw, pre-zod-parse JSON body, so a non-empty `website` value now correctly triggers the silent-reject path.
- `submit.test.ts` was updated to assert the honeypot value is forwarded (`'http://spam.example'` case) rather than asserting the old broken always-`''` behavior.
- Full test suite: 199/199 passing (`npm run test`), `npx tsc --noEmit` clean, `npm run build` succeeds and lists `/simulateur`.

**This fix is verified as functionally correct and tested**, closing the one Critical issue from the code review.

### Remaining Review Findings (non-blocking, per task framing)

The 4 Warnings + 2 Info findings in `07-REVIEW.md` were confirmed still present in the current source (WR-01 no back-button on contact step, WR-02 client/server validation gap surfacing as a generic error, WR-03 layout.test.ts comment-stripping fragility, WR-04 two unused exports; IN-01 redundant `aria-hidden={false}`, IN-02 index-as-key). None of these affect the phase's observable truths above (branching, recommendation clamp, gauge, consent gate, price guard, CTA, pillar structure, honeypot) — they are UX polish and test-fragility items, consistent with the task framing. Not treated as blockers.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/simulateur/questions.ts` | QUESTIONS bank, branching predicate | ✓ VERIFIED | 5 questions, `isQuestionApplicable`, `nextQuestionId`, `ALL_SLUGS` all present and tested |
| `src/lib/simulateur/priorityOrder.ts` | PRIORITY_ORDER 9-slug tiebreak | ✓ VERIFIED | present, imported by `scoring.ts` |
| `src/lib/simulateur/wizardSteps.ts` | Step machine | ✓ VERIFIED | `buildStepSequence`, `progressRatio`, `contactStepIndex`, `applicableQuestionIds` all exported and wired into `Wizard.tsx` (except `contactStepIndex`, see WR-04) |
| `src/lib/simulateur/scoring.ts` | Recommendation + visual score | ✓ VERIFIED | `computeRecommendedServices`, `computeVisualScore`, `scoreBand` — used in `Wizard.tsx` result branch |
| `src/lib/simulateur/submit.ts` | Consent gate + payload assembly | ✓ VERIFIED | `canSubmit`, `buildProspectPayload`; honeypot fix confirmed present |
| `src/lib/simulateur/gauge.ts` + `ScoreGauge.tsx` | Radial gauge geometry + component | ✓ VERIFIED | Reduced-motion branch, GSAP count-up, tween cleanup all present |
| `src/app/globals.css` (.sim-* layer) | Wizard/contact/result CSS | ✓ VERIFIED | `styles.test.ts` passing, 44px tap targets present |
| `src/lib/translations.ts` (SimulateurContent) | fr/en/th copy incl. RGPD + FAQ | ✓ VERIFIED | 3 `simulateur:` blocks, RGPD 5-row mentions, 4-item FAQ, all locale-parity tests passing |
| `src/components/simulateur/Wizard.tsx` | Full client wizard | ✓ VERIFIED | 380 lines, all three step kinds implemented, honeypot wired |
| `src/app/simulateur/layout.tsx` + `page.tsx` | Route, metadata, JSON-LD, pillar page | ✓ VERIFIED | Confirmed via `npm run build` route table and source read |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Wizard.tsx` | `wizardSteps.ts` | `buildStepSequence`/`progressRatio` | ✓ WIRED | Both imported and used to derive rendered step |
| `Wizard.tsx` | `submit.ts` | `canSubmit`/`buildProspectPayload` | ✓ WIRED | disabled-state gate + payload construction in `handleSubmit` |
| `Wizard.tsx` | `/api/simulateur` | `fetch POST` | ✓ WIRED | `fetch('/api/simulateur', {method:'POST', ...})`, response `ok` branch handled |
| `Wizard.tsx` | `ScoreGauge.tsx` | result render | ✓ WIRED | `<ScoreGauge score={score} caption={...} framing={...} />` |
| `submit.ts` | `prospects-schema.ts` | `prospectSchema`/`ProspectSubmission` | ✓ WIRED | imported and used, no hand-typed duplicate |
| `submit.ts` (honeypot) | `route.ts::isSpamSubmission` | `website` field | ✓ WIRED | traced end-to-end: DOM ref → payload → raw JSON body → pre-zod spam check |
| `layout.tsx` | `serviceJsonLd.ts` | `buildFaqJsonLd`/`buildJsonLdScript` | ✓ WIRED | reused verbatim, escapes `<` |
| `page.tsx` | `Wizard.tsx` | component mount | ✓ WIRED | mounted between intro and FAQ sections |
| `services/page.tsx`, `services/[slug]/page.tsx` | `/simulateur` | CTA anchors | ✓ WIRED | `href="/simulateur"` present in both, confirmed non-404 via build route table + live checkpoint |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm run test` | 199/199 passing | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exits 0 | ✓ PASS |
| Production build | `npm run build` | exits 0, `/simulateur` listed as static route | ✓ PASS |
| Honeypot fix isolated | `npx vitest run src/lib/simulateur` | 159/159 passing, incl. new forwarding assertion | ✓ PASS |
| Translations content guard | `npx vitest run src/lib/translations.test.ts` | 25/25 passing | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| SIMU-01 | 07-01, 07-05 | Branching questionnaire | ✓ SATISFIED | `showIf` skip logic, `questions.test.ts`, live checkpoint |
| SIMU-02 | 07-04, 07-05 | 2-4 recommended services | ✓ SATISFIED | `computeRecommendedServices` clamp, `scoring.test.ts` |
| SIMU-03 | 07-02, 07-04, 07-05 | Visual-only gauge score | ✓ SATISFIED | `computeVisualScore`, `ScoreGauge.tsx`, exact-key-set payload test |
| SIMU-04 | 07-01, 07-05 | Contact gate position | ✓ SATISFIED | `buildStepSequence`, `wizardContract.test.ts` |
| SIMU-05 | 07-03, 07-04, 07-05 | RGPD consent + Art. 13 | ✓ SATISFIED | unticked `useState(false)`, throw-on-no-consent, 5-row mentions, 12-month retention |
| SIMU-06 | 07-03, 07-06 | No price language | ✓ SATISFIED | `SIMU_PRICE_PATTERN` guards in both `translations.test.ts` and `wizardContract.test.ts` |
| SIMU-07 | 07-05, 07-06 | Single dual-channel CTA | ✓ SATISFIED | one `tel:` + one `mailto:`, non-clickable cards, `wizardContract.test.ts` |
| SIMU-08 | 07-03, 07-06 | Citable pillar page | ✓ SATISFIED | FAQPage JSON-LD, indexable metadata, intro/wizard/FAQ order, build route table |

**Note on REQUIREMENTS.md checkbox staleness:** `.planning/REQUIREMENTS.md` still shows `[ ]` (unchecked) for SIMU-01, 02, 04, 05, 06, 07, 08 — only SIMU-03 is checked `[x]`. All 8 IDs are correctly declared across the phase's plan frontmatter `requirements:` fields and each plan's `requirements-completed` in its SUMMARY, and the codebase evidence above independently confirms each is implemented and tested. This is a documentation-hygiene gap (the checklist in REQUIREMENTS.md was not updated to reflect completion), not a functional gap — flagged as Info, not a blocker.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/simulateur/Wizard.tsx` | contact step nav | No back button on contact step (WR-01, pre-existing) | Info | UX polish, not correctness/security — carried forward from 07-REVIEW.md as accepted |
| `src/lib/simulateur/submit.ts` / `Wizard.tsx` | `canSubmit` | Weaker client validation than server schema (WR-02, pre-existing) | Info | Generic error message on malformed email/phone; not a security or data-integrity issue |
| `src/app/simulateur/layout.test.ts` | comment-stripping regex | String-literal-unaware regex (WR-03, pre-existing) | Info | Test fragility, currently passing by luck; no functional impact |
| `src/lib/simulateur/wizardSteps.ts`/`questions.ts` | `contactStepIndex`, `nextQuestionId` | Unused production exports (WR-04, pre-existing) | Info | Dead code risk of drift, no functional impact today |
| `.planning/REQUIREMENTS.md` | SIMU-01/02/04/05/06/07/08 rows | Checkboxes not updated to `[x]` despite completion | Info | Documentation hygiene only |

No debt markers (`TBD`/`FIXME`/`XXX`) found in any phase-modified file.

### Human Verification Required

None. The phase's `checkpoint:human-verify` task (07-06-PLAN.md Task 3) was already executed with genuine live-browser verification per 07-06-SUMMARY.md, covering: pillar reading, branching in both directions, contact gate + RGPD consent (12-month retention text), no-price copy, and CTA repair. The one item not exercised live — an actual form submission — was deliberately deferred to avoid writing fake data into the production Supabase `prospects` table and sending a real Resend email; that path is covered instead by the automated test suite (`submit.test.ts`, `wizardContract.test.ts`, `route.test.ts`), all of which are independently confirmed passing in this verification. This is a reasonable, well-documented substitution and does not require re-opening human verification.

### Gaps Summary

No gaps found. All 8 observable truths (mapped 1:1 to SIMU-01 through SIMU-08) are verified against the codebase, not merely claimed in SUMMARY.md files. The one Critical issue raised by code review (honeypot never wired to the payload) was independently re-traced end-to-end in this verification — from the DOM ref in `Wizard.tsx`, through `submit.ts`'s forwarding logic, into the raw JSON body, to the server's pre-parse `isSpamSubmission` check in `route.ts` — and confirmed fixed and tested. The full test suite (199/199), typecheck, and production build all pass. The four Warnings and two Info findings from code review remain present but are UX/test-fragility items that do not block the phase goal, consistent with the task's framing of them as non-blocking. The only other note is that `.planning/REQUIREMENTS.md`'s checkboxes were not updated to reflect the seven newly-completed SIMU requirements — a documentation-hygiene item, not a functional one.

---

_Verified: 2026-09-21T01:00:00Z_
_Verifier: Claude (gsd-verifier)_
