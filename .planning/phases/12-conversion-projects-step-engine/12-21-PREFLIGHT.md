# 12-21 Task 1 Preflight (local only, no remote change)

## Local suites

| Command | Result |
|---------|--------|
| `npm test` | 86 files, 1021 tests passed |
| `npm run lint` | 0 errors, 6 warnings (after fix below) |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | success |

Initial lint run had 1 error in phase-12 code: `src/components/portal/project/OnboardingCard.tsx:115` (react-hooks "Cannot access refs during render", the `markDirty` ref callback passed into the render-prop children). Fixed by moving the dirty flag from `useRef` to `useState` (commit 8c46ab8). Tests, tsc and build re-run green after the fix.

Remaining 6 lint warnings (not errors): unused `eslint-disable` directives in `src/lib/attribution/params.ts`, `src/lib/projects/fileRules.ts`, `src/lib/server/projects/convert.test.ts`; `CinemaIntro.tsx` exhaustive-deps (pre-existing, not phase 12); plus unused `_formData` and one other. Cosmetic, left as is.

## Local CRON_SECRET

- `CRON_SECRET` (32 bytes, 64 hex chars) written to `.env.local` (existing variables kept, only that key added or replaced). Value never printed.
- `git check-ignore .env.local` outputs `.env.local` (ignored, not committed).

## Working tree notes

- `src/proxy.ts` shows as modified but `git diff` is empty (only an LF/CRLF line-ending flag): unrelated to phase 12, no cron matcher change. Not committed, not reverted.
- `12-PATTERNS.md` untracked: not part of the plans, left untouched.
- `vercel.json` declares only `{"path": "/api/cron/mail", "schedule": "0 6 * * *"}` (daily, valid on Hobby and Pro).

## Presentation consent (current, `src/lib/projects/consent.ts`)

- version: `2026-10-v1`
- provisional: `true` (comment: "TEXTE PROVISOIRE : relecture juridique requise avant mise en production")
- text, verbatim:

> J'autorise Sèvalys à présenter ce projet, son nom, ses visuels et le résultat obtenu, dans son portfolio, sur ses réseaux sociaux et sous forme de cas client. Cet accord est facultatif, il n'a aucun effet sur la réalisation de mon projet et je peux le retirer à tout moment depuis cet espace.

## Vercel facts (read-only)

- Contrary to the session note, the Vercel CLI IS installed (`vercel` 59.24.0 at `/c/nvm4w/nodejs/vercel`) and `vercel whoami` returns `anatholyb1` without a login prompt.
- No `.vercel/project.json` in the repo: the directory is not linked locally. Step 1/2 need `vercel link` (or `--project`/`--scope` flags) first; confirm the project/scope with the owner at the checkpoint. Phase 11 used `vercel env add` plus a `phase-11-preview` branch push successfully, so the project exists.
- Plan (Hobby vs Pro) not confirmed; the daily cron is valid on both.

## Exact remote command list (in order, awaiting owner "deploy prod")

0. (prerequisite) `vercel link` to the Sèvalys project if not linked.
1. `vercel env add CRON_SECRET production` (value piped from `.env.local`, never printed).
2. `vercel env add CRON_SECRET preview` (same value).
3. `git push origin HEAD:refs/heads/phase-12-preview`
4. Read-only preview checks with the bypass token:
   - `curl -s -o /dev/null -w "%{http_code}" <preview>/api/cron/mail` expects 401
   - same with `-H "Authorization: Bearer <secret>"` expects 200 and JSON `{claimed,sent,failed}`
   - anonymous `<preview>/admin/projets` redirects to `/connexion`
   - anonymous `<preview>/espace-client` redirects to `/connexion`
5. `git push origin master` (production deploy; only after step 4 passes and 12-20 schema verified, which it is)
6. Read-only production checks: same anonymous redirects, `/api/cron/mail` returns 401 without secret; `vercel crons ls` (or dashboard) shows `/api/cron/mail` daily.

Note: master currently also contains the commit 8c46ab8 and all phase-12 commits; the pushes include every unpushed commit.
