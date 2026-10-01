---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Plateforme Sèvalys
status: ready_to_plan
last_updated: "2026-10-01T19:00:00.000Z"
last_activity: 2026-10-01
progress:
  total_phases: 10
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-01 for milestone v2.0)

**Core value:** Un patron de PME arrive sur le site, comprend, fait confiance et sait comment nous contacter en moins de 60 secondes.
**Current focus:** Phase 10 — Foundation, auth & isolation

## Current Position

Phase: 10 of 19 (Foundation, auth & isolation)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-10-01 — Roadmap v2.0 created (10 phases, 51/51 requirements mapped)

Progress: [░░░░░░░░░░] 0% (0/10 phases in v2.0)

## Performance Metrics

**Velocity:**

- Total plans completed: 48 (v1.0: 21, v1.1: 27)
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

Last session: 2026-10-01
Stopped at: Roadmap v2.0 created
Resume file: None

## Operator Next Steps

- `/gsd:plan-phase 10`
