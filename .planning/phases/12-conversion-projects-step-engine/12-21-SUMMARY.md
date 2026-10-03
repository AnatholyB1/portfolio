---
phase: 12-conversion-projects-step-engine
plan: 21
subsystem: deploy
tags: [vercel, cron, consent, production]
requires: [12-06, 12-07, 12-14, 12-15, 12-17, 12-19, 12-20]
provides: [phase 12 live on sevalys.com, protected daily mail cron]
key-files:
  modified:
    - src/components/portal/project/OnboardingCard.tsx
completed: 2026-10-03
---

# Phase 12 Plan 21: Rulings, CRON_SECRET, preview, production deploy

## Owner rulings (verbatim, asked in this session through interactive questions)

- Consent text (version `2026-10-v1`, `provisional: true`): **"provisional-ok"**. The text was shown in full in the question: « J'autorise Sèvalys à présenter ce projet, son nom, ses visuels et le résultat obtenu, dans son portfolio, sur ses réseaux sociaux et sous forme de cas client. Cet accord est facultatif, il n'a aucun effet sur la réalisation de mon projet et je peux le retirer à tout moment depuis cet espace. » `consent.ts` is unchanged; the provisional text ships by the owner's explicit acceptance. A later text change must bump the version (v2); each consent row keeps its own snapshot. The legal review blocker in STATE.md stays open for the final text.
- Remote command list: **"deploy prod"** (full list, in the order below).

As in 12-20, the executor agent could not take the approval relayed in a prompt, so the orchestrator ran the approved list itself in the main session.

## Task 1 (executor): local checks

`npm test` 1021 pass, `tsc` clean, `npm run build` OK, lint 0 errors / 6 warnings. One lint error in phase-12 code (`OnboardingCard.tsx`, a ref read during render) fixed in 8c46ab8. CRON_SECRET (32 bytes hex) generated into gitignored `.env.local`, never printed. Evidence: `12-21-PREFLIGHT.md`.

## Remote commands run

1. `vercel link --project portfolio --scope anatholyb1s-projects` (`.vercel` is gitignored). The team plan is **Pro**: this resolves the Hobby/Pro blocker from STATE.md.
2. `vercel env add CRON_SECRET` for production and preview, `--sensitive`, value piped from `.env.local`; `vercel env ls` lists it for both.
3. `git push origin HEAD:refs/heads/phase-12-preview` -> preview Ready (`portfolio-2vym7crmc`).
4. Preview checks (through `vercel curl`, which handles the deployment-protection bypass): `/api/cron/mail` 401 without secret; 200 with `Authorization: Bearer` and body `{"claimed":0,"sent":0,"failed":0}`; anonymous `/admin/projets` and `/espace-client` return 307 to `/connexion?next=...`.
5. `git push origin master` (27ccbd6..0428549) -> production Ready (`portfolio-cidcqxp48`), target production.
6. Production checks: `https://sevalys.com/api/cron/mail` 401 without secret; anonymous `/admin/projets` and `/espace-client` 307 to `/connexion`; home 200. `vercel crons ls` shows `/api/cron/mail  0 6 * * *`.

## Notes

- The real-secret Bearer header was verified on the preview; Vercel sending the same header from its scheduler (RESEARCH A1) will be visible at the first 06:00 UTC run.
- Pre-existing uncommitted `src/proxy.ts` (CRLF flag only) and untracked `12-PATTERNS.md` were not pushed or changed.
- The branch `phase-12-preview` remains on GitHub; delete when no longer needed.

## Next

12-22: production end-to-end check on the permanent test client (owner types login codes).
