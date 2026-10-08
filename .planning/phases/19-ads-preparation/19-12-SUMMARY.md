# Phase 19 Plan 12: Release (PARTIAL: preview stage only) Summary

Status: PARTIAL. Task 1 preview stage done 2026-10-08. Production promotion, Task 2 and branch cleanup NOT run (separate approvals pending).

## Approval (verbatim, 2026-10-08)

"Approve preview deploy" (preview only: no master push, no production, sv-rls-p19 kept).

## Preview

- Pushed `release/phase-19` from master HEAD 3194241 (`git push origin master:refs/heads/release/phase-19`; remote ref only, no local branch).
- Preview Ready: https://portfolio-5izljrcdj-anatholyb1s-projects.vercel.app (Preview, build 56s).
- Checks via `vercel curl` without --debug; bypass token never printed or recorded. No form submitted, no lead created. No `.env.vercel.local` was needed or created.
- Note: Vercel adds `X-Robots-Tag: noindex` on all preview responses (platform header, not app).

| Check | Result | Status |
|---|---|---|
| GET /admin/liens (anonymous) | 307, `Location: /connexion?next=%2Fadmin%2Fliens` | PASS |
| GET / | 200 | PASS |
| GET /simulateur | 200 | PASS |
| GET /avis | 200; meta robots `index, follow` (header noindex is the Vercel preview header) | PASS (header caveat, re-verify on prod) |
| GET /politique-des-avis | 200 | PASS |
| GET /sitemap.xml | 200, includes sevalys.com/avis | PASS |
| GET /robots.txt | 200; Disallow /admin, /api/, /espace-client, /connexion, /auth, /desinscription, /avis/ | PASS |
| GET / with accepted consent cookie, no params | no `Set-Cookie: sv_attr_*` | PASS |
| Landing `?utm_source=Facebook&utm_medium=paid_social&utm_campaign=agent-vocal_restaurants_202611` with accepted consent cookie, browser-like Sec-Fetch headers and UA | 200, NO Set-Cookie sv_attr_* | NOT VERIFIABLE ON PREVIEW |

### Why the attribution cookie check could not be proven on preview

`src/lib/attribution/touch.ts` `classifyArrival` returns `skip` when `request.nextUrl.hostname !== canonicalHost`, and canonicalHost comes from `NEXT_PUBLIC_SITE_URL` (default sevalys.com). The preview host (`portfolio-5izljrcdj-...vercel.app`) differs, so the proxy deliberately sets no cookie (this is the intended guard, not a regression). The Host header cannot be spoofed through Vercel routing. The decoded cookie fields (p.utm_source 'meta', p.utm_medium 'paid_social', w.utm_source 'Facebook', e v4 UUID) therefore must be checked on production (https://sevalys.com) after the second approval. The unit/integration suites from 19-11 cover the logic.

## Production promotion (2026-10-08)

### Second approval (verbatim, 2026-10-08)

"Approve production deploy" (fast-forward and push master, production checks, delete release/phase-19; sv-rls-p19 and `.env.test.local` kept).

### Deploy

- Fast-forward push `c8e8598..a86bc3a master -> master` (plain, no force).
- Production deployment https://portfolio-csf4ld9y4-anatholyb1s-projects.vercel.app: Ready (build 2m).

### Production checks (plain curl on https://sevalys.com, no form submitted, no lead created)

| Check | Result | Status |
|---|---|---|
| GET / | 200 | PASS |
| GET /simulateur | 200 | PASS |
| GET /avis | 200; no X-Robots-Tag header; meta robots `index, follow` | PASS |
| GET /politique-des-avis | 200 | PASS |
| GET /sitemap.xml | 200; includes sevalys.com/avis | PASS |
| GET /robots.txt | 200; Disallow /api/, /espace-client, /admin, /connexion, /auth, /desinscription, /avis/ | PASS |
| GET /admin/liens (anonymous) | 307, `Location: /connexion?next=%2Fadmin%2Fliens` (`X-Robots-Tag: noindex, nofollow`, expected on admin) | PASS |
| GET `/?utm_source=Facebook&utm_medium=paid_social&utm_campaign=agent-vocal_restaurants_202611` with accepted `sv_consent` cookie (synthetic UUID id) and browser-like Sec-Fetch headers/UA | 200; `Set-Cookie: sv_attr_lt` and `sv_attr_ft` set (Path=/, Max-Age=2592000, Secure, HttpOnly, SameSite=lax) | PASS |

Decoded `sv_attr_lt` (identical `sv_attr_ft`): `p` = {utm_source: "meta", utm_medium: "paid_social", utm_campaign: "agent-vocal_restaurants_202611"}, `l` "/", `r` null, `w` = {utm_source: "Facebook"}, `e` = f58dd7e6-f296-45a9-8127-0165dc7b76c8 (valid v4 UUID). The cookie check deferred from preview is now verified.

### Cleanup

- `release/phase-19` deleted on origin (it never existed locally).
- Supabase branch `sv-rls-p19` and `.env.test.local` kept for the owner's manual end-to-end check (deleted in a later step).

## State

- (Superseded by production section above) release/phase-19 existed on origin only; master not pushed; production untouched; Supabase branch sv-rls-p19 and `.env.test.local` untouched.
- Remaining: second approval, fast-forward master and push, production checks (incl. cookie decode), delete release/phase-19, Task 2 manual check, branch cleanup.

## Task 2 — Manual end-to-end check (2026-10-08, run by the orchestrator in Chrome on owner request)

Owner answer (verbatim): "Do the test with chrome", then phone provided for the test identity; for the capture proof: "I do it with curl".

- `/admin/liens` (admin session): Meta Ads, `/simulateur`, offre `agent-vocal`, cible `restaurants`, mois 2026-10 → `https://sevalys.com/simulateur?utm_source=meta&utm_medium=paid_social&utm_campaign=agent-vocal_restaurants_202610`, "Conforme à la convention", 30/60 caractères.
- Browser run with the alias link (`utm_source=Facebook`) inside the admin's Chrome profile: the lead attached to the existing test lead ("Revenu") but "Dernier contact" stayed "arrivée directe". Expected by design: `classifyArrival` skips attribution when an auth cookie is present (`src/lib/attribution/touch.ts`), and the plan asked for a private window.
- Capture proof without auth cookie (curl GET of the alias link, then POST `/api/simulateur` with the returned cookies and the permanent test identity): `sv_leads.last_touch` = utm_source `meta`, utm_medium `paid_social`, utm_campaign `agent-vocal_restaurants_202610`, raw utm_source `Facebook`, event id a v4 UUID, landing `/simulateur`; `source_nonconformity` null (alias only). Admin lead detail shows Source meta, "Reçu : Facebook", no "Hors convention" notice. First touch / frozen source of the existing lead unchanged (expected).
- Conversions card renders; the existing test lead predates the migration so its four ranks read "Non atteint" (no backfill, D-09).
- Note for ADS-04: conversion rows of the permanent test identity must be excluded from any future sending.
- Cleanup: Supabase branch `sv-rls-p19` deleted (branch list shows only main); `.env.test.local` deleted. Note: the test lead now has 3 contacts (2 from this check).
