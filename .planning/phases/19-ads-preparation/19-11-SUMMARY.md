# Phase 19 Plan 11: Production apply of the ads-conversions schema - Summary

Phase-19 schema (sv_conversion_events journal, sv_leads source_nonconformity/source_raw, redefined sv_ingest_lead / protect_lead_source / sv_correct_lead_source, recreated sv_leads_admin_v, emission trigger) applied to production (ref ubxllsvanurkwkohzxau) in one transaction on 2026-10-08, verified read-only; Gecko untouched.

Release gate and preflight evidence: see `19-11-PREFLIGHT.md` (Task 1, all green).

## Task 2: owner approval (verbatim, 2026-10-08)

> "Approve and apply now"

Approving the exact production command list in 19-11-PREFLIGHT.md (envelope sha256 13dff84ad7464034a056e392c4812608e9b2718edbd5f4d8a27cf64044085259, migration sha256 825bd45ec1ac3e831355feaf1e2357c99b033147ddfd5560595498bf83d82127). Scope: only the listed steps; the cleanup script would need a new approval (not needed, apply succeeded).

## Task 3: apply and verification

| Step | Command | Result |
|---|---|---|
| 1 | `sha256sum` envelope | 13dff84ad7464034a056e392c4812608e9b2718edbd5f4d8a27cf64044085259 (match) |
| 2 | `supabase db query --linked -f <envelope>` | exit 0, rows [] (single transaction committed) |
| 3 | `supabase migration repair --status applied 20261011000000` | exit 0 (run only after step 2 exit 0) |
| 4 | `supabase migration list --linked` | 20261011000000 on both local and remote |
| 5 | read-only verification | see below |
| 6 | `supabase db advisors --linked --type security` | 61 WARN, all pre-existing categories; 0 mention sv_conversion_events, sv_ingest_lead, emit_conversions, conversion_event_id, sv_leads_admin_v, sv_correct_lead_source, protect_lead_source |
| 7 | envelope and cleanup19.sql removed from scratchpad | done |

Step 5 results (single SELECT):
- relrowsecurity on sv_conversion_events: true
- has_table_privilege: service_role insert false; authenticated insert false; anon select false
- has_function_privilege: service_role sv_private.emit_conversions() false; authenticated sv_private.conversion_event_id(uuid, text) false; sv_ingest_lead 13-arg execute: service_role true, anon false, authenticated false
- Triggers all enabled (O): sv_conversion_events_no_upd_del, sv_conversion_events_no_truncate, sv_lead_events_emit_conversions
- conversion_event_id('00000000-0000-4000-8000-000000000001','lead_submitted') = c2906e05-76be-58a0-b812-a56ec50f0a76 (golden vector, match)
- sv_leads_admin_v: reloptions security_invoker=true; columns source_raw and source_nonconformity present; anon select false
- sv_conversion_events rows: 0 (journal empty); sv_leads 3 and sv_lead_events 5 (unchanged)
- GECKO_POLICY_COUNT = 24 (unchanged)
- Storage policies on storage.objects = 42, name-list md5 8fddcf421e7d7e95ad49013a62d0f5c9 (identical to preflight)
- Fixture sv_clients siret 90098846000011 count = 1

## Deviations from Plan

None. Minor: first verification query had a type error (text || "char"), fixed with a cast; it was read-only and changed nothing.

## Self-Check: PASSED
