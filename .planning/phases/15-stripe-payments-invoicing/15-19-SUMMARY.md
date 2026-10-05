---
phase: 15-stripe-payments-invoicing
plan: 19
subsystem: infra
tags: [supabase, stripe, vercel, production-apply]
requires: [15-11, 15-12, 15-14, 15-15, 15-18, 15-21]
provides:
  - Phase-15 schema applied to production (two migrations)
  - Fixture « Test E2E Sèvalys » flagged is_test = true
  - Stripe test webhook endpoint and Vercel secrets
key-decisions:
  - Stripe CLI key used as stopgap secret key (owner choice); expires 2027-01-03
  - customer_balance enabled on the default payment method configuration (owner choice)
requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-04, PAY-05]
completed: 2026-10-05
---

# Phase 15 Plan 19: Production apply and Stripe provisioning Summary

Production carries the phase-15 schema, the permanent test client is isolated on Stripe test mode, the Stripe test webhook and secrets are in place, and the test branch is deleted.

## Owner approvals (verbatim, 2026-10-05)
- Branch: « Créer la branche sv-rls-p15 (Recommended) » (15-08).
- Production apply: « Approuvé : appliquer la base maintenant ».
- Stripe account: « Autre compte : je connecte le bon (Recommended) », then « j'ai connecté le compte de test sevalys ».
- Secret key: « Clé de la CLI, en dépannage ». Bank transfer: « Tu l'actives via l'API sur la config par défaut ».

## Production (ref ubxllsvanurkwkohzxau)
- Preflight (read-only): nine phase-15 tables absent, `sv_clients.is_test` absent, GECKO_POLICY_COUNT 24, storage policies 42, fixture count 1, both sha256 equal to the branch-proven files (`3a7ec85a…2e26e` and `fd24b6f6…dcc21`).
- Applied in order with history repaired: `20261007000000_sv_invoices.sql`, `20261007010000_sv_payments.sql`. `migration list --linked` shows both on both sides.
- Verified: nine tables with RLS enabled; `service_role` has no insert on `sv_invoices`; `authenticated` cannot select `sv_stripe_events`; `sv_apply_stripe_event` executable by `service_role` only; both `sv_mail_outbox` checks contain `payment_requested` and `payment_anomaly_admin`; GECKO policies still 24, storage policies still 42; `sv_clients.is_test` exists; security advisor reports 0 findings on phase-15 objects (61 findings total belong to other applications).
- Only data write: `update sv_clients set is_test = true where siret = '90098846000011'`, one row, zero invoices for that client.

## Stripe (test mode, account acct_1TqiriBWPMSBebOk « environnement de test sevalys », FR)
- The CLI first pointed at « Sellerie Duchet » (another business). Nothing was configured on it; the owner connected the Sèvalys account.
- Webhook endpoint `we_1UN8pwBWPMSBebOkrDuj2DJI` created: https://sevalys.com/api/stripe/webhook, API `2026-09-30.endive`, eight events (checkout.session.completed, async_payment_succeeded, async_payment_failed, expired, payment_intent.partially_funded, charge.refunded, refund.failed, cash_balance.funds_available). Two pre-existing endpoints (noetree.com) were left untouched.
- `customer_balance` enabled on the default payment method configuration `pmc_1TqisEBWPMSBebOkJodUdIgt` (shared with another project on the same account).
- No live key was provided: live mode stays unconfigured and live checkout fails closed.

## Vercel (project `portfolio`, sevalys.com)
- `STRIPE_SECRET_KEY_TEST` and `STRIPE_WEBHOOK_SECRET_TEST`: Production, sensitive, values never printed. Preview not set (webhooks only reach the production URL).
- The repo was linked locally (`.vercel/`, gitignored).

## Cleanup
- Branch `sv-rls-p15` deleted; `branches list` shows only `main`. `.env.test.local` removed; `.env.stripe.local` was never created.

## Deviations and open items
- **Expiring key:** the Stripe CLI key expires 2027-01-03. Replace it with a restricted key created in the dashboard before then, otherwise test payments stop silently.
- **Receipts:** « Envoyer des reçus pour les paiements réussis » is a dashboard-only setting; the owner must disable it (D-16) or clients get a second receipt.
- **Shared default configuration:** enabling bank transfer there also enables it for any other project using that configuration.
- **Branch password exposure** during 15-08 concerned a throwaway branch, now deleted.
- Accountant review of invoice mentions and franchise wording, and the Vercel plan, remain open risks (accepted 2026-10-03).
