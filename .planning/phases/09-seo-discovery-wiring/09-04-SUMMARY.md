---
phase: 09-seo-discovery-wiring
plan: 04
subsystem: seo
tags: [search-console, sitemap, deploy, gsc-mcp]
requires:
  - phase: 09-seo-discovery-wiring
    plan: 01
    provides: "sitemap + llms.txt entries"
  - phase: 09-seo-discovery-wiring
    plan: 02
    provides: "hasOfferCatalog JSON-LD"
  - phase: 09-seo-discovery-wiring
    plan: 03
    provides: "link audit + SEO doc annotations"
provides:
  - "Phase 9 code deployed to production (master pushed, Vercel deployment for fcaa28e)"
  - "https://sevalys.com/sitemap.xml submitted to Search Console for sc-domain:sevalys.com"
requirements-completed: [SEO-01]
completed: 2026-10-01
---

# Phase 9 Plan 04: Deploy and Search Console submission

Pre-deploy gate, production deploy and sitemap submission (D-10), human-gated.

## Task 1: Pre-deploy gate
- `npx vitest run`: 332 passed. `npx tsc --noEmit`: clean.
- `npx next build`: first run failed on a transient `next/font/google` fetch in `/demo/feuillette` (file untouched by this phase); the rerun succeeded.
- Local `next start`: sitemap had 15 `<loc>`, 9 `/services/` and 1 `/simulateur`; llms.txt had no "tarif"; homepage payload carried the OfferCatalog with 9 Service objects and no price keys.
- Plan expected 10 `/services/` matches; actual is 9 because the `/services` index URL has no trailing slash. Total of 15 `<loc>` is the correct check.

## Task 2: Deploy and re-auth (human)
- User approved pushing all of master (247 commits, phases 5-8 included). Pushed `2bc8db5..fcaa28e`; Vercel production deployment built.
- Live checks: sitemap 15 URLs, llms.txt 10 new links and no "tarif", OfferCatalog present, `/simulateur`, `/services`, `/services/agent-vocal-ia` return 200.
- ADC re-auth needed several attempts: scope typo, concurrent runs (CSRF mismatching_state), and PowerShell splitting the comma-separated `--scopes` value (fixed by quoting). Completed in a regular terminal; `gsc` MCP reconnected.

## Task 3: Submission (MCP responses)
- `list_sitemaps` before: `{}`
- First `submit_sitemap` (read-only credentials): `Insufficient Permission`
- `submit_sitemap` after re-auth and reconnect: `Sitemap submitted: https://sevalys.com/sitemap.xml`
- `list_sitemaps` after:
  `{"sitemap":[{"path":"https://sevalys.com/sitemap.xml","lastSubmitted":"2026-10-01T11:07:43.163Z","isPending":true,"isSitemapsIndex":false,"warnings":"0","errors":"0"}]}`

Assumption A1 held: re-authenticating ADC with the write scope was enough; `server.mjs` was not edited.

## Follow-ups
- Revert ADC to read-only (least privilege, T-09-08): `gcloud auth application-default login --scopes="https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform"`.
- Optional: run the homepage through validator.schema.org to confirm `hasOfferCatalog` parses with 9 Service items.
- `graphify update .` still fails with a NoneType error (pre-existing tooling issue).
