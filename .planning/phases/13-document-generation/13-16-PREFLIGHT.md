# 13-16 Task 1: read-only production preflight

Date: 2026-10-03. Target: production ref `ubxllsvanurkwkohzxau` (confirmed via `supabase/.temp/project-ref`). Only `migration list --linked` and SELECT queries via `db query --linked` were run. Nothing was modified. No credential was printed.

## Migration

- File: `supabase/migrations/20261005000000_sv_documents.sql`
- sha256 now: `b5552c433ef8b8af9e8d3d5e6730e0f954488a045408691c08748f9c4815f7bd`
- Branch-proven sha256 (13-07 SUMMARY, applied unchanged on `sv-rls-p13`): `b5552c433ef8b8af9e8d3d5e6730e0f954488a045408691c08748f9c4815f7bd`
- Result: IDENTICAL. Single commit `f96464b` (feat(13-02)) touches the file.

## Remote migration list (`supabase migration list --linked`)

Remote applied through `20261004000000` (phase 12 applied). `20261005000000` is local only (remote empty), as expected. Pre-existing local/remote mismatches on `20260920000000` and `20260921000000` (local only) and several remote-only April to September versions are not ours (same as 12-20).

## Preflight results

| Check | Result |
|-------|--------|
| to_regclass('public.sv_project_documents') | null |
| to_regclass('public.sv_document_snapshots') | null |
| bucket `sv-documents` in storage.buckets | absent (0 rows) |
| function `sv_issue_document` | absent (0) |
| sv_mail_outbox event_type check | `sv_mail_outbox_event_type_check` = client_invited, step_changed, onboarding_completed (no document_issued) |
| sv_mail_outbox template check | `sv_mail_outbox_template_check` = invite, step_changed, onboarding_completed (no document_issued) |
| other sv_mail_outbox checks (untouched) | dedupe_key_check, last_error_check, recipient_email_check, recipient_kind_check, status_check |
| GECKO_POLICY_COUNT (pg_policies tablename like gecko_%) | 24 (same as 12-20) |
| storage.objects policies | 42 total |
| storage policies not filtered by bucket_id | 0 (see note) |
| permanent fixture sv_clients siret 90098846000011 | present (1) |

Storage note: 12 policies have a null USING clause because they are INSERT policies; for all 12 the WITH CHECK contains `bucket_id = '<gecko/ziko/album/portfolio bucket>'`. None is open to every bucket and none references `sv-documents`. The migration creates no storage.objects policy, so the new private bucket stays reachable only through service_role signed URLs. The bucket insert uses `on conflict do nothing`, public=false, file_size_limit=10485760, allowed_mime_types={application/pdf}.

Constraint swap note: the migration drops both named checks, drops any check matching step_changed and onboarding_completed, and re-adds the same two names with document_issued appended. No other constraint is touched.

## Red flags

None blocking. Test branch `sv-rls-p13` (ref soygoebzenroyoszjaky) still exists and bills hourly; it is deleted in Task 3. Its connection strings were exposed in the 13-07 transcript (see 13-07 SUMMARY), another reason to delete rather than keep it.

## Exact Task 3 command list (run nothing outside it, in order)

1. `sha256sum supabase/migrations/20261005000000_sv_documents.sql` must equal `b5552c433ef8b8af9e8d3d5e6730e0f954488a045408691c08748f9c4815f7bd`
2. `supabase db query --linked -f supabase/migrations/20261005000000_sv_documents.sql`
3. `supabase migration repair --status applied 20261005000000`
4. Read-only verification via `supabase db query --linked`:
   - both tables exist and `relrowsecurity` is true (`select relname, relrowsecurity from pg_class where oid in ('public.sv_project_documents'::regclass, 'public.sv_document_snapshots'::regclass)`)
   - `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='sv-documents'` gives public=false, 10485760, {application/pdf}
   - `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.sv_mail_outbox'::regclass and contype='c' and conname in ('sv_mail_outbox_event_type_check','sv_mail_outbox_template_check')` gives exactly 2 rows, each containing document_issued
   - `select proname from pg_proc where proname='sv_issue_document'` returns 1 row
   - `select has_function_privilege('authenticated','public.sv_issue_document(uuid, uuid, text, integer, text, text, text, text, text, integer, jsonb, uuid, uuid, text)','execute')` is false (and the same for service_role is true)
   - GECKO_POLICY_COUNT = 24
   - storage.objects policy count = 42 and list unchanged
   - `supabase migration list --linked` shows 20261005000000 on both sides
5. `supabase db advisors --linked --type security`: 0 WARN/ERROR on sv_project_documents, sv_document_snapshots, sv_issue_document
6. `supabase branches delete sv-rls-p13 --project-ref ubxllsvanurkwkohzxau --yes`, then `supabase branches list --project-ref ubxllsvanurkwkohzxau` shows only main
7. Remove local `.env.test.local`
