---
created: 2026-09-20T18:35:07.366Z
title: Restructurer la landing page autour des problèmes PME, pas de l'agent vocal
area: landing
files:
  - src/app/page.tsx
  - src/components/sections/PhoneAgentExplainer.tsx
  - src/lib/translations.ts (t.landing.*)
resolves_phase: "8"
---

## Problem

La landing page actuelle est trop centrée sur l'agent vocal IA — trop de contenu sur ce service unique alors que la landing doit présenter les 9 offres de façon équilibrée. Une partie de ce contenu (détails techniques/fonctionnement de l'agent vocal) devrait être déplacée vers sa page dédiée `/services/agent-vocal-ia` (créée en Phase 6), pas dupliquée sur la landing.

Retour utilisateur (2026-09-20, après exécution de la Phase 6) :
> "je trouve que la page d'accueil est trop axée sur l'agent vocal, certain contenu devrait aller dans la page explication de l'agent vocal, et on devrait présenter des problèmes courants puis quels services les règlent, il faut que ça soit très visuel et qu'il y ait plus de CTA pour le simulateur, recherche sur internet des inspirations"

Ce chantier correspond exactement au périmètre de **Phase 8 : Landing Simplification & Pricing Policy** (`.planning/ROADMAP.md`), qui prévoit déjà : "Landing re-sequenced and re-CTA'd, all pricing removed site-wide". Ce todo capture le contenu de vision spécifique à intégrer dans le `/gsd:discuss-phase 8` à venir, pour ne pas le perdre avant que ce chantier soit atteint (Phase 7 — Diagnostic Simulator — passe avant, car Phase 8 dépend de son existence pour les CTA simulateur).

## Solution

Pistes à discuter lors de `/gsd:discuss-phase 8` (TBD, pas verrouillé) :
- Réorganiser la landing autour du pattern "problème courant PME → quel(s) service(s) le résout" plutôt que par offre technique — probablement une nouvelle section listant 3-5 problèmes fréquents (visibilité en ligne, pas de temps pour répondre au téléphone, image dépassée, etc.), chacun reliant vers 1-2 des 9 pages de service créées en Phase 6
- Alléger fortement la section Agent Vocal IA sur la landing (garder un teaser + CTA vers `/services/agent-vocal-ia`, retirer le détail fonctionnement qui vit déjà sur cette page dédiée)
- Rendre la présentation "très visuelle" — pistes concrètes à trouver via recherche d'inspiration (icônes/illustrations par problème, avant/après, etc.) — non précisé par l'utilisateur, à explorer en recherche de phase
- Ajouter davantage de CTA vers `/simulateur` (Phase 7) tout au long de la landing, pas seulement en fin de page — cohérent avec LANDING-02 (déjà dans REQUIREMENTS.md : "Tous les CTA de la landing renvoient vers le simulateur ou le contact direct")
- Rechercher des inspirations de design sur internet pour cette restructuration — explicitement demandé par l'utilisateur, à faire pendant `/gsd:plan-phase 8` (recherche) ou `/gsd:ui-phase 8`, pas improvisé sans référence
