# Phase 15: Stripe payments & invoicing - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 41 new/modified
**Analogs found:** 38 / 41 (3 with no codebase analog: Stripe SDK client, gapless counter, webhook route)

All paths are relative to `C:\portfolio`. Line numbers refer to the files as read on 2026-10-04.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20261007000000_sv_payments_invoicing.sql` (tables) | migration | CRUD, append-only | `supabase/migrations/20261005000000_sv_documents.sql` + `20261006000000_sv_signature.sql` | exact |
| same file: RPC `sv_issue_invoice`, `sv_issue_credit_note`, `sv_attach_invoice_pdf` | migration (RPC) | transaction, request-response | `sv_issue_document` (documents.sql L138-237) | exact |
| same file: RPC `sv_apply_stripe_event` | migration (RPC) | event-driven | `sv_seal_document` (signature.sql L1312-1415) | role-match (best available) |
| same file: counter table + `sv_private.next_invoice_seq` | migration | gapless allocation | `sv_private.append_signature_event` (advisory lock, signature.sql L323) | partial |
| same file: outbox closed-list extension | migration | DDL | signature.sql L750-775 and documents.sql L102-123 | exact |
| `src/lib/paymentsMigration.test.ts` | test | file parse | `src/lib/signatureMigration.test.ts` | exact |
| `tests/rls/invoices.rls.test.ts`, `tests/rls/payments.rls.test.ts` | test | RLS / RPC integration | `tests/rls/documents.rls.test.ts`, `tests/rls/signature.rls.test.ts` | exact |
| `tests/rls/helpers.ts` (add `issueTestInvoice`, parallel RPC helper) | test util | RPC | `issueTestDocument` (helpers.ts L227-267) | exact |
| `src/lib/server/stripe/client.ts` | utility | config / guard | `assertSupabaseKeyMode` in `src/lib/supabase/env.ts` L41-62 | role-match |
| `src/lib/server/stripe/webhook.ts` (verify + pure mapper) | utility | transform | `src/lib/server/signature/closedLists.test.ts` style + RESEARCH Pattern 3 | no analog (new) |
| `src/lib/server/stripe/checkout.ts` | service | request-response | `src/lib/server/documents/download.ts` (RLS read first, then service_role) | role-match |
| `src/lib/server/stripe/refund.ts`, `customers.ts` | service | request-response | `src/lib/server/documents/issue.ts` (try/catch, code results) | role-match |
| `src/app/api/stripe/webhook/route.ts` | route | event-driven | `src/app/api/cron/mail/route.ts` | role-match |
| `src/app/api/cron/mail/route.ts` (modified: invoice sweeps) | route | batch | itself | exact |
| `src/lib/server/invoices/issue.ts` | service | two-phase CRUD + file I/O | `src/lib/server/documents/issue.ts` | exact |
| `src/lib/server/invoices/read.ts` | service | CRUD read (RLS) | `src/lib/server/documents/read.ts` | exact |
| `src/lib/server/invoices/download.ts` (or extend documents/download) | service | file I/O | `src/lib/server/documents/download.ts` | exact |
| `src/lib/server/invoices/autoIssue.ts` (`ensureDepositInvoice`, `ensureFinalInvoice`) | service | event-driven | `finalizeSignature` post-RPC block (`src/lib/server/signature/seal.ts` L213-229) | role-match |
| `src/lib/documents/invoiceMath.ts` | utility | transform (pure) | `src/lib/documents/money.ts` | exact |
| `src/lib/documents/invoiceStatus.ts` | utility | transform (pure) | `src/lib/documents/status.ts` | exact |
| `src/lib/documents/facturx.ts` | utility | transform (pure) | `src/lib/documents/legalMentions.ts` (pure, tested mapping) | partial |
| `src/lib/documents/types.ts` (modified: `InvoiceSnapshot` v2, `CreditNoteSnapshot`) | model | types | itself L150-205 | exact |
| `src/lib/documents/seller.ts` (modified: exemption text versioned) | config | constants | itself | exact |
| `src/lib/documents/pdf/templates/invoice/v2/InvoiceV2.tsx`, `credit-note/v1/CreditNoteV1.tsx` | component (PDF) | transform | `src/lib/documents/pdf/templates/invoice/v1/InvoiceV1.tsx` | exact |
| `src/lib/documents/legalMentions.ts` + `legalMentions.test.ts`, `render.test.ts` (extend) | test / utility | transform | themselves | exact |
| `src/lib/documents/registry.ts` (modified: v2 + credit-note) | config | registry | itself | exact |
| `src/lib/server/mail/rules.ts` (modified) | config | event-driven | itself L4-64 | exact |
| `src/lib/server/mail/outbox.ts` (modified: `buildMail` cases) | service | event-driven | itself L61-138 | exact |
| `src/lib/server/mail/payment*Email.ts` (7 builders) | utility | transform | `src/lib/server/mail/documentIssuedEmail.ts` | exact |
| `src/lib/server/mail/urls.ts` (add `buildPortalPaymentsUrl`) | utility | transform | itself | exact |
| `src/lib/projects/copy.ts` (`PROJECT_COPY.payments`, nav change) | config | copy | itself L144 | exact |
| `src/components/portal/project/ClientNav.tsx` (modified) | component | render | itself | exact |
| `src/app/espace-client/paiements/page.tsx` | component (RSC page) | request-response | `src/app/espace-client/documents/page.tsx` | exact |
| `src/components/portal/project/PaymentsList.tsx`, `PayButton.tsx`, `ReturnBanner.tsx` | component (client) | request-response | `src/components/portal/project/DocumentsList.tsx` | role-match |
| `src/app/espace-client/actions.ts` (add `payInvoiceAction`, `invoiceDownloadAction`) | controller (server action) | request-response | `src/app/espace-client/actions.ts` `documentDownloadAction` | exact |
| `src/components/admin/projects/billing/*` (BillingPanel, PeriodInvoiceForm, CreditNoteForm, InvoiceList, PendingPayments) | component | request-response | `src/components/admin/projects/documents/DocumentsPanel.tsx`, `PreviewIssuePanel.tsx`, `QuoteForm.tsx`, `InvoicePreviewForm.tsx` | exact |
| `src/app/admin/projets/actions.ts` (add billing actions) | controller | request-response | itself, `issueDocumentAction` L265-297 | exact |
| `src/app/admin/projets/[id]/page.tsx` (add Facturation section) | component (RSC) | request-response | itself L69, L160 | exact |
| `src/lib/server/invoices/adminView.ts` | service | read | `src/lib/server/documents/adminView.ts` | exact |
| `src/lib/priceScope.ts` + `priceScope.test.ts` (modified) | config / test | guard | itself | exact |
| `src/lib/server/signature/seal.ts` (modified: trigger deposit/final invoice) | service | event-driven | itself L222-229 | exact |
| `vercel.json` | config | cron | itself (no change expected) | exact |

---

## Pattern Assignments

### Migration `supabase/migrations/20261007000000_sv_payments_invoicing.sql` (tables)

**Analog:** `supabase/migrations/20261005000000_sv_documents.sql` (append-only table + RLS), `20261006000000_sv_signature.sql` (function-only inserts).

**Table + RLS + grants + triggers pattern** (documents.sql L25-67): copy verbatim per table (`sv_invoices`, `sv_invoice_lines`, `sv_invoice_deductions`, `sv_invoice_pdfs`, `sv_invoice_payment_events`):
```sql
create table if not exists public.sv_project_documents (
  id uuid primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  ...
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  issued_at timestamptz not null default now(),
  unique (project_id, doc_type, revision)
);
alter table public.sv_project_documents enable row level security;
revoke all on public.sv_project_documents from anon, authenticated, service_role;
grant select (id, project_id, doc_type, ...) on public.sv_project_documents to authenticated;  -- column grant: hide storage_path
grant select, insert on public.sv_project_documents to service_role;

drop policy if exists sv_project_documents_read on public.sv_project_documents;
create policy sv_project_documents_read on public.sv_project_documents
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_project_documents_no_upd_del on public.sv_project_documents;
create trigger sv_project_documents_no_upd_del
  before update or delete on public.sv_project_documents
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_documents_no_truncate on public.sv_project_documents;
create trigger sv_project_documents_no_truncate
  before truncate on public.sv_project_documents
  for each statement execute function sv_private.deny_mutation();
```
Rules the lint test enforces (`src/lib/migrationLint.test.ts` L24-50): every `public.sv_*` table has `enable row level security` plus `revoke all ... from anon, authenticated`; every `sv_private.*` / `public.sv_*` function has `set search_path = ''` and a revoke. Header comment style (decisions implemented, "NOT applied until branch") from documents.sql L1-19.

**Admin-only read (amount/identity snapshots, Stripe ids)** (documents.sql L73-96): `sv_stripe_events` and any table with Stripe ids copies `sv_document_snapshots` (policy `using ((select sv_private.is_admin()))`; no `authenticated` grant at all for `sv_stripe_events`, per RESEARCH Security table).

**Function-only inserts (no insert grant to service_role)** (signature.sql L50-53): `revoke all ... from anon, authenticated, service_role; grant select ...` then rows are written only by `security definer` functions. Use this for `sv_invoices`, `sv_invoice_lines`, `sv_invoice_deductions`, `sv_invoice_payment_events`, `sv_invoice_counters` so the number cannot be forged by a direct insert. (`sv_project_documents` instead grants insert to service_role; do not copy that part for invoices.)

**Deny trigger function** is already defined: `sv_private.deny_mutation()` (`20261003000000_sv_leads_core.sql` L147-157) raises `sv_immutable_table`. The one allowed UPDATE (`sv_stripe_events.processed_at` null to value) needs its own small trigger function, not `deny_mutation`; model it on the signature-codes "only modifiable table" comment (signature.sql L76-98) but enforce null-to-value in a `before update` trigger.

**FK rule** (documents.sql L18-19): append-only tables have no FK to `auth.users`; all FKs out of them `on delete restrict` (RESEARCH Pitfall 14: retention 10 years).

**Gap in codebase:** `sv_clients` (foundation.sql L38-49) has no `is_test` column. Phase 15 must add one (alter table, or a `sv_test_clients` table) for the `TFA/TAV` series decision (Open Question 1, Pitfall 8). `sv_clients` currently has only `grant`s by earlier migrations; verify its column grants before altering.

### Migration: outbox closed-list extension

**Analog:** `20261006000000_sv_signature.sql` L750-775 (latest version; start from its list, not from the phase 13 one).
```sql
do $$
declare v_name text;
begin
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_event_type_check;
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_template_check;
  for v_name in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%step_changed%'
      and pg_get_constraintdef(c.oid) ilike '%onboarding_completed%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_event_type_check check (event_type in (<full signature list> , 'payment_requested', ...));
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_template_check check (template in (<full signature list>, ...));
end; $$;
```
Current full list (signature.sql L771/773): `client_invited, step_changed, onboarding_completed, document_issued, document_signed, document_signed_admin, acceptance_refused` with templates `invite, step_changed, onboarding_completed, document_issued, document_signed, document_signed_admin, acceptance_refused`. Note: the mail `status` column already allows `'skipped'` (projects_engine.sql L272) and `send_after` exists, so no schema change is needed for reminders.

### Migration: RPC `sv_issue_invoice` / `sv_issue_credit_note`

**Analog:** `sv_issue_document` (documents.sql L138-237).

**Skeleton to copy** (lock project row, idempotency check, raise `sv_*` codes with `errcode = 'P0001'`, per-member outbox loop with `on conflict (dedupe_key) do nothing returning id`, return jsonb with `outbox_ids`, revoke/grant):
```sql
create or replace function public.sv_issue_document(...)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ... v_ids uuid[] := '{}';
begin
  select p.title, p.client_id into v_title, v_client_id
  from public.sv_projects p where p.id = p_project_id for update;
  if not found then raise exception 'sv_project_not_found' using errcode = 'P0001'; end if;

  if exists (select 1 from public.sv_project_documents d where d.id = p_id) then
    raise exception 'sv_document_already_issued' using errcode = 'P0001';
  end if;
  ...
  for v_email in
    select distinct lower(m.invited_email) from public.sv_client_members m where m.client_id = v_client_id
  loop
    v_outbox_id := null;
    insert into public.sv_mail_outbox (event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id)
    values ('document_issued', 'document_issued', v_email, 'client',
            'document_issued:' || p_id::text || ':' || v_email,
            jsonb_build_object('documentLabel', p_document_label, 'projectTitle', v_title, 'revision', p_revision),
            v_client_id, p_project_id)
    on conflict (dedupe_key) do nothing returning id into v_outbox_id;
    if v_outbox_id is not null then v_ids := v_ids || v_outbox_id; end if;
  end loop;
  return jsonb_build_object('document_id', p_id, 'revision', p_revision, 'outbox_ids', to_jsonb(v_ids));
end; $$;
revoke all on function public.sv_issue_document(<types>) from public, anon, authenticated;
grant execute on function public.sv_issue_document(<types>) to service_role;
```
Adaptations for invoices: idempotency by `issue_key` unique (return the existing invoice instead of raising, so retries are safe); the counter call and the invoice insert live in the same function body; reminders are extra outbox inserts with `send_after = now() + interval '3 days'` etc. (columns exist, projects_engine.sql L272). The payment_requested payload carries the amount here (UI-SPEC Surface D allows amount in text), unlike `document_issued` which carries none (documents.sql L11 D-04).

**Gapless counter:** no codebase analog. Closest lock idiom is the advisory lock in `sv_private.append_signature_event` (signature.sql L323+, prefixed keys `sv_sig`); but RESEARCH Pattern 1 (counter row `insert ... on conflict do update ... returning`) is the chosen mechanism. Use RESEARCH Pattern 1 verbatim, deriving year from `now() at time zone 'Europe/Paris'` (Pitfall 13) and use the "inner function with `p_now`" trick so tests can drive year rollover.

### Migration: RPC `sv_apply_stripe_event`

**Analog:** `sv_seal_document` (signature.sql L1312-1415): one transaction that locks (`sv_private.lock_document_project`), inserts rows, calls `public.sv_post_project_fact`, enqueues outbox rows, and returns `fact_id`, `fact_changed`, `outbox_ids` for TS post-processing.

**Fact posting from inside SQL** (signature.sql L1385):
```sql
v_fact := public.sv_post_project_fact(v_project_id, v_fact_type, 'client', v_sig.signer_user_id, null, v_doc.reference);
...
return jsonb_build_object('seal_id', v_seal_id, 'fact_id', v_fact -> 'fact_id', 'fact_changed', v_fact -> 'changed', 'outbox_ids', to_jsonb(v_ids));
```
For payments call with `'system'` actor, `null` actor id, reason = `'Paiement Stripe ' || invoice.number` (reason stored in admin-only `sv_project_fact_notes`; `sv_post_project_fact` already returns `changed:false` when a non-revoked fact exists, projects_engine.sql L477-565). Signature: `sv_post_project_fact(uuid, text, text, uuid, bigint, text)`; `'system'` is a valid actor kind and only `onboarding_completed` forbids non-system.

**Outbox skip for reminders:** `sv_mail_outbox.status` check already includes `'skipped'`; `sv_claim_due_mail` (projects_engine.sql L568-598) only claims `pending` or retryable `failed`, so setting pending reminders to `skipped` inside the apply RPC reliably cancels them.

### `src/lib/paymentsMigration.test.ts`

**Analog:** `src/lib/signatureMigration.test.ts` L1-60: read the migration with `readFileSync(new URL('../../supabase/migrations/...'))`, `stripComments`, helpers `closedList`, `constraintList(name, column)`, `fnBody(name)`; assert SQL closed lists equal the TS arrays (`MAIL_EVENTS`, templates). Do not touch `docTypesSql.test.ts` (RESEARCH Pitfall 10). `migrationLint.test.ts` automatically lints the new file (readdir of the migrations dir).

### RLS tests `tests/rls/invoices.rls.test.ts`, `payments.rls.test.ts`

**Analog:** `tests/rls/documents.rls.test.ts` L1-90.

**Setup pattern:**
```ts
import { addMember, anonClient, cleanup, makeAdmin, makeClient, makeGeckoAdmin, makeProject, makeUser, svc, type TestUser } from './helpers';
beforeAll(async () => {
  clientA = await makeClient('RLS Docs A'); clientB = await makeClient('RLS Docs B');
  projectA = await makeProject(clientA.id); projectB = await makeProject(clientB.id);
  memberA = await makeUser('docsa'); memberB = await makeUser('docsb');
  plain = await makeUser('docsplain'); gecko = await makeUser('docsgecko'); admin = await makeUser('docsadmin');
  await addMember(clientA.id, memberA); await addMember(clientB.id, memberB);
  await makeGeckoAdmin(gecko); await makeAdmin(admin);
});
afterAll(async () => { await cleanup(); });
```
Raw RPC calling idiom (documents.rls L47-66: `svc().rpc('sv_issue_document', {...})` with explicit `p_*` args). Matrix required by D-18: client A vs B, anonymous, Gecko user, plain user, admin. For concurrency (PAY-04) fire `Promise.all` of N `svc().rpc('sv_issue_invoice', ...)` and assert numbers are exactly 1..N. Retention test: deleting a client with invoices must fail with a restrict error (cleanup in `helpers.ts` will need to tolerate invoices; check `cleanup()` and add invoice cleanup only where triggers allow, which they do not: use per-run unique clients and let test data persist on the throwaway branch, or add a SQL truncate path using `session_replication_role` on the branch only).

**Helpers to add** (helpers.ts L227-267 `issueTestDocument` as template): `issueTestInvoice(projectId, opts)` calling `sv_issue_invoice` with deterministic `p_issue_key`; for signed state use `signTestDocument` (helpers.ts L340+) when a test needs a real `contract_signed` fact.

### `src/lib/server/stripe/client.ts`

**Analog:** `assertSupabaseKeyMode` (`src/lib/supabase/env.ts` L41-62): env-reading helpers named `required(name, value)` that name the variable but never its value, an `assert*` that throws `'[supabase/env] ...'` messages, `Env` parameter defaulting to `process.env` for testability.
```ts
type Env = Record<string, string | undefined>;
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[supabase/env] variable manquante : ${name}`);
  return value;
}
export function assertSupabaseKeyMode(env: Env = process.env): 'modern' | 'legacy' { ... throw new Error('[supabase/env] modes de clés mixtes ...') }
```
Use the `[stripe/env]` prefix and take `env` as a parameter (RESEARCH "Stripe client with mode assertion" code is the target shape). Add `import 'server-only';` as in `src/lib/rpc.ts` L1. Test file `client.test.ts` mirrors `src/lib/supabase/env.test.ts`. Note `getSiteUrl()` (env.ts L66-68) is the only source for `success_url`/`cancel_url` bases.

### `src/lib/server/stripe/checkout.ts`, `refund.ts`, `customers.ts`

**Analog:** `src/lib/server/documents/download.ts` (authorization = RLS read of the row first, then service_role for the privileged step).
```ts
export async function createDocumentDownloadUrl(rls: SupabaseClient, documentId: string):
  Promise<{ ok: true; url: string } | { ok: false; code: 'not_found' | 'error' }> {
  try {
    const row = await rls.from('sv_project_documents').select('id, filename').eq('id', documentId).maybeSingle();
    if (row.error || !row.data) return { ok: false, code: 'not_found' };
    ...service_role step...
  } catch { console.error('[documents/download] download failed'); return { ok: false, code: 'error' }; }
}
```
Copy: header PRECONDITION comment (L1-2), the `rls` parameter as first argument, discriminated-union results with short `code`s, logs with fixed strings only (never ids, emails, amounts). Checkout reads `net_to_pay_cents` from `sv_invoices` through the caller's RLS client (D-05, IDOR mitigation) and refuses when the ledger shows `processing`/`paid`/credited.

### `src/app/api/stripe/webhook/route.ts`

**Analog:** `src/app/api/cron/mail/route.ts` (full file read): `export const dynamic = 'force-dynamic'`, `NextResponse`/`Response` returns, fail-closed `authorized()`, delegating to a `src/lib/server` module.
```ts
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await processDueMail(25);
  return NextResponse.json(result);
}
```
Webhook adds `export const runtime = 'nodejs'`, `await request.text()` and signature verification (RESEARCH Pattern 3 is the template). After the RPC, call `afterFactPosted(project_id, factId)` exactly like `seal.ts` L222-229 (only when `fact_changed === true`, wrapped in try/catch with a fixed-string log).

**Proxy:** `src/proxy.ts` L70-76 matcher lists only `/espace-client`, `/admin`, `/connexion`, `/auth`; `/api/*` is not matched, so no proxy change is needed (CONTEXT said to exempt it; it is already exempt). `src/lib/privateRoutes.ts` need not list `/api/stripe`. The working copy of `src/proxy.ts` and `.gitignore` currently carry unrelated uncommitted modifications; do not rely on them.

**No analog:** signature verification (`stripe.webhooks.constructEvent`) and the event-to-RPC-args mapper are new; test with `stripe.webhooks.generateTestHeaderString` per RESEARCH Validation Architecture.

### `src/lib/server/invoices/issue.ts` (two-phase issue)

**Analog:** `src/lib/server/documents/issue.ts` (full file read).

**Imports / structure** (L3-10):
```ts
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';
import { SV_DOCUMENTS_BUCKET } from './download';
import { renderDocument } from './render';
```
**Result union** (L14-26) with `code` literals; **`aggregateMail`** (L29-34, export and reuse rather than copy); **`sendOutbox`** (L36-45); **`removeOrphan`** (L48-58).

**Core flow to adapt** (L72-146): render, upload with `upsert:false` and `cacheControl: '31536000'`, `callRpc('documents/issue', 'sv_issue_document', {...})`, map `rpc.code` through a `switch`, mail sending that never cancels the issue ("Un échec d'envoi n'annule jamais l'émission (D-04)"). **Key difference:** for invoices the order is reversed (RPC first allocates the number, then render with the number, upload `{project}/invoices/{invoice_id}.pdf`, then `sv_attach_invoice_pdf`), per RESEARCH Pattern 2. Keep the orphan-cleanup rule (never remove an object that belongs to an existing row, L120-123) and the "storage duplicate means check the row, idempotent" rule (L83-95).

**`callRpc` wrapper** (`src/lib/server/rpc.ts`): returns `{ ok: false, code }` where `code` is the `sv_*` token from the exception message; log is `[scope] fn code` only. Raise exceptions in SQL as `raise exception 'sv_...' using errcode = 'P0001'` so the wrapper extracts the code.

### `src/lib/server/invoices/autoIssue.ts` and `seal.ts` hook

**Analog:** `src/lib/server/signature/seal.ts` L213-229 (post-RPC best-effort block):
```ts
const factId = rpc.data?.fact_id;
if (rpc.data?.fact_changed === true && factId !== null && factId !== undefined) {
  try { await afterFactPosted(doc.project_id, Number(factId)); }
  catch { console.error('[signature/seal] notify_failed'); }
}
return { ok: true, outcome: 'sealed', sealSha256: sealed.sha256 };
```
Add after this: when the sealed document is a `contract`, call `ensureDepositInvoice(projectId)`; when `acceptance`, `ensureFinalInvoice(projectId)`; each wrapped in try/catch and never failing the seal (D-07, D-09). `finalizeSignature` returns before the invoice step on failure, so the daily cron sweep (RESEARCH Pitfall 7) is the safety net: idempotent via `issue_key = 'deposit:' || project_id`. Alternative considered: do it inside `sv_seal_document` (signature.sql L1312); rejected as the PDF needs TS rendering.

### `src/lib/documents/invoiceMath.ts`

**Analog:** `src/lib/documents/money.ts` (pure, double-quoted, `Number.isSafeInteger` guards, throws `"invalid_amount"`, half-up rounding on integers `Math.floor((x * pct + 50) / 100)` in `quoteTotals` L36-45). Reuse `lineTotalCents`, `quoteTotals`, `formatEuros`, `toCents`, `NBSP` from it; add `mulMilli` and `finalInvoice` (RESEARCH Code Examples). Test file mirrors `money.test.ts`. Note `money.ts` and the neighbouring modules use double quotes while `status.ts` uses single quotes; follow the file you extend.

### `src/lib/documents/invoiceStatus.ts`

**Analog:** `src/lib/documents/status.ts` (pure, takes facts, derives the status; never stored). Existing `documentStatus` for `invoice` (L18-20) returns `paid`/`to_pay` from facts; it must be superseded for real invoices by a function taking the invoice ledger (`processing`, `paid`, `credited`, `refunded`, `failed`) per UI-SPEC badge contract. `withStatuses`/`sortForDisplay` (L28-49) stay for the other documents. `DocumentStatus` union lives in `types.ts`; extend it deliberately and update `status.test.ts`.

### `src/lib/documents/types.ts` and templates

**Analog:** `types.ts` L150-205 (`InvoiceSnapshot` has `number: 'PROFORMA'`, `kind: 'deposit' | 'balance'`; `buildReference` returns `'PROFORMA'` for invoices L188; `buildFilename` returns `Facture-apercu-...` L204). `DocType` includes `'invoice'` and `issueDocument` refuses it (`issue.ts` L68). Invoices do not go through `sv_project_documents` (RESEARCH anti-pattern), so keep the preview path for `invoice` in `prepare.ts`/`render` and add new types: `InvoiceSnapshotV2` (number, type code, deductions, period) and `CreditNoteSnapshot`; update `registry.ts` to map `invoice/v2` and `credit-note/v1`.

**PDF template analog:** `src/lib/documents/pdf/templates/invoice/v1/InvoiceV1.tsx` L1-60: imports from `../../../primitives` (`DocPage, HeaderBand, LinesTable, MetaGrid, PDF_COLORS, Parties, PaymentConditions, SectionHeading, TotalsBlock`), `meta` array of `{label, value}`, `totals` array with `fine`/`bold` flags, `Document` with `language="fr-FR"`. The `APERÇU` fixed stamp View (L43-60) is removed in v2; "PROFORMA" disappears (UI-SPEC Surface C). Keep `VAT_FRANCHISE_MENTION` import from `seller.ts` but read the printed text from the snapshot (Pitfall 11). Legal mentions test: extend `legalMentions.ts` builder (it takes `InvoiceSnapshot`, L10) and `legalMentions.test.ts` with number, deduction line, "Acquittée" and credit-note mentions; test render via `unpdf` per `render.test.ts`.

### Mail rules / builders

**Analog:** `src/lib/server/mail/rules.ts` (full file read). Add every new event in **five** places, as Pitfall 10 warns: `MAIL_EVENTS` (L4-12), `MailTemplate` union (L14-21), `MAIL_RULES` (L24-32; `delayMs` and `to`), `dedupeKey` (L40-64), plus `buildMail` switch in `outbox.ts` (L64-136), plus SQL lists. Example of key helper to copy (L52-54):
```ts
documentIssued(documentId: string, email: string): string {
  return clamp(`document_issued:${documentId}:${norm(email)}`);
},
```
Reminder keys must match what the SQL RPC writes (`payment_reminder:{invoice_id}:d3|d7`, `payment_reminder_admin:{invoice_id}:d14`); add a parity assertion in `rules.test.ts`.

**Builder analog:** `src/lib/server/mail/documentIssuedEmail.ts`: function returning `{ subject, html, text }`, inline styles, `escapeHtml` imported from `./inviteEmail`, dark palette (`#0A0B0C`, `#111213`, CTA `#C4F542`), footer with `INVITE_EMAIL_REPLY_TO`. Clone per template and keep the `text` alternative in lock-step (L63-79). In `outbox.ts` use the `str(v)` helper and numeric guards on payload fields (L59, L89) and `buildPortalPaymentsUrl()` next to `buildPortalDocumentsUrl()` in `urls.ts` L13-15. Tests: `documentIssuedEmail.test.ts`, `projectEmails.test.ts`.

**Enqueue from TS** (used by cron sweeps and any non-RPC path): `enqueueAndSend({ event, recipientEmail, dedupeKey, payload, clientId, projectId })` (`outbox.ts` L246-259); the `rule.delayMs` is applied as `send_after` (L154). Reminders at +3/+7/+14 days are inserted by the SQL RPC instead, so `delayMs` stays 0 for those events.

### Portal `src/app/espace-client/paiements/page.tsx`

**Analog:** `src/app/espace-client/documents/page.tsx` (full file read). Copy as-is: `export const dynamic = 'force-dynamic'`, `metadata`, `requireClient()` with `ctx.status === 'no_access'` branch returning `<NoAccess action={<SignOutButton />} />`, RLS reads only (`loadClientProjects(ctx.supabase)`, `loadProjectBundle(...)`), grouping per project with `ProjectSelector`-like `h2` shown only when `groups.length > 1`, layout `ShellHeader` / `ShellMain width="client"` / `ClientNav current=...` / `ShellFooter`, CSS imports `@/components/portal/client.css` and `project.css`. Server actions passed as props to the client list (`getDownloadUrl={documentDownloadAction}`). Add query-param handling (`facture` uuid validated against `UUID_RE` as in `signer/actions.ts` L19; `retour=succes|annule`). Return banner polling uses `router.refresh()`.

**ClientNav:** `src/components/portal/project/ClientNav.tsx` currently has `current: 'projet' | 'documents'` and a disabled `<span aria-disabled="true" className="pt-client-nav-off">` for payments (L28-32). Replace with a `<Link href="/espace-client/paiements" aria-current=...>` branch and widen the `current` type. Update `portalPage.test.ts` L65-71 which asserts `'Paiements (bientôt)'` in `src/lib/projects/copy.ts` L144 (`nav.payments`), per UI-SPEC Open Items.

### Server actions (portal + admin)

**Portal analog:** `src/app/espace-client/documents/[id]/signer/actions.ts` L1-80 (`'use server'`, `requireClient()`, UUID regex validation, `fail(PROJECT_COPY.errors.generic)` generic French message, never leaking internals, result union `{ ok: true } | { ok: false; message }`) and `src/app/espace-client/actions.ts` (`documentDownloadAction`). `payInvoiceAction(invoiceId)`: validate uuid, `requireClient()`, load invoice via `ctx.supabase`, then `createCheckoutForInvoice`, return `{ ok: true, url }`; the client component does `window.location.assign(url)`. No amount parameter anywhere.

**Admin analog:** `src/app/admin/projets/actions.ts` L201-297 (comment "Ordre : requireAdmin, zod, getAccessibleProject, module serveur"):
```ts
export async function issueDocumentAction(raw: unknown): Promise<IssueResult> {
  const { user, supabase } = await requireAdmin();
  ...zod safeParse...
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) return ...;
```
and the fact actions L91-114 (`requireAdmin` first, `getAccessibleProject`, then service_role module, `refresh(projectId)` which calls `revalidatePath` for admin and portal; add `/espace-client/paiements` to `refresh`). Add `previewPeriodInvoiceAction`, `issuePeriodInvoiceAction`, `issueCreditNoteAction`, `invoiceDownloadAction`, `loadInvoiceDataAction` following `previewDocumentAction`/`issueDocumentAction`/`adminDocumentDownloadAction`/`loadSnapshotAction` one-to-one. Tests colocated: `documents.actions.test.ts` is the model for a new `billing.actions.test.ts`. Period-invoice guard: refuse unless `contract_signed` effective fact (use `effectiveFacts` from `@/lib/projects/steps`, see `status.ts` L2, L16).

### Admin UI `src/components/admin/projects/billing/*`

**Analogs:** `src/components/admin/projects/documents/DocumentsPanel.tsx` (panel composition, per-type switch L74, labels), `PreviewIssuePanel.tsx` (preview → confirm → issue state machine; reuse for both period invoice and credit note), `QuoteForm.tsx` (repeating line group, `toCents` conversions), `InvoicePreviewForm.tsx` (current invoice preview), `SnapshotPanel.tsx` (disclosure "Voir les données"), `IssuedDocumentsList.tsx` (list with hash/verify), `types.ts` (result unions shared with actions). UI tests: `documentsAdminUi.test.ts`, `projectSheetUi.test.ts` (read the component source and assert strings; update deliberately per UI-SPEC Open Item 1-2, including removal of the "Facture (aperçu uniquement)" block, which `adminView.ts` L65 and `DocumentsPanel.tsx` L74-93 currently produce).

**Page integration:** `src/app/admin/projets/[id]/page.tsx` L41 imports `loadAdminDocumentsView`, L69 calls it, L160 mounts `<DocumentsPanel ...>`; add `loadAdminBillingView(supabase, bundle)` and `<BillingPanel>` after it. Style classes `pt-bill-*` in `src/components/admin/projects/projects.css` under `.pt-admin`; portal `pt-pay-*` in `src/components/portal/project/project.css` under `.pt-root` (UI-SPEC Design System).

### `src/lib/projects/copy.ts` (`PROJECT_COPY.payments`)

All strings must live there (UI-SPEC: none hard-coded in JSX). Existing nav copy is `PROJECT_COPY.documents.nav` (copy.ts ~L144) and `PROJECT_COPY.errors.generic`; add a `payments` block mirroring `documents.portal` (`title`, `emptyHeading`, `emptyBody`) plus statuses and return-banner texts; `copy.test.ts` will need the new keys.

### Price scope guard

`src/lib/priceScope.test.ts` asserts exactly ten allowed zones (L46-61): `src/app/admin`, `src/app/api/cron`, `src/app/auth`, `src/app/connexion`, `src/app/espace-client`, `src/components/admin`, `src/components/portal`, `src/lib/documents`, `src/lib/server`, `src/lib/signature`. **`src/app/api/stripe` is not in the list.** Either keep the webhook route price-free (it only passes ids/cents to the RPC, no price copy) or add the zone deliberately and update the test's exact list (the test compares `.sort()` equality, so adding a zone is a test edit). `src/lib/server/stripe/*` and `src/lib/server/invoices/*` are covered by `src/lib/server`.

---

## Shared Patterns

### service_role confinement
**Source:** `src/lib/server/rpc.ts`, every module starts `import 'server-only';`
**Apply to:** all `src/lib/server/stripe/*`, `src/lib/server/invoices/*`, the webhook route.
```ts
export async function callRpc<T = unknown>(scope: string, fn: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc(fn, args);
    if (error) { const msg = ...; const code = msg.startsWith('sv_') ? msg.split(/[\s:]/)[0] : 'unknown'; console.error(`[${scope}] ${fn} ${code}`); return { ok: false, code }; }
    return { ok: true, data: data as T };
  } catch { console.error(`[${scope}] ${fn} threw`); return { ok: false, code: 'unknown' }; }
}
```
Every state-changing step goes through a `security definer` RPC with `revoke ... from public, anon, authenticated; grant execute ... to service_role`.

### Admin / client authorization in actions
**Source:** `src/lib/server/auth/dal.ts` (`requireAdmin`, `requireClient`; role from tables via RLS client, never metadata) and `src/lib/server/projects/access.ts` (`getAccessibleProject`).
**Apply to:** all billing and payment server actions. Order: auth, zod parse, accessibility check with the RLS client, then the service_role module. Public webhook is the only unauthenticated entry; its auth is the Stripe signature.

### Logging
Fixed-string `console.error('[module/area] code')` only, never emails, ids, amounts or payloads (`issue.ts` L42, L93, L142; `seal.ts` L219-227; `rpc.ts`). RESEARCH V7.

### Mail idempotency
`dedupe_key` unique + `on conflict (dedupe_key) do nothing` in SQL (documents.sql L226-227) or `upsert ... ignoreDuplicates` in TS (`outbox.ts` L157-160); send after commit with `sendOutboxRow(id)`; failure never rolls back the issuance. Cron `processDueMail` (`outbox.ts` L261-277) picks up the rest daily (`vercel.json`: `"0 6 * * *"`, route `src/app/api/cron/mail/route.ts`, fail-closed `CRON_SECRET`).

### Append-only + immutable
Triggers `sv_private.deny_mutation()` on `before update or delete` (row) and `before truncate` (statement), plus no UPDATE/DELETE grants. Fixed error token `sv_immutable_table`. Tests: assert the error against `svc()` (service_role) for each table.

### Step engine facts
Read through `loadProjectFacts`/`afterFactPosted` (`src/lib/server/projects/facts.ts` L33-150) and `deriveProjectState`/`effectiveFacts` from `@/lib/projects/steps`; step is never stored. `FactType` already includes `deposit_received` and `balance_received` (`steps.ts` L24-25), so `src/lib/projects/steps.ts` needs no change. `step_changed` mail is deduped per fact id (`rules.ts` L46-48), so webhook retries are safe.

### Time and money
Paris time via SQL `now() at time zone 'Europe/Paris'` (seal RPC uses `to_char(... at time zone 'Europe/Paris', ...)`, signature.sql ~L1370). Cents are integers; `formatEuros` never uses `Intl` (money.ts L47-53). Dates via `src/lib/documents/dates.ts` (`formatDateFr`, `formatDateLongFr`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/server/stripe/webhook.ts` (signature verification, event mapper) | utility | event-driven | No inbound third-party webhook exists; use RESEARCH Pattern 3 and Pitfall 2 mapping table |
| `sv_invoice_counters` + `sv_private.next_invoice_seq` | migration | gapless allocation | No counter table exists; only advisory-lock chain tail in `append_signature_event` is related; use RESEARCH Pattern 1 and prove with concurrency + rollback tests |
| `src/lib/documents/facturx.ts` | utility | transform | No EN 16931 mapping exists; pure module with a fixture-driven test, structured like `legalMentions.ts` |
| `sv_clients.is_test` flag | migration | schema | Column does not exist (foundation.sql L38-49); decide column vs table before planning (RESEARCH Open Question 1) |
| Stripe SDK usage (`stripe@23.0.0`) | dependency | — | Package not installed; `package.json` must gain it (`npm install stripe@23.0.0 --save-exact`) |

## Planner Notes (codebase facts that affect plans)

1. `/api/stripe/webhook` needs no proxy or `privateRoutes.ts` change (matcher in `src/proxy.ts` L70-76 excludes `/api`).
2. `sv_project_documents` cannot hold invoices (unique root index per `(project_id, doc_type)`, documents.sql L49-50); invoice tables are separate. The `doc_type` check (`quote, contract, spec, acceptance`, documents.sql L28) already excludes `invoice`, and `issueDocument` rejects it (`issue.ts` L68), so phase 15 does not alter either.
3. Existing preview path keeps working for `docType === 'invoice'` (`InvoiceV1`, `DOC_TITLES`, `adminView.ts` L65); decide whether v1 preview is retired or reused as the period-invoice preview ("Aperçu" with PROFORMA stamp per UI-SPEC B3).
4. Seller constants (`SELLER_V1` in `src/lib/documents/seller.ts`: IBAN, BIC, 30-day terms, `vatRegime: 'franchise'`) are the source for seller_* columns; copy them into each invoice row at issue time (D-15), do not read them at display time.
5. Test files are colocated (`*.test.ts` beside modules); RLS tests live in `tests/rls/` and need `SV_TEST_*` env (local only).
6. `.planning/STATE.md`, `.gitignore`, `src/proxy.ts` have uncommitted changes in the working tree unrelated to this phase.

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/lib/server/{documents,signature,mail,projects,auth}`, `src/lib/documents` (incl. `pdf/templates`), `src/lib/projects`, `src/lib/supabase`, `src/app/{api,admin,espace-client}`, `src/components/{admin/projects,portal/project}`, `tests/rls/`, `src/proxy.ts`, `src/lib/privateRoutes.ts`, `vercel.json`
**Files scanned:** ~45 read in full or in targeted ranges; ~150 listed
**Pattern extraction date:** 2026-10-04
