---
phase: 11-lead-attribution-pipeline-consent
plan: 02
subsystem: api
tags: [attribution, utm, cookies, vitest, consent]

requires: []
provides:
  - Whitelist parser for 8 attribution keys (params.ts)
  - Arrival/channel classification and first/last touch merge (touch.ts)
  - Size-guarded base64url cookie codec with re-validation (cookie.ts)
affects: [11-06, 11-07, 11-11, 11-12]

tech-stack:
  added: []
  patterns:
    - "Pure modules with only Web APIs (URL, TextEncoder, btoa), importable from proxy and tests"
    - "Cookie content is never trusted: decode re-runs the whitelist parser"

key-files:
  created:
    - src/lib/attribution/params.ts
    - src/lib/attribution/params.test.ts
    - src/lib/attribution/touch.ts
    - src/lib/attribution/touch.test.ts
    - src/lib/attribution/cookie.ts
    - src/lib/attribution/cookie.test.ts

key-decisions:
  - "Click ids (gclid, fbclid, ttclid) keep original case; only utm_* and referrer are lowercased (deviation from D-09 literal wording, case-sensitive tokens needed for phase 19 conversion matching)"
  - "Single cookie sv_attr from D-06 split into sv_attr_ft / sv_attr_lt (4096-byte limit, RESEARCH Pattern 4); owner should be informed"
  - "Size guard drops utm_term, utm_content, then referrer, then lower-value keys until the value is <= 3800 bytes"

patterns-established:
  - "Drop, never truncate, over-long values"

requirements-completed: [LEAD-01]

duration: 8min
completed: 2026-10-02
---

# Phase 11 Plan 02: Attribution Pure Module Summary

**Pure attribution module: 8-key whitelist parser (click ids case-preserved), referrer filter, arrival/channel classification, first/last-touch merge with click-id enrichment, and a size-guarded cookie codec that re-validates on decode.**

## Accomplishments
- params.ts: ALLOWED_KEYS, CLICK_ID_KEYS, parseAttrParams, parseReferrer, IGNORED_REFERRER_HOSTS
- touch.ts: classifyArrival, classifyChannel, nextTouches, enrichFirstTouchClickIds, isBotUserAgent, SEARCH_ENGINE_HOSTS, BOT_UA_PATTERN
- cookie.ts: encodeTouch, decodeTouch, stripClickIds, cookie name/size constants
- 54 tests green across 3 files; no next/supabase/node imports

## Task Commits
1. Task 1 RED: 0fbd2b6 (test params/touch)
2. Task 1 GREEN: 571204e (feat params/touch)
3. Task 2 RED: f2bceb8 (test cookie)
4. Task 2 GREEN: 26682f8 (feat cookie)

## Deviations from Plan

### Documented deviations (specified by the plan, flagged for the owner)
- **D-09 click-id case:** gclid/fbclid/ttclid are not lowercased; utm_* and referrer are.
- **D-06 cookie split:** `sv_attr` is split into `sv_attr_ft` and `sv_attr_lt`.

No auto-fixes were needed. Otherwise the plan was executed as written.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
All 6 files exist; commits 0fbd2b6, 571204e, f2bceb8, 26682f8 exist; `npx vitest run src/lib/attribution` green.
