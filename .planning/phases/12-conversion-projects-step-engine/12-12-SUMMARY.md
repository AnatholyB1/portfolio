---
phase: 12-conversion-projects-step-engine
plan: 12
subsystem: database-tests
tags: [rls, storage, supabase, conversion]
requires: ["12-01", "12-05"]
provides:
  - "Proven private-bucket isolation for sv-project-files"
  - "Proven atomic sv_convert_lead behaviour"
affects: [12-13]
key-files:
  created:
    - tests/rls/files.rls.test.ts
    - tests/rls/convert.rls.test.ts
decisions:
  - "No migration or FilesPanel change needed: both upload formats work"
requirements-completed: [PORTAL-01, PORTAL-05]
metrics:
  completed: 2026-10-03
  tasks: 2
  files: 2
---

# Phase 12 Plan 12: Storage isolation and conversion RLS suites Summary

Two RLS suites on branch sv-rls-p12 prove the private sv-project-files bucket (shared with Gecko) and the atomic sv_convert_lead RPC; full `npm run test:rls` is green (14 files, 130 tests).

## Results

- Raw-body PUT to a signed upload URL: status 200, file stored.
- Multipart FormData PUT (key '', the format FilesPanel.tsx uses): status 200, file stored. FilesPanel needs no change.
- Anon, member of A, member of B, plain user, Gecko admin and Sèvalys admin: list returns empty or error, download errors. Bucket is private.
- Signed download URL returns 200 with attachment disposition, then 4xx after expiry.
- text/html upload rejected (>=400); 26214401-byte upload rejected (400).
- Storage policy audit (qual not mentioning bucket_id): count 1. Inspected: it is Gecko's INSERT policy "Admins can upload gecko menu images", whose qual is null by nature while its with_check is scoped to bucket 'gecko-menu-images'. No policy opens all buckets (A2 confirmed). No policy touches sv-project-files, so only the service role can access it.
- Conversion: client, member, project, converted_client_id, status kept, source columns unchanged, one lead_converted event, one client_invited outbox row with the expected dedupe key; second conversion gives sv_lead_already_converted; new and lost leads give sv_lead_not_convertible; existing SIRET gives client_reused true and a second project; Promise.all of two conversions gives one success and one sv_lead_already_converted with a single project; an admin user gives sv_role_conflict with full rollback.

## Deviations from Plan

- Test-only: the "lost" lead case needed a lost reason ('autre'), so that case sets status through sv_set_lead_status directly instead of makeConvertibleLead. No helper or migration change.
- The audit query's raw count is 1 (false positive described above), so the audit is recorded as informational and asserts only that the query ran, per the plan.
- No migration bugs found; 20261004000000_sv_projects_engine.sql unchanged.

## Commits

- 9489a9f: test(12-12): add storage isolation and lead conversion RLS suites

## Notes

STATE.md advance-plan/record-metric not run in this pass beyond the SUMMARY; orchestrator may update.

## Self-Check: PASSED
