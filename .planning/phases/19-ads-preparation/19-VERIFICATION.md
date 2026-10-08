---
phase: 19-ads-preparation
verified: 2026-10-08T21:50:00Z
status: passed
score: 2/2 roadmap success criteria verified (plus D-01..D-13)
overrides_applied: 0
---

# Phase 19: Ads preparation Verification Report

**Phase Goal:** Les futures campagnes Meta et Google s'appuient sur des conventions et un modèle de conversion prêts (ADS-01, ADS-02)
**Status:** passed (initial verification)

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Convention UTM (Meta, Google, GBP) documentée et appliquée par la capture | VERIFIED | `src/lib/attribution/utm.ts` is a pure module holding vocabulary (meta/google/gbp; paid_social/cpc/organic/referral), alias tables, `assessUtm`, `buildTrackedUrl` and the `offre_cible_aaaamm` regex. `docs/convention-utm.md` exists (105 lines). `params.ts` canonicalises via `canonicaliseUtmValue` and returns the raw values. `proxy.ts` and `cookie.ts` use `parseAttrParamsWithRaw`. `requestAttribution.ts` calls `assessUtm`. `ingest.ts` passes `nonconformity` and `raw` in `p_source`. The migration's `sv_ingest_lead` stores `source_nonconformity` (closed 6-code filter) and `source_raw`, and the freeze trigger covers both columns. The flag is shown in `/admin/entonnoir`, `LeadsTable` and `AttributionCard`. The generator page `/admin/liens` has `requireAdmin`, noindex, an AdminNav entry and reuses `buildTrackedUrl`. |
| SC2 | Taxonomie d'événements + échelle Lead/Qualifié/RDV/Signé, `event_id` partagé | VERIFIED | `src/lib/ads/events.ts` has the closed 9-name list, `CONVERSION_RANKS` 1-4, `STATUS_TO_CONVERSION`, and `eventIdFor` (UUIDv5, `lead:event`, `lead:lead_lost:<id>` for lost). `newPreLeadEventId` returns a random UUID for pre-lead events. The SQL `sv_private.conversion_event_id` uses the same namespace and name format. The golden vector `c2906e05-...` is asserted in both `events.test.ts` and `tests/rls/ads.rls.test.ts`. |

## Journal (D-07..D-11)

- `sv_conversion_events` has `event_id uuid unique`, a unique `(lead_id, event_name)` index excluding `lead_lost`, and a rank check consistent with the event name.
- Append-only: update/delete/truncate triggers call `deny_mutation`. RLS is enabled with an admin-only select, and write grants are revoked.
- No PII: the columns are lead_id, source, campaign, click_ids and value only. Click ids are read from stored touches only.
- Value: `value_cents` and `EUR` are set only for `deal_signed`, taken from the active quote snapshot head. The check constraint forbids a value on any other event. No estimated values.
- `emit_conversions` is a trigger on `sv_lead_events` (insert). It back-fills missing ranks, is idempotent through `on conflict do nothing`, and a rollback or `lost` neither re-emits nor cancels.
- Existing `sv_set_lead_status` and `sv_funnel_v` are untouched.

## Deferred items must be absent

- No CAPI, Graph API, `fbq` or `gtag` code. The `createHash` hits are unrelated signature and Stripe code.
- No PII hashing for ad platforms.
- No new browser events. Pre-lead id helper only.
- Nothing sent to platforms (the events.ts header states this).

## Spot-checks

- `vitest run` on attribution, ads, leads, proxy, adsMigration, server/ads, admin components and lib/admin, and linkAudit: 31 files, 313 tests passed.
- Production schema, deploy and the manual end-to-end check are recorded in 19-11/19-12. The production lead showed last_touch meta / raw Facebook, consistent with the alias plus raw design. Attribution is intentionally skipped for auth-cookie browsers.

## Anti-patterns

None blocking. `deferred-items.md` notes a pre-existing, out-of-scope failure in `src/lib/pilotageMigration.test.ts` ("no internal day-rate column", from another phase's migration). I did not run it. It is a warning-level carry-over, not a Phase 19 gap.

## Requirements

- ADS-01: SATISFIED
- ADS-02: SATISFIED

## Human verification

None outstanding. Live behaviour was already confirmed in 19-12.

---
_Verifier: Claude (gsd-verifier)_
