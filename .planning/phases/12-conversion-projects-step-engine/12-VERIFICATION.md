---
phase: 12-conversion-projects-step-engine
verified: 2026-10-03T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
deferred:
  - truth: "Company data reused inside generated documents (second half of SC2)"
    addressed_in: "Phase 13"
    evidence: "Phase 13 'Document generation' (PDF from versioned templates). Phase 12 stores the data structurally (D-13) in sv_client_onboarding; no document exists yet to consume it."
  - truth: "'Fichier demande' as a client blocker (D-21)"
    addressed_in: "accepted deferral (owner)"
    evidence: "Instructed as accepted; blocking.ts covers client-waits, admin-waits and dormant 14 days."
human_verification:
  - test: "Legal review of the presentation consent text (version 2026-10-v1, flagged provisional in src/lib/projects/consent.ts)"
    expected: "Lawyer-approved wording before real clients use the consent switch"
    why_human: "Legal judgement, existing STATE.md blocker; owner accepted provisional text for now"
  - test: "Admin fact form: pick 'Acompte recu' while step 3 still needs 'Contrat signe'"
    expected: "Visible out-of-order warning (PROJECT_COPY.facts.ahead, rendered by PostFactForm when isFactAhead is true)"
    why_human: "Code path exists and isFactAhead is unit-tested, but the production run (12-22) saw no warning; cannot tell from source whether the select state triggers it"
  - test: "Daily Vercel cron /api/cron/mail fires in production with CRON_SECRET and drains due outbox rows"
    expected: "200 with {claimed,sent,failed}; no unauthorized"
    why_human: "Route fails closed and is unit-tested; 12-22 only exercised immediate sends, no scheduled run was observed"
---

# Phase 12: Conversion, projects & step engine - Verification Report

**Phase Goal:** Un lead devient client en un clic et suit son projet etape par etape dans son espace, pendant que l'admin voit tous les projets.
**Verified:** 2026-10-03
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | Admin converts lead to client in one click; client gets invitation e-mail | VERIFIED | `src/lib/server/projects/convert.ts`: validates, checks invitee e-mail, creates auth user, calls atomic RPC `sv_convert_lead` (creates/reuses client by SIRET, member, project, lead link, lead event, outbox row in one function, migration l.343-437), compensates by deleting the auth user on RPC failure, then `sendOutboxRow`. Mail failure never rolls back (cron resumes). UI `ConvertDialog.tsx`. Production run 12-22 steps 1-3: client_invited sent, client logged in. |
| 2 | Guided onboarding; company data reused in his documents | VERIFIED (first half) / DEFERRED (second half) | `onboarding.ts` saves blocks to structured `sv_client_onboarding`, completeness via `isOnboardingComplete`, posts system fact `onboarding_completed`, mails admin. `client_id` comes from `requireClient()`, never the form. Production step 5 confirms. Documents that consume the data are Phase 13 scope. |
| 3 | Timeline, current step, what is expected; step unlocks from a recorded fact, never manual entry | VERIFIED | `src/lib/projects/steps.ts`: pure `deriveProjectState(facts)`; the step is never stored; `fact_revoked` correction recomputes. Migration: facts table append-only (update/delete/truncate triggers), insert-only grants to service_role, no client write path. `/espace-client/page.tsx` renders WhoWaits + Timeline from `loadProjectBundle` via RLS client. Production step 8: fact moves step 3 -> 4, cancel returns to 3. |
| 4 | Files (private storage, short signed links), useful links, consent grant/revoke with date and text kept | VERIFIED | `files.ts`: path built server-side (`clientId/projectId/uuid-name`), `validateUpload`, signed upload URL, `createSignedUrl(..., SIGNED_DOWNLOAD_SECONDS, {download})`, RLS check before service_role Storage call. Migration: bucket `sv-project-files` `public=false`, 25 MB limit, MIME allowlist, no storage.objects policy. `content.ts`: consent rows append-only (triggers), stores `text_version` + `text_snapshot` + actor, stale version refused; current state = latest row (`latestConsent`). Links admin-write, client read (`PortalLinks`). Production steps 6, 9, 10 confirm (.exe refused, PDF downloaded, two consent rows). |
| 5 | Status/step change triggers rule-based mail, no duplicate per event+recipient, journaled; admin sees all projects, step and blockers | VERIFIED | `rules.ts` MAIL_RULES (event -> template, delay, recipient) in code; `outbox.ts` upsert `onConflict dedupe_key ignoreDuplicates`, unique `dedupe_key` column, atomic claim, Resend idempotencyKey, status/attempts/last_error journal, `processDueMail` + cron route (CRON_SECRET, timingSafeEqual, fail-closed) + `vercel.json` daily. `facts.ts` mails every member only when `currentStep` actually changes, key `step_changed:<factId>:<email>`. Admin `/admin/projets` (requireAdmin) with `blocking.ts` filters; production steps 7, 11: 10 outbox rows, 0 duplicate dedupe_keys, all sent. |

**Score:** 5/5 truths verified (SC2 second clause deferred to Phase 13)

Scope note on SC5 wording "changement de statut": per D-19, lead-status e-mails to prospects are explicitly out of phase 12 (marketing consent, Phase 16). The implemented events are client_invited, step_changed, onboarding_completed. Accepted by decision, not a gap.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | Onboarding data consumed by generated documents | Phase 13 | Phase 13 Document generation; data already structured (D-13) |
| 2 | Client blocker "fichier demande" (D-21) | Accepted deferral | Per owner instruction |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20261004000000_sv_projects_engine.sql` | VERIFIED | RLS on all sv_* tables, revoke-then-grant, append-only triggers, private bucket, atomic RPC; applied to production (12-20) |
| `src/lib/projects/steps.ts`, `blocking.ts` | VERIFIED | Pure, tested |
| `src/lib/server/projects/{convert,facts,files,onboarding,content,read}.ts` | VERIFIED | Substantive and wired to actions/pages |
| `src/lib/server/mail/{rules,outbox}.ts`, `src/app/api/cron/mail/route.ts`, `vercel.json` | VERIFIED | Wired; cron not observed firing |
| `src/app/espace-client/{page,actions}.tsx`, `src/app/admin/projets/**` | VERIFIED | Real data via RLS clients |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| ConvertDialog -> convertLead -> sv_convert_lead -> outbox -> Resend | WIRED |
| Onboarding save -> syncOnboardingFacts -> postProjectFact -> notifyStepChange -> outbox | WIRED |
| Portal page -> loadProjectBundle (RLS) -> Timeline/WhoWaits/Files/Links/Consent | WIRED |
| Portal actions -> requireClient -> services (client id from session) | WIRED |
| Admin actions -> requireAdmin -> facts/links/files services | WIRED |

### Data-Flow Trace (Level 4)

Portal and admin pages read from DB tables through RLS clients; production run shows real rows rendered (step 1/6, files listed, consent history). FLOWING.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit suite | `rtk vitest run` | PASS (1021) FAIL (0) | PASS |
| RLS suite | `npm run test:rls` | NOT RUN: Supabase test branch deleted. Last green per 12-11/12-12 summaries (14 files, 130 tests); not re-verified by me | SKIPPED |

### Probe Execution

No probes declared. SKIPPED.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PORTAL-01 | SATISFIED | convert.ts + RPC + prod run |
| PORTAL-02 | SATISFIED | structured onboarding; reuse by documents lands in Phase 13 |
| PORTAL-03 | SATISFIED | steps.ts + portal page |
| PORTAL-04 | SATISFIED | append-only facts, derived step |
| PORTAL-05 | SATISFIED | files.ts, private bucket |
| PORTAL-06 | SATISFIED | append-only consents with text snapshot |
| MAIL-01 | SATISFIED | MAIL_RULES, 3 events (D-19 scope) |
| MAIL-02 | SATISFIED | unique dedupe_key, journal, prod 0 duplicates |
| ADM-01 | SATISFIED | /admin/projets + blocking |

No orphaned requirements (MAIL-03/04 map to Phase 16).

### Anti-Patterns Found

No TBD/FIXME/XXX markers in non-test source or the migration. `consent.ts` carries a "TEXTE PROVISOIRE" comment and `provisional: true` (tracked blocker, owner-accepted). Warnings: legal form displayed as raw code `1000`; commune duplicated in address; no visible out-of-order warning observed in prod. None block the goal.

### Human Verification Required

1. **Legal review of consent text** - see frontmatter. Expected: approved wording. Why human: legal.
2. **Out-of-order warning in admin fact form** - Expected: visible warning. Why human: code present, prod run did not show it.
3. **Daily cron in production** - Expected: authorized 200 run draining due rows. Why human: needs deployed env and secret.

### Gaps Summary

No blocking gaps. All five success criteria are backed by source and by the real production run in 12-22, with 1021 unit tests passing. RLS tests could not be re-run (test branch deleted), so RLS assurance rests on earlier summaries plus production observation. Remaining items are human decisions or confirmations, hence `human_needed`. Note: VALIDATION.md still says `nyquist_compliant: false` / draft; bookkeeping only.

---

_Verified: 2026-10-03_
_Verifier: Claude (gsd-verifier)_
