---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Plateforme Sèvalys
status: planning
stopped_at: Phase 11 context gathered
last_updated: "2026-10-02T16:14:41.803Z"
last_activity: 2026-10-02
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 13
  completed_plans: 13
  percent: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-01 for milestone v2.0)

**Core value:** Un patron de PME arrive sur le site, comprend, fait confiance et sait comment nous contacter en moins de 60 secondes.
**Current focus:** Phase 11 — lead attribution, pipeline & consent

## Current Position

Phase: 11
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-02

Progress: [░░░░░░░░░░] 0% (0/10 phases in v2.0)

## Performance Metrics

**Velocity:**

- Total plans completed: 61 (v1.0: 21, v1.1: 27)
- v2.0: 0 plans executed

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full decision log lives in PROJECT.md Key Decisions table. v2.0 scoping decisions:

- Signature simple maison (pas de tiers), Stripe Checkout hébergé, PDF depuis modèles dans le code, un seul projet Next.js + Supabase
- Rôles en tables (`sv_admins`, `sv_client_members`), jamais `user_metadata` : le projet Supabase est partagé avec Gecko
- Attribution en phase 11 (données non rattrapables) ; bandeau de consentement avec elle
- ADM-01 (vue projets admin) rattaché à la phase 12 avec le moteur d'étapes ; MAIL-01/02 (squelette) en phase 12, MAIL-03/04 en phase 16
- Politique « aucun prix » inchangée sur le public ; prix autorisés uniquement dans portail, admin et modèles
- Client de test permanent en production (décision propriétaire 2026-10-02) : « Test E2E Sèvalys », SIRET 90098846000011, `anatholyb+sv-test@gmail.com`, à réutiliser pour tous les tests des phases et milestones suivants ; ne pas le supprimer ni le signaler comme donnée résiduelle. Le jeton de contournement Vercel reste en place. Détails : PROJECT.md « Permanent test fixtures »
- Code de connexion à 8 chiffres (réglage du projet Supabase partagé, constante `OTP_LENGTH`) ; l'adresse `anatholyb@gmail.com` seule ne peut pas être invitée (compte existant d'une autre application), utiliser le plus-address

### Pending Todos

None.

### Blockers/Concerns

- Confirmer le plan Vercel (Hobby vs Pro) : fréquence des crons et droits commerciaux (phase 10)
- Relecture juridique (CGV, contrat, clause de convention de preuve) avant la phase 14 ; relecture comptable (mentions de facture, TVA) avant la phase 13
- Vérifier les politiques `gecko_*` actives sur le projet Supabase partagé (phase 10)
- Table de rétention unique à fixer : purge prospects 12 mois, dédoublonnage 9 mois, factures 10 ans, effacement (phase 11)
- Spike React-PDF sur Turbopack et polices locales en premier plan de la phase 13

## Deferred Items

Carried from v1.0/v1.1, not in v2.0 scope: footer nav labels not wired to LanguageContext; JS-level prefers-reduced-motion guards (CinemaIntro, CustomCursor, PhoneAgent, MethodologySection); sector pages and blog; real case studies (SVC2-01); simulator v2 (SIMU2-01/02).

## Session Continuity

Last session: 2026-10-02T16:14:41.794Z
Stopped at: Phase 11 context gathered
Resume file: .planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md

## Operator Next Steps

- `/gsd:plan-phase 10`
