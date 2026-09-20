# Phase 7: Diagnostic Simulator - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the `/simulateur` page: a branching questionnaire wizard that qualifies a visitor's needs, recommends 2-4 of the 9 finalized services with a purely visual score, captures name/email/phone + RGPD consent only between the last question and the result screen, submits to the **already-built** `POST /api/simulateur` endpoint, and reads as an explanatory/citable pillar page (SIMU-08) rather than a bare form.

The backend — Supabase `prospects` table, RLS, spam guard, Resend notification, and the exact submission payload contract — was fully built in Phase 5. This phase is UI + content only: the question flow, the recommendation algorithm, the result screen (gauge + CTA), and the pillar-page framing around the wizard.

</domain>

<decisions>
## Implementation Decisions

### Question content & branching (SIMU-01)
- **D-01:** The entry/first question asks about the visitor's business type/sector (not "main problem" directly). This is a single generic-option question feeding the scoring signal — it does NOT require building sector-specific content or pages (`/secteurs/*` stays out of scope, SIMU2-01 is v2).
- **D-02:** 3-5 questions total — fast, low-friction flow.
- **D-03:** Branching is driven by severity/satisfaction scales (Likert-style, e.g. "Comment jugez-vous votre présence en ligne ?"), not simple binary existence-gate questions. Note for planning: combined with the short 3-5 question count (D-02), the scoring/branching logic needs care to stay deterministic — see Recommendation logic below.
- **D-04:** Mixed question format: single-select for most questions, multi-select for "which of these apply" questions. The existing payload schema already supports this (`reponsesDiagnostic[].value: string | string[]`) — no schema change needed.

### Recommendation logic (SIMU-02)
- **D-05:** Weighted tag scoring: each answer option is pre-tagged with one or more service slugs and a weight; weights are summed per service; the top 2-4 scoring services win. (Not a decision-tree/fixed-path approach.)
- **D-06:** The sector/business-type answer never hard-excludes a service — it only adjusts weight. Any of the 9 services can still surface if severity signals point there. Keeps the flow flexible since no sector-specific service catalog exists.
- **D-07:** Ties are broken via a fixed, agency-defined priority order across the 9 services, used only as a tiebreaker — guarantees the algorithm always lands on exactly 2-4 recommendations (never more, per SIMU-02). The exact priority ranking is Claude's discretion to draft during planning/execution, informed by which services the agency most wants to lead with.
- **D-08:** "Maintenance" (`maintenance` slug) can be recommended standalone — not always paired with a build service (site-vitrine/rebranding-site-premium/projet-sur-mesure) — when the visitor already has a site and severity signals point to reliability/security concerns.

### Score/gauge visual (SIMU-03)
- **D-09:** A single overall gauge/score (not per-service match bars).
- **D-10:** Radial/circular (speedometer-style) gauge, using the site's acid-green (`#C4F542`) accent.
- **D-11:** Urgency-framed: a lower score means more opportunity to improve, positioning the recommended services as the fix. Supports the single clear CTA goal (SIMU-07) rather than reading as a vanity/maturity compliment.
- **D-12:** The gauge animates on reveal (count-up/fill), consistent with the site's existing GSAP ScrollTrigger scroll-reveal motion language. Must still respect `prefers-reduced-motion` (existing PROJECT.md constraint applies here too).

### Wizard UX & pillar framing (SIMU-08 + general UX)
- **D-13:** One question per screen (step-by-step wizard), not all questions on a single scrolling page. Pairs naturally with the contact-form gating requirement (SIMU-04 — form appears strictly between the last question and the result, never before the first question).
- **D-14:** Progress bar (fills as the visitor answers) as the progress indicator — visually consistent with the result screen's gauge motif, not a plain step-counter text.
- **D-15:** Back navigation is allowed — the visitor can return to and change previous answers before the recommendation is computed.
- **D-16:** `/simulateur` uses a full pillar structure: an explainer intro (what the tool does, how it works, why answer honestly) above the wizard, plus an FAQ block — matching the citable/GEO pattern already established on the 9 `/services/[slug]` pages (SVC-05's `FAQPage` schema precedent). This directly satisfies SIMU-08's "explanatory, citable pillar page, not a bare form" requirement.

### Claude's Discretion
- Exact question copy/wording for all 3-5 questions and their answer options.
- Exact tag-weight values in the scoring algorithm (D-05) and the fixed tiebreak priority order (D-07).
- Exact gauge sizing, color gradient, and count-up animation timing (within the acid-green accent + GSAP-consistency constraints already decided).
- Exact FAQ questions/answers and explainer intro copy for the pillar framing (D-16) — draft during planning/content writing, consistent with the concise-copy precedent set in Phase 6 (SVC-06).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone v1.1 section, "no price anywhere" constraint, `prefers-reduced-motion` constraint
- `.planning/REQUIREMENTS.md` — SIMU-01 through SIMU-08 (this phase's scope)
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, and dependency on Phase 5 (submission endpoint) and Phase 6 (finalized service slugs)

### Prior phase decisions (locked, feed directly into this phase)
- `.planning/phases/05-prospect-capture-backend/05-CONTEXT.md` — D-01 (nom/email/téléphone all required), D-03 (raw diagnostic answers stored per question, not just aggregate), D-04 (12-month retention — MUST be stated in the RGPD consent text per SIMU-05)
- `.planning/phases/06-service-pages-template-content/06-CONTEXT.md` — the 9 finalized service slugs/pages, existing CTA wiring already pointing to `/simulateur`

### Existing code — backend contract (MUST match exactly, do not modify)
- `src/lib/prospects-schema.ts` — `prospectSchema` (zod): the exact payload shape the wizard must submit (`nom`, `email`, `telephone`, `reponsesDiagnostic: {questionId, value: string | string[]}[]`, `servicesRecommandes` 2-4 items, `consentementRgpd: true`, honeypot `website` field that must stay empty, `formRenderedAt` epoch-ms captured at wizard mount)
- `src/app/api/simulateur/route.ts` — the already-implemented `POST` handler: silent-reject on spam (`{ok:true}` even when rejected, no distinct signal), `{error: 'invalid_payload'}` / `{error: 'insert_failed'}` / `{error: 'notification_failed'}` on real failures, `{ok:true}` on success
- `src/app/api/simulateur/route.test.ts` — existing test coverage to extend when wiring the frontend, not to duplicate

### Existing code — data & content precedent
- `src/data/services.ts` — the 9 finalized slugs: `site-vitrine`, `rebranding-site-premium`, `branding`, `projet-sur-mesure`, `agent-vocal-ia`, `maintenance`, `community-management`, `meta-ads`, `google-ads`
- `src/app/services/page.tsx` (line ~85-86) and `src/app/services/[slug]/page.tsx` (lines ~43-44, ~156-157) — existing `<a href="/simulateur">` CTAs already wired, currently 404 until this phase ships
- `src/lib/serviceJsonLd.ts` — `buildFaqJsonLd`/`buildJsonLdScript` helpers used for Phase 6's per-page `FAQPage` schema — reuse for `/simulateur`'s FAQ block (D-16)
- `src/lib/translations.ts` — existing i18n system (fr/en/th); all simulator copy (questions, options, pillar intro, FAQ, RGPD consent text) belongs here, consistent with SVC-06's precedent

### SEO/GEO/AEO strategy
- `docs/strategie-seo-geo-llm-2026-09.md` §9 — `/simulateur` as a transverse pillar page, GEO/AEO citability guidance (informs D-16; note SEO-01's sitemap/llms.txt wiring is explicitly Phase 9's job, not this phase's)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prospects-schema.ts`'s `prospectSchema` — the wizard's final submit step must assemble exactly this shape; no new schema needed.
- `api/simulateur/route.ts` — fully implemented backend (Supabase insert, Resend notification, spam guard). This phase only builds the UI that calls this existing endpoint — no backend changes.
- Existing GSAP ScrollTrigger / `useReveals()` scroll-reveal pattern — reuse for the pillar intro's reveal-on-scroll and the gauge's count-up animation (D-12), respecting `prefers-reduced-motion`.
- `serviceJsonLd.ts`'s FAQPage JSON-LD builder — reuse verbatim for `/simulateur`'s FAQ block rather than hand-rolling new schema.

### Established Patterns
- Metadata lives in a sibling `layout.tsx`, `page.tsx` stays `'use client'` for reveals/i18n — this convention must extend to `src/app/simulateur/page.tsx` + `layout.tsx`.
- The honeypot field is literally named `website` and must render as an empty, effectively-invisible field for legitimate users (schema enforces max length 0).
- `formRenderedAt` must be captured client-side as `Date.now()` at wizard mount (not at submit) — the server's spam check compares elapsed time against `SPAM_MIN_ELAPSED_MS` (2000ms).

### Integration Points
- New route `src/app/simulateur/page.tsx` (+ `layout.tsx`) is the target of already-live CTA links from `/services` and every `/services/[slug]` page (currently 404 until this phase ships).
- Result-screen service links resolve against `src/data/services.ts`'s finalized slugs.
- Sitemap/`llms.txt` registration (SEO-01) is explicitly out of scope here — Phase 9's job — this phase only builds the page itself.

</code_context>

<specifics>
## Specific Ideas

No specific external reference sites/tools were named for the wizard's visual style beyond the radial-gauge + acid-green-accent decision (D-10). Exact question copy, weight values, and FAQ content are open — see Claude's Discretion.

</specifics>

<deferred>
## Deferred Ideas

- Sector-tailored question sets/content beyond a single generic entry question (SIMU2-01, v2 scope) — the sector question asked here (D-01) stays generic; deep per-sector branching is not this phase's job.

### Reviewed Todos (not folded)
- "Restructurer la landing page autour des problèmes PME, pas de l'agent vocal" (`.planning/todos/pending/2026-09-20-landing-page-trop-ax-e-agent-vocal-restructurer-en-probl-mes.md`) — surfaced as a weak keyword match (score 0.6) but is explicitly landing-page scope, already tracked in STATE.md as resolving during Phase 8 (Landing Simplification & Pricing Policy), not this phase.

</deferred>

---

*Phase: 7-diagnostic-simulator*
*Context gathered: 2026-09-20*
