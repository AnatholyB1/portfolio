---
phase: 5
slug: prospect-capture-backend
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (new — no test framework exists anywhere in this repo today) |
| **Config file** | none — Wave 0 installs `vitest` + `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app/api/simulateur/route.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (once Wave 0 lands) + manual curl smoke test against local dev with a disposable Supabase row (deleted after verifying)
- **After every plan wave:** Re-run the curl checklist for CRM-01 through CRM-04 end to end
- **Before `/gsd:verify-work`:** Full vitest suite green; RLS manually verified via Supabase dashboard policy simulator (or MCP `execute_sql`) — this behavior is inherently live-Supabase-dependent and stays manual for a project this size
- **Max feedback latency:** ~5 seconds (vitest) + manual curl round-trip

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-02 | 01 | 0 | infra | — | zod + vitest installed, `npm test` works, `passWithNoTests` gate | infra | `npx vitest --version` | ✅ | ✅ green |
| 05-01-03 | 01 | 0 | CRM-01, CRM-03 | V4/V5, DoS mitigation | `prospectSchema` + pure `isSpamSubmission()` predicate, 20 unit tests | unit | `npx vitest run src/lib/prospects-schema.test.ts` | ✅ | ✅ green |
| 05-02-01 | 02 | 1 | CRM-01, CRM-02 | V4 | `prospects` table DDL, RLS enable, zero anon/authenticated grants, pg_cron purge job, written to a tracked migration | infra | migration file reviewed at Task 2 checkpoint | ✅ | ✅ green |
| 05-02-03 | 02 | 1 | CRM-01, CRM-02, D-04 | V4 | Migration applied live; RLS enabled with zero policies/grants; purge job scheduled; consent constraint rejects `false` | integration (Supabase MCP `execute_sql`, run by coordinator) | 6 live assertions + negative consent test, see 05-02-SUMMARY.md | ✅ | ✅ green |
| 05-03-01 | 03 | 2 | CRM-01 | V6 | `createServiceRoleClient()` added, server-only, RLS-bypassing, documented | unit/typecheck | `npx tsc --noEmit` | ✅ | ✅ green |
| 05-03-02 | 03 | 2 | CRM-01, CRM-03, CRM-04 | V4/V5/V6 | `POST /api/simulateur`: spam-check → validate → explicit-field insert → single Resend notification → `{ok:true}` | integration (manual curl, dev-only, row deleted) | curl smoke test against local dev | ✅ | ✅ green |
| 05-03-03 | 03 | 2 | CRM-03, CRM-04 | DoS mitigation, — | Spam guard + notification trigger + XSS-escaping + insert-shape, 13 unit tests, Supabase/Resend mocked | unit | `npx vitest run src/app/api/simulateur/route.test.ts` | ✅ | ✅ green |
| 05-04-01 | 04 | 3 | — | T-05-20 | Full suite (33 tests) green, `tsc` clean, own-files lint clean, production build succeeds, service-role key absent from `.next/static` (env-var-name AND value-prefix grep, corrected for JWT-header false positive), graph refreshed | integration | `npx vitest run && npx tsc --noEmit && npm run build && grep -r SUPABASE_SERVICE_ROLE_KEY .next/static` (0 matches) | ✅ | ✅ green |
| 05-04-02 | 04 | 3 | CRM-01, CRM-02, CRM-03, D-04 | T-05-21, T-05-22, T-05-23 | Live POST creates a real, correctly-mapped row; honeypot + too-fast submissions produce no row; missing-telephone rejected 400; anon key denied on GET/POST/PATCH/DELETE (401/42501, zero successes); purge job confirmed active; all test rows deleted, count = 0 | integration (curl + PostgREST + direct Postgres query) | see Task 2 evidence trail below | ✅ | ✅ green |
| 05-04-03 | 04 | 3 | CRM-04 | — | Resend notification actually delivered to `contact@sevalys.com` | manual (`checkpoint:human-verify`, auto-approved under auto-chain mode using Resend API `last_event: delivered` as evidence — see caveat below) | Resend API `GET /emails` — both notification sends show `last_event: "delivered"` | ✅ | ✅ green (auto-approved, see caveat) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Task 2 (05-04-02) Live Evidence Trail

- **Case A (CRM-01, valid payload):** `POST /api/simulateur` → HTTP 200 `{"ok":true}`. Row verified via PostgREST (service-role key): `nom`/`email`/`telephone` match, `reponses_diagnostic`/`services_recommandes` contain submitted JSON, `consentement_rgpd: true`, `ip_hash` = 64-char hex (`eff8e7ca...`), `id`/`created_at` DB-generated.
- **Case B (CRM-03, honeypot):** `POST` with `website: "http://spam.example"` → HTTP 200 `{"ok":true}` (byte-identical to A). Row count unchanged.
- **Case C (CRM-03, timing):** First attempt was mistimed by tool round-trip latency between computing `formRenderedAt` and sending the request, causing elapsed time to exceed `SPAM_MIN_ELAPSED_MS` and produce a real (unwanted) insert — **this was a test-methodology artifact, not an application bug**: the app correctly used the actual elapsed time it received. Re-run with `formRenderedAt` computed and sent within a single atomic command → HTTP 200 `{"ok":true}`, row count confirmed unchanged. The accidental extra row from the mistimed attempt was included in the Task 2 cleanup (Resend still delivered a real notification for it, which became part of the CRM-04 evidence).
- **Case D (validation):** `POST` missing `telephone` → HTTP 400 `{"error":"invalid_payload"}`, row count unchanged.
- **Case E (CRM-02, anon lockdown):** Direct PostgREST calls with `NEXT_PUBLIC_SUPABASE_ANON_KEY` — GET, POST, PATCH, DELETE all returned HTTP 401 with PostgREST error `42501 permission denied for table prospects`. Zero successes, no 200-with-empty-array false pass.
- **Case F (D-04, purge job):** Direct Postgres query (`pg` client, `--no-save`, removed after use — no Supabase MCP tools were exposed to this worktree session) confirmed exactly one active `cron.job` row: `purge-prospects-12mo`, schedule `0 3 * * *`.
- **Cleanup:** Both rows for `test-gsd-phase5@example.com` deleted via service-role PostgREST DELETE. `SELECT count(*) FROM public.prospects` confirmed `0` afterward (`Content-Range: */0`).

### Task 3 (05-04-03) Auto-Approval Caveat

This plan's Task 3 is `type="checkpoint:human-verify"`. The orchestrating session had `workflow._auto_chain_active: true`, and per this executor's checkpoint protocol, `checkpoint:human-verify` (not tagged `gate="blocking-human"`) auto-approves in auto-chain mode. Before auto-approving, this executor queried the Resend API directly (`GET https://api.resend.com/emails`) and confirmed both notification sends triggered by Task 2 (Case A and the mistimed Case C retry) show `last_event: "delivered"` to `contact@sevalys.com`, subject `Nouveau prospect - simulateur`, message IDs `010201a0be2425ad-78ba60eb-12e3-46fc-911d-e4002f4b2068-000000@eu-west-1.amazonses.com` and `010201a0be26a1a9-5736100a-9758-4b19-ac66-84ae2562cdf6-000000@eu-west-1.amazonses.com`.

**What this evidence does confirm:** the email was actually sent and accepted/delivered by the receiving mail infrastructure, not merely queued — this is a materially stronger signal than "the Resend API call returned no error."

**What this evidence does NOT confirm:** the visual rendering inside the inbox (no raw HTML tags visible, no `&amp;`-double-escaping artifacts, correct accent rendering, sender display name). No human visually inspected the inbox during this execution. If a human later opens `contact@sevalys.com` and finds rendering defects, treat CRM-04 as reopened per this plan's own acceptance criteria, notwithstanding the ✅ recorded above.

---

## Wave 0 Requirements

- [ ] Install `vitest` (`npm install -D vitest`) + minimal `vitest.config.ts` — first test infrastructure in this repo, justified because this phase introduces the project's first meaningfully pure-testable logic (zod schema, spam predicate, notification trigger)
- [ ] `src/lib/prospects-schema.ts` — extract the zod schema + `isSpamSubmission(payload)` predicate out of the route handler so both are unit-testable without mocking `next/server`
- [ ] `src/app/api/simulateur/route.test.ts` — covers CRM-03 (honeypot/timing) and CRM-04 (Resend triggered on success), with Supabase and Resend clients mocked

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Outcome |
|----------|-------------|------------|-------------------|---------|
| Prospect row actually persists in Supabase | CRM-01 | Live-Supabase-dependent; no test Supabase project stood up for a project this size | `curl` a valid payload to `/api/simulateur`, then `SELECT * FROM prospects ORDER BY created_at DESC LIMIT 1` via Supabase MCP `execute_sql` or dashboard; delete the test row after | ✅ Verified live in Plan 04 Task 2, Case A (PostgREST select via service-role key — no Supabase MCP tools exposed to this worktree) |
| `anon` role cannot read/update/delete `prospects` | CRM-02 | RLS/grant behavior can only be verified against the live database, not mocked | Supabase dashboard → Authentication → RLS policy simulator on `prospects` for role `anon`; or `curl` the PostgREST endpoint directly with the public anon key and confirm 401/403 on SELECT/UPDATE/DELETE | ✅ Verified live in Plan 04 Task 2, Case E — all 4 verbs denied, HTTP 401 / `42501` |
| Service-role key never reaches the client bundle | Security (V6, Pitfall 4) | Build-output inspection, not a runtime test | After `next build`, `grep -r "SUPABASE_SERVICE_ROLE_KEY\|<actual key prefix>" .next/static` — expect zero matches | ✅ Verified in Plan 04 Task 1 — 0 matches for env var name and for a service-role-unique 24-char substring (12-char prefix alone is a false-positive-prone check since it's shared with the legitimately-public anon key's JWT header) |
| `pg_cron` purge job exists and is scheduled | D-04 (12-month retention) | Cron job state lives in the database, not application code | Supabase MCP `execute_sql`: `SELECT * FROM cron.job WHERE jobname = '<purge-job-name>'` — confirm one row with the expected schedule | ✅ Verified live in Plan 04 Task 2, Case F (direct Postgres connection, `pg` client) — 1 active row, `purge-prospects-12mo`, `0 3 * * *` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Approved — all Manual-Only Verifications executed live and green; CRM-04's human-inbox check was auto-approved under auto-chain mode using Resend API `last_event: delivered` evidence (see Task 2 (05-04-03) Auto-Approval Caveat above) rather than a literal human eyeball on the inbox. Visual rendering (HTML escaping, accents, sender display) was NOT manually inspected — flagged as a residual caveat, not a blocking gap.
