---
phase: 11-lead-attribution-pipeline-consent
plan: 03
subsystem: consent
tags: [consent, posthog, cookies, vitest, i18n]

requires: []
provides:
  - Consent constants including ATTR_COOKIE_BEFORE_CONSENT switch (constants.ts)
  - sv_consent cookie codec and status helpers (state.ts)
  - Pure PostHog config per consent state plus click-id stripping before_send (posthogConfig.ts)
  - Versioned FR/EN/TH banner copy (text.ts)
affects: [11-05, 11-06, 11-07, 11-08, 11-12]

tech-stack:
  added: []
  patterns:
    - "PostHog options are a pure function of consent status; posthog-js imported as type only"

key-files:
  created:
    - src/lib/consent/constants.ts
    - src/lib/consent/state.ts
    - src/lib/consent/state.test.ts
    - src/lib/consent/posthogConfig.ts
    - src/lib/consent/posthogConfig.test.ts
    - src/lib/consent/text.ts
    - src/lib/consent/text.test.ts

key-decisions:
  - "CLICK_ID_KEYS imported from @/lib/attribution/params (plan 11-02 had landed); a test asserts it equals gclid, fbclid, ttclid"
  - "before_send only set for pending/refused; accepted keeps click ids"
  - "Accepted state keeps capture_pageview false (pageviews stay manual, as in the existing provider)"

requirements-completed: [LEAD-09, LEAD-01]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 03: Consent Pure Module Summary

**Pure consent module: sv_consent codec with versioning, PostHog config that is memory-only/anonymous/click-id-free until accepted, and UI-SPEC FR/EN/TH banner copy tied to CONSENT_VERSION.**

## Accomplishments
- constants.ts with ATTR_COOKIE_BEFORE_CONSENT = true (doc comment records D-07 and the A1 CNIL caveat)
- state.ts: serialise/parse (strict uuid, numeric timestamp, a|r), consentStatus, needsPrompt, readConsentFromCookieHeader
- posthogConfig.ts: buildPostHogConfig, stripClickIdsFromEvent (properties, $set, $set_once, URL props)
- text.ts: verbatim UI-SPEC copy (footer link string is not part of ConsentCopy per the plan interface)
- 21 tests green in src/lib/consent; no tsc errors in the module

## Verified PostHog options (node_modules/@posthog/types posthog-config.d.ts)
api_host, persistence ('memory' | 'localStorage+cookie'), autocapture, ip, person_profiles, before_send, save_campaign_params, save_referrer, disable_session_recording, capture_pageview, capture_pageleave, respect_dnt. All exist and are used.

## Task Commits
1. Task 1 (constants, state, text + tests): aa06451
2. Task 2 RED: test(11-03) PostHog config tests (module missing, failed as expected)
3. Task 2 GREEN: feat(11-03) posthogConfig implementation

## Deviations from Plan
- **TDD process (Task 1):** tests and implementation were written together and committed in one feat commit, so a separate RED commit and RED run do not exist for Task 1. Task 2 followed RED then GREEN. Both pass.
- Otherwise executed as written. No auto-fixes.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
All 7 files exist; `npx vitest run src/lib/consent` green (21 tests).
