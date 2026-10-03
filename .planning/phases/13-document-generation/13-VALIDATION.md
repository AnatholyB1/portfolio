---
phase: 13
slug: document-generation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-03
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 13-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (`environment: 'node'`) |
| **Config file** | `vitest.config.ts`; RLS: `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`) |
| **Quick run command** | `rtk vitest run src/lib/documents` |
| **Full suite command** | `rtk npm test` (plus `rtk npm run test:rls` on the Supabase branch) |
| **Estimated runtime** | ~60 seconds (unit), RLS suite longer |

---

## Sampling Rate

- **After every task commit:** `rtk vitest run src/lib/documents` plus the touched file's test
- **After every plan wave:** `rtk npm test`
- **Before `/gsd:verify-work`:** Full suite green, RLS suite green on the branch
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| DOC-01 | Each template renders a valid PDF from a snapshot | unit | `rtk vitest run src/lib/documents/render.test.ts` | ❌ W0 |
| DOC-01 | Totals/deposit/balance in integer cents, no TVA | unit | `rtk vitest run src/lib/documents/money.test.ts` | ❌ W0 |
| DOC-01 | Step guard and prerequisites | unit | `rtk vitest run src/lib/documents/steps.test.ts` | ❌ W0 |
| DOC-01 | Admin actions: requireAdmin first, zod, preview writes nothing | unit (mock) | `rtk vitest run src/app/admin/projets/documents.actions.test.ts` | ❌ W0 |
| DOC-02 | Upload `upsert:false`, hash of uploaded buffer, random path | unit (mock) | `rtk vitest run src/lib/server/documents/issue.test.ts` | ❌ W0 |
| DOC-02 | Migration: append-only triggers, no storage.objects policy, private bucket | static SQL | `rtk vitest run src/lib/migrationLint.test.ts src/lib/documentsMigration.test.ts` | ❌ W0 |
| DOC-02 | UPDATE/DELETE denied, replacement race, A vs B isolation, snapshot admin-only | RLS integration | `rtk npm run test:rls -- documents` | ❌ W0 |
| DOC-03 | `documentStatus` matrix over facts, revoked, replaced | unit | `rtk vitest run src/lib/documents/status.test.ts` | ❌ W0 |
| DOC-03 | Portal Documents page: no price tokens, replaced in retrait, signed download | unit | `rtk vitest run src/components/portal/project/documentsPage.test.ts` | ❌ W0 |
| DOC-04 | Mentions in extracted text of real quote and invoice, all variants | integration | `rtk vitest run src/lib/documents/legalMentions.test.ts` | ❌ W0 |
| DOC-04 | Non-vacuity: removing one mention fails the check | unit | same file | ❌ W0 |
| MAIL | `document_issued` event, unique key per doc+email, no price in mail | unit + static SQL | `rtk vitest run src/lib/server/mail` | extend |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `@react-pdf/renderer@4.9.0` and `unpdf@1.8.1` (dev); font data module
- [ ] `render.test.ts`, `money.test.ts`, `status.test.ts`, `steps.test.ts`, `legalMentions.test.ts` under `src/lib/documents`
- [ ] `src/lib/documentsMigration.test.ts` and `tests/rls/documents.rls.test.ts`
- [ ] Update `migrationLint.test.ts` `APPEND_ONLY_TABLES`, `portalPage.test.ts` (Documents tab), `rules.test.ts`
- [ ] `next.config.ts`: `serverExternalPackages: ['@react-pdf/renderer']`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Issue and download one document on a preview deploy (Vercel Linux runtime) | DOC-01, DOC-02 | Spike ran on Windows only | Use the permanent "Test E2E Sèvalys" client, issue a quote, download, compare SHA-256 |
| Legal wording of contract and invoice mentions | DOC-04 | Needs accountant and lawyer review | Owner review before production use |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
