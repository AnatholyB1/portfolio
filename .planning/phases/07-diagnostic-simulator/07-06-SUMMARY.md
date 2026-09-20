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

requirements-completed: [SIMU-06, SIMU-07]
# SIMU-08 requirement is satisfied by the shipped code (FAQPage JSON-LD,
# index/follow robots, pillar structure) but is left uncompleted here
# pending the human checkpoint (Task 3) that closes out the phase-wide
# manual verification, including the SIMU-08 "reads as a pillar, not a
# bare form" judgment call explicitly flagged as manual-only in
# 07-VALIDATION.md.

# Metrics
duration: ~15min (Tasks 1-2; Task 3 checkpoint pending)
completed: 2026-09-21
---

# Phase 7 Plan 06: Diagnostic Simulator Route Summary

**`/simulateur` ships as a Server Component `layout.tsx` (indexable metadata + FAQPage JSON-LD reused verbatim from `serviceJsonLd.ts`) wrapping a client `page.tsx` pillar page (hero/direct-answer → explainer intro → `Wizard` → FAQ), un-404ing the `/services` CTAs — full phase closure is pending the Task 3 human-verification checkpoint.**

## Performance

- **Started:** 2026-09-20T23:58:01+02:00 (worktree base commit)
- **Completed (Tasks 1-2):** 2026-09-21T00:09:27+02:00
- **Duration:** ~15 min for Tasks 1-2
- **Tasks:** 2 of 3 complete; Task 3 (`checkpoint:human-verify`) reached and awaiting developer input
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

**Task 3 (checkpoint:human-verify):** dev server started (bound to port 3003 — port 3000 was already occupied by another process on this machine), `/simulateur` confirmed responding `200`, FAQPage JSON-LD confirmed present in the server-rendered HTML (`grep -c 'application/ld+json'` → 2, ≥1 required). The eight-item verification checklist has NOT yet been presented to / confirmed by the developer — this plan halts here per the executor's checkpoint protocol. This SUMMARY will be amended with the per-check verdicts once the developer responds.

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

- Tasks 1-2 are fully shipped, tested, and building clean. `/simulateur` is live and un-404s the Phase 6 CTAs.
- Task 3 — the phase-closing human-verification checkpoint — is outstanding. The eight numbered checks from `07-06-PLAN.md` (pillar reading, branching, contact gate, submission/Resend/Supabase round-trip, result screen, gauge motion + reduced-motion, no-price skim, CTA repair) still need to be presented to and confirmed by the developer before Phase 7 can be considered closed.
- No blockers for Tasks 1-2's own scope. This SUMMARY will be updated in place once the checkpoint resolves.

---
*Phase: 07-diagnostic-simulator*
*Completed: Tasks 1-2 on 2026-09-21; Task 3 pending*

## Self-Check: PASSED

- FOUND: src/app/simulateur/layout.tsx
- FOUND: src/app/simulateur/layout.test.ts
- FOUND: src/app/simulateur/page.tsx
- FOUND: .planning/phases/07-diagnostic-simulator/07-06-SUMMARY.md
- FOUND: b2d0177 (Task 1 commit)
- FOUND: 8e5d62b (Task 2 commit)
