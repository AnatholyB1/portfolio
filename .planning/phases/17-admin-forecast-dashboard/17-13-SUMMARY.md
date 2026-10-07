---
phase: 17-admin-forecast-dashboard
plan: 13
subsystem: infra
tags: [supabase, production-apply, migration]
requirements: [ADM-02, ADM-03, ADM-04, ADM-05]
completed: 2026-10-07
---

# Phase 17 Plan 13: Production migration apply Summary

Migration `20261009000000_sv_pilotage.sql` applied to production in a single begin/commit envelope, history repaired after success, privileges and Gecko objects verified unchanged.

## Owner approval (verbatim, 2026-10-07)

Question: "Autorisez-vous l'application de la migration 20261009000000_sv_pilotage.sql sur la base de PRODUCTION (projet Supabase partagé avec Gecko, ref ubxllsvanurkwkohzxau) ? Elle crée 3 tables append-only + 5 fonctions, sans toucher aux tables Gecko, en une seule transaction (sha256 identique à celui testé sur la branche : 3ea9b124…b877). L'ajout est irréversible hors nettoyage manuel."

Answer: "Oui, appliquer en production (Recommended)"

Scope: only this exact migration file plus the plan's read-only checks. Not deployment (17-14), not cleanup after a failed apply, not deleting sv-rls-p17.

## Task 1: Preflight (read-only)

- Migration list: 20261009000000 local only, remote empty; every earlier migration in sync.
- to_regclass for sv_recurring_costs, sv_project_costs, sv_cash_balances: all null.
- Phase-17 functions in public: 0.
- GECKO_POLICY_COUNT: 24. Storage policies: 42 (md5 of policy definitions `536cb28dfe0a997a101d4c4305fb828c`).
- Fixture (siret 90098846000011): 1.
- Migration sha256: `3ea9b124286be9c7a21be22aedbd77df724d7e4ed43fcf46d3c89c582e03b877`, equal to the 17-06 branch-proven hash.
- Transaction-safety grep (concurrently, vacuum, alter system, begin/commit/rollback): 0.
- Envelope (scratchpad, outside repo): `begin;` + file bytes + `commit;`. `sed '1d;$d' | cmp - migration` returned 0. Envelope sha256 `af11f9d3e4a8b723a37aef3f507927cb7f85773c86c89da4e90182e87b6a0591`.
- 17-12 gate: 185 files, 2162 tests passed, tsc clean, lint 0 errors.
- Cleanup script (prepared, NOT run, not needed): one `begin; ... commit;` dropping the five RPCs by exact signature, then `drop table if exists public.sv_cash_balances, public.sv_project_costs, public.sv_recurring_costs;`.

## Task 2: Approval

Recorded above. Given in the main session and relayed to the executor in the plan prompt.

## Task 3: Apply and verify

1. Envelope sha256 re-checked (OK), then `supabase db query --linked -f <envelope>`: exit 0, no error.
2. Only after exit 0: `supabase migration repair --status applied 20261009000000`: exit 0, "Migration history repaired".
3. Read-only verification:
   - Three tables exist, relrowsecurity true on all.
   - service_role insert on sv_project_costs: false. authenticated insert on sv_recurring_costs: false. authenticated select on sv_cash_balances: true.
   - sv_add_project_cost execute: authenticated false, service_role true.
   - Six triggers present (`*_no_upd_del` and `*_no_truncate` on each table).
   - Row counts: 0, 0, 0.
   - GECKO_POLICY_COUNT 24, storage policies 42 with identical md5: unchanged.
   - Fixture count: 1.
   - `migration list --linked`: 20261009000000 on both sides.
   - Security advisors: no finding on any phase-17 table or function.
4. Envelope file deleted from the scratchpad. No repo files changed.

## Deviations from Plan

**1. [Rule 1 - Bug] Envelope first build added a blank line before commit.** The migration file already ends with a newline, so an extra `\n` made cmp fail (exit 1). Rebuilt with `commit;\n` only; cmp then returned 0 before anything touched production.

**2. Trigger count check.** My first query filtered on a `deny_mutation` name pattern and returned 0. The actual trigger names are `*_no_upd_del` and `*_no_truncate`; a name-agnostic query showed all six. Not a schema defect.

## Known Stubs

None.

## Self-Check: PASSED

Production state confirmed by the read-only queries above; no repo files were created other than this summary.
