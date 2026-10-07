---
phase: 17-admin-forecast-dashboard
plan: 14
subsystem: deploy
tags: [deploy, production-verification, cleanup]
requirements: [ADM-02, ADM-03, ADM-04, ADM-05]
completed: 2026-10-08
---

# Plan 17-14 Summary — deploy, production check, cleanup

## Deploy (owner approvals recorded)

- Approval 1 (2026-10-07), verbatim: "Oui, preview d'abord (Recommended)". `release/phase-17` pushed, preview Ready. Unauthenticated `/admin/pilotage` resolves to `/connexion?next=/admin/pilotage` with `x-robots-tag: noindex, nofollow` (fetched through the Vercel MCP bypass; the bypass token was not present in the pulled env file and `vercel curl` printed nothing on Windows).
- Approval 2 (2026-10-07), verbatim: "Oui, déployer en production (Recommended)". Fast-forward merge and push of `master`; production Ready; `https://sevalys.com/admin/pilotage` returns 307 to `/connexion?next=%2Fadmin%2Fpilotage`. Release branch deleted locally and remotely, `.env.vercel.local` deleted.
- Owner instruction (2026-10-08): "push en prod et verifie", then "corriger" for the two display defects below; each fix was pushed to master (`09729b9`, `9d01dfa`) and checked in production.

## Production verification (Chrome, admin session, year 2026, tests included)

| Check | Dashboard | Read-only SQL on production |
|---|---|---|
| CA facturé | 1 600,00 € | 160000 cents (4 invoices) |
| CA encaissé | 1 600,00 € | 180000 paid minus 20000 refunded (max per invoice) = 160000 |
| CA signé | 1 600,00 € | n/a |
| Pipeline | 0,00 € | n/a |
| Source table | header "Source figée du lead", row "direct" 1 600,00 €, total 1 600,00 € = CA signé | n/a |
| Fixture client projects | 1 project listed | count = 1 |
| Tests hidden | tests=0 shows "Rien à piloter pour l'instant" | n/a |
| HT/TTC | franchise helper shown (HT = TTC) | n/a |

Test cost: 1,00 € "Test phase 17" added on the fixture project (status Valide). With tests included the project's Coûts showed 1,00 € and the margin 1 599,00 €. After "Annuler ce coût" the status is Annulé and the dashboard is back to Coûts 0,00 € / margin 1 600,00 €. No recurring cost and no balance were created: production `sv_recurring_costs` count 0 at check time; `sv_project_costs` holds the one voided test row (append-only, cannot be removed).

## Defects found by the owner-requested Chrome check, fixed and redeployed

1. `/admin/pilotage/couts`: the three forms were invisible (class `pt-lead-panel` from leads.css is an absolute dropdown). Fixed in `pilotage.css` (`9d01dfa` predecessor `09729b9`), guarded by a test, confirmed in production (forms static, 295/354/387 px high).
2. Confirmation panels overflowed the card because admin.css sets nowrap on `td[data-label="Action"]`. Fixed (`9d01dfa`), guarded by a test; verified with a probe using the real panel text (no overflow at 1920 px).
3. Cash chart showed a "1,00 €" tick when every month is zero. Fixed in `chartGeometry.ts` (no ticks on a flat chart), guarded by a test; production axis now shows only "0 €".

## Cleanup

- Supabase branch `sv-rls-p17` deleted on owner approval (2026-10-08, "yes"); `supabase branches list` shows only `main`. `.env.test.local` deleted.

## Not done / open

- D-12 clickable-set confirmation (tiles and the Signé/Facturé/Encaissé cells of the project table) was not explicitly given by the owner; it is left for the owner's review.
- Mobile layout was not checked.
- The confirmation panel was checked with a probe, not on a live row (rows are append-only).
- One unrelated flaky test (`seal.test.ts`, phase 14) failed once under load and passes alone.
