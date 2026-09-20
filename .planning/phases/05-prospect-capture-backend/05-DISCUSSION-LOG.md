# Phase 5: Prospect Capture Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 5-prospect-capture-backend
**Areas discussed:** Champs de contact obligatoires, Détail du diagnostic conservé, Durée de conservation RGPD

---

## Champs de contact obligatoires

| Option | Description | Selected |
|--------|-------------|----------|
| Nom + email obligatoires, téléphone optionnel | Cohérent avec `/api/contact` actuel, moins de friction | |
| Nom + email + téléphone tous obligatoires | Aligné avec le CTA "appeler", garantit un contact direct, plus de friction | ✓ |
| Nom + téléphone obligatoires, email optionnel | Priorise l'appel comme canal principal | |

**User's choice:** Nom + email + téléphone tous obligatoires
**Notes:** Suivi par une question complémentaire sur le nom d'entreprise/secteur — rejeté (reste nom/email/téléphone uniquement, pour minimiser la friction au-delà des 3 champs déjà obligatoires).

---

## Détail du diagnostic conservé

| Option | Description | Selected |
|--------|-------------|----------|
| Oui, stocker les réponses brutes | Permet de personnaliser l'appel de suivi ; peu de volume de données supplémentaire | ✓ |
| Non, uniquement les services recommandés | Moins de données à gérer côté RGPD, mais perte de contexte au rappel | |

**User's choice:** Oui, stocker les réponses brutes en plus des services recommandés
**Notes:** Implique un champ structuré (JSON) dans le schéma de la table, en plus du/des champ(s) services recommandés.

---

## Durée de conservation RGPD

| Option | Description | Selected |
|--------|-------------|----------|
| 12 mois puis suppression | Durée raisonnable pour une petite agence, facile à justifier | ✓ |
| 3 ans puis suppression | Durée maximale habituelle CNIL pour prospection commerciale | |
| Pas de suppression automatique pour l'instant | Plus simple à construire, mais dette RGPD à documenter | |

**User's choice:** 12 mois puis suppression
**Notes:** Doit apparaître dans la mention Art. 13 du formulaire (Phase 7) et être implémenté comme politique de purge côté données (Phase 5).

---

## Claude's Discretion

- Choix RLS/clé pour l'écriture publique dans la table prospects (réutiliser le pattern anon-key existant + RLS insert-only scopée, vs. introduire une vraie clé service-role) — recommandation research : option anon-key + RLS stricte, cohérente avec le reste du repo.
- Mécanisme anti-spam exact (honeypot + rate-limit léger recommandé, CAPTCHA explicitement déconseillé par la recherche pour cette audience).
- Mécanisme technique de purge à 12 mois (cron/scheduled function vs. vérification applicative).
- Nom exact de la table et syntaxe précise de la politique RLS.

## Deferred Ideas

- Champ "nom d'entreprise / secteur" sur le formulaire — explicitement écarté, pas reporté (hors périmètre de ce milestone par choix, pas par manque de temps).
- Pipeline CRM formel (étapes, scoring, routage) — déjà capturé comme CRM2-01 (v2) dans REQUIREMENTS.md, reconfirmé hors périmètre de cette phase.
