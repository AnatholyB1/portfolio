---
phase: 5
slug: prospect-capture-backend
status: draft
nyquist_compliant: true
wave_0_complete: false
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
| 05-01-01 | 01 | 0 | — | — | vitest installed, config present | infra | `npx vitest --version` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | CRM-01 | V4/V5 | Valid submission creates a `prospects` row via explicit field mapping (no raw-body spread) | integration (curl + Supabase check) | `curl -X POST localhost:3000/api/simulateur -d '{...valid payload...}'` then verify row via Supabase MCP `execute_sql` | ❌ W0 (manual checklist) | ⬜ pending |
| 05-01-03 | 01 | 1 | CRM-02 | V4 | `anon` role has zero grants on `prospects` — cannot select/update/delete | manual (Supabase dashboard RLS tester / anon-key curl expecting 401/403) | n/a — documented manual step | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | CRM-03 | DoS mitigation | Honeypot-filled or too-fast submission is silently rejected (same `{ok:true}` response, no row written) | unit (pure `isSpamSubmission()` predicate) | `npx vitest run src/app/api/simulateur/route.test.ts -t spam` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | CRM-04 | — | Successful insert triggers exactly one Resend call to `contact@sevalys.com` | unit (mocked Resend client) | `npx vitest run src/app/api/simulateur/route.test.ts -t notification` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs above are placeholders for the planner to align with actual plan/task numbering — the requirement→test mapping is what's binding, not the exact IDs.*

---

## Wave 0 Requirements

- [ ] Install `vitest` (`npm install -D vitest`) + minimal `vitest.config.ts` — first test infrastructure in this repo, justified because this phase introduces the project's first meaningfully pure-testable logic (zod schema, spam predicate, notification trigger)
- [ ] `src/lib/prospects-schema.ts` — extract the zod schema + `isSpamSubmission(payload)` predicate out of the route handler so both are unit-testable without mocking `next/server`
- [ ] `src/app/api/simulateur/route.test.ts` — covers CRM-03 (honeypot/timing) and CRM-04 (Resend triggered on success), with Supabase and Resend clients mocked

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prospect row actually persists in Supabase | CRM-01 | Live-Supabase-dependent; no test Supabase project stood up for a project this size | `curl` a valid payload to `/api/simulateur`, then `SELECT * FROM prospects ORDER BY created_at DESC LIMIT 1` via Supabase MCP `execute_sql` or dashboard; delete the test row after |
| `anon` role cannot read/update/delete `prospects` | CRM-02 | RLS/grant behavior can only be verified against the live database, not mocked | Supabase dashboard → Authentication → RLS policy simulator on `prospects` for role `anon`; or `curl` the PostgREST endpoint directly with the public anon key and confirm 401/403 on SELECT/UPDATE/DELETE |
| Service-role key never reaches the client bundle | Security (V6, Pitfall 4) | Build-output inspection, not a runtime test | After `next build`, `grep -r "SUPABASE_SERVICE_ROLE_KEY\|<actual key prefix>" .next/static` — expect zero matches |
| `pg_cron` purge job exists and is scheduled | D-04 (12-month retention) | Cron job state lives in the database, not application code | Supabase MCP `execute_sql`: `SELECT * FROM cron.job WHERE jobname = '<purge-job-name>'` — confirm one row with the expected schedule |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
