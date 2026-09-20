# Phase 7: Diagnostic Simulator - Research

**Researched:** 2026-09-20
**Domain:** Client-side multi-step form wizard (Next.js App Router) + weighted-tag recommendation logic + hand-rolled SVG data visualization, submitting to an already-built backend contract
**Confidence:** HIGH (backend contract, existing patterns, dependency versions all directly read from source) / MEDIUM (exact copy, weights, gauge visual tuning — explicitly Claude's discretion per CONTEXT.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Question content & branching (SIMU-01)**
- D-01: The entry/first question asks about the visitor's business type/sector (not "main problem" directly). This is a single generic-option question feeding the scoring signal — it does NOT require building sector-specific content or pages (`/secteurs/*` stays out of scope, SIMU2-01 is v2).
- D-02: 3-5 questions total — fast, low-friction flow.
- D-03: Branching is driven by severity/satisfaction scales (Likert-style, e.g. "Comment jugez-vous votre présence en ligne ?"), not simple binary existence-gate questions. Note for planning: combined with the short 3-5 question count (D-02), the scoring/branching logic needs care to stay deterministic.
- D-04: Mixed question format: single-select for most questions, multi-select for "which of these apply" questions. The existing payload schema already supports this (`reponsesDiagnostic[].value: string | string[]`) — no schema change needed.

**Recommendation logic (SIMU-02)**
- D-05: Weighted tag scoring: each answer option is pre-tagged with one or more service slugs and a weight; weights are summed per service; the top 2-4 scoring services win. (Not a decision-tree/fixed-path approach.)
- D-06: The sector/business-type answer never hard-excludes a service — it only adjusts weight. Any of the 9 services can still surface if severity signals point there.
- D-07: Ties are broken via a fixed, agency-defined priority order across the 9 services, used only as a tiebreaker — guarantees the algorithm always lands on exactly 2-4 recommendations. The exact priority ranking is Claude's discretion to draft during planning/execution, informed by which services the agency most wants to lead with.
- D-08: "Maintenance" (`maintenance` slug) can be recommended standalone — not always paired with a build service — when the visitor already has a site and severity signals point to reliability/security concerns.

**Score/gauge visual (SIMU-03)**
- D-09: A single overall gauge/score (not per-service match bars).
- D-10: Radial/circular (speedometer-style) gauge, using the site's acid-green (`#C4F542`) accent.
- D-11: Urgency-framed: a lower score means more opportunity to improve, positioning the recommended services as the fix. Supports the single clear CTA goal (SIMU-07) rather than reading as a vanity/maturity compliment.
- D-12: The gauge animates on reveal (count-up/fill), consistent with the site's existing GSAP ScrollTrigger scroll-reveal motion language. Must still respect `prefers-reduced-motion`.

**Wizard UX & pillar framing (SIMU-08 + general UX)**
- D-13: One question per screen (step-by-step wizard), not all questions on a single scrolling page. Pairs naturally with the contact-form gating requirement (SIMU-04 — form appears strictly between the last question and the result, never before the first question).
- D-14: Progress bar (fills as the visitor answers) as the progress indicator — visually consistent with the result screen's gauge motif, not a plain step-counter text.
- D-15: Back navigation is allowed — the visitor can return to and change previous answers before the recommendation is computed.
- D-16: `/simulateur` uses a full pillar structure: an explainer intro (what the tool does, how it works, why answer honestly) above the wizard, plus an FAQ block — matching the citable/GEO pattern already established on the 9 `/services/[slug]` pages (SVC-05's `FAQPage` schema precedent). This directly satisfies SIMU-08's "explanatory, citable pillar page, not a bare form" requirement.

### Claude's Discretion
- Exact question copy/wording for all 3-5 questions and their answer options.
- Exact tag-weight values in the scoring algorithm (D-05) and the fixed tiebreak priority order (D-07).
- Exact gauge sizing, color gradient, and count-up animation timing (within the acid-green accent + GSAP-consistency constraints already decided).
- Exact FAQ questions/answers and explainer intro copy for the pillar framing (D-16) — draft during planning/content writing, consistent with the concise-copy precedent set in Phase 6 (SVC-06).

### Deferred Ideas (OUT OF SCOPE)
- Sector-tailored question sets/content beyond a single generic entry question (SIMU2-01, v2 scope) — the sector question asked here (D-01) stays generic; deep per-sector branching is not this phase's job.
- "Restructurer la landing page autour des problèmes PME, pas de l'agent vocal" — explicitly tracked for Phase 8, not this phase.

### Canonical References (MUST read/respect, do not modify)
- `src/lib/prospects-schema.ts` — `prospectSchema` (zod), exact payload shape, honeypot `website`, `formRenderedAt`. **Do not modify.**
- `src/app/api/simulateur/route.ts` — already-implemented `POST` handler (spam guard, insert, Resend notification). **Do not modify.**
- `src/app/api/simulateur/route.test.ts` — extend coverage when wiring frontend, do not duplicate.
- `src/data/services.ts` — the 9 finalized slugs: `site-vitrine`, `rebranding-site-premium`, `branding`, `projet-sur-mesure`, `agent-vocal-ia`, `maintenance`, `community-management`, `meta-ads`, `google-ads`.
- `src/lib/serviceJsonLd.ts` — reuse `buildFaqJsonLd`/`buildJsonLdScript` for `/simulateur`'s FAQ block.
- `src/lib/translations.ts` — all simulator copy (questions, options, pillar intro, FAQ, RGPD consent text) belongs here (fr/en/th), per SVC-06 precedent.
- `.planning/phases/05-prospect-capture-backend/05-CONTEXT.md` D-01 (nom/email/téléphone all required), D-03 (raw diagnostic answers stored per question), D-04 (12-month retention — MUST be stated in the RGPD consent text per SIMU-05).
- `.planning/phases/06-service-pages-template-content/06-CONTEXT.md` — 9 finalized slugs/pages, existing CTA wiring already pointing to `/simulateur`.
- `docs/strategie-seo-geo-llm-2026-09.md` §9 — `/simulateur` as transverse pillar page, GEO/AEO citability guidance (SEO-01 sitemap/llms.txt wiring is explicitly Phase 9's job).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIMU-01 | Branching question flow, irrelevant questions skipped based on prior answers | Architecture Pattern 1 (question bank + `nextQuestionId()` pure function); Validation Architecture test row |
| SIMU-02 | Result recommends 2-4 of the 9 services, never all 9 | Architecture Pattern 2 (`computeRecommendedServices()` with fixed-priority tiebreak and 2-4 clamp) |
| SIMU-03 | Result screen shows a purely visual score/gauge, not stored as a metric | Architecture Pattern 2 (`computeVisualScore()`, independent of recommendation scoring) + Pattern 3 (SVG gauge); confirmed `prospectSchema` has no score field |
| SIMU-04 | Contact-capture form appears only between last question and result, never before first question | Architecture Diagram (wizard step machine: questions → contact → result); Pitfall 5 (in-wizard vs. browser Back) |
| SIMU-05 | RGPD consent checkbox (unticked default) with Art. 13 mentions (identity, purpose, legal basis, retention, rights) | Code Examples (honeypot/consent field rendering); `mentions-legales/page.tsx`'s existing Art.13-style language identified as reusable wording source; 12-month retention figure sourced from Phase 5 D-04 |
| SIMU-06 | No price mentioned/shown/estimated at any step | Validation Architecture test row (content-lint check); Don't Hand-Roll table notes Phase 6's price-free precedent |
| SIMU-07 | Result screen offers one clear action (contact) via two channels (call/write), not competing CTAs | Open Question 3 (service-links-vs-single-CTA tradeoff); Security/Architecture diagram final step |
| SIMU-08 | `/simulateur` reads as an explanatory, citable pillar page (GEO/AEO), not a bare form | Architecture Pattern 4 (layout.tsx/page.tsx split, FAQPage JSON-LD reuse, `robots: index/follow` — contrasted with `calculateur-roi`'s `noindex`) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

`C:\portfolio\CLAUDE.md` (project-level) declares this project has a graphify knowledge graph at `graphify-out/`:
- Before answering architecture/codebase questions, read `graphify-out/GRAPH_REPORT.md` first — done in this research session (see Sources).
- If `graphify-out/wiki/index.md` exists, navigate it instead of raw files — not present in this repo; raw-file reading was used instead, consistent with the fallback the rule implies.
- **Actionable for the planner/executor:** after this phase's code files are modified, run `graphify update .` (AST-only, no API cost) to keep the graph current. This should be a final housekeeping step in the phase's last plan/wave, not a per-task action.

No other CLAUDE.md-derived coding conventions apply beyond this — the global `~/.claude/CLAUDE.md` (RTK command-prefixing, ruflo) governs the researching/executing agent's own tool usage, not the code being written.

## Summary

Phase 7 is a pure frontend/content build. The backend (`POST /api/simulateur`, `prospectSchema`, spam guard, Supabase insert, Resend notification) is complete, tested, and **must not be touched**. The only integration surface is the exact JSON shape `prospectSchema` validates: `{ nom, email, telephone, reponsesDiagnostic: {questionId, value: string|string[]}[], servicesRecommandes: string[2-4], consentementRgpd: true, website?: '', formRenderedAt: number }`.

Two independent pure-function computations must be designed on top of a shared question/answer data bank: (1) a **weighted-tag service-recommendation score** (D-05/D-06/D-07/D-08 — sums per-option weights per service slug, tiebreaks via a fixed priority order, always yields 2-4 slugs) and (2) a **severity-derived visual gauge score** (D-09/D-11 — independent 0-100 "opportunity" number, urgency-framed, never sent to the backend — `prospectSchema` has no score field, confirming SIMU-03's "purely visual, not stored as metric"). These are two different numbers computed from the same answers; conflating them is the single biggest design risk for this phase.

No new dependencies are needed or should be installed. zod (already used to define `prospectSchema`), gsap (already used for `ScrollTrigger`-driven scroll-reveals and, critically, an already-shipped **numeric scrub-to-state pattern** in `MethodologySection.tsx` that is the direct precedent for the gauge's count-up), and lucide-react are already in `package.json`. The gauge is a hand-rolled inline SVG (`<circle>` + `stroke-dasharray`/`stroke-dashoffset`), consistent with the zero-charting-library, zero-UI-library precedent locked in `06-UI-SPEC.md`.

**Primary recommendation:** Build `src/lib/simulateur/` as a framework-free TypeScript module (question bank + two pure scoring functions, fully unit-testable with vitest, no React/DOM imports) and drive the actual `/simulateur` wizard's UI off it, mirroring the `layout.tsx` (Server Component: metadata + FAQPage JSON-LD, hardcoded French) / `page.tsx` (`'use client'`: reveals + i18n + wizard state) split already proven on `/services/[slug]`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Question bank + branching order | Browser / Client | — | Pure data + pure function, no server round-trip needed for a 3-5 question flow; matches `calculateur-roi`'s 100%-client precedent |
| Weighted-tag recommendation scoring | Browser / Client | — | Must be computed before submit (payload requires `servicesRecommandes` at POST time); no reason to move to the API since the API already trusts the client-submitted array as-is |
| Visual gauge score | Browser / Client | — | Explicitly "purely visual, non stored as metric" (SIMU-03) — has no reason to ever leave the browser |
| Contact capture + RGPD consent UI | Browser / Client | — | Rendered by the wizard between last question and result (D-13/D-04) |
| Payload validation | API / Backend | Browser / Client (optional pre-check) | `prospectSchema.safeParse` already runs server-side in `route.ts` (unmodifiable); client-side use of the same shared `prospectSchema` for pre-submit UX validation is optional but free (zero extra dependency, same import) |
| Persistence, spam guard, email notification | API / Backend | Database / Storage (Supabase) | Fully built in Phase 5, out of scope, do not modify |
| Pillar intro + FAQ content, JSON-LD | Frontend Server (SSR) for JSON-LD / Browser for i18n copy | — | Mirrors `/services/[slug]/layout.tsx` split exactly |

## Standard Stack

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 [VERIFIED: package.json] | App Router, Server/Client Component split | Already the project's framework — **note:** `PROJECT.md` states "Next.js 14" but the installed version is 16.1.6; treat Next 16 semantics as authoritative for this phase (see Pitfall below) |
| react / react-dom | 19.2.3 [VERIFIED: package.json] | Wizard state, step rendering | Already installed |
| zod | ^4.6.5 [VERIFIED: package.json] | Reuse `prospectSchema` from `src/lib/prospects-schema.ts` for the submit payload (and optionally for client-side pre-submit shape checks) | Already the project's validation library; the schema file is explicitly designed to be imported from both server and client code (no `next/server`/Supabase/`node:crypto` imports) |
| gsap (+ `gsap/ScrollTrigger`) | ^3.15.0 [VERIFIED: package.json] | Count-up/fill animation for the gauge; scroll-reveal for the pillar intro/FAQ | Already the project's only animation library; `MethodologySection.tsx` already proves the exact "GSAP drives a numeric React state, React renders the SVG/CSS from that state" pattern needed for D-12 |
| lucide-react | ^1.47.0 [VERIFIED: package.json] | Optional icons on question options / result cards | Already the project's only icon source (`src/lib/serviceIcons.ts` registry pattern) |

### Supporting
No supporting libraries are required beyond the above. There is no charting library, no state-machine library, no form library, and no accessible-checkbox/radio component library anywhere in `package.json` — the entire codebase is hand-rolled CSS + native HTML form elements (confirmed by `06-UI-SPEC.md`'s explicit "Component library: none" contract, and by `calculateur-roi/page.tsx`'s native `<input type="range">`/`<details>` usage).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled SVG radial gauge | A charting lib (recharts, visx, chart.js) | Rejected — adds a new dependency for one visual element; contradicts the "no UI-library dependencies" precedent (06-UI-SPEC.md) explicitly cited in the phase's research questions |
| Plain `useState` step machine | A wizard/form library (react-hook-form, formik, xstate) | Rejected — 3-5 steps with two pure scoring functions is well within hand-rolled `useState` territory; no existing form library in this codebase, and `ContactSection.tsx`/`calculateur-roi/page.tsx` both already prove plain `useState` is the house style for forms |
| GSAP-driven count-up | A dedicated count-up library (react-countup) | Rejected — GSAP already ships the exact primitive needed (`gsap.to(obj, {v: target, onUpdate})`), proven in `MethodologySection.tsx`; adding a second animation-adjacent dependency for one number is unjustified |

**Installation:** None. No `npm install` needed for this phase.

**Version verification:** All versions above were read directly from the installed `package.json` — no registry lookup was needed since nothing new is being added.

## Package Legitimacy Audit

**Not applicable — this phase installs zero new packages.** Every library used (`next`, `react`, `zod`, `gsap`, `lucide-react`) is already installed and was vetted in prior phases (Phase 5/6). The Package Legitimacy Gate protocol is skipped per its own scope ("whenever this phase installs external packages" — it does not).

**Packages removed due to slopcheck verdict:** none (n/a — no packages evaluated)
**Packages flagged as suspicious:** none (n/a)

## Architecture Patterns

### System Architecture Diagram

```
Visitor lands on /simulateur
        |
        v
[layout.tsx — Server Component]
  - generateMetadata (title/description/canonical, robots: index+follow)
  - buildFaqJsonLd(faq, url) -> buildJsonLdScript() -> <script type="application/ld+json">
  - hardcoded FRENCH copy only (i18n is client-only post-hydration, same
    documented gap as /services/[slug]/layout.tsx)
        |
        v
[page.tsx — 'use client']
  - Navbar / pillar intro (data-reveal, useReveals()) / FAQ block (t.simulateur.faq)
        |
        v
  [Wizard state machine: step index + answers[] in useState]
        |
        +--> step 0..N-1: Question screens (single/multi-select, Likert)
        |      - "Next" advances step, computed via nextQuestionId(answers)
        |      - "Back" (D-15) decrements step, does NOT clear stored answer
        |
        +--> step N: Contact capture screen (D-13/D-04)
        |      - nom / email / telephone inputs
        |      - RGPD consent checkbox (unticked default) + Art.13 text
        |      - honeypot `website` field (visually hidden, always empty)
        |      - formRenderedAt captured once at wizard mount (not here)
        |      - on submit: compute BOTH pure functions, POST to /api/simulateur
        |
        v
  [Pure functions — src/lib/simulateur/*.ts, no React/DOM imports]
        |
        +--> computeRecommendedServices(answers) -> 2-4 service slugs
        |      (weighted-tag sum + fixed-priority tiebreak, D-05..D-08)
        |
        +--> computeVisualScore(answers) -> 0-100 number
               (severity-derived, independent of the above, D-09/D-11 —
               NEVER included in the POST body)
        |
        v
  [Result screen — step N+1]
        - Radial gauge (SVG, animates 0 -> computeVisualScore() on mount)
        - 2-4 recommended service names/blurbs (from computeRecommendedServices())
        - Single CTA, two channels: tel: link + mailto:/#contact link (SIMU-07)
        |
        v
  fetch('/api/simulateur', { method: 'POST', body: JSON.stringify(prospectSchema-shaped payload) })
        |
        v
  [Already-built backend — src/app/api/simulateur/route.ts — UNTOUCHED]
```

### Recommended Project Structure
```
src/
├── app/
│   └── simulateur/
│       ├── layout.tsx        # Server Component: metadata + FAQPage JSON-LD (hardcoded fr)
│       └── page.tsx          # 'use client': pillar intro + wizard + FAQ, useReveals(), useLanguage()
├── lib/
│   └── simulateur/
│       ├── questions.ts      # question bank: id, type, options[], each option tagged with
│       │                     #   { weights: Partial<Record<ServiceSlug, number>>, severity: number }
│       ├── scoring.ts        # computeRecommendedServices(answers), computeVisualScore(answers)
│       │                     #   — pure, no React/DOM imports, importable by both page.tsx and tests
│       └── priorityOrder.ts  # PRIORITY_ORDER: ServiceSlug[] (fixed tiebreak order, D-07)
│   └── prospects-schema.ts   # EXISTING — reused verbatim, do not modify
└── (scoring.ts and questions.ts MUST be named *.ts, not *.tsx — see Pitfall 2 below)
```

### Pattern 1: Question bank as data, not branching `if` chains
**What:** Every question is a data record `{ id, type: 'single'|'multi', textKey, options: [{ value, labelKey, weights, severity }] }`. "Branching" (SIMU-01, D-03) is expressed as a pure function `nextQuestionId(answers: Answer[]): string | null` that reads prior answers and returns which question comes next (or `null` when done) — never a hardcoded sequence of screens with embedded conditionals in JSX.
**When to use:** Any time question order/visibility depends on prior answers, since it keeps the wizard component a thin renderer over data + one pure function (fully unit-testable without mounting React).
**Example:**
```typescript
// src/lib/simulateur/questions.ts — plain data, no framework imports
export type ServiceSlug =
  | 'site-vitrine' | 'rebranding-site-premium' | 'branding' | 'projet-sur-mesure'
  | 'agent-vocal-ia' | 'maintenance' | 'community-management' | 'meta-ads' | 'google-ads';

export interface QuestionOption {
  value: string;
  weights: Partial<Record<ServiceSlug, number>>; // recommendation signal (D-05)
  severity: number;                               // 0-100, feeds the visual gauge (D-09), independent axis
}
export interface Question {
  id: string;
  type: 'single' | 'multi';
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'secteur',
    type: 'single',
    options: [
      { value: 'commerce', weights: { 'site-vitrine': 1, 'meta-ads': 1 }, severity: 50 },
      { value: 'restauration', weights: { 'agent-vocal-ia': 2, 'site-vitrine': 1 }, severity: 50 },
      // ... D-06: sector NEVER hard-excludes, only adjusts weight
    ],
  },
  // 2-4 more questions, mostly Likert-style severity scales (D-03)
];

// Pure — no side effects, no DOM. Import directly in vitest without mounting React.
export function nextQuestionId(answers: { questionId: string; value: string | string[] }[]): string | null {
  const answered = new Set(answers.map((a) => a.questionId));
  const next = QUESTIONS.find((q) => !answered.has(q.id));
  return next ? next.id : null;
}
```

### Pattern 2: Two independent pure scoring functions sharing one answer bank
**What:** `computeRecommendedServices` sums `weights` per service, sorts, tiebreaks via `PRIORITY_ORDER`, and clamps to 2-4 slugs. `computeVisualScore` averages/aggregates `severity` (or inverts it, per D-11's "lower = more opportunity" framing) into a single 0-100 number. Both take the exact same `answers` array and return primitives — no React, no DOM, no `Date.now()`, fully deterministic and unit-testable.
**When to use:** Always for this phase — this is the load-bearing logic behind SIMU-02 and SIMU-03.
**Example:**
```typescript
// src/lib/simulateur/scoring.ts
import { QUESTIONS, type ServiceSlug } from './questions';
import { PRIORITY_ORDER } from './priorityOrder';

type Answer = { questionId: string; value: string | string[] };

const ALL_SLUGS: ServiceSlug[] = [
  'site-vitrine', 'rebranding-site-premium', 'branding', 'projet-sur-mesure',
  'agent-vocal-ia', 'maintenance', 'community-management', 'meta-ads', 'google-ads',
];

function forEachSelectedOption(answers: Answer[], fn: (o: import('./questions').QuestionOption) => void) {
  for (const a of answers) {
    const q = QUESTIONS.find((q) => q.id === a.questionId);
    if (!q) continue;
    const values = Array.isArray(a.value) ? a.value : [a.value];
    for (const v of values) {
      const opt = q.options.find((o) => o.value === v);
      if (opt) fn(opt);
    }
  }
}

export function computeRecommendedServices(answers: Answer[]): ServiceSlug[] {
  const scores: Record<string, number> = Object.fromEntries(ALL_SLUGS.map((s) => [s, 0]));
  forEachSelectedOption(answers, (opt) => {
    for (const [slug, w] of Object.entries(opt.weights)) scores[slug] += w ?? 0;
  });

  const sorted = [...ALL_SLUGS].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b); // D-07 fixed tiebreak
  });

  const scored = sorted.filter((s) => scores[s] > 0);
  if (scored.length >= 2) return scored.slice(0, 4);       // clamp to max 4
  // Guard: pad from PRIORITY_ORDER so the schema's .min(2) is always satisfiable
  return sorted.slice(0, 2);
}

export function computeVisualScore(answers: Answer[]): number {
  let total = 0;
  let count = 0;
  forEachSelectedOption(answers, (opt) => { total += opt.severity; count += 1; });
  if (count === 0) return 0;
  return Math.round(total / count); // 0-100; D-11: caller frames LOW as "opportunity", not a compliment
}
```

### Pattern 3: SVG radial gauge + GSAP count-up (no charting library)
**What:** A `<circle>` pair (`stroke-dasharray`/`stroke-dashoffset`) driven by a React state value that GSAP tweens from 0 to the target score, exactly mirroring the already-shipped scrub-to-state pattern in `MethodologySection.tsx` (there: `ScrollTrigger.onUpdate` → `setRailFill`; here: `gsap.to(obj, {onUpdate})` → `setValue`).
**When to use:** The result screen's gauge (D-10/D-12).
**Example:**
```typescript
// Source: pattern adapted from src/components/sections/MethodologySection.tsx (verified in this repo)
'use client';
import { useEffect, useState } from 'react';
import gsap from 'gsap';

function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target); // respects prefers-reduced-motion, same branch shape as useReveals()
      return;
    }
    const obj = { v: 0 };
    const tween = gsap.to(obj, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => setValue(obj.v) });
    return () => { tween.kill(); };
  }, [target]);
  return value;
}

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score }: { score: number }) {
  const animated = useCountUp(score);
  const offset = CIRCUMFERENCE * (1 - animated / 100);
  return (
    <svg viewBox="0 0 200 200" width={200} height={200}>
      <circle cx={100} cy={100} r={RADIUS} stroke="var(--line)" strokeWidth={14} fill="none" />
      <circle
        cx={100} cy={100} r={RADIUS} stroke="var(--acid)" strokeWidth={14} fill="none"
        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 100 100)"
      />
      <text x={100} y={108} textAnchor="middle" fontSize={36} fill="var(--ink)">{Math.round(animated)}</text>
    </svg>
  );
}
```

### Pattern 4: layout.tsx / page.tsx split (routing convention)
**What:** `src/app/simulateur/layout.tsx` is a Server Component exporting `metadata` (title/description/canonical `/simulateur`, `robots: { index: true, follow: true }` — **not** `calculateur-roi`'s `noindex` precedent, since SIMU-08 explicitly wants this page crawlable/citable) and rendering the FAQPage JSON-LD `<script>` via `buildFaqJsonLd`/`buildJsonLdScript` (both reused verbatim from `src/lib/serviceJsonLd.ts`). `src/app/simulateur/page.tsx` stays `'use client'` for `useReveals()` and `useLanguage()`, exactly like `/services/[slug]/page.tsx`.
**When to use:** This is the only precedent in the codebase for a page needing both server-rendered JSON-LD and client-side i18n/animation — follow it exactly, do not deviate.
**Example:**
```typescript
// Source: src/app/services/[slug]/layout.tsx (verified in this repo) — same shape, no [slug] param
import type { Metadata } from "next";
import { translations } from "@/lib/translations";
import { buildFaqJsonLd, buildJsonLdScript } from "@/lib/serviceJsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export const metadata: Metadata = {
  title: translations.fr.simulateur.metaTitle,
  description: translations.fr.simulateur.metaDescription,
  alternates: { canonical: "/simulateur" },
  robots: { index: true, follow: true },
};

export default function SimulateurLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildFaqJsonLd(translations.fr.simulateur.faq, `${SITE_URL}/simulateur`);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLdScript(jsonLd) }} />
      {children}
    </>
  );
}
```

### Anti-Patterns to Avoid
- **Sending the visual gauge score to the backend:** `prospectSchema` has no score field — adding one client-side and hoping the server ignores extra keys works today (zod strips unknown keys by default) but conflates a "purely visual" number (SIMU-03) with stored data. Keep `computeVisualScore` fully client-local; never add it to the POST body.
- **Modifying `src/app/api/simulateur/route.ts` or `src/lib/prospects-schema.ts`:** Explicitly forbidden by CONTEXT.md canonical refs. Every change needed to make submission work is achievable from the client side alone.
- **CAPTCHA on the contact-capture step:** Phase 5's research explicitly rejected CAPTCHA as excessive friction for this audience; the honeypot + timing guard is already the full anti-spam mechanism and needs no client-side counterpart beyond rendering the two required fields.
- **A new charting/wizard/form library:** Contradicts the zero-dependency precedent this whole milestone has followed (Phase 5 added only zod+vitest for a hard technical need; Phase 6 added nothing).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Submit payload shape/validation | A second, hand-typed interface for the POST body | `prospectSchema` from `src/lib/prospects-schema.ts` (import it in the wizard's submit handler, e.g. `prospectSchema.parse(payload)` before `fetch`, or at minimum use `ProspectSubmission` as the payload's TypeScript type) | It's already free of server-only imports specifically so client code can import it; any hand-typed duplicate risks drifting from the server's actual `.min()`/`.max()` constraints (e.g. forgetting `servicesRecommandes` needs 2-4 items) |
| FAQ schema.org markup | A new JSON-LD object literal per page | `buildFaqJsonLd` + `buildJsonLdScript` from `src/lib/serviceJsonLd.ts` | Already handles the `<` escaping needed to safely use `dangerouslySetInnerHTML` (mitigates the XSS vector the file's own comment documents) |
| Scroll-reveal-on-view | A new IntersectionObserver setup | `useReveals()` from `src/hooks/useReveals.ts` (`data-reveal` / `data-reveal-delay` attributes) | Already handles `prefers-reduced-motion`, MutationObserver-based re-sweep for dynamically added DOM (relevant since wizard steps mount/unmount), and is the codebase's only reveal mechanism — a second one would fight it for the same attribute |
| Numeric count-up animation | A `requestAnimationFrame` loop or a new npm count-up package | `gsap.to(obj, { v: target, onUpdate })` pattern, already proven in `MethodologySection.tsx`'s `railFill` state | GSAP is already the dependency; this is literally copy-adjacent code that already ships in this repo |
| Honeypot + timing spam guard | A new spam check in the wizard | Nothing to build — `isSpamSubmission` already runs server-side; the wizard's only job is to render the `website` field (empty, hidden) and capture `formRenderedAt = Date.now()` once at mount | Rebuilding any part of this client-side would be redundant and cannot change server behavior anyway |

**Key insight:** Every "backend-adjacent" concern in this phase (validation shape, spam fields, JSON-LD escaping) already has a single canonical implementation in this codebase from Phase 5/6. The only genuinely new code is the question bank, the two pure scoring functions, and the wizard's own step-rendering — everything else is import-and-reuse.

## Common Pitfalls

### Pitfall 1: Conflating the two scores
**What goes wrong:** Using the same number for both "which services to recommend" and "what the gauge shows" — e.g. showing the raw weighted-tag sum on the gauge, or using severity to pick services.
**Why it happens:** D-05..D-08 (recommendation) and D-09..D-12 (gauge) are adjacent sections in CONTEXT.md and both derive from "the answers," making it easy to reach for one function where two are needed.
**How to avoid:** Two named pure functions (`computeRecommendedServices`, `computeVisualScore`) with different return shapes (`ServiceSlug[]` vs `number`) and no shared intermediate value, as shown in Pattern 2.
**Warning signs:** Any code path where changing `severity` values would change which services get recommended, or where changing `weights` would move the gauge needle.

### Pitfall 2: vitest will silently skip `.tsx` test files
**What goes wrong:** `vitest.config.ts` sets `include: ['src/**/*.test.ts']` — note: **not** `.test.tsx`. A scoring-logic test file named e.g. `scoring.test.tsx` (easy to do if the file is co-located with a React component) will never run, and `passWithNoTests: true` means the suite reports green with zero tests executed — no visible failure.
**Why it happens:** Copy-pasting a `.tsx` extension out of habit for anything "wizard-related," or placing the test next to a component file.
**How to avoid:** Keep `src/lib/simulateur/{questions,scoring,priorityOrder}.ts` and their `*.test.ts` (not `.tsx`) files free of JSX/React imports entirely — verified in this research to be achievable since neither scoring function needs React.
**Warning signs:** `npm run test` reports 0 tests for a file you just wrote; always confirm test count in output, not just the vitest exit code.

### Pitfall 3: `formRenderedAt` and hydration
**What goes wrong:** Capturing `Date.now()` at module scope or directly in JSX during render can produce a React hydration warning (server-rendered timestamp differs from the client's first paint) if that value is ever reflected into rendered markup (e.g. a debug display).
**Why it happens:** Next.js Client Components are still server-rendered for the initial HTML; any browser-clock-derived value computed during render (not inside `useEffect` or a `useState` initializer that isn't echoed into the DOM) can differ between the server pass and the client hydration pass.
**How to avoid:** Capture it via `useState(() => Date.now())` at the wizard's top-level component (runs once, consistently, on both passes) and never render the raw number into JSX. This mirrors this codebase's own established pattern in `LanguageContext.tsx`, where `lang` starts as a fixed `'fr'` on both server and client and is only adjusted post-mount inside `useEffect`.
**Warning signs:** React DevTools/console hydration mismatch warnings on `/simulateur`'s first load.

### Pitfall 4: The `PROJECT.md` "Next.js 14" claim is stale
**What goes wrong:** Planning against Next.js 14 App Router semantics/APIs when the installed version is actually **16.1.6** (`package.json`, verified) — e.g. assuming `params` is a plain object rather than a `Promise` (Next 15+ requires `await params` / `use(params)`, as `/services/[slug]/page.tsx` already demonstrates), or missing the `dynamicParams` 404-routing bug documented inline in `/services/[slug]/layout.tsx` (`vercel/next.js#84738`/`#87738`, relevant if a future dynamic segment is ever added under `/simulateur`).
**Why it happens:** `PROJECT.md`'s "Tech stack" line was written at v1.0 and never updated after a silent framework upgrade during v1.1.
**How to avoid:** `/simulateur` has no dynamic route segment, so the `params`-as-`Promise` concern doesn't directly apply here, but the planner should treat Next 16 (not 14) as ground truth for any App Router API question, and flag the stale `PROJECT.md` line for correction in a later phase-transition pass (not this phase's job to fix, per scope).
**Warning signs:** Any App Router behavior that "used to work in Next 14" but doesn't — check the installed version before assuming a docs gap.

### Pitfall 5: Browser Back button vs. in-wizard Back
**What goes wrong:** D-15 grants in-wizard "Back" navigation between question steps, but this is pure React state (step index decrement) — it has no relationship to the browser's native Back button, which (since `/simulateur` is a single URL with no per-step routing, matching `calculateur-roi`'s precedent of zero query-param/hash state for its own internal toggles) will simply navigate the visitor away from `/simulateur` entirely, discarding all wizard progress.
**Why it happens:** Conflating "Back" as a UI affordance (a button inside the wizard) with "back" as browser history navigation.
**How to avoid:** Implement D-15 as a plain in-component "Précédent" button that decrements a `useState` step index (no History API, no per-step URL) — this matches the codebase's existing zero-router-state convention for stateful pages. Do not attempt to intercept the native Back button (no existing precedent for `history.pushState` interception anywhere in this codebase; introducing one would be new complexity with no CONTEXT.md mandate).
**Warning signs:** A user reports "I hit back and lost all my answers" — this is expected/acceptable per this recommendation, not a bug, but should be a conscious decision documented in the plan rather than an accident.

### Pitfall 6: Hardcoded-French JSON-LD is a known, accepted gap
**What goes wrong:** Assuming the FAQPage JSON-LD in `layout.tsx` should read from `useLanguage()`'s active locale.
**Why it happens:** Everywhere else on the page, copy comes from `t.simulateur.*` reactively.
**How to avoid:** `layout.tsx` is a Server Component — it cannot access the client-only `LanguageContext`. `/services/[slug]/layout.tsx`'s own comment documents this as an intentional, pre-existing gap (the crawled/JSON-LD version of every page is always the French source, same as the root `layout.tsx`'s global JSON-LD). Follow the same convention for `/simulateur` rather than trying to "fix" it in this phase — that would be new, out-of-scope work.
**Warning signs:** Attempting `useLanguage()` inside `layout.tsx` will throw ("must be used inside LanguageProvider") since Server Components render outside the client provider tree.

## Code Examples

### Assembling the exact submit payload (confirmed against `prospectSchema`)
```typescript
// Source: src/lib/prospects-schema.ts (verified in this repo, field-for-field)
import { prospectSchema, type ProspectSubmission } from '@/lib/prospects-schema';

async function submitDiagnostic(input: {
  nom: string; email: string; telephone: string;
  reponsesDiagnostic: { questionId: string; value: string | string[] }[];
  servicesRecommandes: string[]; // 2-4 items — from computeRecommendedServices()
  consentementRgpd: true;
  formRenderedAt: number; // captured once at wizard mount
}) {
  const payload: ProspectSubmission = { ...input, website: '' };
  prospectSchema.parse(payload); // optional client-side guard, mirrors server's own check
  const res = await fetch('/api/simulateur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ ok: true } | { error: string }>;
}
```

### Honeypot + timing field rendering (server-verified contract)
```tsx
// website: visually hidden, must stay empty for legitimate users.
// formRenderedAt: captured ONCE at mount via useState initializer (Pitfall 3),
// compared server-side against SPAM_MIN_ELAPSED_MS = 2000 (src/lib/prospects-schema.ts).
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
  aria-hidden="true"
/>
```

### RGPD consent copy — reusable identity/purpose/rights language
There is no existing consent-checkbox pattern anywhere in the codebase (`/api/contact`'s `ContactSection.tsx` has no consent UI at all) — this is genuinely net-new for SIMU-05. However, `src/app/mentions-legales/page.tsx` already states the data-controller identity and the rights list in Art.13-compatible language, reusable verbatim for the consent text's "identité du responsable" and "droits" clauses:
```text
Responsable du traitement : Sèvalys — Anatholy Bricon, Tours (37), France — contact@sevalys.com
Finalité : qualification de votre demande et prise de contact par notre équipe
Base légale : consentement (case ci-dessus)
Durée de conservation : 12 mois si non converti en client, puis suppression automatique
  (per 05-CONTEXT.md D-04 — note this is a DIFFERENT retention period from
  mentions-legales.tsx's existing "3 ans" contact-form figure; the prospects
  table has its own, shorter, pg_cron-purged retention window — do not copy
  the 3-year figure for this form)
Droits : accès, rectification, effacement, limitation, opposition, portabilité
  — exerçables auprès de contact@sevalys.com, réclamation possible auprès de la CNIL
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — no prior simulator implementation exists | This is a greenfield page within an already-established codebase convention set | Phase 5/6 (2026-09-20) | The "current approach" is simply "match Phase 5/6's conventions exactly" — there is no legacy pattern to migrate away from |

**Deprecated/outdated:** Nothing deprecated in-scope. The one stale fact is `PROJECT.md`'s "Next.js 14" line (see Pitfall 4) — informational only, not a blocker.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 3-5 question copy, exact option wording, exact weight values, and the fixed D-07 tiebreak priority order shown in Pattern 1/2's examples are illustrative only, not final content — CONTEXT.md explicitly marks all of this as Claude's Discretion, to be drafted during planning/execution, not decided by research | Architecture Patterns (Pattern 1, Pattern 2) | Low — CONTEXT.md already flags this as open; the planner/executor is expected to draft final copy and values, informed by which services the agency wants to lead with (business input this research has no access to) |
| A2 | `servicesRecommandes` should be submitted as `services.ts` slugs (e.g. `'site-vitrine'`) rather than display names (e.g. `'Site Vitrine'`) — the zod schema (`z.array(z.string())`) accepts either, but slugs are the canonical identifier used everywhere else in Phase 6, at the cost of a less "pretty" Resend notification email (which the route.ts template renders as raw joined strings and cannot be reformatted without touching the forbidden route.ts file) | Don't Hand-Roll, Code Examples | Medium — if the team wants a human-readable email, the wizard would need to submit display names instead (or a hybrid); this is a genuine open tradeoff, not just copy — flagged again in Open Questions |
| A3 | "Animates on reveal" (D-12) is interpreted as "animates when the result screen becomes visible/mounts" (a wizard step transition), not as an `IntersectionObserver`/scroll-triggered reveal like the pillar intro's `data-reveal` sections — since the result screen is reached via in-wizard step advancement, not page scrolling | Architecture Patterns (Pattern 3) | Low — either interpretation produces a working, motion-consistent gauge; worth confirming with a human if the distinction matters for the "explanatory pillar page" framing (D-16) which does use true scroll-reveal above the wizard |
| A4 | The RGPD consent copy's legal-basis/retention/rights language may be drafted by reusing `mentions-legales/page.tsx`'s existing wording as a base, adapted for the 12-month (not 3-year) retention figure — this is a reasonable drafting shortcut, not a verified legal-compliance review | Code Examples (RGPD consent copy) | Medium — Art. 13 compliance is a legal requirement (SIMU-05); this research provides a structurally complete starting point sourced from the site's own existing legal page, but final wording should get a human legal-language pass before shipping, same as any other legal text |

## Open Questions

1. **Should `servicesRecommandes` carry slugs or display names?**
   - What we know: the zod schema imposes no format constraint (`z.array(z.string()).min(2).max(4)`); slugs are the sitewide canonical identifier (Phase 6); the Resend email template (unmodifiable) renders whatever strings are submitted, joined with `, `.
   - What's unclear: whether the Sèvalys team's inbox notification readability matters enough to prefer display names over slugs, given the backend can't be changed to reformat them.
   - Recommendation: default to slugs (consistent, matches A2's reasoning above) unless a human explicitly prioritizes email readability; either choice is a same-day change confined to the wizard's submit-assembly code.

2. **Exact severity → gauge-score aggregation formula.**
   - What we know: D-09 wants a single overall score; D-11 wants it urgency-framed (low = opportunity); the question bank's Likert-style answers (D-03) are the natural signal source.
   - What's unclear: simple average of per-answer `severity` values (as shown in Pattern 2's example) vs. a weighted average favoring certain questions vs. an explicit inversion (`100 - averageSeverity`) depending on how `severity` is defined (does a high number mean "healthy" or "struggling"?).
   - Recommendation: define `severity` explicitly as "how much this answer indicates unmet need" (higher = more opportunity = lower displayed gauge value after inversion, OR just display the raw need-score directly framed as "opportunity score" rather than "health score" — avoids an inversion step entirely). Decide and document the exact polarity in the plan before writing `computeVisualScore`, since getting this backwards would make a struggling business see a falsely reassuring high gauge score.

3. **Does the result screen link out to `/services/[slug]` pages, or only display names/blurbs?**
   - What we know: SIMU-07 requires exactly one clear action (contact, two channels) — it does not require service-page deep links. `/services/[slug]` pages already exist and could be linked for more info.
   - What's unclear: whether adding secondary "learn more" links per recommended service would compete with the "single clear action" requirement (SIMU-07 explicitly warns against "two competing objectives").
   - Recommendation: if service names are shown as plain text/cards (no links), SIMU-07 compliance is unambiguous; if the planner wants deep links, keep them visually secondary (e.g. small "en savoir plus" text links, not buttons) so they don't compete with the primary appeler/écrire CTA.

## Environment Availability

No new external dependencies are introduced by this phase. The backend this phase's wizard calls (`RESEND_API_KEY`, Supabase service-role env vars) was already configured and verified end-to-end in Phase 5 (`05-04-PLAN.md`'s live verification wave) and is unmodified here — `.env`, `.env.example`, and `.env.local` already exist in the repo root. This phase adds only static frontend code (page/layout/components/pure functions) with a single `fetch()` call to an already-live same-origin endpoint; there is nothing further to probe.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.11 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` — `include: ['src/**/*.test.ts']` (note: `.ts` only, not `.tsx` — see Pitfall 2), `environment: 'node'`, `passWithNoTests: true` |
| Quick run command | `npm run test -- src/lib/simulateur` (or `npx vitest run src/lib/simulateur`) |
| Full suite command | `npm run test` (runs `vitest run` — full repo) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIMU-01 | `nextQuestionId(answers)` returns the correct next question id given prior answers, and `null` once all applicable questions are answered | unit | `npx vitest run src/lib/simulateur/questions.test.ts` | ❌ Wave 0 |
| SIMU-02 | `computeRecommendedServices(answers)` always returns 2-4 unique slugs, never all 9, ties broken by `PRIORITY_ORDER` | unit | `npx vitest run src/lib/simulateur/scoring.test.ts` | ❌ Wave 0 |
| SIMU-03 | `computeVisualScore(answers)` returns a number in [0,100]; the POST payload assembled by the wizard never includes a score field | unit | `npx vitest run src/lib/simulateur/scoring.test.ts` | ❌ Wave 0 |
| SIMU-04 | Contact-capture UI is unreachable before the last question and unavoidable before the result step (wizard step-order assertion) | unit (pure step-machine function, not full component mount) | `npx vitest run src/lib/simulateur/wizardSteps.test.ts` (if a `computeSteps`/step-order helper is extracted) | ❌ Wave 0 |
| SIMU-05 | Submitted payload always has `consentementRgpd: true` (never submittable unless checkbox ticked) — covered indirectly by the existing `route.test.ts` (`rejects consentementRgpd: false`); this phase's own test should assert the wizard's submit handler refuses to call `fetch` unless the checkbox state is `true` | unit | `npx vitest run src/lib/simulateur/*.test.ts` | ❌ Wave 0 (existing `src/app/api/simulateur/route.test.ts` already covers the server side) |
| SIMU-06 | No price string appears anywhere in `t.simulateur.*` copy (grep-style content assertion, same spirit as Phase 6's price-free gate) | unit/content-lint | `npx vitest run src/lib/simulateur/content.test.ts` (or reuse Phase 6's price-audit approach if it was extracted to a shared helper) | ❌ Wave 0 — check whether Phase 6 (`06-07-PLAN.md`) left a reusable price-string checker |
| SIMU-07 | Result screen exposes exactly one CTA concept with two channels (tel + écrire), not two competing CTAs — likely a manual/visual check given this is JSX composition, not pure logic | manual | n/a (documented in plan as a UAT checklist item) | n/a |
| SIMU-08 | `/simulateur` renders a `FAQPage` JSON-LD script tag server-side, mirroring the existing `serviceJsonLd.test.ts`-style assertion pattern if one exists for Phase 6 | unit/integration | `npx vitest run src/app/simulateur/layout.test.ts` (if written) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/simulateur`
- **Per wave merge:** `npm run test` (full suite, includes the untouched `src/app/api/simulateur/route.test.ts` and `src/lib/prospects-schema.test.ts` as regression guards that this phase must not break)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/simulateur/questions.ts` + `questions.test.ts` — question bank + `nextQuestionId`
- [ ] `src/lib/simulateur/scoring.ts` + `scoring.test.ts` — `computeRecommendedServices`, `computeVisualScore`
- [ ] `src/lib/simulateur/priorityOrder.ts` — fixed `PRIORITY_ORDER` (D-07)
- [ ] Confirm whether Phase 6 left a reusable "no price string" content-lint helper to extend for SIMU-06, or whether one needs writing fresh
- [ ] No new test framework/config install needed — vitest is already configured and picks up any `src/**/*.test.ts` automatically

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface in this phase (public wizard, no accounts) |
| V3 Session Management | No | Stateless wizard, no session/cookie introduced |
| V4 Access Control | No | Public page, no privileged actions |
| V5 Input Validation | Yes | Reuse `prospectSchema` (zod) client-side as an optional pre-submit guard; server-side validation is already enforced by the unmodifiable `route.ts` |
| V6 Cryptography | No | No new crypto — `route.ts` already sha256-hashes IPs server-side, untouched by this phase |
| V13 API and Web Service | Yes (partial) | The wizard is a same-origin `fetch()` client to an existing endpoint; no CORS, no new API surface introduced |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via unescaped user copy in JSON-LD `<script>` | Tampering | Already mitigated — reuse `buildJsonLdScript()`'s `<` escaping verbatim (do not hand-roll a second JSON-LD serializer) |
| Automated/bot form submission | Denial of Service (resource exhaustion via spam inserts) | Already mitigated server-side (`isSpamSubmission` — honeypot + timing); this phase's only job is correctly rendering the two required fields (Pitfall/Code Example above), not re-implementing the check |
| Reflected content in the Resend notification email | Tampering | Already mitigated server-side (`escapeHtml` in `route.ts`) — the wizard has no email-rendering responsibility |
| Client-side-only validation bypass (a scripted client posts directly to `/api/simulateur` skipping the wizard) | Tampering/Spoofing | Not a new risk introduced by this phase — `prospectSchema.safeParse` already re-validates server-side regardless of what the client sends; this phase's client-side use of the schema is a UX nicety, not a security boundary |

## Sources

### Primary (HIGH confidence — read directly from the repo in this session)
- `src/lib/prospects-schema.ts` — exact `prospectSchema` shape, `isSpamSubmission`, `SPAM_MIN_ELAPSED_MS`
- `src/app/api/simulateur/route.ts` — full POST handler behavior, response shapes, escaping
- `src/app/api/simulateur/route.test.ts` — confirms expected payload shape via test fixtures
- `src/data/services.ts` — 9 finalized slugs, `getServiceBySlug`
- `src/lib/serviceJsonLd.ts` — `buildFaqJsonLd`, `buildJsonLdScript`
- `src/app/services/[slug]/layout.tsx`, `src/app/services/[slug]/page.tsx` — layout/page split convention, hardcoded-French JSON-LD precedent
- `src/hooks/useReveals.ts` — reveal/`prefers-reduced-motion` pattern
- `src/components/sections/MethodologySection.tsx` — GSAP `ScrollTrigger` scrub-to-state pattern (direct precedent for the gauge)
- `src/app/calculateur-roi/page.tsx`, `layout.tsx` — plain-`useState` multi-field client tool precedent, `noindex` counter-example
- `src/context/LanguageContext.tsx` — hydration-safe client-only-state-adjustment pattern
- `src/lib/translations.ts` — i18n structure/type shape (`ServicePageContent`, locale block layout)
- `src/app/mentions-legales/page.tsx` — existing Art.13-compatible data-controller identity/rights language, reused as SIMU-05 consent-copy source
- `src/components/sections/ContactSection.tsx`, `src/app/api/contact/route.ts` — confirmed no existing RGPD consent-checkbox pattern in this codebase (net-new for SIMU-05)
- `vitest.config.ts` — test include pattern (`.ts` only)
- `package.json` — exact installed dependency versions (Next 16.1.6, React 19.2.3, zod ^4.6.5, gsap ^3.15.0)
- `.planning/phases/05-prospect-capture-backend/05-CONTEXT.md`, `.planning/phases/06-service-pages-template-content/06-UI-SPEC.md` — locked prior-phase decisions this phase must not contradict
- `graphify-out/GRAPH_REPORT.md` — read per project CLAUDE.md's graphify rule before searching raw files; confirmed `POST()`/`isSpamSubmission()`/`useReveals()` as the graph's own-flagged god-node relationships, consistent with this research's findings

### Secondary (MEDIUM confidence)
- None — no external web sources were needed; every question in the phase brief was answerable directly from the existing, already-built codebase.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version/library claim verified directly against `package.json`, no speculation
- Architecture: HIGH — every pattern cited has a working, shipped precedent in this exact repo (not a generic best-practice guess)
- Pitfalls: HIGH for hydration/vitest-config/version-mismatch (directly observed); MEDIUM for browser-back-button UX call (a reasoned recommendation, not something CONTEXT.md dictates)

**Research date:** 2026-09-20
**Valid until:** 2026-10-20 (30 days — this research is entirely internal-codebase-derived and stable; re-verify only if `package.json` dependency versions change before planning executes)
