---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Plateforme Sèvalys
status: ready_to_plan
stopped_at: Phase 13 complete (20/20) — ready to discuss Phase 14
last_updated: 2026-10-03T20:59:20.039Z
last_activity: 2026-10-03 -- Phase 13 execution started
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 73
  completed_plans: 73
  percent: 30
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-01 for milestone v2.0)

**Core value:** Un patron de PME arrive sur le site, comprend, fait confiance et sait comment nous contacter en moins de 60 secondes.
**Current focus:** Phase 14 — electronic signature

## Current Position

Phase: 14
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-03

Progress: [████████░░] 82%

## Performance Metrics

**Velocity:**

- Total plans completed: 99 (v1.0: 21, v1.1: 27)
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
- [Phase 11]: 11-02: click ids keep case (D-09 deviation); sv_attr split into sv_attr_ft/sv_attr_lt (D-06 deviation)
- [Phase 11]: [11-03] CLICK_ID_KEYS imported from attribution/params; before_send strips click ids only for pending/refused
- [Phase ?]: 11-04: table named sv_lead_events; lost_at cleared on leaving lost; phone lock key prefixed sv_lead_phone
- [Phase 11]: [11-01] RLS branch sv-rls-p11 (ref ywdfkwysihglnogazybs) owner-approved; delete in 11-17; push sv_leads migration to it before lead suites
- [Phase 11]: 11-06: lead/throttle modules in src/lib/leads and src/lib/throttle.ts, server-only, guarded by priceScope rule (d)
- [Phase 11]: 11-07: public proxy branch is string-only, private branch unchanged; one static public matcher entry
- [Phase 11]: 11-09: closed lists guarded by test parsing migration SQL; Perdu only via markLostAction
- [Phase ?]: 11-11: contact ingest best-effort, simulator ingest fatal
- [Phase 11]: 11-12: refusal strips click ids from sv_attr_* cookies; mentions-legales section 5 text needs legal review

### Pending Todos

None.

### Blockers/Concerns

- Confirmer le plan Vercel (Hobby vs Pro) : fréquence des crons et droits commerciaux (phase 10)
- Relectures professionnelles à planifier : comptable (mentions de facture, franchise en base art. 293 B, mention EI, e-facturation 2027, cohérence avec le numéro de TVA FR58900988460 du propriétaire) et juridique (contrat, clause de convention de preuve avant la phase 14). Risque accepté le 2026-10-03 : textes provisoires utilisables avec de vrais clients, toute correction = nouvelle version de modèle (v2)
- Vérifier les politiques `gecko_*` actives sur le projet Supabase partagé (phase 10)
- Résolu en phase 11 : table de rétention dans supabase/migrations/20261003020000_sv_leads_backfill_purge.sql
- Résolu en phase 13 : React-PDF sur Turbopack et polices locales (rendu prouvé sur Vercel Linux, 13-19)
- Revue de code phase 13 : WR-01, WR-02, WR-08 restent ouverts (nécessitent une migration en production : bucket existant public, clé d'unicité outbox non bornée, règle « pas de remplacement d'un document signé » à revérifier dans la RPC) ; voir 13-REVIEW.md

## Deferred Items

Carried from v1.0/v1.1, not in v2.0 scope: footer nav labels not wired to LanguageContext; JS-level prefers-reduced-motion guards (CinemaIntro, CustomCursor, PhoneAgent, MethodologySection); sector pages and blog; real case studies (SVC2-01); simulator v2 (SIMU2-01/02).

## Session Continuity

Last session: 2026-10-03T14:14:28.210Z
Stopped at: Phase 13 UI-SPEC approved
Resume file: .planning/phases/13-document-generation/13-UI-SPEC.md

## Operator Next Steps

- `/gsd:plan-phase 10`
