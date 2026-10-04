# Phase 15: Stripe payments & invoicing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04
**Phase:** 15-stripe-payments-invoicing
**Areas discussed:** Stripe (mode, méthodes, virement), Échéancier, Facture légale, Reçu/relances/déblocage

---

## Stripe : mode, méthodes, virement

| Option | Description | Selected |
|--------|-------------|----------|
| Test mode partout sauf prod réelle | Clés live seulement en prod pour de vrais clients | ✓ |
| Live pour le client de test | Petits paiements réels remboursés | |
| Test mode jusqu'à validation | Aucune clé live avant relecture comptable | |

| Méthodes | Selected |
|----------|----------|
| Carte + virement Stripe | ✓ |
| Carte uniquement | |
| Carte + prélèvement SEPA | |

| Virement hors Stripe | Selected |
|----------------------|----------|
| Pas de virement hors Stripe | ✓ |
| Fait admin journalisé | |

**User's choice:** Test mode ; carte + virement Stripe ; pas de virement hors Stripe.
**Notes:** L'utilisateur a demandé comment fonctionne le virement Stripe et ses frais (IBAN virtuel, ~0,8 % plafonné 5 €, 1 à 3 jours, écarts de montant à gérer) avant de choisir.

---

## Échéancier

| Option | Description | Selected |
|--------|-------------|----------|
| Acompte + solde unique | Faits existants | |
| Échéances libres au devis | Plusieurs paiements nommés | |
| Facture émise par l'admin à la demande | Lignes libres, TJM, mensuel ou sprint | ✓ |
| Acompte déduit de la dernière facture | | ✓ |
| Bouton acompte dès le contrat signé | | ✓ |
| Facture finale auto après PV signé | | ✓ |

**User's choice:** Acompte puis facturation en TJM mensuelle ou par sprint de deux semaines ; acompte déduit de la dernière facture ; acompte dès contrat signé ; facture finale auto après PV.
**Notes:** « Acompte et après c'est en fonction de ce qui est livré, normalement je chiffre en TJM donc mensuellement j'ai des rapports et des facturations, on travaillera peut-être par sprint de deux semaines à voir ».

---

## Facture légale

| Option | Selected |
|--------|----------|
| FA-AAAA-0001, remise à zéro par an | ✓ |
| Séquence continue sans année | |
| Facture d'acompte émise à la demande, avant paiement | ✓ |
| Facture à la réception du paiement | |
| Avoir admin, remboursement Stripe optionnel | ✓ |
| Avoir seul, remboursement dans Stripe | |

**User's choice:** Recommandations retenues.

---

## Reçu, relances, déblocage

| Option | Selected |
|--------|----------|
| E-mail Sèvalys + facture acquittée portail | ✓ |
| Reçu Stripe natif en plus | |
| Relances J+3, J+7, alerte admin J+14 | ✓ |
| Pas de relance en phase 15 | |
| Statut « paiement en cours », déblocage au webhook final | ✓ |
| Déblocage anticipé au virement initié | |

**User's choice:** Recommandations retenues.

---

## Claude's Discretion

Structure des tables, détail du Checkout et des événements Stripe, atomicité, libellés, vue admin des paiements non rapprochés, bibliothèque et version d'API Stripe.

## Deferred Ideas

PAY-06, PAY-07, prélèvement SEPA, calendrier d'échéances prédéfini, virement hors Stripe, relances généralisées (phase 16), dashboard (phase 17).
