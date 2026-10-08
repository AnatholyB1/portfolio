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

## State

- release/phase-19 exists on origin only; master not pushed; production untouched; Supabase branch sv-rls-p19 and `.env.test.local` untouched.
- Remaining: second approval, fast-forward master and push, production checks (incl. cookie decode), delete release/phase-19, Task 2 manual check, branch cleanup.
