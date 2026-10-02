# 11-17 Prod preflight (draft evidence, read-only)

Project ref: ubxllsvanurkwkohzxau (shared prod). Captured 2026-10-02. Only `supabase migration list --linked` and SELECT queries were run. Local `supabase link` wrote only the gitignored `supabase/.temp`.

## Remote migration list (before apply)

Remote versions: 20260425125140, 20260521095243, 20260524220307, 20260920083556, 20260921010000, 20260921202340, 20260921202354, 20260921203728, 20260921211036, 20260921211109, 20260921214241, 20261002000000.

Phase-11 versions 20261003000000, 20261003010000, 20261003020000: NOT present remotely (local only).
(Local-only 20260920000000 and 20260921000000 are pre-existing and unrelated; do not touch.)

## Preflight values

| Check | Result |
|-------|--------|
| to_regclass sv_leads / sv_lead_events / sv_consent_log / sv_funnel_v | all null (absent, expected) |
| sv_consent_versions table | absent |
| public.sv_clients (phase 10) | present |
| sv_private.is_admin | present (1) |
| public.prospects rows | 1 |
| cron.job | only `purge-prospects-12mo` (0 3 * * *) |
| GECKO_POLICY_COUNT | 24 (as in 10-12) |

## sha256 of migration files

- 20261003000000_sv_leads_core.sql: ad40a33bdbe0d69fef562bca91d4eeadb3f81957be363638e1d3e5ccc607b4c9
- 20261003010000_sv_consent_funnel.sql: 1008b8e4ca03b0db1a309bfb729c5065e7e09c65fa8a9102a33a3e13b27fbada
- 20261003020000_sv_leads_backfill_purge.sql: 658e4c1767bb3c967c99deab71b8dfe1f7492a652fdaa96c12dc8575cdff99dc

## Exact ordered command list for Task 3 (nothing else runs against prod/branch)

0. Re-hash the three files (must match above) and re-check `to_regclass('public.sv_leads')` is null.
1. `supabase db query --linked -f supabase/migrations/20261003000000_sv_leads_core.sql`
2. `supabase migration repair --status applied 20261003000000 --linked`
3. `supabase db query --linked -f supabase/migrations/20261003010000_sv_consent_funnel.sql`
4. `supabase migration repair --status applied 20261003010000 --linked`
5. `supabase db query --linked -f supabase/migrations/20261003020000_sv_leads_backfill_purge.sql`
6. `supabase migration repair --status applied 20261003020000 --linked`
7. Read-only verification + security advisor (`supabase db advisors --linked --type security`).
8. `supabase branches delete sv-rls-p11 --project-ref ubxllsvanurkwkohzxau`

Forbidden: `db push`, `migration repair --status reverted`, manual `sv_private.purge_leads()`, test inserts in prod.

## Apply -> deploy window

Between the apply and the 11-18 production deploy, the live (old) site keeps inserting into public.prospects. 11-18 re-runs the idempotent `sv_private.backfill_legacy_prospects()` right after the deploy (legacy_prospect_id guard), so no submission is lost. Keep the window short.

## Anomalies

None. sv_leads absent, phase-10 objects present, policy count 24. Note: cron currently holds purge-prospects-12mo (to be swapped by migration 3 for sv-purge-leads); prospects count is 1, so expected legacy leads after apply = 1 (more if the live site adds rows before apply).
