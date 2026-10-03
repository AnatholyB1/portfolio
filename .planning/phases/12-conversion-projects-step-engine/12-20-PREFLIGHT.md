# 12-20 Task 1: read-only production preflight

Date: 2026-10-03. Target: production ref `ubxllsvanurkwkohzxau` (confirmed via `supabase/.temp/project-ref`). Read-only queries only; nothing was modified.

## Migration

- File: `supabase/migrations/20261004000000_sv_projects_engine.sql`
- sha256: `bbb981b33b2fb6e649867d543542b120da8b6417088c5b586a9e1d7ba39fc4ab`
- Git: single commit `5e0f749` (feat(12-01)), working tree unmodified since.
- Note: the 12-05 / 12-11 / 12-12 SUMMARYs do NOT record a hash. The "same as branch-proven" claim rests on the file having one commit and no later modification. Re-run sha256sum immediately before apply and compare with the value above.

## Remote migration list (`supabase migration list --linked`)

Remote applied through `20261003020000`. `20261004000000` is local only (remote empty). Phase-11 migrations 20261003000000/010000/020000 are applied remote. (Pre-existing local/remote mismatches on 20260920000000 and 20260921000000 are not ours.)

## Preflight results

| Check | Result |
|-------|--------|
| to_regclass of the 8 tables (sv_projects, sv_project_facts, sv_project_fact_notes, sv_client_onboarding, sv_project_files, sv_project_links, sv_project_consents, sv_mail_outbox) | all absent (false) |
| bucket `sv-project-files` | absent (0 rows); 17 buckets exist, all Gecko/Ziko/Sellerie/portfolio |
| sv_lead_events check constraint | name `sv_lead_events_type_check`; allows lead_created, contact_added, status_changed, source_corrected, lead_linked, erased, return_acknowledged (no lead_converted yet) |
| GECKO_POLICY_COUNT (pg_policies tablename like gecko_%) | 24 (same as 11-17) |
| 5 phase-12 RPCs already present | 0 |
| permanent fixture sv_clients siret 90098846000011 | present (1) |
| storage.objects policies | 42 total; 0 lack a bucket_id filter; 0 mention sv-project-files |

Storage isolation: every existing storage policy is filtered by bucket_id, so none is open to all buckets. The migration creates no storage.objects policy, so the new private bucket stays unreachable except via service_role signed URLs. Migration inserts the bucket with `on conflict do nothing`, public=false, file_size_limit=26214400.

## Red flags

None blocking. One caveat: no hash is recorded in prior SUMMARYs (see above). Test branch `sv-rls-p12` (ref lktypaxkrrqzizwxpafo) still exists and is billing hourly; it is deleted in Task 3.

## Exact Task 3 command list (run nothing outside it, in order)

1. `sha256sum supabase/migrations/20261004000000_sv_projects_engine.sql` must equal the hash above
2. `supabase db query --linked -f supabase/migrations/20261004000000_sv_projects_engine.sql`
3. `supabase migration repair --status applied 20261004000000`
4. Read-only verification via `supabase db query --linked`:
   - to_regclass of the 8 tables not null
   - `select id, public, file_size_limit from storage.buckets where id='sv-project-files'` gives public=false, 26214400
   - sv_lead_events check def contains `lead_converted`
   - `select count(*) from pg_proc where proname in ('sv_convert_lead','sv_create_project','sv_post_project_fact','sv_claim_due_mail','sv_client_last_sign_in')` = 5
   - GECKO_POLICY_COUNT = 24
   - `supabase migration list --linked` shows 20261004000000 on remote
5. Security advisor on prod (same command as 11-17), filtered to phase-12 sv_* objects: 0 WARN/ERROR
6. `supabase branches delete sv-rls-p12 --project-ref ubxllsvanurkwkohzxau`, then confirm via `supabase branches list --project-ref ubxllsvanurkwkohzxau`
7. Remove local `.env.test.local`
