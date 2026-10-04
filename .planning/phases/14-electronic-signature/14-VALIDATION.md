---
phase: 14
slug: electronic-signature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 14 — Validation Strategy

> Per-phase validation contract. Source: `14-RESEARCH.md` § Validation Architecture.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.11 |
| **Config file** | `vitest.config.ts` (unit), `vitest.rls.config.ts` (RLS, Supabase branch) |
| **Quick run command** | `npx vitest run src/lib/signature src/lib/server/signature` |
| **Full suite command** | `npm test` then `npm run test:rls` (branch) |
| **Estimated runtime** | ~60 seconds |

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** `npm test` + `npm run test:rls`
- **Before verify-work:** full suites green + manual E2E on « Test E2E Sèvalys »
- **Max feedback latency:** 90 seconds

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | Status |
|-----|----------|-----------|-------------------|--------|
| SIGN-01 | HMAC code, 6 digits, never clear in DB | unit | `npx vitest run src/lib/server/signature/codes.test.ts` | ⬜ pending |
| SIGN-01 | 5 attempts, 10 min expiry, 60 s / 5 per hour, concurrency ≤ 5 | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t otp` | ⬜ pending |
| SIGN-02 | Code send refused without consent of current version | RLS/RPC + unit | `-t consent` | ⬜ pending |
| SIGN-03 | Append-only (no UPDATE/DELETE/TRUNCATE/INSERT direct) | RLS | `-t append-only` | ⬜ pending |
| SIGN-03 | Tamper detected; SQL↔TS hash parity; no fork under 20 concurrent appends | RLS + unit | `-t tamper`, `-t chain`, `npx vitest run src/lib/signature/verifyChain.test.ts` | ⬜ pending |
| SIGN-03 | Isolation client A/B, anon, Gecko | RLS | `-t isolation` | ⬜ pending |
| SIGN-04 | Sealed = original pages + certificate; stored hash = downloaded hash; deterministic retry | unit | `npx vitest run src/lib/server/signature/seal.test.ts` | ⬜ pending |
| SIGN-04 | Seal failure ⇒ no fact; idempotent re-seal; signed document cannot be replaced | unit + RLS | `-t seal-atomic`, `-t frozen` | ⬜ pending |
| SIGN-05 | Refused criterion blocks code; reservations in certificate; `acceptance_signed` fact | RLS + unit | `-t acceptance` | ⬜ pending |

## Wave 0 Requirements

- [ ] `tests/rls/signature.rls.test.ts`
- [ ] `src/lib/signature/verifyChain.test.ts` + golden vector from branch
- [ ] `src/lib/server/signature/{codes,seal}.test.ts`
- [ ] Spike: iframe of PDF (Chrome + Safari mobile) and pdf-lib loading of `renderDocument` output for the 3 types
- [ ] `npm install pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1`; migration applied to branch first

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real signature end to end, download, hash of sealed file | SIGN-01..05 | Real mailbox and browser | Sign a quote/contract/PV as « Test E2E Sèvalys », download sealed PDF, compare SHA-256 |
| Iframe PDF on iOS Safari | SIGN-01 | Device-specific | Open signing page on iPhone |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] No 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
