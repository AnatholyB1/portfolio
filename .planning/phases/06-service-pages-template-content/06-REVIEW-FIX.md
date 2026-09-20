---
phase: 06-service-pages-template-content
fixed_at: 2026-09-20T16:24:21Z
review_path: .planning/phases/06-service-pages-template-content/06-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 0
reverted: 1
status: partial
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-09-20T16:24:21Z
**Source review:** .planning/phases/06-service-pages-template-content/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope: critical_warning — CR-01, WR-01, WR-02, WR-03; IN-01..03 out of scope)
- Fixed: 3 (WR-01, WR-02, WR-03)
- Reverted after human review: 1 (CR-01)
- Skipped: 0

## Reverted Issues

### CR-01: FAQPage JSON-LD (and page `<title>`/description) never match the rendered page for en/th visitors, including default-locale crawlers

**Files modified:** `src/app/services/[slug]/layout.tsx`, `src/app/services/layout.tsx`, `src/lib/serviceJsonLd.ts`, `src/lib/translations.ts`
**Fix commit:** `53b01d5` — **Revert commit:** `bf38902`
**Status:** reverted after human review — trade-off not acceptable
**Applied fix (initially):** Resolved locale server-side from the request's `Accept-Language` header (via `next/headers`) instead of hardcoding `translations.fr`, and stamped the FAQPage JSON-LD with a matching `inLanguage` tag. The fixer's own report correctly flagged this as needing human sign-off: it is only a best-effort `Accept-Language` guess (doesn't match the visitor's actual persisted `localStorage` language preference), and calling `headers()` in `generateMetadata`/the layout body forces Next.js to opt `/services/[slug]` out of static generation.
**Why reverted:** Confirmed via `npm run build` that the fix silently converted `/services/[slug]` from 9 statically prerendered pages (`●` SSG, this phase's explicit, `06-07`-verified deliverable) to a fully dynamic, server-rendered-on-demand route (`ƒ`). That is a real architectural regression — loss of CDN edge caching, added per-request server compute, and the loss of the exact build-time guarantee `06-07`'s completeness gate was built to prove — in exchange for an imperfect, unreliable locale guess. The original hardcoded-French behavior is being kept as an intentional, documented limitation: structured data/metadata target the site's primary local-SEO audience (Tours/France, per the SEO/GEO/AEO strategy doc's French keyword clusters and `GeoCircle` targeting). True per-locale structured-data parity would require locale-prefixed URLs (e.g. `/en/services/branding`) — a larger architectural change appropriate for a future phase, not a code-review hot-fix. This limitation is now recorded as a known gap (see `06-07-SUMMARY.md` and this report) rather than silently regressed.

## Fixed Issues

### WR-01: `caseQuote`/`signals` mutual-exclusivity is enforced only by tests, not by the type system

**Files modified:** `src/lib/translations.ts`
**Commit:** `4cea0e2`
**Applied fix:** Split `ServicePageContent` into a base interface plus a new exported `SocialProof` discriminated union (`{ caseQuote: string; signals: [] } | { caseQuote: null; signals: {t,d}[] }`), intersected back into `ServicePageContent`. No data literals needed to change — `tsc --noEmit` passed cleanly, confirming every existing fr/en/th item across all 9 services already conforms to one of the two shapes. A future edit that violates the pairing (e.g. leaving `caseQuote` null while also emptying `signals`, or vice versa) is now a compile error instead of a silently-empty "Preuve sociale" section at runtime.

### WR-02: No runtime guard against an invalid `services.ts` ↔ `projects.ts` join

**Files modified:** `src/app/services/[slug]/page.tsx`
**Commit:** `e8df4c6`
**Applied fix:** Added `if (!project) return null;` immediately after the `projects[svc.caseStudyProjectIndex as number]` lookup, before `project.href`/`.name`/`.year` are dereferenced, exactly as the review's fix suggested. Prevents a client-side `TypeError` crash if a future `projects.ts` edit (entry removed/reordered) ships without the test suite catching the mismatch first.

### WR-03: Dead CSS left over from the pre-D-10 pricing/popularity design

**Files modified:** `src/app/globals.css`
**Commit:** `2e63b13`
**Applied fix:** Removed the `.pop-tag`, `.o-from`, and `.o-price` rules. Before removing, verified (repo-wide grep, not just `src/app`) that these three selectors are referenced only by `src/components/sections/OffersSection.tsx` and `src/components/sections/MaintenanceSection.tsx` — and that neither of those two components is imported anywhere in the codebase (fully orphaned, pre-D-10 leftovers themselves). Removal has no rendering impact.

## Skipped Issues

None. 3 findings fixed and kept (WR-01, WR-02, WR-03); 1 finding (CR-01) was fixed then reverted after human review of its architectural trade-off (see Reverted Issues above) — not skipped, but not ultimately shipped either.

---

_Fixed: 2026-09-20T16:24:21Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
