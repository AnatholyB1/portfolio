# Phase 8: Landing Simplification & Pricing Policy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 8-landing-simplification-pricing-policy
**Areas discussed:** Calculateur ROI, Problèmes PME → Services, Agent Vocal IA sur la landing, Audit "aucun prix" à l'échelle du site

---

## Calculateur ROI — évolution ou suppression

| Option | Description | Selected |
|--------|-------------|----------|
| Garder, retirer le prix | Supprimer les champs prix et tout ce qui en dépend (ratio, amortissement) ; ne garder que la capacité récupérée | ✓ |
| Retirer la page entièrement | Supprimer `/calculateur-roi` et rediriger son lien vers `/simulateur` ou `/services/agent-vocal-ia` | |
| Garder, remplacer le prix par un CTA | Garder le calcul de capacité récupérée, remplacer l'affichage du prix par un CTA type "découvrez le tarif adapté" | |

**User's choice:** Garder, retirer le prix (recommandé)

**Notes:** → D-01, D-03

### CTA final du calculateur

| Option | Description | Selected |
|--------|-------------|----------|
| CTA vers le simulateur | "Découvrez quel service récupère ce temps" → `/simulateur` | |
| CTA vers contact direct | "Parlons de votre cas" → téléphone/email | |
| CTA vers /services/agent-vocal-ia | Renvoie vers la page dédiée de l'offre concernée | ✓ |

**User's choice:** CTA vers /services/agent-vocal-ia

**Notes:** → D-02

---

## Nouvelle section "Problèmes PME → Services"

| Option | Description | Selected |
|--------|-------------|----------|
| Réutiliser la structure, remplacer le contenu | Garder le pattern visuel de `ProblemSection.tsx`, réécrire les items pour lier vers les services | ✓ |
| Repartir de zéro | Nouveau composant entièrement, layout différent | |

**User's choice:** Réutiliser la structure, remplacer le contenu

**Notes:** → D-04

### Nombre de problèmes et mapping vers les services

| Option | Description | Selected |
|--------|-------------|----------|
| 5-6 problèmes, 1-2 services chacun | Mapping large mais gérable | |
| 9 problèmes, un par service | Mapping 1:1 exact, exhaustif | |
| 3-4 problèmes majeurs seulement | Se concentre sur les douleurs les plus fréquentes/universelles | ✓ |

**User's choice:** 3-4 problèmes majeurs seulement

**Notes:** → D-05

### CTA des cartes problème

| Option | Description | Selected |
|--------|-------------|----------|
| CTA global uniquement (simulateur) | Cartes illustratives, un seul CTA en bas vers `/simulateur` | ✓ |
| Chaque carte a son propre lien service | Chaque problème pointe vers sa page `/services/[slug]` | |

**User's choice:** CTA global uniquement (simulateur)

**Notes:** → D-06

---

## Agent Vocal IA sur la landing — réduction & CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Teaser court + CTA | Accroche courte, retirer la liste de features et le diagramme PhoneFlow animé | ✓ |
| Garder le diagramme, retirer juste les features | Le PhoneFlow reste, la liste de features est retirée/raccourcie | |
| Garder tel quel, corriger juste les CTA | Ne pas réduire le contenu, uniquement corriger le lien cassé | |

**User's choice:** Teaser court + CTA (recommandé)

**Notes:** → D-07

### CTA du teaser

| Option | Description | Selected |
|--------|-------------|----------|
| Un seul CTA → /services/agent-vocal-ia | CTA principal vers la page dédiée uniquement | ✓ |
| Deux CTA → page dédiée + simulateur | CTA principal + CTA secondaire direct vers `/simulateur` | |
| Garder aussi le CTA /demo | Comme ci-dessus, en gardant en plus le lien vers `/demo` | |

**User's choice:** Un seul CTA → /services/agent-vocal-ia

**Notes:** → D-08

---

## Audit "aucun prix" à l'échelle du site

| Option | Description | Selected |
|--------|-------------|----------|
| Oui, le retirer maintenant | Retirer `priceRange: "€€"` du JSON-LD global (`layout.tsx`) dans cette phase | ✓ |
| Non, laisser pour la Phase 9 | Traiter avec le sujet `Service.priceRange` déjà flaggé pour la Phase 9 | |

**User's choice:** Oui, le retirer maintenant

**Notes:** → D-09

### Bloc de transition Realisations.tsx ("des prix publics")

| Option | Description | Selected |
|--------|-------------|----------|
| Réécrire vers le simulateur | Nouveau texte → `/simulateur`, sans mention de prix | ✓ |
| Réécrire vers /services, sans prix | Garder le lien vers `/services`, retirer les mentions de prix/tarifs/formules | |
| Supprimer ce bloc | Retirer entièrement le bridge | |

**User's choice:** Réécrire vers le simulateur

**Notes:** → D-10

---

## Claude's Discretion

- Exact wording of the 3-4 problem cards (D-05) and the section's intro/title copy
- Exact new headline/labels for the calculator's remaining "Capacité récupérée" card (D-01)
- Exact rewritten copy for `Realisations.tsx`'s bridge block (D-10) and the shortened `PhoneAgent.tsx` teaser (D-07)

## Deferred Ideas

None — the one candidate (visual-inspiration sourcing for the problem section, mentioned in the folded todo) is a research task for planning/UI-phase, not a deferred scope item.
