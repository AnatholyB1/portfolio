# Phase 16: Mailing automation completion - Pattern Map

**Mapped:** 2026-10-06
**Files analyzed:** 22 (new or modified)
**Analogs found:** 21 / 22

## CRITICAL FINDING (contradicts RESEARCH.md Pitfall 1 and Open Question 1)

RESEARCH.md says nothing enqueues `payment_reminder*`. That is **wrong in its conclusion**. The reminders ARE enqueued, in SQL, at invoice issue time:

- `supabase/migrations/20261007000000_sv_invoices.sql` lines 643-678 (inside `sv_private.issue_invoice_at`): for `p_kind = 'deposit'`, each client member gets `payment_reminder` d3 and d7 rows with `send_after = p_now + interval '3 days' / '7 days'`, and one `payment_reminder_admin` d14 row. All use `on conflict (dedupe_key) do nothing`.
- `supabase/migrations/20261007010000_sv_payments.sql` lines 598-607 (step "g and h" of `sv_apply_stripe_event`): when the invoice is paid or processing, pending `payment_reminder:<invoice>:%` and `payment_reminder_admin:<invoice>:d14` rows are set to `skipped`.

What is true: no TS sweep exists (CONTEXT's "aucun balayage" is accurate for TS). What it means for the planner: the deposit cadence already works through schedule-at-issue plus skip-on-payment. Do NOT build a second deposit sweep that would double-enqueue (keys would collide, so it would be harmless but redundant). The planner must decide: (a) leave deposit reminders as-is and only share `reminderStage`/cadence code for unsigned docs and review requests, or (b) migrate deposit to the sweep and remove the SQL inserts. Note that D-03 forbids schedule-at-issue for unsigned documents, so option (a) leaves two patterns coexisting. Also note a gap: if a deposit invoice is credited (`credit_note`) the pending reminders are not skipped by the code read here. Flag to user.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/2026100800000x_sv_mail_automation.sql` | migration | CRUD / append-only | `20261007010000_sv_payments.sql` + `20261007000000_sv_invoices.sql` (constraint loop) | exact |
| `src/lib/server/mail/rules.ts` (modify) | config | request-response | itself | exact |
| `src/lib/server/mail/outbox.ts` (modify: guard in `deliver`, headers, switch cases) | service | event-driven | itself | exact |
| `src/lib/server/mail/suppression.ts` | service | CRUD (read) | `src/lib/server/invoices/autoIssue.ts` (admin client reads) | role-match |
| `src/lib/server/mail/unsubscribeToken.ts` | utility | transform | `src/app/api/cron/mail/route.ts` `authorized` (HMAC/timingSafeEqual) | partial |
| `src/lib/server/mail/marketingEmail.ts` | utility | transform | `src/lib/server/mail/paymentEmails.ts` `layout()` | role-match |
| `src/lib/server/mail/reviewRequestEmail.ts` | utility | transform | `paymentEmails.ts` `paymentReminderEmail` | exact |
| `src/lib/server/mail/documentReminderEmail.ts` | utility | transform | `paymentEmails.ts` `paymentReminderEmail` / `paymentReminderAdminEmail` | exact |
| `src/lib/server/reminders/cadence.ts` | utility | transform (pure) | `src/lib/documents/steps.ts` (pure module) | role-match |
| `src/lib/server/reminders/sweep.ts` | service | batch | `src/lib/server/invoices/autoIssue.ts` `sweepInvoices` | exact |
| `src/app/api/cron/mail/route.ts` (modify) | route | request-response | itself | exact |
| `src/lib/server/resend/webhook.ts` | utility | transform | `src/lib/server/stripe/webhook.ts` | exact |
| `src/app/api/resend/webhook/route.ts` | route | event-driven | `src/app/api/stripe/webhook/route.ts` | exact |
| `src/app/api/unsubscribe/route.ts` | route | request-response | `src/app/api/stripe/webhook/route.ts` (public, `text()` helper) | role-match |
| `src/app/desinscription/page.tsx` | component (SSR page) | request-response | portal/admin noindex pages (not read; see No Analog) | partial |
| `src/lib/privateRoutes.ts` (modify) | config | n/a | itself | exact |
| `src/proxy.ts` (verify only; matcher unchanged) | middleware | request-response | itself | exact |
| Admin suppression view + lift action, reminder hold action (`src/app/admin/...`) | component / server action | CRUD | existing admin pages and actions (not read; planner to locate) | partial |
| `src/lib/server/mail/outbox.test.ts` (extend) | test | unit | itself | exact |
| `src/lib/server/mail/paymentsMailParity.test.ts` (extend) | test | unit | itself | exact |
| `src/lib/server/resend/webhook.test.ts`, route tests | test | unit | `src/lib/server/stripe/webhook.test.ts` | exact |
| `src/lib/server/reminders/sweep.test.ts` | test | unit | `src/lib/server/invoices` autoIssue test (supabase mocked) | role-match |
| `tests/rls/mailautomation.rls.test.ts` | test | RLS | `tests/rls/payments.rls.test.ts`, `tests/rls/mailoutbox.rls.test.ts` | exact |
| `.env.example` (modify) | config | n/a | existing entries | exact |

## Pattern Assignments

### `supabase/migrations/2026100800000x_sv_mail_automation.sql` (migration, append-only CRUD)

**Analog:** `supabase/migrations/20261007010000_sv_payments.sql` (tables, RLS, triggers, RPC) and `20261007000000_sv_invoices.sql` lines 377-391 (outbox constraint rebuild).

**Outbox constraint rebuild** (invoices.sql 377-391). Search by content of an event already present, never by name. Extend the full list with `document_reminder`, `document_reminder_admin`, `review_request`, `mail_suppression_admin` (events and templates):
```sql
alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_template_check;
for v_name in
  select c.conname
  from pg_constraint c
  where c.conrelid = 'public.sv_mail_outbox'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%document_issued%'
loop
  execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
end loop;
alter table public.sv_mail_outbox
  add constraint sv_mail_outbox_event_type_check check (event_type in (... full list ...));
alter table public.sv_mail_outbox
  add constraint sv_mail_outbox_template_check check (template in (... full list ...));
```
This is inside a `do $$ ... declare v_name text ... $$` block. The parity test regex requires the literal text `sv_mail_outbox_event_type_check check (event_type in (` and `sv_mail_outbox_template_check check (template in (` on the SAME constraint names. Keep those names.

**Append-only table with RLS** (payments.sql 150-200). Copy this exact shape for `sv_mail_suppressions`, `sv_mail_suppression_lifts`, `sv_reminder_holds`:
```sql
alter table public.sv_invoice_payment_events enable row level security;
revoke all on public.sv_invoice_payment_events from anon, authenticated, service_role;
grant select on public.sv_invoice_payment_events to service_role;
...
drop policy if exists sv_invoice_payment_events_read on public.sv_invoice_payment_events;
create policy sv_invoice_payment_events_read on public.sv_invoice_payment_events
  for select to authenticated
  using ( (select sv_private.is_admin()) or ... );

drop trigger if exists sv_invoice_payment_events_no_upd_del on public.sv_invoice_payment_events;
create trigger sv_invoice_payment_events_no_upd_del
  before update or delete on public.sv_invoice_payment_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_invoice_payment_events_no_truncate on public.sv_invoice_payment_events;
create trigger sv_invoice_payment_events_no_truncate
  before truncate on public.sv_invoice_payment_events
  for each statement execute function sv_private.deny_mutation();
```
Admin-only read variant: copy `sv_stripe_customers_admin_read` (payments.sql 27-52), `grant select on ... to authenticated` plus an `is_admin()`-only policy. Writes occur only via RPC (no `insert` grant to `service_role` where the RPC is the sole writer).

**Event-id idempotency table** (payments.sql 91-144) for `sv_resend_events`: `event_id text primary key`, `received_at`, `processed_at`. This analog has a guarded `processed_at` transition trigger (`guard_stripe_event_update`) plus no-delete and no-truncate triggers. Copy it if the RPC marks `processed_at`; simpler is to insert and process in one transaction and keep the table pure append-only (`deny_mutation`), as RESEARCH suggests.

**RPC signature and grants** (payments.sql 384-404, 651-652):
```sql
create or replace function public.sv_apply_stripe_event(...)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$ ... $$;
revoke all on function public.sv_apply_stripe_event(text, ...) from public, anon, authenticated;
grant execute on function public.sv_apply_stripe_event(text, ...) to service_role;
```
Return `jsonb_build_object('outcome', ..., 'outbox_ids', to_jsonb(v_ids))` (payments.sql 647 and 452 for the duplicate early return).

**Admin alert enqueue inside RPC** (payments.sql 616-640, pattern for `mail_suppression_admin`): `insert into public.sv_mail_outbox (event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id) values ('payment_anomaly_admin','payment_anomaly_admin', v_admin, 'admin', 'payment_anomaly_admin:' || p_event_id, jsonb_build_object(...), ...) on conflict (dedupe_key) do nothing returning id into v_outbox_id;` then `v_ids := v_ids || v_outbox_id`.

**Membership lookup for "is this address a client"** (payments.sql 578-583): `select distinct lower(m.invited_email) from public.sv_client_members m where ...`. For leads use `sv_lead_contacts.email_norm` (per RESEARCH; verify column in `20261003000000_sv_leads_core.sql`).

**Skip pending rows pattern** (payments.sql 598-607) is the model for any "stop reminders" SQL (for example on a hold or on document replacement):
```sql
update public.sv_mail_outbox set status = 'skipped'
where status = 'pending' and (dedupe_key like 'payment_reminder:' || v_inv.id::text || ':%' or ...);
```

---

### `src/lib/server/mail/rules.ts` (config, modify)

**Analog:** itself. Current shape (lines 4-50, 58-100):
```typescript
export const MAIL_EVENTS = [ 'client_invited', ... 'credit_note_issued' ] as const;
export type Rule = { template: MailTemplate; delayMs: number; to: 'client' | 'admin' };
export const MAIL_RULES: Record<MailEvent, Rule> = {
  payment_reminder: { template: 'payment_reminder', delayMs: 0, to: 'client' },
  ...
};
const clamp = (k: string) => (k.length <= MAX_KEY ? k : k.slice(0, MAX_KEY));
const norm = (e: string) => e.toLowerCase();
export const dedupeKey = {
  paymentReminder(invoiceId: string, stage: 'd3' | 'd7', email: string): string {
    return clamp(`payment_reminder:${invoiceId}:${stage}:${norm(email)}`);
  },
  paymentReminderAdmin(invoiceId: string): string {
    return clamp(`payment_reminder_admin:${invoiceId}:d14`);
  },
```
Changes: add `class: 'transactional' | 'marketing'` to `Rule` and to all 13 existing entries (`transactional`); add new events/templates; add `dedupeKey.documentReminder(documentId, stage, email)`, `documentReminderAdmin(documentId)`, `reviewRequest(projectId, stage, email)`, `mailSuppressionAdmin(suppressionId)`. Keep key formats literal so the parity test can match SQL (only needed for keys written in SQL, such as the suppression alert).

---

### `src/lib/server/mail/outbox.ts` (service, modify)

**Analog:** itself.

**Guard insertion point** in `deliver` (lines 253-267). After the `no_api_key` check, before `buildMail`:
```typescript
async function deliver(row: OutboxRow): Promise<'sent' | 'failed'> {
  const fail = async (code: string) => {
    await markRow(row.id, { status: 'failed', last_error: code });
    console.error(`[mail/outbox] ${row.template} ${code}`);
    return 'failed' as const;
  };
  if (!process.env.RESEND_API_KEY) return fail('no_api_key');
```
Add a sibling `skip(code)` that does `markRow(row.id, { status: 'skipped', last_error: code })` plus `console.error` with the template and code only (no address). Widen the return type to `'sent' | 'failed' | 'skipped'` and update all three callers: `sendOutboxRow` (line 295, return type), `enqueueAndSend` (line 318, maps `out`), `processDueMail` (lines 333-349, currently `else failed += 1`, must add a `skipped` counter or skipped rows get counted as failed).

**Class lookup:** `MAIL_RULES[row.event_type as MailEvent].class` at send time (not stored in outbox, per D-14).

**Resend send call to extend** (lines 271-281): add `headers: mail.headers` and keep `{ idempotencyKey: row.dedupe_key }`. `BuiltMail` (lines 59-65) gains `headers?: Record<string, string>`; `buildMail` end (line 209) is `return { from: INVITE_EMAIL_FROM, replyTo: INVITE_EMAIL_REPLY_TO, ...mail };`: for marketing templates return `from: MARKETING_EMAIL_FROM` and the `List-Unsubscribe` headers.

**New switch cases** follow the existing style (lines 169-176):
```typescript
case 'payment_reminder':
  mail = paymentReminderEmail({
    invoiceNumber: str(p.invoiceNumber),
    amountCents: cents(p.amountCents),
    projectTitle: str(p.projectTitle),
    stage: oneOf(p.stage, ['d3', 'd7'] as const),
  });
  break;
```
Use `str`, `oneOf`, `cents` helpers (lines 67-76). Errors are caught as `render_error` in `deliver`.

**Logging rule:** error codes only, never addresses (header comment lines 1-3; test mocks throw `'boom user@example.com'` to prove it).

---

### `src/lib/server/reminders/sweep.ts` (service, batch)

**Analog:** `src/lib/server/invoices/autoIssue.ts` `sweepInvoices` (lines 93-132).

**Imports and header** (lines 1-8):
```typescript
// PRECONDITION : ... route cron protégée par CRON_SECRET.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
```
**Core pattern** (lines 100-125): one `Promise.all` of batch reads from the admin client, bail with a fixed-string console error on `.error`, process in pure helpers, `try/catch` around everything with fixed-string logs, and a typed result object with counters:
```typescript
const admin = createSupabaseAdminClient();
const [facts, invoices] = await Promise.all([
  admin.from('sv_project_facts').select('id, project_id, type, target_fact_id')
    .in('type', ['contract_signed', 'acceptance_signed', 'fact_revoked']),
  admin.from('sv_invoices').select('project_id, kind').in('kind', ['deposit', 'final']),
]);
if (facts.error || invoices.error) { console.error('[invoices/auto] sweep_read_failed'); result.failed += 1; }
```
Pure helper pattern to copy (lines 77-91): `pending(facts, invoices, ...)` filters effective facts by building a `revoked` Set from `fact_revoked` rows (`target_fact_id`). Reuse that revocation logic, or better import `effectiveFacts` from `@/lib/projects/steps`.

**Enqueue:** call `enqueueMail({ event, recipientEmail, dedupeKey, payload, clientId, projectId })` from `outbox.ts` (lines 212-243); `ON CONFLICT DO NOTHING` gives "once per stage".

**Document status derivation (D-03, no copied field):** `src/lib/documents/status.ts` lines 7-22 (`documentStatus`) and `src/lib/documents/steps.ts` lines 18-50: `SIGNING_FACT = { quote: 'quote_accepted', contract: 'contract_signed', acceptance: 'acceptance_signed' }`, `ChainDoc = { id, docType, revision, replacesDocumentId, issuedAt }`, `chainHeads(docs)`, `replacedByMap(docs)`. Rows from `sv_project_documents` must be mapped to `ChainDoc` (snake to camel). Unsigned = `documentStatus(...) === 'to_sign'`; skip docs of type `spec`/`invoice`.

**Recipients:** members of the client, same query as `document_issued` (`sv_client_members.invited_email`, lowercased and de-duplicated).

**Ordering in the cron:** RESEARCH recommends sweep before `processDueMail`.

---

### `src/lib/server/reminders/cadence.ts` (utility, pure transform)

**Analog:** `src/lib/documents/steps.ts` (pure, no `server-only`, exported pure functions with unit tests next to them: `steps.test.ts`). Export `reminderStage(elapsedDays, cadence)` returning highest stage reached. The existing stage type is `ReminderStage = 'd3' | 'd7'` in `paymentEmails.ts` line 11 (admin d14 is separate by design); extend rather than redefine.

---

### `src/app/api/cron/mail/route.ts` (route, modify)

**Analog:** itself (lines 20-33):
```typescript
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await processDueMail(25);
  let invoices: unknown;
  try { invoices = await sweepInvoices(10); }
  catch { console.error('[cron/mail] invoices_failed'); invoices = { error: 'invoices_failed' }; }
  return NextResponse.json({ ...result, invoices });
}
```
Add a second isolated `try/catch` for `sweepReminders` with the same shape (`reminders_failed`). Never let one sweep failure block the others.

---

### `src/lib/server/resend/webhook.ts` (utility, transform)

**Analog:** `src/lib/server/stripe/webhook.ts`.

**Header and verify shape** (lines 1-6, 39-59):
```typescript
import 'server-only';
// Vérification de signature (SDK, corps brut) et table pure événement -> registre.
// Logs : chaînes fixes uniquement, jamais d'identifiants ni de montants.
export function verifyStripeEvent(raw: string, signature: string | null, secrets = webhookSecrets()) {
  if (!signature || typeof raw !== 'string') return null;
  for (const { mode, secret } of secrets) {
    try { const event = Stripe.webhooks.constructEvent(raw, signature, secret); ...; return { event, mode }; }
    catch { /* essai du secret suivant */ }
  }
  console.error('[stripe/webhook] verify_failed');
  return null;
}
```
Resend equivalent: `new Resend(apiKey).webhooks.verify({ payload: raw, headers: { id, timestamp, signature }, webhookSecret })` in `try/catch` returning `null`; log only the fixed string `[resend/webhook] verify_failed`.

**Pure mapper with defensive guards** (lines 61-93): copy `isObj`, `str` helpers and `toApplyArgs(event): ApplyArgs | null` returning `null` for ignored events (`default: return null`). Define `ApplyArgs` with `p_`-prefixed RPC param names (lines 22-37). Normalize each `to[]` address with `trim().toLowerCase()` and bound its length (<=254) and array size.

---

### `src/app/api/resend/webhook/route.ts` (route, event-driven)

**Analog:** `src/app/api/stripe/webhook/route.ts` (exact; copy whole file structure):
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return text('missing signature', 400);
  const raw = await request.text();
  const verified = verifyStripeEvent(raw, signature);
  if (!verified) return text('invalid signature', 400);
  const args = toApplyArgs(verified.event);
  if (!args) return text('ignored', 200);
  const rpc = await callRpc<Applied>('stripe/webhook', 'sv_apply_stripe_event', { ...args, p_admin_email: ADMIN_NOTIFY_EMAIL });
  if (!rpc.ok) return text('retry', 500);
  const ids = Array.isArray(data.outbox_ids) ? data.outbox_ids.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length > 0) {
    try { await Promise.all(ids.map((id) => sendOutboxRow(id))); }
    catch { console.error('[stripe/webhook] mail_failed'); }
  }
  return text('ok', 200);
}
```
Swap headers for `svix-id`, `svix-timestamp`, `svix-signature` (all three required). Add fail-closed when `RESEND_WEBHOOK_SECRET` is unset: 500 `not_configured` (model: `authorized()` in cron route lines 11-18, "Fail-closed"). Imports: `sendOutboxRow` from `@/lib/server/mail/outbox`, `ADMIN_NOTIFY_EMAIL` from `@/lib/server/mail/rules`, `callRpc` from `@/lib/server/rpc`.

**Proxy:** `src/proxy.ts` matcher (lines 128-144) already excludes `api` via `'/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)'`; no code change needed for the route. Add a test in `src/proxy.test.ts` rather than editing the matcher.

---

### `src/app/api/unsubscribe/route.ts` (route, request-response)

**Analog:** `src/app/api/stripe/webhook/route.ts` for the `text()` helper, `runtime`/`dynamic` exports, fixed-string logging, and `callRpc`. HMAC compare analog: `src/app/api/cron/mail/route.ts` lines 11-18:
```typescript
const expected = Buffer.from(`Bearer ${secret}`);
const given = Buffer.from(header);
if (given.length !== expected.length) return false;
return timingSafeEqual(given, expected);
```
Use the same length check before `timingSafeEqual` in `unsubscribeToken.ts`. `POST` with `List-Unsubscribe=One-Click` records via an RPC (`sv_record_unsubscribe`); `GET` must not write.

---

### `src/lib/server/mail/marketingEmail.ts`, `reviewRequestEmail.ts`, `documentReminderEmail.ts` (utility, transform)

**Analog:** `src/lib/server/mail/paymentEmails.ts`.

**Imports** (lines 3-7):
```typescript
import 'server-only';
import { formatEuros } from '@/lib/documents/money';
import { formatDateFr } from '@/lib/admin/format';
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';
import { buildAdminProjectUrl, buildPortalPaymentsUrl } from './urls';
export type BuiltBody = { subject: string; html: string; text: string };
```
`layout()` (lines 13-84) is not exported: build each new email either by exporting it or by extracting it, then extend with the footer. Every email returns `{ subject, html, text }` with both an HTML and a plain-text body and a single button, French copy, dark theme colours.

**Stage-aware copy** (lines 152-176), the model for document and review reminders:
```typescript
export function paymentReminderEmail(p: { invoiceNumber: string; amountCents: number; projectTitle: string; stage: ReminderStage }): BuiltBody {
  const subject = p.stage === 'd7' ? `Dernier rappel : ...` : `Rappel : ...`;
  const paragraphs = [`Bonjour, ...`];
  if (p.stage === 'd7') paragraphs.push('...');
  return layout({ subject, heading: subject, paragraphs, button: "...", url: buildPortalPaymentsUrl(), extraAfterButton: 'Si vous avez déjà payé, ignorez ce message.' });
}
```
Admin variant (lines 178-196) links to `buildAdminProjectUrl(projectId)`. For document reminders link to `buildPortalDocumentsUrl()` (`urls.ts`). New URL builders (`buildUnsubscribeUrl`, `buildUnsubscribePageUrl`) go in `urls.ts` using `getSiteUrl()` (line 2-3 pattern).

**Sender:** `src/lib/server/mail/fromHeader.ts` `buildFromHeader(displayName, address)` validates and returns `"Name" <addr>`. `MARKETING_EMAIL_FROM = buildFromHeader('Sèvalys', '<address>@sevalys.com')`. Address is an ASSUMPTION (A2); confirm with user. Existing `INVITE_EMAIL_FROM`/`INVITE_EMAIL_REPLY_TO` live in `inviteEmail.ts`.

**Tests:** model on `paymentEmails.test.ts` (5.1K) and `documentIssuedEmail.test.ts`.

---

### `src/lib/server/mail/suppression.ts` (service, read)

**Analog:** `autoIssue.ts` lines 101-110 (`createSupabaseAdminClient()` reads with `.error` handling, `'server-only'`). Fail-safe note: if the suppression read errors, decide explicitly (fail-closed for marketing, and fail-open vs retry for transactional). Return a short code, no address in logs. Normalize with `trim().toLowerCase()`, same as `norm` in `rules.ts`.

---

### Tests

**`outbox.test.ts` (extend)**, pattern at lines 1-75: `vi.hoisted` state and mocks, a chainable Supabase `builder()` mock, `vi.mock('@/lib/supabase/admin', ...)`, `vi.mock('@/lib/server/rpc', ...)`, `vi.mock('resend', ...)` capturing `emails.send` calls (so you can assert "no Resend call when skipped"), `vi.mock('@/lib/supabase/env', () => ({ getSiteUrl: () => 'https://sevalys.com' }))`. The mock `update()` records patches in `mocks.updates`, so assert a patch `{ status: 'skipped', last_error: 'suppressed' }`. A suppression lookup mock must be added to `builder()` or `vi.mock('./suppression')`.

**`paymentsMailParity.test.ts` (extend)**: it reads migration SQL, strips comments, regex-matches `sv_mail_outbox_event_type_check check (event_type in (...))` (lines 15-20) and compares to `MAIL_EVENTS`. Currently reads `invoices` migration (line 12). Point the lists test at the new migration (`read('2026100800000x_sv_mail_automation.sql')`), because the NEW constraint is the latest definition. `templates(sql, prefix)` (lines 23-35) normalizes SQL key expressions for comparison with TS `dedupeKey` samples; add `mail_suppression_admin` there.

**`src/lib/server/resend/webhook.test.ts`**: model on `src/lib/server/stripe/webhook.test.ts` (5.3K, not read).

**RLS `tests/rls/mailautomation.rls.test.ts`:** model on `tests/rls/payments.rls.test.ts`. Imports (lines 1-27) from `./helpers`: `anonClient, cleanup, dbQuery, makeAdmin, makeClient, makeGeckoAdmin, makeUser, addMember, svc`. Cast set: client A, client B, anonymous, plain user, Gecko admin, admin. Use `svc()` for service-role reads (line 47-55 shows the query helper style). Reuse the permanent test client (`setClientTest`), never delete it.

---

### `src/lib/privateRoutes.ts` (config, modify)

**Analog:** itself (lines 5-8):
```typescript
export const PRIVATE_PREFIXES = ['/espace-client', '/admin', '/connexion', '/auth'] as const;
export const PROTECTED_PREFIXES = ['/espace-client', '/admin'] as const;
```
Add `'/desinscription'` to `PRIVATE_PREFIXES` only. The proxy matcher is a static literal that MUST mirror it: add `'/desinscription'` (and `'/desinscription/:path*'` if needed) to `config.matcher` in `src/proxy.ts` lines 129-144, otherwise `src/proxy.test.ts` fails. Do not add it to `PROTECTED_PREFIXES` (the page must work without a session). Check what `proxy.ts` does for non-protected private paths (not read in full; planner should read lines 1-120 before editing).

---

## Shared Patterns

### No address or identifier in logs or `last_error`
**Source:** `src/lib/server/mail/outbox.ts` lines 1-3, 233-235, 254-258; `src/app/api/stripe/webhook/route.ts` line 10 comment.
**Apply to:** all new server modules, webhook, unsubscribe route, sweep.
```typescript
console.error('[mail/outbox] enqueue failed');
console.error(`[mail/outbox] ${row.template} ${code}`);  // code = short fixed string
```

### `service_role` confined to server-only modules
**Source:** `import 'server-only';` first line of `rules.ts`, `outbox.ts`, `autoIssue.ts`, `stripe/webhook.ts`; `createSupabaseAdminClient` from `@/lib/supabase/admin`; RPC helper `callRpc(label, fnName, args)` from `@/lib/server/rpc` returning `{ ok, data }`.
**Apply to:** every new file under `src/lib/server`.

### Idempotent insert
**Source:** `outbox.ts` lines 229-232 (`upsert(row, { onConflict: 'dedupe_key', ignoreDuplicates: true })`) and SQL `on conflict (dedupe_key) do nothing` (payments.sql 614-ish, invoices.sql 624-ish).
**Apply to:** sweep enqueues, SQL alerts, `sv_resend_events` insert (`on conflict (event_id) do nothing`).

### SQL security-definer RPC + grants
**Source:** `20261007010000_sv_payments.sql` lines 384-404, 651-652.
**Apply to:** `sv_apply_resend_event`, `sv_record_unsubscribe`, `sv_lift_suppression`, `sv_set_reminder_hold`. `set search_path = ''`, fully qualify (`public.`, `sv_private.`), `revoke all ... from public, anon, authenticated`, `grant execute ... to service_role`.

### Append-only journals
**Source:** payments.sql 193-200, `sv_private.deny_mutation()`.
**Apply to:** suppressions, lifts, holds, Resend events.

### Fail-closed secrets
**Source:** `src/app/api/cron/mail/route.ts` lines 11-18 (`if (!secret || !header) return false;`).
**Apply to:** Resend webhook (`RESEND_WEBHOOK_SECRET`), unsubscribe token (`UNSUBSCRIBE_SECRET`, >=32 bytes). Add both plus `REVIEW_REQUESTS_ENABLED` to `.env.example`.

### Email normalization
**Source:** `rules.ts` line 56 `const norm = (e) => e.toLowerCase()`; `outbox.ts` line 220 `recipient_email: input.recipientEmail.toLowerCase()`; SQL `lower(m.invited_email)`.
**Apply to:** suppression lookup and write (also `trim`), token build and verify.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/desinscription/page.tsx` | SSR public page | request-response | No public, session-less, noindex confirmation page exists besides `/connexion` and `/auth`. Planner should model layout and noindex on an existing `/connexion` page (not read here) and metadata on how `PRIVATE_PREFIXES` consumers set `noindex` (`next.config` headers, `robots.ts`). Add `Referrer-Policy: no-referrer`. |
| Admin suppression view, lift form, hold toggle | admin UI and server actions | CRUD | Not inspected; planner should locate the existing admin project page (`/admin/projets/[id]`, see `buildAdminProjectUrl`) and an existing admin server action using `requireAdmin()` and copy its structure. |
| `src/lib/server/mail/unsubscribeToken.ts` | utility | transform | No existing HMAC token signer was read; `src/lib/server/signature/codes.ts` is cited by RESEARCH as having `createHmac` usage and is the closest analog to check before writing. |

## Metadata

**Analog search scope:** `src/lib/server/mail`, `src/lib/server/invoices`, `src/lib/server/stripe`, `src/app/api/{cron,stripe}`, `src/lib/documents`, `src/lib/privateRoutes.ts`, `src/proxy.ts`, `supabase/migrations/20261004..20261007010000`, `tests/rls`.
**Files scanned:** ~20 read (several partially); not read: `signature/codes.ts`, admin UI files, `stripe/webhook.test.ts`, `mailoutbox.rls.test.ts`, `proxy.ts` lines 1-120.
**Pattern extraction date:** 2026-10-06
