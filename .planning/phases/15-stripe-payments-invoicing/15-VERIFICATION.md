---
phase: 15-stripe-payments-invoicing
verified: 2026-10-06T16:30:00Z
status: human_needed
score: 5/5 must-haves verified (code), 4 owner-side items pending
overrides_applied: 0
human_verification:
  - test: "Desactiver dans le dashboard Stripe « Envoyer des recus pour les paiements reussis » (D-16)"
    expected: "Le client ne recoit que le recu Sevalys, pas un second recu Stripe"
    why_human: "Reglage dashboard uniquement, aucune API"
  - test: "Pousser le commit 5e7c394 (libelle « En attente du PV de recette signe ») sur master et deployer"
    expected: "La ligne de facture finale affiche le nouveau libelle en production"
    why_human: "Deploiement soumis a l'accord du proprietaire (master est en avance de 3 commits sur origin)"
  - test: "Signer un PV de recette sur le client de test et verifier la facture finale automatique"
    expected: "Facture finale TFA avec la ligne de deduction de l'acompte, net a payer = solde, balance_received poste a paiement"
    why_human: "Etape 8 du plan 15-20 non executee en production ; ecriture en production hors perimetre du verificateur"
  - test: "Revue comptable des mentions de facture et de la formule de franchise (VATEX-FR-FRANCHISE)"
    expected: "Mentions legales validees avant le passage en mode live"
    why_human: "Avis professionnel externe"
gaps: []
deferred: []
---

# Phase 15: Stripe payments & invoicing Verification Report

**Phase Goal:** Le client paie en ligne par etape, l'etat « paye » est fiable, et les factures sont legales et immuables
**Verified:** 2026-10-06
**Status:** human_needed
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Le client paie un acompte ou un solde via Stripe Checkout, montant calcule cote serveur | VERIFIED | `src/lib/server/stripe/checkout.ts` : la fonction prend uniquement `invoiceId`; le montant vient de `net_to_pay_cents` lu via RLS, moins les avoirs (`amountDueCents`), refus si statut non payable ; avoirs refuses ; carte + virement (`customer_balance`/`eu_bank_transfer`) ; cle d'idempotence par fenetre de 30 min ; session enregistree par `sv_record_checkout_session`. E2E production : TFA-2026-0001 480 EUR paye par carte, TFA-2026-0002 700 EUR par virement. |
| 2 | « Paye » uniquement apres webhook verifie ; rejeu sans doublon | VERIFIED | `src/app/api/stripe/webhook/route.ts` lit le corps brut, 400 sans signature ou signature invalide (`verifyStripeEvent` -> `Stripe.webhooks.constructEvent`, controle livemode). Seule ecriture du registre : RPC `sv_apply_stripe_event` (execute `service_role` uniquement) ; `sv_stripe_events` PK `event_id` + `on conflict do nothing` + `for update` + retour `replay` si `processed_at` non nul. `sv_invoice_payment_events` : aucun droit d'insertion pour les roles API. Anomalies (montant, devise, livemode, doublon, facture inconnue) enregistrees comme `anomaly` avec mail admin. E2E : `stripe events resend` x2 -> 1 evenement, 1 ligne de registre, 1 fait, 2 recus. |
| 3 | Recu, relances d'acompte impaye, paiement debloque l'etape suivante | VERIFIED | La RPC poste `deposit_received` (acteur `system`) a `paid`, met en file le recu, passe les relances en attente a `skipped` (paid et processing). `payment_requested`, `payment_reminder`, `payment_reminder_admin` definis dans `mail/rules.ts`. E2E : projet passe en Production, 2 recus, 4 relances client + alerte admin `skipped`. Le virement ne duplique pas le fait. |
| 4 | Numerotation sans trou, immuabilite, correction par avoir | VERIFIED | `sv_private.next_invoice_seq` : compteur par (serie, annee) `insert ... on conflict do update`, appele dans la transaction d'emission (lignes 538 et 809) donc un rollback libere le numero ; pas de sequence ; `unique(series, year, seq)`, check `number = serie-annee-seq`. Triggers `*_no_upd_del` et `*_no_truncate` sur `sv_invoices`, lignes, deductions, PDF ; aucun droit d'ecriture aux roles API. Avoir via `sv_issue_credit_note` (TAV/AV, type 381, `credits_invoice_id`, motif obligatoire, remboursement Stripe optionnel). E2E : numerotation 0001, 0002 sans trou ; UPDATE et DELETE rejetes (`sv_immutable_table`) ; avoir TAV-2026-0001 partiel 200 EUR + remboursement Stripe `succeeded` + `charge.refunded` enregistre. |
| 5 | Donnees de facture structurees, pretes Factur-X | VERIFIED | `sv_invoices` : colonnes typees vendeur/acheteur/SIRET, `en16931_type_code` (380/381/386), regime TVA, references (commande, contrat, devis), periode, `prepaid`, `net_to_pay_cents`, `snapshot jsonb`, tables de lignes et de deductions, PDF avec sha256. Pas de generation Factur-X dans cette phase (hors perimetre : « prete pour »). |

**Score:** 5/5 verifies cote code.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Stripe, webhook, factures, statut, calcul, migrations | `npx vitest run` sur `src/lib/server/stripe`, `src/app/api/stripe`, `src/lib/server/invoices`, `invoiceStatus`, `invoiceMath`, `invoicesMigration`, `paymentsMigration` | 15 fichiers, 167 tests passes | PASS |

Probes : aucune declaree (SKIPPED).

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| PAY-01 | SATISFIED | Truth 1 |
| PAY-02 | SATISFIED | Truth 2 |
| PAY-03 | SATISFIED (partiel production) | Truth 3 ; recu, relances skipped et deblocage observes en production ; flux solde/`balance_received` non execute |
| PAY-04 | SATISFIED | Truth 4 |
| PAY-05 | SATISFIED | Truth 5 |

Aucune exigence orpheline : REQUIREMENTS.md rattache exactement PAY-01 a PAY-05 a la phase 15.

## Anti-Patterns

Aucun TBD/FIXME/XXX dans les fichiers stripe, invoices, migrations 20261007*, composants portail et admin billing. Pas de stub observe.

## Constatations honnetes (a conserver, pas des gaps de code)

- **Defaut trouve par l'E2E, corrige** : `loadAdminBillingView` et `loadCreditOrigin` lisaient des colonnes non accordees (`payment_intent_id`, `livemode`, `client_id`) avec le client RLS ; correctif 97bf71e (lecture service-role apres `requireAdmin`), en production. Ni les tests unitaires (mocks) ni les suites RLS ne couvraient cette classe de defaut : un garde « colonnes selectionnees via client RLS dans les grants » est recommande.
- Commit 5e7c394 (libelle) non deploye : `master` est en avance de 3 commits sur `origin/master`.
- PV de recette + facture finale avec deduction d'acompte : non exerces en production (couverts par tests unitaires `build`/`autoIssue` seulement).
- Mode live Stripe jamais configure ; le checkout live echoue ferme (comportement voulu).
- Cle CLI Stripe de test expire le 2027-01-03 ; la remplacer par une cle restreinte du dashboard.
- `npm run test:rls` complet instable sur la branche alors que chaque fichier passe seul ; en release gate, 1 test PDF (timeout 5 s) echoue sous charge parallele, passe seul. Risque de fiabilite de la CI, pas de comportement.
- Configuration de paiement par defaut Stripe partagee avec un autre projet (virement active pour les deux).

## Gaps Summary

Aucun manque de comportement code. Le statut est `human_needed` parce que quatre elements exigent le proprietaire : reglage de recus du dashboard Stripe (D-16), deploiement de 5e7c394, execution PV/facture finale en production, revue comptable des mentions.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
