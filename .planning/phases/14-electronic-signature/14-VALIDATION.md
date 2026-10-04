---
phase: 14
slug: electronic-signature
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-04
revised: 2026-10-04
---

# Phase 14 — Validation Strategy

> Per-phase validation contract. Source: `14-RESEARCH.md` § Validation Architecture. Reconciled with the `describe(...)` names fixed in plans 14-11 and 14-12 (revision 2026-10-04).

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.11 |
| **Config file** | `vitest.config.ts` (unit, `src/**/*.test.ts`), `vitest.rls.config.ts` (RLS, Supabase branch) |
| **Quick run command** | `npx vitest run src/lib/signature src/lib/server/signature` |
| **Full suite command** | `npm test` then `npm run test:rls` (branch) |
| **Estimated runtime** | ~60 seconds |

## Sampling Rate

- **After every task commit:** quick run command (or the task's own `<automated>` command)
- **After every plan wave:** `npm test` + `npm run test:rls`
- **Before verify-work:** full suites green + manual E2E on « Test E2E Sèvalys »
- **Max feedback latency:** 90 seconds

## Describe-name index (RLS suites)

`-t` filters below match these `describe` blocks exactly. Do not rename one without updating this table.

| File (plan) | describe blocks |
|-------------|-----------------|
| `tests/rls/signature.rls.test.ts` (14-11) | `otp`, `concurrency`, `consent`, `acceptance` |
| `tests/rls/signatureChain.rls.test.ts` (14-12) | `append-only`, `chain`, `tamper`, `isolation`, `seal-atomic`, `frozen` |
| `src/lib/signature/verifyChain.test.ts` (14-02, frozen by 14-12) | `golden vector from database` |

## Per-Task Verification Map

| Req | Behavior | Plan | Test Type | Automated Command | Status |
|-----|----------|------|-----------|-------------------|--------|
| SIGN-01 | HMAC code, 6 digits, never clear in DB | 14-07 | unit | `npx vitest run src/lib/server/signature/codes.test.ts` | ⬜ pending |
| SIGN-01 | 5 attempts, 10 min expiry, 60 s / 5 per hour | 14-11 | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t otp` | ⬜ pending |
| SIGN-01 | Concurrent verifies never exceed 5 attempts | 14-11 | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t concurrency` | ⬜ pending |
| SIGN-01 | Code never sent/verified when not signable at current step (wrong_step guard) | 14-13 | unit | `npx vitest run "src/app/espace-client/documents/[id]/signer"` | ⬜ pending |
| SIGN-01 | Conditional apercu handler: RLS 404, sha 409, headers | 14-13 | unit (only if PREVIEW_MODE: handler) | `npx vitest run "src/app/espace-client/documents/[id]/apercu" --passWithNoTests` | ⬜ pending |
| SIGN-02 | Exact consent texts and version | 14-03 | unit | `npx vitest run src/lib/signature/consentText.test.ts` | ⬜ pending |
| SIGN-02 | Code send refused without consent of current version | 14-11 | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t consent` | ⬜ pending |
| SIGN-03 | Append-only (no UPDATE/DELETE/TRUNCATE/INSERT direct) | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t append-only` | ⬜ pending |
| SIGN-03 | Export verifies; no fork under 20 concurrent appends | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t chain` | ⬜ pending |
| SIGN-03 | Tamper detected by SQL and TS verifiers | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t tamper` | ⬜ pending |
| SIGN-03 | SQL↔TS hash parity (golden vector) and offline verifier cases | 14-02, 14-12 | unit | `npx vitest run src/lib/signature/verifyChain.test.ts` | ⬜ pending |
| SIGN-03 | Offline CLI `node scripts/verify-trail.mjs` on JSON exports (D-13) | 14-02 | unit (spawns plain node) | `npx vitest run src/lib/signature/verifyTrailCli.test.ts` | ⬜ pending |
| SIGN-03 | Isolation client A/B, anon, Gecko; storage_path hidden | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t isolation` | ⬜ pending |
| SIGN-03 | Static migration guards (grants, triggers, closed list, part-1 seam) | 14-04 | unit | `npx vitest run src/lib/signatureMigration.test.ts src/lib/migrationLint.test.ts` | ⬜ pending |
| SIGN-04 | Sealed = original pages + certificate; stored hash = downloaded hash; deterministic retry | 14-09 | unit | `npx vitest run src/lib/server/signature/seal.test.ts` | ⬜ pending |
| SIGN-04 | Seal failure ⇒ no fact; idempotent re-seal | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t seal-atomic` | ⬜ pending |
| SIGN-04 | Signed document cannot be replaced | 14-12 | RLS | `npm run test:rls -- tests/rls/signatureChain.rls.test.ts -t frozen` | ⬜ pending |
| SIGN-05 | Answer schema, refusal/reserve rules | 14-03 | unit | `npx vitest run src/lib/signature/acceptance.test.ts` | ⬜ pending |
| SIGN-05 | Refused criterion blocks code; reservations recorded; `acceptance_signed` only via seal | 14-11 | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t acceptance` | ⬜ pending |
| SIGN-01/02/05 | UI contract: one-time-code, no precheck, refusal CTA, pt-sign classes styled | 14-16 | static | `npx vitest run src/components/portal` | ⬜ pending |

Every other task in plans 14-01..14-19 carries its own `<automated>` command or is a blocking checkpoint (14-05 Task 2, 14-18 Task 2, 14-19 Task 2); see the plans.

## Wave 0 Requirements

Still pending (created during execution, not yet on disk):

- [ ] `tests/rls/signature.rls.test.ts` (14-11) and `tests/rls/signatureChain.rls.test.ts` (14-12)
- [ ] `src/lib/signature/verifyChain.test.ts` (14-02) + golden vector from branch (14-12)
- [ ] `src/lib/signature/verifyTrailCli.test.ts` + `scripts/verify-trail.mjs` (14-02)
- [ ] `src/lib/server/signature/{codes,seal}.test.ts` (14-07, 14-09)
- [ ] Spike: iframe of PDF headers → `PREVIEW_MODE` (14-05 Task 4); pdf-lib loading of `renderDocument` output for the 3 types (14-01)
- [ ] `npm install pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1` (14-01); migration applied to branch first (14-05 Task 3)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real signature end to end, download, hash of sealed file | SIGN-01..05 | Real mailbox and browser | Sign a quote/contract/PV as « Test E2E Sèvalys », download sealed PDF, compare SHA-256 |
| Iframe PDF on iOS Safari | SIGN-01 | Device-specific | Open signing page on iPhone |

## Validation Sign-Off

- [x] All tasks have automated verify or are blocking checkpoints
- [x] No 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references (pending execution)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (wave_0_complete stays false until the Wave 0 files exist)
