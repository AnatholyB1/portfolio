---
phase: 13-document-generation
plan: 19
subsystem: deploy
tags: [vercel, release-gate, react-pdf, production]
requires: [13-11, 13-14, 13-16, 13-18]
provides: ["phase-13 code live in production; PDF stack proven on Vercel Linux"]
affects: [13-20]
key-files:
  created: []
  modified: [src/lib/documents/pdf/templates/spec/v1/SpecV1.tsx, src/components/portal/project/portalPage.test.ts]
completed: 2026-10-03
---

# Phase 13 Plan 19: Release gate and deploy Summary

Phase-13 code is deployed to production (`sevalys.com`), after a preview on which the owner confirmed a quote PDF renders on Vercel Linux.

## Local release gate (Task 1)

- `vitest run`: 108 files, 1265 tests passed.
- `tsc --noEmit`: clean.
- `next build`: success; `/espace-client/documents` and `/admin/projets/[id]` are dynamic routes; no `@react-pdf/renderer` error.
- Lint: one real error in a phase-13 file (unescaped apostrophe in `SpecV1.tsx` heading), fixed (commit "fix(13-19): escape apostrophe in SpecV1 heading (lint)"). Remaining lint output is warnings or pre-existing files (`fileRules.ts`, `convert.test.ts`).
- `SELLER_V1.configured` is `true` (13-11), so production issuance is possible.
- Test fix outside the plan: `portalPage.test.ts` source guard failed in the Windows working copy because `core.autocrlf=true` rewrites merged files as CRLF while a needle contains `\n`. The read helper now normalises `\r\n`. Same root cause makes `src/proxy.test.ts` fail inside worktrees (the uncommitted `src/proxy.ts` edit of the owner is untouched).

## Owner approval (Task 2)

Answered in the main session on 2026-10-03. Verbatim: "deploy prod (Recommandé)". Scope as presented: push 87 local commits, first to a preview branch, then master; uncommitted `src/proxy.ts` and `.gitignore` excluded.

## Preview and production (Task 3)

- `git push origin HEAD:refs/heads/phase-13-preview` → preview `https://portfolio-4hqhbpsc5-anatholyb1s-projects.vercel.app`, Ready in 33 s.
- Preview anonymous checks (through `vercel curl` with the full URL; the `--deployment` + path form was rejected as malformed input): `/espace-client/documents` → `307` to `/connexion?next=%2Fespace-client%2Fdocuments`, `X-Robots-Tag: noindex, nofollow`; home `200`.
- Linux PDF check: first attempt failed for a fixture reason, not a code bug. The permanent test project had been advanced by hand in phase 12 (`quote_accepted`, `deposit_received`, `contract_signed` then a revocation of `contract_signed`), so it sat at step 3 with no quote; the contract preview refuses without an active quote (D-05) and the quote cannot be issued after step 2. The owner chose to revoke `deposit_received` then `quote_accepted` through the admin UI (reason "reprise des tests phase 13"). Then the quote preview displayed: owner answer verbatim "Oui, le PDF s'affiche" (2026-10-03). Vercel logs showed the two server actions and no error entries.
- `git push origin master` (`0428549..db8ec6c`) → production deployment `https://portfolio-mxgctxb2a-anatholyb1s-projects.vercel.app`, Ready in 34 s.
- Production checks: `https://sevalys.com/espace-client/documents` anonymous → `307` to `/connexion?next=...`, `X-Robots-Tag: noindex, nofollow`; home `200`.
- The temporary preview branch `phase-13-preview` was deleted from origin afterwards (cleanup of a branch this plan created).
- No test data was written to production by the assistant. The only production data change in this plan is the owner's two corrective revocation facts on the permanent fixture project.

## Observations for 13-20 and later

- The fixture project is now at step 2 (devis and cahier des charges expected). 13-20 can start from there.
- UX note: a project already past step 2 without a quote cannot issue one. Real projects follow the step order, so this only affects hand-advanced fixtures. A reset script or a revocation is the way back.
