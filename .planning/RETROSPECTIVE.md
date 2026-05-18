# Retrospective

## Milestone: v1.0 — Visual Redesign (Selenium Phase 02)

**Shipped:** 2026-05-18
**Phases:** 4 | **Plans:** 21 | **Timeline:** 3 days

### What Was Built

- Global design system (CSS vars, 3 fonts, custom cursor, scroll-reveal, cinema intro)
- Full landing page rebuilt from scratch — 3D icosphere hero, editorial sections, GSAP phone agent pinned scroll, contact form
- Full services page rebuilt — 9 sections, GSAP scroll-driven methodology rail, pricing packs, maintenance tiers
- /mentions-legales + /demo rethemed
- 8 freelance-era components deleted; 342 dead translation lines removed
- i18n audit confirmed full coverage across 17 components + Navbar + Footer
- QA: all automated checks pass (feuillette diff, SEO grep, 900px responsive, reduced-motion)

### What Worked

- **Plan-per-feature batching** — grouping related sections into one plan (e.g., 03-02 covering 3 sections) kept context tight and execution focused
- **ClientProviders pattern** — identifying the ssr:false boundary early in Phase 1 prevented regressions in Phases 2-3
- **CSS globals approach** — writing all section CSS as a single phase-delimited block in globals.css kept diffs readable and conflicts minimal
- **Absolute hrefs decision** — catching the /services navigation bug during Phase 2 plan review (not after regression) saved debugging time
- **Baseline commit for QA-04** — tagging 5f36fa0 as the pre-code baseline made the feuillette integrity check a one-liner

### What Was Inefficient

- **REQUIREMENTS.md checkbox lag** — checkboxes weren't updated during execution; arrived at milestone close with 26/29 unticked, requiring manual reconciliation
- **Context exhaustion at 82%** — milestone completed but session ended before the completion workflow ran; required a fresh session to finalize

### Patterns Established

- `ClientProviders.tsx` as the ssr:false gateway for all browser-only dynamic imports in Next.js Turbopack
- Phase-delimited CSS blocks in globals.css (one `/* === Phase N: Name === */` header per phase)
- Absolute hrefs for on-page anchors in Navbar/Footer to survive cross-page navigation
- `git diff <baseline>..HEAD -- <path>` as the integrity check for protected directories
- `useReveals` called from the page component (not layout) — hook must run after DOM is mounted

### Key Lessons

- **Close REQUIREMENTS.md checkboxes in each plan's commit** — don't save them for milestone close
- **Run `/gsd:audit-milestone` before `/gsd:complete-milestone`** even when confident — the audit doubles as documentation of what was verified and how
- **Tag the pre-work baseline commit explicitly** at project start — `git tag baseline-v1.0-pre` avoids searching git log during QA

### Cost Observations

- Sessions: ~4 sessions over 3 days
- Model: claude-sonnet-4-6 throughout
- Notable: Plan execution consistently ~5-10 min per plan; context exhaustion was the only blocker

---

## Cross-Milestone Trends

| Metric | v0.1 (pre-GSD) | v1.0 |
|--------|----------------|------|
| Plans tracked | 0 | 21 |
| Timeline | Unknown | 3 days |
| Phases | Informal | 4 |
| QA approach | Manual | Automated + browser verify |
| Requirements coverage | None | 29/29 |
