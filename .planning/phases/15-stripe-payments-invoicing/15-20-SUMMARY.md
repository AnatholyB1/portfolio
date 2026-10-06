---
phase: 15-stripe-payments-invoicing
plan: 20
subsystem: release
tags: [deploy, e2e, stripe-test-mode, production]
requires: [15-19]
provides:
  - Phase-15 code deployed on sevalys.com
  - End-to-end proof on production with the permanent fixture « Test E2E Sèvalys » (Stripe test mode)
requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-04, PAY-05]
completed: 2026-10-06
---

# Phase 15 Plan 20: Release gate, deploy and end-to-end Summary

The phase is deployed and every ROADMAP success criterion was observed on production with the permanent test client, in Stripe test mode, via the TFA-/TAV- series.

## Release gate (Task 1)
- `npm test`: 1802 of 1803 passed; the one failure is a 5 s timeout in heavy PDF tests under parallel load (`seal.test.ts`, `consentContract.test.ts`), each passing when run alone.
- `tsc --noEmit` clean; lint 0 errors (9 pre-existing or cosmetic warnings); `next build` succeeded with `/api/stripe/webhook` and `/espace-client/paiements` dynamic.
- The owner's uncommitted `src/proxy.ts` and `.gitignore` were never staged or deployed.

## Deploy (owner approvals, verbatim, 2026-10-05 / 06)
- « Oui : preview puis production (Recommended) ». Preview `phase-15-preview` checked (connexion required, webhook route present), then `git push origin master` (c5d9f14), preview branch deleted. Production: unsigned and bad-signature POST to `/api/stripe/webhook` return 400; anonymous `/espace-client/paiements` redirects to `/connexion`.
- « Oui : pousser le correctif sur master (Recommandé) » for the hotfix below (97bf71e).

## Defect found by the end-to-end run, fixed
- **Symptom:** the admin project sheet crashed on production (`invoices_load_failed`, digest 3930053531).
- **Cause:** `loadAdminBillingView` and `loadCreditOrigin` read `payment_intent_id`, `livemode` and `client_id` of `sv_invoice_payment_events` with the RLS client, but `authenticated` is deliberately granted only `id, invoice_id, kind, amount_cents, method, occurred_at`. The RLS suites did not execute these loaders and the unit tests mocked the client.
- **Fix (97bf71e):** the ledger is read with the service-role client after `requireAdmin` and the project access check, scoped to the project's invoices and client. Tests updated (258 passing).
- **Follow-up (not deployed yet):** 5e7c394 changes « En attente du contrat » to « En attente du PV de recette signé » for the final invoice line. Pushing it is pending the owner's go.

## End-to-end on production (client « Test E2E Sèvalys », is_test = true)
| Step | Observation |
|---|---|
| Deposit invoice | The contract was already signed in phase 14, so the daily sweep (triggered with `vercel cron run`) issued `TFA-2026-0001`: 480,00 €, type 386, VATEX-FR-FRANCHISE, PDF sha256 `e5725fe8…79dc`, 2 request mails, reminders scheduled. Numbering started at 0001 with no gap. |
| Card payment | Paid through Checkout (4242). One `checkout.session.completed` event processed as `paid`, one ledger row (480,00 € expected and received), `deposit_received` posted by the system, project moved to Production, 2 receipts sent, 4 client reminders and the admin alert set to `skipped`. |
| Replay | `stripe events resend` run twice on the same event: still 1 event, 1 ledger row, 1 fact, 2 receipts. |
| Period invoice | Admin form (1,5 j × 200 € + 2 j × 200 €), preview PROFORMA/APERÇU not stored, then issued `TFA-2026-0002` (700,00 €, period 01–05/10/2026, sha256 `e1b68ce6…7260`). |
| Bank transfer | Client chose bank transfer: `checkout.session.completed` → `processing` (« Paiement en cours »). After `stripe test_helpers customers fund_cash_balance` (70 000 EUR): `checkout.session.async_payment_succeeded` → `paid`, 700,00 € received for 700,00 € expected. No new project fact: the step stayed unchanged. |
| Credit note | Partial credit of 200,00 € with Stripe refund: `TAV-2026-0001`, type 381, `refund_requested` true, 2 `credit_note_issued` mails, Stripe refund `pyr_1UNZ3n…` 200,00 € `succeeded`, `charge.refunded` webhook recorded as `refunded` (20 000). |
| Immutability | `UPDATE` and `DELETE` on `sv_invoices` inside a rolled-back transaction both fail with `sv_immutable_table`; the row is unchanged. |

## PV de recette and final invoice (run on production, 2026-10-06)
| Step | Observation |
|---|---|
| Fact | Admin recorded `production_completed` (the project moves to Recette). |
| PV | Admin issued `PVR-2026-9D54A1E5-1` (the three CDC acceptance criteria, delivery 06/10/2026, no reserve, sha256 `1fc8f10b…`) after a not-stored preview and a confirmation panel. |
| Signature | Client signed with the e-mailed code: `acceptance_signed` posted by the client. |
| Final invoice | `TFA-2026-0003` issued automatically: total 1 100,00 € HT/TTC, one deduction line « Acompte déjà versé (facture TFA-2026-0001) » of 480,00 €, net 620,00 €. Check: 480 + (700 − 200 credit) + 620 = 1 600 = quote total, no double billing. |
| Balance | Card payment of 620,00 € expected and received, `checkout.session.completed` processed as `paid`, `balance_received` posted by the system, receipts sent. |

The 15-14 label fix « En attente du PV de recette signé » (5e7c394) and the column-grant guard test (8f4f114) were deployed.

## Not exercised
- Live Stripe mode was never configured; live checkout fails closed.
- The owner-side Stripe dashboard setting « Envoyer des reçus pour les paiements réussis » (D-16) is still to be disabled by the owner.

## Open items
- Stripe CLI key expiring 2027-01-03 used as the production test key: the owner judged this not a concern for now.
- Accountant review of invoice mentions and the franchise wording: owner decision of 2026-10-06, not needed for now. Vercel plan unchanged (cron stays daily).
- Column-grant guard added (`columnGrants.test.ts`, 8f4f114): this class of defect escaped both unit tests and RLS suites.
