# Phase 13: Document generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-03
**Phase:** 13-document-generation
**Areas discussed:** Émission et cycle de vie, Contenu et saisie des montants, Facture et mentions légales, Onglet Documents du client

---

## Émission et cycle de vie

| Question | Option | Selected |
|----------|--------|----------|
| Qui déclenche la génération ? | Geste admin explicite | ✓ |
| | Automatique à l'étape | |
| | Mixte selon le type | |
| Brouillon avant émission, correction après ? | Aperçu puis émission | ✓ |
| | Brouillon stocké puis émission | |
| | Émission directe | |
| Accès client et notification | Visible à l'émission + e-mail | ✓ |
| | Publication séparée | |
| | Visible sans e-mail | |
| Garde par étape et exemplaires | Garde par étape, remplacement | ✓ |
| | Garde par étape + plusieurs actifs | |
| | Pas de garde | |

**User's choice:** Toutes les options recommandées.
**Notes:** Tension relevée : « un seul actif par type » ne convient pas aux factures acompte/solde ; la facture n'étant que prévisualisée en phase 13, la question est reportée aux phases 14-15.

---

## Contenu et saisie des montants

| Question | Option | Selected |
|----------|--------|----------|
| Saisie du contenu financier du devis | Lignes libres par projet | ✓ |
| | Catalogue d'offres pré-rempli | |
| | Libre + modèles enregistrés | |
| Texte du contrat | Modèle fixe dans le code | ✓ |
| | Modèle + clauses spécifiques | |
| | Modèles par offre | |
| Contenu du cahier des charges | Sections structurées saisies | ✓ |
| | Un seul texte riche | |
| | Upload d'un document rédigé ailleurs | |
| Contenu du PV de recette | Livrables + critères du CDC | ✓ |
| | Un PV par étape livrée | |
| | Modèle minimal | |

**User's choice:** Toutes les options recommandées.
**Notes:** Les critères d'acceptation du CDC alimentent le PV de recette.

---

## Facture et mentions légales

| Question | Option | Selected |
|----------|--------|----------|
| Rôle de la facture en phase 13 | Modèle + test, numéro provisoire | ✓ |
| | Émission réelle dès la phase 13 | |
| | Pas de facture en phase 13 | |
| Régime de TVA du vendeur | Franchise en base de TVA | ✓ |
| | Assujetti à la TVA (20 %) | |
| | Configurable par constante, à confirmer | |
| Identité du vendeur | Constante versionnée dans le code | ✓ |
| | Table en base éditable par l'admin | |
| | Variables d'environnement | |
| Périmètre du test de mentions | Texte extrait + liste par type | ✓ |
| | Idem + contrat, CDC et PV | |
| | Test sur les données avant rendu | |

**User's choice:** Options recommandées, sauf TVA : « Franchise en base de TVA » (choix de l'utilisateur, non la recommandation par défaut).
**Notes:** La confirmation par l'expert-comptable reste un blocker avant mise en production.

---

## Onglet Documents du client

| Question | Option | Selected |
|----------|--------|----------|
| Modélisation des statuts à signer / signé / payé | Statut déduit des faits | ✓ |
| | Colonne de statut sur le document | |
| | Seulement « Émis » en phase 13 | |
| Consultation et récupération | Liste + téléchargement signé | ✓ |
| | Liste + aperçu intégré | |
| | Liste seule, ouverture dans un onglet | |
| Vue admin et instantané de données | Section Documents dans la fiche projet | ✓ |
| | Page Documents transverse en plus | |
| | Instantané en base seulement | |

**User's choice:** Toutes les options recommandées.
**Notes:** Fin de discussion : « Je suis prêt pour le contexte ».

---

## Claude's Discretion

- Structure des tables, noms de types, découpage des plans.
- Mécanisme d'écriture unique du stockage et chemin non devinable.
- Spike `@react-pdf/renderer` sur Next 16 / Turbopack, polices locales, extraction de texte PDF pour les tests.
- Mise en page des PDF et de l'onglet, libellés, e-mail d'émission, forme de l'aperçu.

## Deferred Ideas

- Visualiseur PDF intégré, plusieurs documents actifs par type, page admin transverse, contrats par offre, catalogue de prix, test de mentions étendu, clauses particulières, facture réelle (phase 15).
