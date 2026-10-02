---
phase: 11-lead-attribution-pipeline-consent
verified: 2026-10-02T22:30:00Z
status: human_needed
score: 5/5 must-haves verified (code + production evidence); 3 human-only items open
overrides_applied: 0
gaps: []
human_verification:
  - test: "Admin screens /admin/leads, /admin/leads/[id], /admin/entonnoir (status change in one gesture, lost reason prompt, source correction with reason, erasure, funnel with manual cost per RDV)"
    expected: "Each action works end to end and the journal shows it"
    why_human: "Needs admin login codes; the assistant did not run them. Owner approved on 2026-10-02."
  - test: "Legal proofreading of EN/TH banner text and /mentions-legales cookie wording"
    expected: "Wording validated by a reader competent in each language / legal"
    why_human: "Legal and linguistic judgement"
  - test: "CNIL exposure of ATTR_COOKIE_BEFORE_CONSENT = true (sv_attr_ft/lt set before choice)"
    expected: "Owner keeps the risk, or flips the constant and bumps CONSENT_VERSION"
    why_human: "Accepted risk, recorded as owner decision (D-07); not a code defect"
---

# Phase 11 Verification Report

**Goal:** Chaque prospect arrive avec sa source tracee et figee, l'admin pilote le pipeline et l'entonnoir, et rien n'est mesure avant consentement.
**Status:** human_needed (no code gap found; open items are human-only)
**Re-verification:** No, initial.

Accepted deviations taken as given: D-09 click-id case, sv_attr split into _ft/_lt, `sv_lead_events` naming, ATTR_COOKIE_BEFORE_CONSENT=true.

## Success criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | UTM arrival then simulation/contact creates a lead with first/last touch, landing, referrer; anti-spam order intact | VERIFIED | `src/proxy.ts` attributionBranch sets `sv_attr_lt`/`sv_attr_ft` (httpOnly, lax). `sv_ingest_lead` stores `first_touch`, `last_touch`, source_* and touch with landing/referrer. Contact route order: honeypot/too-fast, then IP throttle, then zod, then ingest, then mails. Simulator route order: spam check, zod, ingest, mail, same as before the phase (`git show fd50351^`). Prod: UTM request set both cookies; contact POST created lead 4145809b with source verif11/test/phase11 and identical touches (11-18-SUMMARY). |
| 2 | Return within 9 months adds a contact without changing source; admin correction needs logged reason | VERIFIED | `sv_ingest_lead`: match on email_norm or phone_norm with `last_contact_at > now() - 9 months`, inserts contact + `contact_added` event, updates only last_contact_at/last_touch/count. `protect_lead_source` trigger raises `sv_source_frozen` unless flag set by `sv_correct_lead_source`, which requires a reason (`sv_reason_required`) and logs. RLS suite ran on a branch (11-10/11-14). |
| 3 | lead_events immutable, lead erasable, prospects migrated, purge spares clients/accounting | VERIFIED | `sv_private.deny_mutation` triggers on update/delete/truncate of `sv_lead_events`; service_role has only select/insert. `sv_erase_lead` deletes contacts/notes, sets erased_at, appends `erased` event (events hold no PII). `purge_leads` skips converted_client_id not null and status signed; old cron job replaced by `sv-purge-leads`. Prod: legacy leads 1 = prospects 1, backfill re-run returned 0 rows, only new cron present. |
| 4 | Admin lists leads, one-gesture status with lost reason, funnel by source/campaign with manual cost per RDV | VERIFIED in code, UI HUMAN | `src/app/admin/leads` (page, actions, [id]), `src/app/admin/entonnoir` (page, actions); all actions call `requireAdmin`; lost status rejects without reason (`sv_lost_reason_required` in RPC and `lostReasonRequired` in action); `sv_funnel_v` exists in prod. Rendered screens not exercised by the assistant. |
| 5 | Accept/Refuse equal; every choice journaled; no ad tag or click id before consent | VERIFIED | Prod browser check: both buttons 211x44 with same styling; Refuser and Accepter each logged in `sv_consent_log` (version 2026-10-v1, locale, hashed IP). Click ids stripped from cookie without consent (`parseAttrParams allowClickIds: accepted`; prod `?gclid` check). PostHog starts in memory mode with `autocapture: false`, `ip: false`, `before_send` stripping click ids until accepted. No gtag/fbq/googletagmanager code in `src`. |

## Requirements LEAD-01..LEAD-09

All nine are SATISFIED by the evidence above (01: proxy + cookies; 02: trigger + correction RPC; 03: immutability + erasure; 04: 9-month dedupe; 05: route wiring; 06: backfill + purge; 07/08: admin pages and RPCs, UI unverified by assistant; 09: modal + log + gating). No orphaned requirements: REQUIREMENTS.md maps only LEAD-01..09 to Phase 11, all claimed.

## Automated checks run now

- `vitest run`: 62 files, 767 tests pass.
- `tsc --noEmit`: clean.
- `eslint src tests`: 0 errors, 2 warnings (an unused eslint-disable directive in `src/lib/attribution/params.ts`, one other).
- Anti-patterns: no TBD/FIXME/XXX debt markers sought or found in the verified paths; no stubs seen in route, RPC or proxy code.
- Probes: none declared by the phase.

## Observations (non-blocking)

- `PH_CAPTURE_ON_REFUSE = true`: after Refuse, PostHog still captures cookieless, in-memory product analytics. Not an ad tag, consistent with the criterion, but worth confirming against the banner wording during legal proofreading.
- Local working copy of `src/proxy.ts` shows as modified only through CRLF line endings (`git diff --ignore-cr-at-eol` is empty); not a content change. Do not commit it.
- The admin UI evidence is the owner's approval, not an assistant-run check; hence human_needed rather than passed.
- Verification lead 4145809b is not a permanent fixture (12-month purge).

## Gaps

None.

_Verified: 2026-10-02_
_Verifier: Claude (gsd-verifier)_
