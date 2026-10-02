---
phase: 11-lead-attribution-pipeline-consent
plan: 14
subsystem: database
tags: [rls, vitest, supabase, consent, funnel, retention, canary]
requires:
  - phase: 11-10
    provides: migrations applied on the sv-rls-p11 branch, lead RLS helpers
provides:
  - consent journal, funnel view and retention RLS tests (green on branch)
  - canary scenario on sv_leads admin read policy
affects: [11-17, 11-18]
key-files:
  created:
    - tests/rls/funnel.rls.test.ts
    - tests/rls/retention.rls.test.ts
  modified:
    - tests/rls/consent.rls.test.ts
    - scripts/rls-canary.mjs
key-decisions:
  - "Funnel view is read through an admin client in tests: service_role has no grant on sv_funnel_v (admin-only by design)"
requirements-completed: [LEAD-06, LEAD-08, LEAD-09, LEAD-03]
duration: 25min
completed: 2026-10-02
---

# Phase 11 Plan 14: Consent, funnel, retention proof and canary Summary

Consent log, funnel view and backfill/purge behaviour are proven on the branch (8 suites, 84 tests green), and the canary now turns RED when the sv_leads admin policy is weakened.

## Tasks

1. Consent, funnel, retention RLS tests - 844f852
2. Canary sv_leads scenario plus advisor run - d657967

## Verification

- `npm run test:rls`: 8 files, 84 tests passed.
- `npm run rls:canary`: A PASS GREEN, B RED, C RED, D GREEN, E GREEN, F RED (sv_leads policy using true), G GREEN (restored). Policy restored to `(select sv_private.is_admin())`.
- Security advisor (CLI against branch DB, level info): no WARN/ERROR on any sv_* object. INFO rls_enabled_no_policy on public.sv_tenants and public.sv_throttle (deny-all, accepted). Other findings are pre-existing and out of scope (gecko_*, sellerie*, public.set_updated_at search_path, gecko_reservations insert policy, prospects).

## Deviations from Plan

None material. The funnel view is read via the admin client (not service role) because service_role has no select grant on sv_funnel_v. sv_set_lead_status in the purge test uses a null actor (uuid column).

## Known Stubs

None.

## Self-Check: PASSED
