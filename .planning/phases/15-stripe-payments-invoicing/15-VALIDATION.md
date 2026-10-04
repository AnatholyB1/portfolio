---
phase: 15
slug: stripe-payments-invoicing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `15-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 (unit, `src/**/*.test.ts`) + Vitest RLS suite (`tests/rls/*.rls.test.ts`) on a dedicated Supabase branch |
| **Config file** | `vitest.config.ts`, `vitest.rls.config.ts` |
| **Quick run command** | `npx vitest run src/lib/server/stripe src/lib/documents src/lib/server/invoices` |
| **Full suite command** | `npm test` (unit) and `npm run test:rls` (needs `SV_TEST_*`, local only) |
| **Estimated runtime** | ~30 seconds (quick), several minutes (full + RLS) |

---

## Sampling Rate

- **After every task commit:** Run the quick command on touched directories
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** `npm test` green + `npm run test:rls` green on the branch + manual E2E checklist
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Filled by the planner from the requirement map below; every task must carry an `<automated>` command or a Wave 0 dependency.

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| PAY-01 | Amount from DB only; no amount in request body; session params (customer, methods, metadata, expiry, FR IBAN); no second session while processing; no session on paid/credited invoice | unit (mock Stripe) | `npx vitest run src/lib/server/stripe/checkout.test.ts` | ❌ W0 |
| PAY-02 | Bad/missing/tampered signature → 400; livemode mismatch → 400; event→ledger mapping table | unit | `npx vitest run src/lib/server/stripe/webhook.test.ts` | ❌ W0 |
| PAY-02 | Replay same event id → one ledger row, one fact, one receipt; crash before `processed_at` retries once; amount/currency mismatch → anomaly, no unlock | RLS/integration | `npx vitest run -c vitest.rls.config.ts tests/rls/payments.rls.test.ts` | ❌ W0 |
| PAY-03 | Paid deposit → `deposit_received`, step 4; paid final → `balance_received`; period invoice posts nothing; receipt deduped; reminders J+3/J+7/J+14 with `send_after`, skipped on payment/credit/processing | RLS/integration + unit | same + `npx vitest run src/lib/paymentsMigration.test.ts src/lib/server/mail/rules.test.ts` | ❌ W0 |
| PAY-04 | N parallel issues → numbers 1..N, no gap; failure after allocation reuses number; Paris year rollover; `AV` and `T*` series; UPDATE/DELETE/TRUNCATE refused even for service_role; credit-note cap and reason; RLS client A vs B, anonymous, Gecko | RLS/integration | `npx vitest run -c vitest.rls.config.ts tests/rls/invoices.rls.test.ts` | ❌ W0 |
| PAY-04 | Invoice and credit-note PDF mentions (number, date, deductions, "Acquittée", origin reference) | unit (text extraction) | `npx vitest run src/lib/documents/legalMentions.test.ts src/lib/documents/render.test.ts` | ✅ extend |
| PAY-05 | EN 16931 term mapping from fixtures; milli-quantity rounding; deposit + final + deductions never negative/over-invoiced | unit | `npx vitest run src/lib/documents/facturx.test.ts src/lib/documents/invoiceMath.test.ts` | ❌ W0 |
| D-01 | Key-mode guard: live key refused outside production; publishable key refused | unit | `npx vitest run src/lib/server/stripe/client.test.ts` | ❌ W0 |
| priceScope | New Stripe/portal/admin paths stay inside allowed price zones | unit | `npx vitest run src/lib/priceScope.test.ts` | ✅ existing |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/server/stripe/{client,webhook,checkout}.test.ts` (Stripe mocked; signature tests use the SDK test-header helper)
- [ ] `src/lib/documents/{invoiceMath,invoiceStatus,facturx}.test.ts`
- [ ] `src/lib/paymentsMigration.test.ts` (parity with the new migration, pattern of `signatureMigration.test.ts`)
- [ ] `tests/rls/invoices.rls.test.ts`, `tests/rls/payments.rls.test.ts` (+ helpers for issuing test invoices, parallel RPC)
- [ ] Framework install: `npm install stripe@23.0.0 --save-exact`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card payment, bank transfer, replay, credit note end to end in Stripe test mode | PAY-01..04 | Needs a Stripe test account and CLI | `stripe listen --forward-to localhost:3000/api/stripe/webhook`; fund the cash balance with `stripe test_helpers customers fund_cash_balance`; replay with `stripe events resend <id>`; use client « Test E2E Sèvalys » |
| Stripe account activation, bank transfers enabled, native receipts disabled, test and live webhook endpoints with the pinned API version | D-01, D-02, D-16 | Dashboard state not visible from the repo | Owner checklist before the first live payment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
