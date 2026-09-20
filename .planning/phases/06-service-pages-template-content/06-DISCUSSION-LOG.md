# Phase 6: Service Pages (Template + Content) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 6-service-pages-template-content
**Areas discussed:** Copy strategy for the 5 existing offers, Social proof for the 4 brand-new services, Branding vs Rebranding+Premium boundary, /services index organization, Design inspiration sourcing

---

## Copy strategy for the 5 existing offers

| Option | Description | Selected |
|--------|-------------|----------|
| Port & expand | Keep existing facts/features as the skeleton, expand each into full sections | |
| Rewrite fresh | Write each of the 5 pages from scratch to match the new template's depth and tone | ✓ |
| Hybrid | Keep the core facts/features list, write fresh framing around them | |

**User's choice:** Rewrite fresh

| Option | Description | Selected |
|--------|-------------|----------|
| Concise (SVC-06 literal) | ~300-500 words total per page | ✓ |
| Pillar-length | ~800-1200+ words per page | |
| You decide | Claude picks per-service | |

**User's choice:** Concise (SVC-06 literal)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as bullets | Reuse checkmark-bullet format under fonctionnement | ✓ |
| Convert to prose | Fold features into flowing paragraphs | |
| You decide | Claude picks per-section | |

**User's choice:** Keep as bullets

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | No renaming, add 4 new ones alongside | |
| Align to SEO clusters | Adjust names/slugs where the SEO doc suggests better terms | ✓ |

**User's choice:** Align to SEO clusters

**Notes:** None additional.

---

## Social proof for the 4 brand-new services

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing 3 case studies | Feuillette, Gecko Cabane, Folies Temps Danse, framed generically | |
| Trust signals instead | Guarantees, methodology, "sans engagement", stats | |
| Hybrid | Reuse case studies where relevant, trust signals otherwise | ✓ |

**User's choice:** Hybrid

| Option | Description | Selected |
|--------|-------------|----------|
| Same treatment as new 4 | Uniform approach across all 9 pages | ✓ |
| Leave existing proof as-is | Carry forward whatever's already applicable per existing offer | |

**User's choice:** Same treatment as new 4

**Notes:** None additional.

---

## Branding vs Rebranding+Premium boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Identity-only vs bundled | Branding = logo/identity/guidelines only; Rebranding+Premium = full site + branding bundled | |
| Standalone vs upgrade path | Branding = identity only; Rebranding+Premium positioned as "Branding + new site" | |
| You decide | Claude drafts the distinction | ✓ |

**User's choice:** You decide

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, explicit cross-link | Each page links to the other for self-selection | ✓ |
| No, keep pages independent | Let the simulator handle routing instead | |

**User's choice:** Yes, explicit cross-link

**Notes:** SEO doc (§9) explicitly flags this overlap but doesn't resolve it — user delegated the exact wording to Claude's discretion, informed by the doc's framing.

---

## /services index organization

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by category | e.g. Présence & Site / Croissance & Ads / Agent Vocal IA / Maintenance | |
| Flat ordered list | All 9 in a single sequence | |
| You decide | Claude picks based on what reads best | ✓ |

**User's choice:** You decide

| Option | Description | Selected |
|--------|-------------|----------|
| Keep an emphasis tag | Carry forward a "most popular" highlight | |
| Drop it | No popularity emphasis — simulator (Phase 7) surfaces fit instead | ✓ |

**User's choice:** Drop it

**Notes:** None additional.

---

## Design inspiration sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Component patterns (21st.dev) | UI component patterns from 21st.dev | |
| Competitor/agency sites | Reference other agency/SaaS marketing sites | |
| Both | Pull from 21st.dev AND study reference sites | ✓ |

**User's choice:** Both

| Option | Description | Selected |
|--------|-------------|----------|
| Let Claude find examples | Researcher searches during research phase | ✓ |
| I'll provide references separately | User shares links later | |

**User's choice:** Let Claude find examples

**Notes:** This area was added by the user via free-text ("Other") during gray-area selection, not one of the originally-presented options — reflects a genuine open question about visual/structural inspiration sourcing for the new template.

---

## Claude's Discretion

- Exact Branding vs Rebranding+Premium scope split and wording (draft during planning/content writing, informed by agency-scoping conventions and the SEO doc's framing)
- /services index grouping vs flat list — pick whichever reads best with 9 items
- Specific 21st.dev components and reference sites to draw from during research/design

## Deferred Ideas

- Real per-service case studies for the 4 new offers — already tracked as v2 requirement SVC2-01
- `priceRange` in Service schema.org objects (recommended by SEO doc) conflicts with the no-price policy — flagged for whoever plans Phase 9, not actionable here
