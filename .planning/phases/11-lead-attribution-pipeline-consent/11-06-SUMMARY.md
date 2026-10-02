---
phase: 11-lead-attribution-pipeline-consent
plan: 06
subsystem: api
tags: [leads, attribution, hmac, throttle, server-only, vitest]

requires:
  - phase: 11-02
    provides: decodeTouch, classifyChannel, attribution cookies
  - phase: 11-03
    provides: sv_consent cookie parsing, consentStatus
  - phase: 11-04
    provides: sv_ingest_lead RPC
provides:
  - src/lib/leads/normalise.ts (normaliseEmail, normalisePhone)
  - src/lib/leads/ipHash.ts (getClientIp, hashIp HMAC-SHA256)
  - src/lib/leads/requestAttribution.ts (readAttribution)
  - src/lib/leads/ingest.ts (ingestLead)
  - src/lib/throttle.ts (shared throttle core with contact-ip and consent-ip kinds)
affects: [11-07, 11-11, 11-12]

tech-stack:
  added: []
  patterns:
    - "Lead and throttle modules live outside src/lib/server so public routes and proxy can import them (priceScope rule b), each server-only and guarded by rule (d)"
    - "Old throttle path kept as a pure re-export so existing imports and vi.mock paths keep working"

key-files:
  created:
    - src/lib/leads/normalise.ts
    - src/lib/leads/ipHash.ts
    - src/lib/leads/requestAttribution.ts
    - src/lib/leads/ingest.ts
    - src/lib/throttle.ts
    - src/lib/leads/normalise.test.ts
    - src/lib/leads/ipHash.test.ts
    - src/lib/leads/requestAttribution.test.ts
    - src/lib/leads/ingest.test.ts
  modified:
    - src/lib/server/auth/throttle.ts
    - src/lib/priceScope.test.ts
    - .env.example

key-decisions:
  - "normalisePhone returns null for national numbers that are not FR 10-digit 0X form and lack a + or 00 prefix"
  - "Ingest logs only the RPC error code, never message text, to avoid leaking e-mail/phone"

requirements-completed: [LEAD-01, LEAD-04, LEAD-05]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 06: Server Lead Library Summary

**Server-side lead library: trim/lowercase e-mail and E.164 phone normalisers, HMAC-SHA256 IP hash, cookie-only attribution reader gated by consent, and a service_role sv_ingest_lead wrapper, with the throttle core moved to a public-importable module.**

## Tasks

1. Normalisers, ipHash, throttle move, env example - 520432d
2. requestAttribution, ingest, priceScope rule (d) extension - 34ce46e

## Verification

`npx vitest run src/lib/leads src/lib/priceScope.test.ts src/lib/server/auth src/app/admin src/app/connexion`: 10 files, 102 tests pass. `tsc --noEmit` clean. No `@/lib/server` import in src/lib/leads or src/lib/throttle.ts.

## Deviations from Plan

None - plan executed as written. SV_IP_HASH_SECRET is documented as a commented line in .env.example; it must be set in Vercel/.env.local before ipHash returns non-null (not done here, no remote changes).

## Known Stubs

None.

## Self-Check: PASSED
