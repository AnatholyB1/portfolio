---
phase: 11-lead-attribution-pipeline-consent
plan: 11
subsystem: api
tags: [leads, simulateur, contact, spam-guard, throttle, vitest]

requires:
  - phase: 11-06
    provides: ingestLead, readAttribution, hashIp, shared throttle
provides:
  - Simulator route writing via sv_ingest_lead (spam order unchanged)
  - Contact route with honeypot/timing, IP throttle, zod validation and best-effort ingest
  - contactSchema and ContactSection honeypot/timing fields
affects: [11-18]

key-files:
  created:
    - src/lib/contact-schema.ts
    - src/app/api/contact/route.test.ts
  modified:
    - src/app/api/simulateur/route.ts
    - src/app/api/simulateur/route.test.ts
    - src/lib/simulateur/submit.ts
    - src/app/api/contact/route.ts
    - src/components/sections/ContactSection.tsx

key-decisions:
  - "Contact ingest is best-effort (e-mail remains source of truth); simulator ingest is fatal (500 insert_failed)"
  - "Returning-lead subjects: 'Lead revenu - simulateur' and 'Lead revenu — {projectType}'"

requirements-completed: [LEAD-05, LEAD-01, LEAD-04]

duration: 12min
completed: 2026-10-02
---

# Phase 11 Plan 11: Simulator and contact into the lead pipeline Summary

Both forms now create or append leads server-side with cookie-only attribution; the simulator keeps parse -> spam -> zod -> ingest -> e-mail, and the contact route gains spam guards, a 5/10min IP throttle and zod validation before any write.

## Tasks

1. Simulator route to sv_ingest_lead, tests rewritten - fd50351
2. Contact route guards + best-effort ingest, contactSchema, ContactSection hidden fields - 84d2bda

## Verification

`npx vitest run src/app/api src/lib/priceScope.test.ts src/lib/simulateur/submit.test.ts src/lib/prospects-schema.test.ts`: all green. `tsc --noEmit` clean. Mailbox sends are mocked.

## Deviations from Plan

None in scope. Out-of-scope: `npm run lint` reports 4 errors (no-explicit-any) in src/components/ui/CinemaIntro.tsx, src/lib/attribution/params.ts and tests/rls/leads.rls.test.ts, none in files touched by this plan; not fixed. Plan acceptance "lint exits 0" is therefore not met globally, only for this plan's files.

## Known Stubs

None.

## Self-Check: PASSED
