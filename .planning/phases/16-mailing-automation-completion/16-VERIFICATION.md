---
phase: 16-mailing-automation-completion
verified: 2026-10-06T00:00:00Z
status: passed
score: 6/6 must-haves verified (1 by owner override)
overrides_applied: 1
gaps: []
deferred:
  - truth: "Un projet livre sans avis declenche une demande d'avis envoyee"
    addressed_in: "Phase 18"
    evidence: "Phase 18 (REV-01..04) delivers the unique, single-use review link; sweepReminders takes a reviewLink resolver (currently () => null) and REVIEW_REQUESTS_ENABLED is false (D-04). Phase 16 ships the pipeline, Phase 18 must supply the link and flip the flag."
human_verification:
  - test: "Check the first scheduled run of /api/cron/mail (06:00 UTC) in Vercel runtime logs"
    expected: "HTTP 200 JSON with reminders {queued, duplicates, stale, failed:0}, invoices, and no *_failed log lines; a second run queues 0 (idempotence)"
    why_human: "The manual run in 16-14 was never confirmed in logs and CRON_SECRET is masked, so the live cron path was not exercised end to end."
  - test: "Owner accepts that review-request sending is off until Phase 18 (success criterion 1, third trigger)"
    expected: "Owner confirms the roadmap wording 'projet livre sans avis' is satisfied by pipeline + gate, with the link and flag flip tracked in Phase 18; or adds an override"
    why_human: "Roadmap SC1 literally lists the review reminder as an automatic trigger; code deliberately never sends it today. Scope decision, not a code defect."
---

# Phase 16: Mailing automation completion - Verification Report

**Phase Goal:** Les relances partent seules, et la delivrabilite et les obligations de desinscription sont maitrisees (MAIL-03, MAIL-04)
**Status:** passed (owner accepted the review-gate override and the residual cron caveat on 2026-10-07)
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1a | Unsigned document triggers its reminder automatically, once | VERIFIED | `src/lib/server/reminders/sweep.ts` `planReminders`: chain heads of quote/contract/acceptance with `documentStatus === 'to_sign'`, not refused, not held; stage d3/d7 to clients, d14 to admin; `enqueueMail` upserts with `ignoreDuplicates` on `dedupe_key` (`documentReminder:{docId}:{stage}:{email}`); stale open rows flipped to `skipped`. Cron `src/app/api/cron/mail/route.ts` calls `sweepReminders()` then `processDueMail`; `vercel.json` schedules `0 6 * * *`. `sweep.test.ts` covers queued then duplicates=1 on a second run. |
| 1b | Unpaid deposit triggers its reminder automatically, once | VERIFIED | SQL path: `20261007000000_sv_invoices.sql` `issue_invoice_at` inserts d3/d7 client and d14 admin rows with `send_after` and `on conflict (dedupe_key) do nothing` (lines ~645-677); cancelled on credit note (line 871). `paymentsMailParity.test.ts` guards SQL/TS parity. Prod: zero duplicate dedupe keys in `sv_mail_outbox`. |
| 1c | Delivered project without review triggers its review request | PARTIAL (deferred) | Pipeline exists (`planReminders` review branch, `reviewRequestContent`, `buildMarketingEmail`), but `sweepReminders` defaults `reviewLink` to `() => null`, `REVIEW_REQUESTS_ENABLED=false` in prod and `deliver()` returns `flag_off` for `review_request`. Intentional per D-04; prod has 0 review_request rows. Not a defect, but it is not "automatic" today. Needs owner acceptance (see human verification). |
| 2 | Resend bounce or complaint adds the address to the suppression list; no marketing mail afterwards | VERIFIED | `app/api/resend/webhook/route.ts`: Svix verification, `toApplyArgs` (Permanent bounces and complaints, own-domain senders only), RPC `sv_apply_resend_event`, admin alert. Tables are append-only (update/delete/truncate triggers, service_role has no direct grants). `deliver()` in `outbox.ts` calls `blockScope` via `sv_mail_block_scope` (unlifted suppressions) and `decideSend`: marketing is suppressed on any scope, fail-closed on lookup error; transactional blocked only on `all`. Prod evidence (16-14 + read-only query): 3 suppressions, 2 lifts, 2 `sv_resend_events` rows; bounce gave scope `all`, complaint gave scope `marketing`. |
| 3a | Every marketing mail has a working unsubscribe link and List-Unsubscribe headers | VERIFIED | `marketingEmail.ts` throws `missing_unsubscribe` unless both URLs are https; footer link + `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. `outbox.ts` `buildMail` signs an HMAC token (`unsubscribeToken.ts`) and fails render if the secret is missing. `/api/unsubscribe` POST only (GET returns 405, no scanner side effects), RPC `sv_record_unsubscribe`; `/desinscription` page exists. Only marketing event today is `review_request` (gated). |
| 3b | Transactional and marketing flows separated by class | VERIFIED | `rules.ts` `MAIL_RULES[...].class` is the single source (class never read from stored row, D-13); 16 events transactional, `review_request` marketing; `decideSend` branches on class. |

**Score:** 5/6 fully verified; 1c deferred to Phase 18 pending owner acceptance.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server, API and migration tests | `rtk vitest run src/lib/server src/app/api src/lib/invoicesMigration.test.ts` | 642 pass, 0 fail | PASS |
| Type check | `rtk tsc` | completed, no errors | PASS |
| Prod outbox idempotence | read-only `supabase db query --linked` | 0 duplicate dedupe_key; 0 review_request rows; 4 reminder rows | PASS |

## Probe Execution

SKIPPED, no probes declared by the phase.

## Key Links

| From | To | Status |
|------|----|--------|
| cron route | `sweepReminders` and `processDueMail` | WIRED |
| `sweepReminders` | `enqueueMail` (dedupe) then `deliver` | WIRED |
| `deliver` | `blockScope` / `decideSend` | WIRED |
| webhook route | `sv_apply_resend_event` then suppression alert | WIRED |
| `buildMail` | `buildMarketingEmail` with signed token | WIRED |
| unsubscribe route | `sv_record_unsubscribe` | WIRED |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MAIL-03 | SATISFIED for documents and deposits; review request built but gated (deferred) | truths 1a-1c |
| MAIL-04 | SATISFIED | truths 2, 3a, 3b |

No orphaned requirements.

## Anti-Patterns

No TBD/FIXME/XXX blockers found in the reviewed phase files. `reviewLink: () => null` default is the intentional D-04 gate, not a stub.

## Caveats Assessed

- **Cron manual run unconfirmed:** the code path is unit-tested and fail-soft (each stage catches its errors), and first-run impact was computed as 0 reminders by read-only SQL, so risk is low. Still, the live cron-with-secret path has not been observed. Included as human verification item 1.
- **bounced@resend.dev lift:** Resend's own test sink, lifts are append-only and audited, no real recipient affected. Not a gap. The correct test client lift was done (id 3). Informational.
- **Review sending off:** intentional (D-04); drives human verification item 2. If the owner accepts, this can be recorded as an override: must_have "Un projet livre sans avis declenche la relance prevue", reason "Gated by D-04 until Phase 18 supplies the review link".

## Gaps Summary

No code gaps. Goal is achieved for document and deposit reminders, suppression, and unsubscribe/class separation, with production evidence. Status is human_needed only for two items: confirming the first scheduled cron run, and the owner's acceptance of the review-request gate against the literal roadmap wording.

_Verifier: Claude (gsd-verifier)_

## Owner Acceptance (2026-10-07)

- **Override accepted:** must_have "Un projet livre sans avis declenche la relance prevue" is satisfied by pipeline + gate. Reason: gated by D-04 until Phase 18 supplies the unique review link and flips `REVIEW_REQUESTS_ENABLED`. Tracked for Phase 18.
- **Cron caveat accepted, not confirmed:** the first scheduled `/api/cron/mail` run (06:00 UTC, 2026-10-07) could not be confirmed. The Vercel log view (UI and MCP) returned no entries for it, nor for `/desinscription`, which was hit the day before, so the log view is not conclusive evidence in either direction. The database shows no due mail that a run would have produced (first-run impact computed as 0 reminders, 0 review requests). Residual risk: if the cron does not run, reminders for unsigned documents will not queue. Re-check the first time a document reminder is expected.
