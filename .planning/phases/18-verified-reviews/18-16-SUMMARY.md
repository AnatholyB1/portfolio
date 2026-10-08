---
phase: 18-verified-reviews
plan: 16
status: partial (Tasks 1-2 done; Task 3 pending owner approvals)
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

## Pending

Task 3: owner approvals (preview, then production), smoke checks, release branch / sv-rls-p18 / local env file cleanup. The flag value of REVIEW_REQUESTS_ENABLED should be verified as false at that time.
