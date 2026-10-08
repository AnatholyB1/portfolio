# 19-11 Task 1: release gate, read-only production preflight, apply package (2026-10-08)

No command in this task modified production (only `supabase migration list --linked` and SELECT-only `supabase db query --linked -f`). Task 2 (owner approval) and Task 3 (apply) NOT run.

## Release gate (master, clean tree) - ALL GREEN
| Check | Result |
|---|---|
| `rtk npm test` | 209 files, 2443 tests passed |
| `tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, 0 errors, 11 pre-existing warnings |
| `next build` | exit 0 (confirmed with `node_modules/.bin/next build`; the `rtk next build` wrapper printed "Errors: 0 | Warnings: 0" but its piped exit code read 1, a wrapper artifact) |

## Read-only production preflight (ref ubxllsvanurkwkohzxau)
- `migration list --linked`: 20261010000000 on both sides; 20261011000000 local only (to apply). Pre-existing unrelated drift: 20260920000000 and 20260921000000 local-only, several remote-only older versions (why `db push` is not used; `db query -f` + `migration repair` is).
- `to_regclass('public.sv_conversion_events')` = null (PASS).
- `sv_leads` columns source_nonconformity/source_raw: 0 present (PASS).
- Extensions: uuid-ossp 1.1 in schema `extensions`; pgcrypto 1.3 in schema `extensions`.
- Probe `extensions.uuid_generate_v5('87713031-3054-582f-9073-0aa58d13d20e', '00000000-0000-4000-8000-000000000001:lead_submitted')` = `c2906e05-76be-58a0-b812-a56ec50f0a76` (equals expected golden value, PASS).
- `sv_ingest_lead(...13 args)` pg_get_functiondef md5 (pre-apply reference) = `9ed765d77387bc1455fb5e7b6d6ddcf6`.
- `sv_leads_admin_v` exists. Dependents: `information_schema.view_table_usage` = 0; `pg_depend`/`pg_rewrite` dependents = 0 (PASS: safe to drop/recreate).
- Row counts (record only, no backfill): sv_leads 3, sv_lead_events 5.
- GECKO_POLICY_COUNT (pg_policies tablename like 'gecko\_%') = 24.
- Storage policies (schema storage, table objects): 42, name-list md5 `8fddcf421e7d7e95ad49013a62d0f5c9`. Names: gecko menu images (3), auth delete/upload album-backgrounds/album-covers/album-photos/portfolio-photos (8), public read album-backgrounds/covers/photos + portfolio-photos (4), product_images_select_all, sellerie_preview_product_images_select_all, ziko_* (ai_imports 3, avatar 4, coach_exercises 3, coach_kyc 3, coach_logos 2, coach_videos 3, exports_read, profile_photos 3, scan_photos 3). Post-apply must be identical (42, same md5).
- Fixture `sv_clients` siret 90098846000011: count 1 (PASS).

## Hash comparison
- `supabase/migrations/20261011000000_sv_ads_conversions.sql` sha256 = `825bd45ec1ac3e831355feaf1e2357c99b033147ddfd5560595498bf83d82127`
- 19-06 and 19-07 SUMMARY: `825bd45ec1ac3e831355feaf1e2357c99b033147ddfd5560595498bf83d82127` -> IDENTICAL (PASS). 19-07 (20/20 on sv-rls-p19) covers this exact file.
- File is 20823 bytes. Git tree clean.
- Transaction-safety grep: no top-level begin/commit/rollback (the 4 `begin` hits at lines 39, 94, 254, 409 are plpgsql function-body `begin`), no `create extension`, no `sv_mail_outbox`, no concurrently/vacuum (PASS).
- Phase-11 objects being replaced exist only in 20261003000000_sv_leads_core.sql (no intermediate migration redefines sv_ingest_lead, sv_correct_lead_source, protect_lead_source or sv_leads_admin_v), so cleanup restores from that file.

## Envelope
- Built in the session scratchpad: `begin;\n` + file byte for byte + `commit;\n`; 20838 bytes (20823 + 7 + 8).
- Path: `C:/Users/Anatholy/AppData/Local/Temp/claude/C--portfolio/e0c454c5-6b0d-4972-a2eb-6da6131aebe4/scratchpad/sv_ads_tx.sql`
- Envelope sha256 = `13dff84ad7464034a056e392c4812608e9b2718edbd5f4d8a27cf64044085259`
- cmp proofs: `tail -n +2 "$ENV" | head -n -1 | cmp - <file>` exit 0; `tail -c +8 "$ENV" | head -c 20823 | cmp - <file>` exit 0. First 7 bytes `begin;\n`, last 8 bytes `commit;\n`.

## Cleanup script (prepared, NOT run; only after a new explicit owner approval, only if residue exists after a failed apply)
Stored at scratchpad `cleanup19.sql` (245 lines). Structure, in one transaction:
```sql
begin;
drop trigger if exists sv_lead_events_emit_conversions on public.sv_lead_events;
drop table if exists public.sv_conversion_events;
drop function if exists sv_private.emit_conversions();
drop function if exists sv_private.conversion_event_id(uuid, text);
drop view if exists public.sv_leads_admin_v;
alter table public.sv_leads drop column if exists source_nonconformity, drop column if exists source_raw;
-- verbatim from 20261003000000_sv_leads_core.sql (LF-normalised):
--   lines 180-209: sv_private.protect_lead_source() + revoke + trigger sv_leads_protect_source
--   lines 215-358: public.sv_ingest_lead(13 args) + revoke/grant
--   lines 436-498: public.sv_correct_lead_source(...) + revoke/grant
--   lines 568-584: create or replace view public.sv_leads_admin_v (security_invoker) + revoke anon / grant authenticated
commit;
```
(Dropping the table removes its index and deny triggers; the view is dropped before the columns because it selects `l.*`.)

## Exact Task 3 command list (to be approved in Task 2)
```
ENV_SQL="C:/Users/Anatholy/AppData/Local/Temp/claude/C--portfolio/e0c454c5-6b0d-4972-a2eb-6da6131aebe4/scratchpad/sv_ads_tx.sql"
1. sha256sum "$ENV_SQL"                                   # must equal 13dff84a...85259
2. rtk supabase db query --linked -f "$ENV_SQL"            # single transaction; the ONLY DDL
3. ONLY if step 2 exit 0: rtk supabase migration repair --status applied 20261011000000
4. rtk supabase migration list --linked                    # 20261011000000 on both sides
5. Read-only verification (db query --linked): relrowsecurity true on sv_conversion_events; has_table_privilege false for service_role insert, authenticated insert, anon select; has_function_privilege false for service_role on sv_private.emit_conversions(), authenticated on sv_private.conversion_event_id(uuid, text); sv_ingest_lead 13-arg execute true for service_role, false for anon and authenticated; triggers sv_conversion_events_no_upd_del, sv_conversion_events_no_truncate and sv_lead_events_emit_conversions present and enabled; sv_private.conversion_event_id('00000000-0000-4000-8000-000000000001','lead_submitted') = c2906e05-76be-58a0-b812-a56ec50f0a76; sv_leads_admin_v has security_invoker, the two new columns, anon no select; sv_conversion_events row count recorded; GECKO_POLICY_COUNT = 24; storage policies = 42 with md5 8fddcf421e7d7e95ad49013a62d0f5c9; fixture count = 1
6. rtk supabase db advisors --linked --type security       # no WARN/ERROR on phase-19 objects
7. rm the envelope and cleanup files from the scratchpad
```
Failure procedure: if step 2 fails, NO repair; read-only: to_regclass('public.sv_conversion_events') null, sv_leads has no source_nonconformity column, sv_ingest_lead definition md5 = 9ed765d77387bc1455fb5e7b6d6ddcf6; record; if residue, present cleanup19.sql and wait for a new verbatim approval.

## Awaiting
Task 2 owner approval of the list above (blocking checkpoint). Nothing applied.
