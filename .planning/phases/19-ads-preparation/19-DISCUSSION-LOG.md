# Phase 19: Ads preparation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-08
**Phase:** 19-ads-preparation
**Areas discussed:** Vocabulaire UTM, Application par la capture, Taxonomie d'événements, Echelle et event_id

---

## Vocabulaire UTM

| Question | Options | Selected |
|----------|---------|----------|
| source/medium | Source = plateforme, medium = type / google pour GBP aussi / libre | Source = plateforme, medium = type ✓ |
| campagne/content/term | offre_cible_aaaamm / id court + date / nom libre | offre_cible_aaaamm ✓ |
| variantes | Alias → canonique / tel quel | Alias → canonique ✓ |

## Application par la capture

| Question | Options | Selected |
|----------|---------|----------|
| UTM non conforme | Garder + marquer / rejeter / avertissement logs | Garder + marquer ✓ |
| Où vit la convention | Doc repo + générateur admin / doc seule / page admin seule | Doc repo + générateur admin ✓ |

## Taxonomie d'événements

| Question | Options | Selected |
|----------|---------|----------|
| Liste d'événements | Entonnoir complet / 4 conversions / noms existants | Entonnoir complet ✓ |
| Émission | Définis + journalisés serveur / aussi PostHog / taxonomie seule | Définis + journalisés serveur ✓ |
| Propriétés | Sans PII, source et valeur / minimaux / PII hachée | Sans PII, source et valeur ✓ |

## Echelle et event_id

| Question | Options | Selected |
|----------|---------|----------|
| Echelle | 4 rangs, quote_sent hors échelle / 5 rangs / plus haut rang seul | 4 rangs ✓ |
| event_id | Déterministe lead + étape / UUID aléatoire / préfixe + compteur | Déterministe ✓ |
| Valeur | Réelle à Signé seulement / estimée par rang / aucune | Réelle à Signé ✓ |

## Claude's Discretion

Tables et colonnes, alias exacts, emplacement doc/générateur, rétro-marquage des leads existants.

## Deferred Ideas

ADS-03/04/05, hachage PII, valeurs estimées, événements PostHog par étape.
