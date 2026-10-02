---
phase: 11-lead-attribution-pipeline-consent
plan: 12
subsystem: api
tags: [consent, posthog, rgpd, cookies, mentions-legales, vitest]

requires:
  - phase: 11-03
    provides: consent constants, state helpers, buildPostHogConfig
  - phase: 11-06
    provides: hashIp, getClientIp, hitThrottle
provides:
  - POST /api/consent with server-side journal before cookie
  - logConsent wrapper over sv_log_consent
  - Consent-aware PostHogProvider (memory before consent, reset on withdrawal)
  - Mentions legales cookies section (#cookies) aligned with real behaviour
affects: [11-18]

key-files:
  created:
    - src/lib/consent/serverLog.ts
    - src/app/api/consent/route.ts
    - src/app/api/consent/route.test.ts
  modified:
    - src/components/analytics/PostHogProvider.tsx
    - src/app/mentions-legales/page.tsx

key-decisions:
  - "Refusal with ATTR_COOKIE_BEFORE_CONSENT true rewrites sv_attr_* without click ids; an undecodable cookie is deleted"
  - "Mentions legales states truthfully that sv_attr_* are set before the choice (current default)"

requirements-completed: [LEAD-09, LEAD-01]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 12: Consent API, PostHog gating, legal page Summary

Every Accept/Refuse is journaled via sv_log_consent (HMAC IP hash) before the 13-month readable sv_consent cookie is set; PostHog now obeys the consent state and the legal page no longer claims an anonymised IP.

## Tasks

1. /api/consent route, logConsent wrapper, 10 tests - b65264d
2. PostHogProvider consent-aware init/switch, mentions legales rewrite - 72926a6

## Verification

`vitest run src/app/api/consent src/lib/consent src/app/linkAudit.test.ts src/app/page.test.ts src/lib/priceScope.test.ts`: green. `tsc --noEmit` clean. eslint clean on all touched files. Browser storage check deferred to 11-18.

## Deviations from Plan

None. Added an optional `id` prop to the local `Section` component in mentions-legales to expose `#cookies`.

Pre-existing global lint errors (no-explicit-any in CinemaIntro.tsx, attribution/params.ts, tests/rls/leads.rls.test.ts) are out of scope and untouched; no new lint errors introduced.

## Legal review required

The French text of section 5 of /mentions-legales (banner, cookies, durations, pre-consent sv_attr_* statement) needs legal review before production.

## Known Stubs

None.

## Self-Check: PASSED
