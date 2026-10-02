---
phase: 10-foundation-auth-isolation
plan: 12
subsystem: database
tags: [supabase, prod-migration, rls, advisor, admin-recovery]
requires: ["10-03", "10-07", "10-09"]
provides:
  - "sv_* schema applied on shared prod (ubxllsvanurkwkohzxau)"
  - "contact@sevalys.com seeded in prod sv_admins (D-05)"
  - "proven admin recovery path (dry run)"
affects: ["10-13"]
key-files:
  created: []
  modified: []
metrics:
  completed: 2026-10-02
requirements-completed: [FOUND-02, FOUND-03, FOUND-04]
---

# Phase 10 Plan 12: Prod apply of sv_foundation Summary

The sv_foundation migration (sha256 8931c458...973f4a, commit d324417) was applied to the shared prod database through `supabase db query --linked -f` plus `migration repair --status applied`, after explicit owner approval, with no change to any other app's migration history or Gecko policies.

## Owner approval (Task 2, blocking gate)

Given by the project owner in the main interactive session at 2026-10-02T11:09Z, verbatim reply: **"apply prod"**, to the exact command list:
1. `supabase db query --linked -f supabase/migrations/20261002000000_sv_foundation.sql`
2. `supabase migration repair --status applied 20261002000000 --linked`

Forbidden and not run: `db push`, `migration repair --status reverted`, any other DDL. The approval was relayed to this continuation by the orchestrator.

## Preflight (Task 1, read-only)

- Migration file sha256 8931c4581e8c54275c884a6af914dbc47cf20725da3ee2001edebc933a973f4a (re-hashed before apply: identical).
- Before apply: sv_clients absent, schema sv_private absent, GECKO_POLICY_COUNT = 24, auth.users has 1 row for contact@sevalys.com. Re-checked immediately before apply: same values.
- Remote migration list before apply (remote versions): 20260425125140, 20260521095243, 20260524220307, 20260920083556, 20260921010000, 20260921202340, 20260921202354, 20260921203728, 20260921211036, 20260921211109, 20260921214241. 20261002000000 not present.

## Apply (Task 3)

- `db query -f` succeeded (no error, empty result set).
- `migration repair --status applied 20261002000000 --linked` -> "Repaired migration history: [20261002000000] => applied".
- Remote list after: identical to the snapshot plus 20261002000000. No other remote version changed.
- Note: the worktree had no `supabase/.temp`; the project was linked with `supabase link --project-ref ubxllsvanurkwkohzxau` (needed for the IPv4 pooler). `supabase/.temp` was removed afterwards.

## Verification (read-only queries on prod)

| Check | Result |
|-------|--------|
| sv_admins, sv_client_members, sv_clients, sv_tenants, sv_throttle relrowsecurity | all true |
| contact@sevalys.com rows in sv_admins (D-05) | 1 |
| anon select on public.sv_clients | false |
| authenticated insert on public.sv_clients | false |
| authenticated execute on public.sv_login_allowed(text) | false |
| Gecko policy count | 24 (unchanged) |

## Security advisor (prod)

`supabase db advisors --linked --type security`: 61 findings, all on other apps' objects (27 anon_security_definer_function_executable, 27 authenticated_security_definer_function_executable, 4 function_search_path_mutable, 2 extension_in_public, 1 auth_leaked_password_protection). Zero findings mention an sv_* object. Pre-existing findings were listed, not fixed.

## Recovery script dry run

`node --env-file=C:\portfolio\.env scripts/sv-add-admin.mjs --email contact@sevalys.com` (equivalent to the npm script; env loaded from the main repo `.env`, no secret printed) printed `[sv-add-admin] already_admin (dry run)`, exit 0.

## Procédure de récupération admin

- Quand l'utiliser : perte de l'accès admin Sèvalys, ou ajout d'un second admin.
- Simulation : `npm run sv:add-admin -- --email <adresse>` (aucune écriture, affiche le statut).
- Écriture : la même commande avec `--yes`. Ajouter `--create` seulement pour une adresse sans compte auth.
- Nécessite la clé secrète Supabase locale (`SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`) dans le shell ou `.env.local`.
- Les membres clients sont refusés (D-04).

## Deviations from Plan

- Worktree HEAD base differed from the expected c368554; reset to c368554 per the launch instructions before any work.
- The dry run used `node --env-file` directly instead of `npm run`, because the isolated shell refused sourcing the env file. Same script, same result.

## Self-Check: PASSED

No repo files were changed other than this SUMMARY; prod state verified by the queries above.
