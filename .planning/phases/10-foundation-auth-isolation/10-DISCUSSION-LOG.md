# Phase 10: Foundation, auth & isolation - Discussion Log

> **Audit trail only.** Decisions are captured in 10-CONTEXT.md.

**Date:** 2026-10-01
**Phase:** 10-foundation-auth-isolation
**Areas discussed:** Invitation & premier admin, Parcours de connexion, Look & coquilles, Tests/env/DNS

## Invitation & premier admin
- Invitation: user answered freely — e-mail + nom client + SIRET, with automatic retrieval of public company info from the SIRET
- Premier admin: user answered freely — contact@sevalys.com should already exist, otherwise create it
- Membres: table membres, plusieurs utilisateurs (recommended)
- Cumul rôles: exclusifs (recommended)

## Parcours de connexion
- Page unique /connexion (recommended)
- Session: 30 jours pour tous (user chose over recommended client 30j / admin 7j)
- Anti-énumération: réponse identique (recommended)
- E-mail FR, Sevalys <connexion@sevalys.com> (recommended)

## Look & coquilles
- Tokens design system sobre; FR seul; coquille + nom du client; pas de navbar publique (all recommended)

## Tests, env & DNS
- Branche Supabase dédiée; sevalys.com via Resend; critère Resend verified + dig + test réception; gardes prix limitées aux chemins publics (all recommended)

## Claude's Discretion
Schéma exact, découpage des plans, rate limiting, organisation des route groups.

## Deferred Ideas
Self-service ajout de membres; sous-domaine mail dédié (phase 16).
