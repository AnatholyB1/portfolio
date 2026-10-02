# Phase 12: Conversion, projects & step engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 12-Conversion, projects & step engine
**Areas discussed:** Conversion lead → client, Étapes du projet & déblocage, Onboarding/fichiers/accord, Mails & vue admin des projets

---

## Conversion lead → client

| Question | Selected | Alternatives |
|----------|----------|--------------|
| Saisie au clic (lead sans SIRET) | Mini-formulaire SIRET + e-mail | SIRET demandé au client (siret nullable) ; Claude décide |
| Contact invité | Le plus récent, modifiable | Premier contact ; choix dans une liste |
| Statut du lead après conversion | Reste lié, Signé posé à la main | Passage auto en Signé ; statut « Converti » |
| Garde-fou de statut | Seulement à partir de Qualifié (≠ défaut recommandé) | Tout statut sauf Perdu ; tout statut |

## Étapes du projet & déblocage

| Question | Selected | Alternatives |
|----------|----------|--------------|
| Modèle de frise | Commune, offre en métadonnée | Un modèle par famille d'offre ; étapes optionnelles |
| Liste d'étapes | 6 étapes | 4 étapes ; 8 ou plus |
| Déblocage avant phases 13-15 | Faits typés posés par l'admin | Seuls faits automatiques ; bouton « avancer » |
| Retour arrière | Fait correctif journalisé | Avancement monotone |

## Onboarding, fichiers & accord

| Question | Selected | Alternatives |
|----------|----------|--------------|
| Champs d'onboarding | Confirmer + compléter | Minimal ; étendu |
| Accès avant fin d'onboarding | Frise visible, étape 1 en cours | Bloquant ; facultatif |
| Fichiers | Client et admin, 25 Mo | Client seul 10 Mo ; 100 Mo |
| Liens utiles | Admin, titre + URL | Admin et client |
| Accord de présentation | Interrupteur, texte versionné, une portée | Demandé en fin de projet ; portées séparées |

## Mails & vue admin des projets

| Question | Selected | Alternatives |
|----------|----------|--------------|
| Règles de mail | En code, journal en base | Modifiables en base par l'admin |
| Délais | Immédiat, `send_after` + cron quotidien | Tout immédiat jusqu'en phase 16 |
| Événements phase 12 | Client invité, changement d'étape, onboarding terminé → admin | Statut lead → prospect (non retenu, phase 16) |
| Définition de blocage | Attend le client, attend l'admin, projet dormant | — (les trois retenus) |
| Forme de la vue admin | Tableau triable + fiche projet | Tableau seul |
| Projets par client | Multi-projets, un créé à la conversion | Un seul projet |

## Claude's Discretion

Structure des tables, noms des faits, libellés et textes, types de fichiers autorisés, durée du lien signé, disposition de la fiche projet, détection d'activité du projet dormant.

## Deferred Ideas

Modèles d'étapes par offre ; e-mail prospect sur statut (phase 16) ; éditeur de règles ; ajout de membre par le client ; accord de présentation par usage.
