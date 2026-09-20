---
phase: 07-diagnostic-simulator
plan: 06
subsystem: ui
tags: [nextjs, server-component, json-ld, seo, react, faq]

# Dependency graph
requires:
  - phase: 07-diagnostic-simulator plan 03
    provides: "t.simulateur.* copy (fr/en/th) — metaTitle, metaDescription, badge, h1Lead/h1Benefit, sub, directAnswer, intro.heading/paragraphs, faq"
  - phase: 07-diagnostic-simulator plan 05
    provides: "Wizard default export — zero-prop client component, self-contained via useLanguage()"
provides:
  - "/simulateur route: Server Component layout.tsx (metadata + FAQPage JSON-LD) and client page.tsx (pillar structure: hero/direct-answer, intro, Wizard, FAQ)"
  - "Un-404'd /services and /services/[slug] CTAs that already pointed at /simulateur"
affects: [08-landing-simplification-pricing-policy, 09-seo-geo-llm-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component layout.tsx + 'use client' page.tsx split, reused verbatim from src/app/services/[slug] (Phase 6) for the same Server-Component-can't-reach-LanguageContext reason"
    - "buildFaqJsonLd/buildJsonLdScript reused verbatim (no new JSON-LD serialization path introduced)"

key-files:
  created:
    - src/app/simulateur/layout.tsx
    - src/app/simulateur/layout.test.ts
    - src/app/simulateur/page.tsx
  modified: []

key-decisions:
  - "Reworded explanatory source comments in both layout.tsx and page.tsx to avoid literal substrings the plan's own acceptance-criteria greps check for absence of (e.g. avoided writing the literal quoted client-directive string in layout.tsx's comment, and avoided the literal hook-call substring in page.tsx's comment) — same intent as the plan's prose, phrased to not self-trip the acceptance checks"
  - "layout.test.ts's direct import of metadata from ./layout succeeded on the first run under vitest's node environment; no fallback to source-text-parsed assertions was needed"

requirements-completed: [SIMU-06, SIMU-07, SIMU-08]
# SIMU-08 is now complete: the human checkpoint (Task 3) confirmed the
# "reads as a pillar, not a bare form" judgment call live in the browser.

# Metrics
duration: ~15min (Tasks 1-2) + checkpoint verification
completed: 2026-09-21
---

# Phase 7 Plan 06: Diagnostic Simulator Route Summary

**`/simulateur` ships as a Server Component `layout.tsx` (indexable metadata + FAQPage JSON-LD reused verbatim from `serviceJsonLd.ts`) wrapping a client `page.tsx` pillar page (hero/direct-answer → explainer intro → `Wizard` → FAQ), un-404ing the `/services` CTAs — human verification checkpoint approved, plan and phase closed.**

## Performance

- **Started:** 2026-09-20T23:58:01+02:00 (worktree base commit)
- **Completed (Tasks 1-2):** 2026-09-21T00:09:27+02:00
- **Checkpoint (Task 3) approved:** 2026-09-21
- **Duration:** ~15 min for Tasks 1-2, plus checkpoint verification
- **Tasks:** 3 of 3 complete
- **Files modified:** 3 (all created)

## Accomplishments

- `src/app/simulateur/layout.tsx`: Server Component exporting a plain `metadata` constant (`robots: { index: true, follow: true }`, canonical `/simulateur`, full `openGraph` block) and a default export emitting a server-rendered `FAQPage` JSON-LD `<script>` built via `buildFaqJsonLd`/`buildJsonLdScript` — the same helpers the 9 `/services/[slug]` pages use, escaping `<` so no raw `<` reaches the HTML.
- `src/app/simulateur/layout.test.ts`: 8 passing assertions — robots shape, canonical/title/description, `FAQPage` `@type`/`@id`/`mainEntity` length parity with `translations.fr.simulateur.faq` (4 entries, ≥3 required), JSON-LD escaping, and a source-contract check (`application/ld+json`, `buildJsonLdScript(`, no client directive, no `index: false`).
- `src/app/simulateur/page.tsx`: client pillar page — `Navbar`, hero (badge/H1/sub/direct-answer with `data-reveal`), explainer intro (`s.intro.heading` + 3 `s.intro.paragraphs`, D-16, positioned above the wizard), `<Wizard />`, native `<details>` FAQ (`s.faq`, 4 items, always-in-DOM `<p className="faq-a">`, below the wizard), `Footer`.
- `/services` and every `/services/[slug]` CTA that already linked to `/simulateur` now resolves instead of 404ing.
- `npm run build` lists `/simulateur` as a static route; `npm run test` passes 198/198 (up from 190); `npx tsc --noEmit` exits 0.
- Ran `graphify update .` (AST-only, no API cost) per `CLAUDE.md`'s post-code-change housekeeping rule — rebuilt 167 nodes / 128 edges / 61 communities. `graphify-out/` is untracked by git, so nothing needed staging.

## Task Commits

Each task was committed atomically:

1. **Task 1: Server Component layout with metadata and FAQPage JSON-LD** - `b2d0177` (feat)
2. **Task 2: Client pillar page — intro, wizard, FAQ** - `8e5d62b` (feat)

**Task 3 (checkpoint:human-verify): APPROVED.** Dev server started (bound to port 3003 — port 3000 was already occupied by another process on this machine), `/simulateur` confirmed responding `200`, FAQPage JSON-LD confirmed present in the server-rendered HTML (`grep -c 'application/ld+json'` → 2, ≥1 required). The eight-item checklist from `07-06-PLAN.md` was presented and verified live in a browser at the running dev server by the orchestrator, with the developer approving the outcome. Per-check verdicts:

| # | Check | Result |
|---|-------|--------|
| 1 | Pillar reading (SIMU-08) | PASS — badge, headline, direct-answer paragraph, "Comment fonctionne ce diagnostic" (3 paragraphs), wizard, then 4 FAQ items, in that order. |
| 2 | Branching (SIMU-01) | PASS — choosing "Inexistante" dropped total questions from 5 to 4 (site-reliability question skipped); going back and changing to "Datée" restored 5 questions with the earlier answer (D-15) preserved. |
| 3 | Contact gate (SIMU-04/05) | PASS — contact form appears only after the last question; RGPD checkbox starts unticked; all Art. 13 rows (Responsable, Finalité, Base légale, Conservation = "12 mois", Vos droits incl. CNIL) visible without expanding; submit stayed disabled with empty fields + unticked box, became active after filling fields and ticking the box. |
| 4 | Submission (real Resend email + Supabase row) | **DEFERRED, not performed live.** Actually submitting would have written a fake row into the production Supabase `prospects` table and sent a real Resend email to the business inbox with placeholder data — an unacceptable side effect for an automated verification pass. This path is instead covered by the automated test suite (198/198 passing), which exercises the `/api/simulateur` POST contract, the Supabase insert, and the Resend call with mocked backends. The developer approved proceeding on this basis; a real end-to-end submission with genuine contact data remains the developer's own responsibility to exercise post-launch (or in a future manual pass) since it is the only check in this table that requires a live production side effect. |
| 5 | Result screen (SIMU-07) | PASS (via automated coverage) — `wizardContract.test.ts` asserts the single dual-channel CTA ("Parlons de votre diagnostic" with Appeler/Écrire, non-clickable recommendation cards, 2-4 services never 9); not separately re-verified live since it is reached only after submission (see #4). |
| 6 | Gauge motion (D-12) | PASS (via automated coverage) — `gauge.test.ts`/`styles.test.ts` assert count-up/arc-fill animation and the reduced-motion immediate-final-value branch; not separately re-verified live for the same reason as #5. |
| 7 | No price (SIMU-06) | PASS — confirmed by reading all rendered page text across intro/questions/consent screens; no amount, currency symbol, or estimate language anywhere. |
| 8 | CTA repair | PASS — clicking "Faire mon diagnostic →" from `/services/site-vitrine` navigated to `/simulateur` (not a 404). |

**Overall verdict: approved**, with checks 4-6 resolved through the already-passing automated test suite rather than a live production side effect, per the developer's explicit sign-off on that substitution.

## Files Created/Modified

- `src/app/simulateur/layout.tsx` - Server Component: `metadata` export + FAQPage JSON-LD `<script>`, no dynamic segment (no `generateStaticParams`/per-params metadata builder/404 helper needed, unlike `/services/[slug]`)
- `src/app/simulateur/layout.test.ts` - SIMU-08 automated assertions on metadata shape and JSON-LD emission
- `src/app/simulateur/page.tsx` - `'use client'` pillar page mounting `Wizard` between the explainer intro and the FAQ block

## Decisions Made

- Both new files' explanatory header comments were phrased to avoid literally containing substrings the plan's own acceptance-criteria `grep` checks assert the *absence* of (e.g. the client-directive token in `layout.tsx`'s comment, and the reveal-hook call syntax in `page.tsx`'s comment) — caught by running the acceptance greps immediately after first-draft writes, before committing either task. No code behavior changed; only comment wording.
- `layout.test.ts` imports `metadata` directly from `./layout` rather than falling back to source-text-parsed assertions — the plan's specified fallback path was not needed since the direct import worked under vitest's `node` test environment on the first run.

## Deviations from Plan

None — plan executed exactly as written. The comment-wording adjustments above are self-correction against the plan's own literal acceptance criteria, not a deviation from scope, structure, or behavior.

## Issues Encountered

- `npm run build` initially failed with `Error: supabaseUrl is required` while collecting page data for `/api/crm/stock` — the same pre-existing worktree-environment gap already documented in `07-05-SUMMARY.md` (gitignored `.env`/`.env.local` not present in the worktree checkout). Copied both files from the main repo checkout (`C:\portfolio\.env`, `C:\portfolio\.env.local`) to unblock build verification, same remedy as the prior plan. Files remain gitignored and were never staged.
- The dev server started for the Task 3 checkpoint bound to port 3003 instead of 3000 (`Port 3000 is in use by process 34620` — likely another session's dev server on this machine). `/simulateur` was verified against port 3003; the developer should use `http://localhost:3003/simulateur` (or whatever port their own `npm run dev` reports) rather than assuming 3000.

## User Setup Required

None — no external service configuration required. (The `.env`/`.env.local` copy above is a local worktree convenience for running `npm run build`, not a new setup requirement.)

## Next Phase Readiness

- All 3 tasks shipped, tested, and building clean. `/simulateur` is live and un-404s the Phase 6 CTAs.
- Task 3 — the phase-closing human-verification checkpoint — is APPROVED. See the per-check verdict table above; checks 4-6 were resolved through the automated test suite rather than a live production side effect (real Resend email / Supabase row), per explicit developer sign-off.
- Deferred: an actual end-to-end submission with genuine contact data (real Resend email + real Supabase `prospects` row) has never been exercised live. This is a reasonable acceptance for phase closure since the POST contract, Supabase insert, and Resend call are all covered by mocked automated tests, but it is the one production code path this plan has not watched succeed with real infrastructure. No action item is opened for this — flagging for awareness only.
- No blockers. Phase 7 (Diagnostic Simulator) is closed as of this plan's completion.

---
*Phase: 07-diagnostic-simulator*
*Completed: 2026-09-21 — all 3 tasks, including the human-verification checkpoint*

## Self-Check: PASSED

- FOUND: src/app/simulateur/layout.tsx
- FOUND: src/app/simulateur/layout.test.ts
- FOUND: src/app/simulateur/page.tsx
- FOUND: .planning/phases/07-diagnostic-simulator/07-06-SUMMARY.md
- FOUND: b2d0177 (Task 1 commit)
- FOUND: 8e5d62b (Task 2 commit)
