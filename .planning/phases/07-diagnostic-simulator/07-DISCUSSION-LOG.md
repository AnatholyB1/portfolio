# Phase 7: Diagnostic Simulator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 7-diagnostic-simulator
**Areas discussed:** Question content & branching, Recommendation logic, Score/gauge visual, Wizard UX & pillar framing

---

## Question content & branching

| Option | Description | Selected |
|--------|-------------|----------|
| Main problem/goal first | Maps directly to services, no sector content needed | |
| Business type/sector first | Richer but generic since sector-specific sets are v2 | ✓ |

**User's choice:** Business type/sector first
**Notes:** Entry question stays a single generic-option question — does not require building `/secteurs/*` content.

| Option | Description | Selected |
|--------|-------------|----------|
| 3-5 questions | Fast, low-friction | ✓ |
| 6-8 questions | More granular, higher drop-off risk | |

**User's choice:** 3-5 questions

| Option | Description | Selected |
|--------|-------------|----------|
| Binary gate questions | Existence checks, clean routing | |
| Severity/satisfaction scales | Likert-style, more nuanced | ✓ |

**User's choice:** Severity/satisfaction scales
**Notes:** Flagged in CONTEXT.md that combining this with only 3-5 questions needs careful scoring design to stay deterministic.

| Option | Description | Selected |
|--------|-------------|----------|
| Single-select only | Simplest | |
| Mixed | Single for gates, multi for "which apply" | ✓ |

**User's choice:** Mixed

---

## Recommendation logic

| Option | Description | Selected |
|--------|-------------|----------|
| Weighted tag scoring | Tag+weight per answer, sum, top 2-4 win | ✓ |
| Decision tree / fixed paths | Hardcoded bundles per answer combo | |

**User's choice:** Weighted tag scoring

| Option | Description | Selected |
|--------|-------------|----------|
| Never hard-excludes | Sector adjusts weight only | ✓ |
| Hard-excludes some services | Certain sectors can't get certain services | |

**User's choice:** Never hard-excludes

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed priority order | Agency-ranked tiebreaker | ✓ |
| No explicit tiebreak | Risks exceeding 4 | |

**User's choice:** Fixed priority order

| Option | Description | Selected |
|--------|-------------|----------|
| Can stand alone | Maintenance can be sole recommendation | ✓ |
| Always paired | Never recommended alone | |

**User's choice:** Can stand alone

---

## Score/gauge visual

| Option | Description | Selected |
|--------|-------------|----------|
| Single overall gauge | One score | ✓ |
| Per-service match bars | 2-4 individual bars | |

**User's choice:** Single overall gauge

| Option | Description | Selected |
|--------|-------------|----------|
| Radial/circular gauge | Speedometer-style | ✓ |
| Horizontal bar(s) | Simpler, responsive | |

**User's choice:** Radial/circular gauge

| Option | Description | Selected |
|--------|-------------|----------|
| Urgency-framed | Lower score = more opportunity | ✓ |
| Maturity-framed | Higher score = more mature | |

**User's choice:** Urgency-framed

| Option | Description | Selected |
|--------|-------------|----------|
| Animated reveal | Count-up/fill, GSAP-consistent | ✓ |
| Static | No animation | |

**User's choice:** Animated reveal

---

## Wizard UX & pillar framing

| Option | Description | Selected |
|--------|-------------|----------|
| One question per screen | Step-by-step wizard | ✓ |
| All on one scrolling page | Single page, all visible | |

**User's choice:** One question per screen

| Option | Description | Selected |
|--------|-------------|----------|
| Progress bar | Fills as you answer | ✓ |
| Step counter text | e.g. "3/5" | |

**User's choice:** Progress bar

| Option | Description | Selected |
|--------|-------------|----------|
| Allow back navigation | Can revisit/change answers | ✓ |
| Forward-only | No back button | |

**User's choice:** Allow back navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Full pillar structure | Explainer intro + wizard + FAQ | ✓ |
| Minimal framing | Wizard starts immediately | |

**User's choice:** Full pillar structure

---

## Claude's Discretion

- Exact question copy/wording for all 3-5 questions and answer options
- Exact tag-weight values in the scoring algorithm and the fixed tiebreak priority order across the 9 services
- Exact gauge sizing, color gradient, and count-up animation timing
- Exact FAQ questions/answers and explainer intro copy for the pillar framing

## Deferred Ideas

- Sector-tailored question sets/content beyond the single generic entry question (SIMU2-01, v2 scope)
- Todo "Restructurer la landing page autour des problèmes PME" — reviewed, not folded; belongs to Phase 8 per STATE.md
