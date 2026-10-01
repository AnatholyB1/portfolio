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

## Milestone: v1.1 — Extension de l'offre & refonte commerciale

**Shipped:** 2026-10-01
**Phases:** 5 | **Plans:** 27 | **Tasks:** 67 | **Timeline:** 12 days (2026-09-20 → 2026-10-01)

### What Was Built

- Prospect capture backend: dedicated Supabase table, insert-only RLS, spam guard, Resend notification
- 9 price-free service pages + index, each with FAQPage JSON-LD and a citable direct-answer block
- Diagnostic simulator with branching, 2-4 service recommendation and RGPD-consented capture
- Landing recomposed around PME problems, and a site-wide "no price" policy enforced by tests
- SEO/GEO wiring: sitemap, `llms.txt`, `OfferCatalog` of 9 `Service` objects, automated link audit, sitemap submitted to Search Console
- Post-delivery design overhaul and mobile pass (real client screenshots, one rhythm per section, burger menu, sticky diagnostic bar)

### What Worked

- **Policy as tests** — encoding "no price anywhere" and the CTA allowlist as vitest guards caught regressions during the later redesign instead of relying on memory
- **Locked decisions in CONTEXT.md** — D-01..D-10 for Phase 9 let the planner and checker work without re-asking, and the decision-coverage gate forced every decision to be cited in a plan
- **Checking the real thing** — measuring production (mobile length, EN/TH overflow, scroll overlap) found defects that tests and tsc could not: a sticky column covering text, a menu hidden below 900px with no replacement
- **Human-gated last step** — making the Search Console submission a final, post-deploy checkpoint kept the code plans independent of an interactive OAuth flow

### What Was Inefficient

- **Design came after the build** — Phases 6-8 shipped a flat, generic look that needed a full overhaul after Phase 9; a design contract before building would have avoided the rework (and the `gsd-ui-phase` output was judged unusable)
- **Google re-auth took many attempts** — typos in `--scopes`, PowerShell splitting the comma, concurrent runs causing CSRF errors; a ready-made runbook with the exact command would have saved time
- **Tooling noise** — `graphify update` kept failing, and two GSD state commands (`record-metric`, `add-decision`) were called with wrong arguments, leaving the metrics table incomplete
- **No milestone audit** — closed without `/gsd:audit-milestone` again (same lesson as v1.0)

### Patterns Established

- Real client screenshots in `public/work/` via a reusable `BrowserShot` frame, driven by `src/data/projects.ts`
- One composition per section (index list, sticky side column, paper band, acid band) instead of repeating the same section template
- Sticky columns live in a grid container that ends with the list they follow; text that follows goes outside the container
- Mobile: collapse secondary content behind a "see more" button (content stays in the DOM) and keep a persistent diagnostic CTA
- Capture-based review: a temporary `puppeteer-core` + local Chromium script to screenshot sections and check overflow per language

### Key Lessons

- **Run the design pass before shipping content pages** — or define `PRODUCT.md` early so every phase builds against it
- **Test in the browser at the target width and language, not only in unit tests** — overlap, overflow and hidden navigation only show up rendered
- **Quote PowerShell arguments that contain commas** (`--scopes="a,b"`) and run interactive OAuth in a regular terminal, not in a time-limited shell
- **Update `STATE.md` metrics via the right CLI arguments** or skip them, rather than leaving half-recorded data

### Cost Observations

- Sessions: 1 long session for discuss, plan, execute, deploy, design overhaul and close, plus earlier sessions for Phases 5-8
- Models: Sonnet for execution and research agents, Opus for the planner
- Notable: the design overhaul and mobile pass took more interaction than Phase 9 itself

---

## Cross-Milestone Trends

| Metric | v0.1 (pre-GSD) | v1.0 | v1.1 |
|--------|----------------|------|------|
| Plans tracked | 0 | 21 | 27 |
| Timeline | Unknown | 3 days | 12 days |
| Phases | Informal | 4 | 5 |
| QA approach | Manual | Automated + browser verify | Policy guards + production browser checks |
| Requirements coverage | None | 29/29 | 26/26 |
