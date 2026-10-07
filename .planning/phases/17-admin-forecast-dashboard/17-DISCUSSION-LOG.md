# Phase 17: Admin forecast dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-07
**Phase:** 17-admin-forecast-dashboard
**Areas discussed:** CA pipeline et signé, Saisie des coûts, Projection marge et trésorerie, Attribution et lecture du dashboard

---

## CA pipeline et signé

| Option | Description | Selected |
|--------|-------------|----------|
| Devis émis non signés | Devis actif des projets non signés, montants réels | ✓ |
| Devis + estimation manuelle sur leads | Champ valeur estimée sur sv_leads | |
| Pondéré par statut | Devis × probabilité par statut | |

**User's choice:** Devis émis non signés
**Notes:** Signé = total du devis actif à la date de `contract_signed` (alternatives : gelé à la signature, acompte perçu). Facturé/encaissé nets des avoirs, tests TFA/TAV exclus par défaut avec bascule (alternatives : brut, tests inclus).

---

## Saisie des coûts

| Option | Description | Selected |
|--------|-------------|----------|
| Dépenses réelles seulement | Sorties de compte réelles | ✓ |
| Dépenses + temps valorisé | TJM interne | |

**User's choice:** Dépenses réelles seulement
**Notes:** Récurrents = modèle avec période de validité, modification = nouvelle ligne (alternative : saisie mensuelle manuelle). Montant payé en centimes + TVA optionnelle (alternative : HT et TVA séparés).

---

## Projection marge et trésorerie

| Option | Description | Selected |
|--------|-------------|----------|
| Factures émises impayées par échéance | Reste à facturer hors courbe | ✓ |
| + calendrier estimé | Répartition du reste à facturer | |
| Deux courbes certain/probable | Hypothèses supplémentaires | |

**User's choice:** Factures émises impayées par échéance
**Notes:** Horizon 6 mois avec solde de départ saisi (alternative : 3/6/12 mois flux net seulement). Marge par projet et globale, plus marge réalisée (alternative : globale mensuelle).

---

## Attribution et lecture du dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Source figée du lead d'origine | Source puis campagne, « Direct / hors lead » | ✓ |
| Source figée + bascule dernier contact | Deux lectures | |

**User's choice:** Source figée du lead d'origine
**Notes:** Page `/admin/pilotage` avec période, HT/TTC, drill-down de réconciliation, coûts sur `/admin/pilotage/couts` (alternative : intégré à `/admin/entonnoir`).

---

## Claude's Discretion

Structure des tables, catégories de coûts, présentation, méthode de calcul du signé à date, cas limites.

## Deferred Ideas

Valeur estimée sur leads, courbe probable, temps valorisé, bascule dernier contact, alertes de trésorerie négative, export comptable.
