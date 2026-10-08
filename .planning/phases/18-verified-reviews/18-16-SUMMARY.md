---
phase: 18-verified-reviews
plan: 16
status: partial (Tasks 1-2 done; Task 3 preview stage done, production pending second approval)
requirements: [REV-01, REV-03, REV-04]
---

# Phase 18 Plan 16: Policy wording and token secret (partial) Summary

Tasks 1-2 complete. Task 3 (preview, production promotion, branch cleanup) is NOT run and will be appended later.

## Task 1: Owner decisions (2026-10-08, verbatim)

1. Retention: "Confirmer la phrase proposée (Recommended)" = "Les avis restent publiés tant que l'activité de Sèvalys est maintenue ; ils sont conservés trois ans après la dernière action de modération."
2. Withdrawal handling: "Documenter seulement (Recommended)" = option `document` (D-06 unchanged).

## Task 2: Policy text and secret

- Commit d44ec21: `src/app/politique-des-avis/page.tsx` keeps the confirmed retention sentence in "Durée de conservation" and adds, in "Affichage du nom, dates et consentement", the withdrawal/data-rights sentence (contact@sevalys.com, answer "sous un mois"). `page.test.ts` asserts the retention sentence, the rights sentence and "sous un mois".
- `rtk vitest run src/app/politique-des-avis`: 6 passed, 0 failed.
- REVIEW_TOKEN_SECRET created in Vercel for Production and Preview (names only; value from node crypto randomBytes(32) base64url, piped, never printed or written to the repo). `vercel env ls` confirms both entries.
- REVIEW_REQUESTS_ENABLED already exists (Production, Preview, value hidden/secret); left untouched. Its value cannot be read back from `env ls`; it was not changed. REVIEW_GOOGLE_URL not set.
- Repo check: `git grep "REVIEW_TOKEN_SECRET="` only matches planning text, no secret value.

## Deviations

None. Note: the retention sentence was already present from 18-11; only the withdrawal sentence and tests were new.

## Task 3 (preview stage), 2026-10-08

First owner approval (verbatim, 2026-10-08): "Approve preview deploy" (preview only).

- Pushed `release/phase-18` from master HEAD 111bfa8 (origin/release/phase-18).
- Preview Ready: https://portfolio-fmiepm51a-anatholyb1s-projects.vercel.app (Preview, build 1m).
- Checks run through `vercel curl` (CLI injects the protection bypass; the token was never recorded). `.env.vercel.local` pulled (gitignored, confirmed) and still in place for the production stage. Note: the preview `X-Robots-Tag: noindex` on public pages is Vercel's automatic preview header; the page-level meta robots is what production will serve.

| Check | Result | Status |
|---|---|---|
| GET /avis | 200; meta robots `index, follow`; h1 "Avis clients"; empty-state heading "Pas encore d'avis publié"; header `X-Robots-Tag: noindex` (Vercel preview header, not app) | PASS (header caveat) |
| GET /politique-des-avis | 200 | PASS |
| GET /avis/AAAA...A (43 chars) | 200; "Ce lien n'est plus valide"; `X-Robots-Tag: noindex, nofollow`; meta robots `noindex, nofollow, nocache` | PASS |
| GET /robots.txt | contains `Disallow: /avis/` | PASS |
| GET /sitemap.xml | contains https://sevalys.com/avis and https://sevalys.com/politique-des-avis | PASS |
| GET /admin/avis (anonymous) | 307, `Location: /connexion?next=%2Fadmin%2Favis` | PASS |
| POST /api/avis, valid body, malformed token "bad" | 410 `{"error":"link_invalid"}` (a body without consent returned 400 first, schema validation precedes the token check) | PASS |

Caveat to re-verify on production: that /avis has no `X-Robots-Tag: noindex` header (the preview header cannot prove it).

Incident: one `vercel curl --debug` call printed the start of its bypass header in the tool output (truncated); no secret reached any file or commit. Consider rotating the protection bypass secret if the log is retained.

Not done (awaiting second approval): fast-forward and push master, production polling and checks on https://sevalys.com, deletion of release/phase-18 (local and remote), `.env.vercel.local`, Supabase branch sv-rls-p18 and `.env.test.local`. Local master carries the unpushed docs commit of this summary (release/phase-18 is its ancestor, so master can be pushed directly).

## Pending

Task 3: owner approvals (preview, then production), smoke checks, release branch / sv-rls-p18 / local env file cleanup. The flag value of REVIEW_REQUESTS_ENABLED should be verified as false at that time.
