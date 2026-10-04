# Phase 14: Electronic signature - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 34 (new or modified)
**Analogs found:** 31 / 34 (3 partial or none, see end)

Sources: 14-CONTEXT.md, 14-RESEARCH.md, 14-UI-SPEC.md. Every analog below was read in this pass; line numbers refer to the current tree.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/20261006000000_sv_signature.sql` | migration | CRUD + append-only | `supabase/migrations/20261005000000_sv_documents.sql` | exact |
| (same migration) `sv_private.append_signature_event` + chain triggers | SQL function / trigger | event-driven (append-only) | `sv_private.deny_mutation` in `20261003000000_sv_leads_core.sql` (147-170) + `sv_issue_document` | role-match |
| (same migration) RPC `sv_request_signature_code`, `sv_verify_signature_code`, `sv_seal_document`, `sv_submit_acceptance`, `sv_export_signature_chain`, `sv_verify_signature_chain` | RPC (security definer) | request-response | `public.sv_issue_document` (138-237), `public.sv_post_project_fact` in `20261004000000_sv_projects_engine.sql` (477-566) | exact |
| (same migration) outbox constraints extension (`document_signed`, `document_signed_admin`, `acceptance_refused`) | migration | config | `sv_documents.sql` 102-123 | exact |
| (same migration) `create or replace sv_issue_document` with signed guard | RPC | request-response | `sv_documents.sql` 138-237 (same function) | exact |
| `src/lib/signature/canonical.ts` | utility (pure) | transform | `src/lib/documents/status.ts`, `src/lib/documents/steps.ts` (pure, no server-only) | role-match |
| `src/lib/signature/verifyChain.ts` + `.test.ts` | utility (pure) | transform | `src/lib/documents/status.ts` + `src/lib/leads/ipHash.ts` (HMAC style) | role-match |
| `src/lib/signature/consentText.ts` | config (versioned constant) | static | `CURRENT_TEMPLATE_VERSION` in `src/lib/documents/types.ts` (36-42) | role-match |
| `src/lib/signature/events.ts` | utility (closed list) | static | `MAIL_EVENTS` in `src/lib/server/mail/rules.ts` (4-11) | role-match |
| `src/lib/signature/certificate.ts` | utility (pure data model) | transform | `src/lib/documents/snapshot.ts` | role-match |
| `src/lib/server/signature/codes.ts` (+ test) | service (server-only) | request-response | `src/lib/leads/ipHash.ts` (HMAC) + `src/lib/server/mail/outbox.ts` deliver() (Resend) | role-match |
| `src/lib/server/signature/chain.ts` | service (RPC wrappers) | request-response | `src/lib/server/rpc.ts` + `src/lib/server/projects/facts.ts` | exact |
| `src/lib/server/signature/seal.ts` (+ test) | service | file-I/O + request-response | `src/lib/server/documents/issue.ts` | exact |
| `src/lib/server/signature/sealDownload.ts` | service | file-I/O | `src/lib/server/documents/download.ts` | exact |
| `src/lib/server/signature/clientIp.ts` | utility | transform | `getClientIp` in `src/lib/leads/ipHash.ts` (14-19) | exact |
| `src/lib/server/mail/signatureCodeEmail.ts` | utility (template) | transform | `src/lib/server/mail/loginCodeEmail.ts` | exact |
| `src/lib/server/mail/documentSignedEmail.ts` (+ admin variants) | utility (template) | transform | `src/lib/server/mail/documentIssuedEmail.ts` | exact |
| `src/lib/server/mail/rules.ts` (modify) | config | static | itself | exact |
| `src/lib/server/mail/outbox.ts` (modify `buildMail` switch) | service | event-driven | itself (56-92) | exact |
| `src/lib/server/mail/urls.ts` (modify) | utility | transform | itself | exact |
| `src/lib/documents/pdf/templates/contract/v2/*` (clause convention de preuve) + `types.ts`, `registry.ts` (modify) | component (PDF template) | transform | `src/lib/documents/pdf/templates/contract/v1/`, `registry.ts` 15-45 | exact |
| `src/lib/projects/copy.ts` (`PROJECT_COPY.signature`) | config (copy) | static | `PROJECT_COPY.documents` (copy.ts 140+) | exact |
| `src/app/espace-client/documents/[id]/signer/page.tsx` | route (RSC) | request-response | `src/app/espace-client/documents/page.tsx` | role-match |
| `src/app/espace-client/documents/[id]/signer/actions.ts` | server actions | request-response | `src/app/espace-client/actions.ts` (`documentDownloadAction` 236-247, `setConsentAction` 163-189) | exact |
| `src/app/espace-client/documents/[id]/apercu/route.ts` (fallback, only if spike fails) | route handler | streaming | none exact; `documents/download.ts` for the bytes | partial |
| `src/components/portal/project/SigningFlow.tsx`, `AcceptanceChecklist.tsx` | component (client) | request-response | `src/components/portal/project/DocumentsList.tsx` (useTransition + action) | role-match |
| `src/components/portal/project/DocumentsList.tsx` (modify: "Lire et signer", sealed download) | component | request-response | itself | exact |
| `src/app/espace-client/documents/page.tsx` (modify: pass signed info) | route (RSC) | request-response | itself | exact |
| `src/components/portal/project/project.css` (`pt-sign-*`) | config (css) | static | itself | exact |
| `src/app/admin/projets/actions.ts` (add export / integrity / sealed download actions) | server actions | request-response | itself 290-313 | exact |
| `src/components/admin/projects/documents/IssuedDocumentsList.tsx` + `SnapshotPanel.tsx` + `types.ts` (modify) | component | request-response | itself | exact |
| `src/lib/documents/steps.ts` / `status.ts` (signed guard stays; facts-driven) | utility | transform | itself (`SIGNING_FACT` 24-28) | exact |
| `tests/rls/signature.rls.test.ts` | test (RLS) | request-response | `tests/rls/documents.rls.test.ts` + `tests/rls/helpers.ts` | exact |
| `.env.example` (`SV_SIGNATURE_CODE_SECRET`) | config | static | `SV_IP_HASH_SECRET` line 57 | exact |

## Pattern Assignments

### `supabase/migrations/20261006000000_sv_signature.sql` (migration, append-only CRUD)

**Analog:** `supabase/migrations/20261005000000_sv_documents.sql`

**Table + grants + RLS + triggers** (lines 25-67). Copy this block per append-only table (`sv_signature_events`, `sv_document_signatures`, `sv_document_seals`, `sv_acceptance_responses`):
```sql
create table if not exists public.sv_project_documents ( ... );
alter table public.sv_project_documents enable row level security;
revoke all on public.sv_project_documents from anon, authenticated, service_role;
grant select (id, project_id, ...) on public.sv_project_documents to authenticated;
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
Deviation required for `sv_signature_events`: grant **select only** to `service_role` (no insert), insertion only via `sv_private.append_signature_event` (RESEARCH Pattern 1). Chain tables have no FK to `auth.users`; FKs out of them are `on delete restrict` (header comment 18-19). Policy for events/signatures: admin OR document belongs to a project in `sv_private.project_ids()` (join through `sv_project_documents.project_id`), because events have `document_id`, not `project_id`.

**Admin-only read variant** (84-86) for tables with PII not meant for clients (`sv_signature_codes` should have no client select at all):
```sql
create policy sv_document_snapshots_admin_read on public.sv_document_snapshots
  for select to authenticated using ((select sv_private.is_admin()));
```

**Outbox closed-list extension** (lines 102-123), reuse verbatim, only change the lists. Never trust constraint names:
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
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_event_type_check
    check (event_type in ('client_invited','step_changed','onboarding_completed','document_issued', /* + new */ ));
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_template_check
    check (template in ('invite','step_changed','onboarding_completed','document_issued', /* + new */ ));
end; $$;
```

**RPC skeleton** (lines 138-173 and 236-237): `security definer`, `set search_path = ''`, lock project first, raise `sv_*` codes with `errcode = 'P0001'`, then revoke/grant:
```sql
create or replace function public.sv_issue_document(...) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  select p.title, p.client_id into v_title, v_client_id
  from public.sv_projects p where p.id = p_project_id for update;
  if not found then raise exception 'sv_project_not_found' using errcode = 'P0001'; end if;
  ...
end; $$;
revoke all on function public.sv_issue_document(uuid, ...) from public, anon, authenticated;
grant execute on function public.sv_issue_document(uuid, ...) to service_role;
```
Lock order is mandatory: project `for update` then `pg_advisory_xact_lock(hashtext('sv_sig_chain'), hashtext(doc))` (RESEARCH Pattern 2).

**Outbox insert inside the RPC** (212-231), reuse for `document_signed` (client, one row per member) and admin rows; `on conflict (dedupe_key) do nothing returning id`, collect `outbox_ids` into the returned jsonb so the app can call `sendOutboxRow`:
```sql
insert into public.sv_mail_outbox (event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id)
values ('document_issued','document_issued', v_email,'client','document_issued:' || p_id::text || ':' || v_email,
        jsonb_build_object('documentLabel', p_document_label, 'projectTitle', v_title, 'revision', p_revision), v_client_id, p_project_id)
on conflict (dedupe_key) do nothing returning id into v_outbox_id;
```

**Fact posting inside `sv_seal_document`:** call `public.sv_post_project_fact(p_project_id, p_type, 'client', p_actor_id, null, p_reason)` (signature in `20261004000000_sv_projects_engine.sql` 477-484, returns `jsonb {fact_id, changed}`; it locks `sv_projects` itself, idempotent). Valid types list at 502-506 already includes `quote_accepted`, `contract_signed`, `acceptance_signed`; no change needed there.

**Signed guard for D-17:** `create or replace function public.sv_issue_document` with identical 14-arg signature (lines 138-153) plus, after the project lock, `if p_replaces is not null and exists (select 1 from public.sv_document_signatures where document_id = p_replaces) then raise exception 'sv_document_signed' using errcode='P0001'; end if;`. Map the new code in `issue.ts` switch (below).

**Hash chain function:** body in RESEARCH Pattern 1 (lines 194-221). Factor the hash expression into `sv_private.signature_link_hash(...)` shared with `sv_verify_signature_chain`. Use `sha256()` native, no pgcrypto.

---

### `src/lib/server/signature/seal.ts` (service, file-I/O + request-response)

**Analog:** `src/lib/server/documents/issue.ts`

**Imports + header** (lines 1-10):
```typescript
// PRECONDITION : ... Écrit en service_role.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';
import { SV_DOCUMENTS_BUCKET } from './download'; // here: '@/lib/server/documents/download'
```

**Result-type + best-effort helpers** (14-57): discriminated union `{ ok: true ... } | { ok: false; code: ... }`, `aggregateMail` (reuse by import, it is exported), `sendOutbox(ids)` swallowing errors, `removeOrphan(admin, path)` that never throws.

**Core pattern: upload `upsert:false` -> RPC -> orphan cleanup** (73-137):
```typescript
const up = await admin.storage.from(SV_DOCUMENTS_BUCKET).upload(path, rendered.buffer, {
  contentType: 'application/pdf', upsert: false, cacheControl: '31536000',
});
if (up.error) { /* idempotent check, else */ return { ok: false, code: 'upload_failed' }; }
orphanPath = path;
const rpc = await callRpc<{ outbox_ids?: string[] | null }>('documents/issue', 'sv_issue_document', { ... });
if (!rpc.ok) {
  if (rpc.code !== 'sv_document_already_issued') { await removeOrphan(admin, orphanPath); orphanPath = null; }
  switch (rpc.code) { case 'sv_document_already_issued': orphanPath = null; return { ok: true, outcome: 'already_issued', ... }; ... }
}
orphanPath = null; // ligne créée : l'objet est référencé.
const mail = await sendOutbox(ids);   // un échec d'envoi n'annule jamais l'opération
```
Adaptations for seal: path is `${projectId}/sealed/${crypto.randomUUID()}.pdf` (non guessable, D-09); input bytes come from `admin.storage.from(bucket).download(storagePath)` and are re-hashed with `createHash('sha256')` and compared to `sv_project_documents.sha256` before sealing (same download+hash code as `verifyDocumentHash`, download.ts 53-60); map `sv_already_sealed` to idempotent success (mirrors `sv_document_already_issued`); check size < 10 485 760 before upload (bucket limit, migration 130-132). pdf-lib part: RESEARCH Pattern 4 (`PDFDocument.load(bytes, { updateMetadata:false })`, `registerFontkit`, deterministic dates, `save({useObjectStreams:false})`).

**Tests:** colocated `seal.test.ts`, mock pattern per `src/lib/server/documents/issue.test.ts`.

---

### `src/lib/server/signature/sealDownload.ts` (service, file-I/O)

**Analog:** `src/lib/server/documents/download.ts` (whole file, 66 lines)

**Pattern to copy** (RLS check first, path resolved in service_role, short signed URL, hash verification):
```typescript
import 'server-only';
import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SIGNED_DOWNLOAD_SECONDS } from '@/lib/projects/fileRules';

const row = await rls.from('sv_project_documents').select('id, filename').eq('id', documentId).maybeSingle();
if (row.error || !row.data) return { ok: false, code: 'not_found' };
const signed = await createSupabaseAdminClient().storage.from(SV_DOCUMENTS_BUCKET)
  .createSignedUrl(path, SIGNED_DOWNLOAD_SECONDS, { download: String(row.data.filename) });
...
const hex = createHash('sha256').update(bytes).digest('hex');
return { ok: true, match: hex === String(row.data.sha256) };
```
Adaptation: RLS select on `sv_document_seals` (client read policy), resolve `storage_path` and `sha256` from that table, verify hash before issuing URL (D-09), log `seal_downloaded` via RPC before returning the URL. Iframe preview link for the original: reuse `createDocumentDownloadUrl` but without the `download:` option and with a ~5 min TTL (UI-SPEC open item 4), still server-only.

---

### `src/lib/server/signature/chain.ts` (service, RPC wrappers)

**Analog:** `src/lib/server/rpc.ts` (whole file) used the way `facts.ts` does.

```typescript
import 'server-only';
import { callRpc } from '@/lib/server/rpc';
// callRpc returns { ok:true, data } | { ok:false, code } where code is the sv_* prefix of error.message
```
Rules from `callRpc` (rpc.ts 8-29): logs only `[scope] fn code`, never PII. Because RESEARCH Pitfall 1 requires verification failures to be **returned** (not raised), the verify RPC returns `{ ok:false, reason, remaining }` in `data`, and `callRpc` ok:true wraps it; `chain.ts` must unwrap both layers.

---

### `src/lib/server/signature/codes.ts` (service, request-response)

**Analogs:** `src/lib/leads/ipHash.ts` (HMAC with env secret) and `outbox.ts` deliver() (Resend).

**HMAC + missing-secret handling** (ipHash.ts 1-33):
```typescript
import 'server-only';
import { createHmac } from 'node:crypto';
let warned = false;
export function hashIp(ip: string | null): string | null {
  const secret = process.env.SV_IP_HASH_SECRET;
  if (!secret) { if (!warned) { warned = true; console.error('[leads/ipHash] secret missing'); } return null; }
  return createHmac('sha256', secret).update(ip).digest('hex');
}
```
For the signature code, a missing `SV_SIGNATURE_CODE_SECRET` must **fail closed** (return error, no send), not return null silently.

**Direct Resend send with idempotency key** (outbox.ts 142-174):
```typescript
if (!process.env.RESEND_API_KEY) return fail('no_api_key');
const resend = new Resend(process.env.RESEND_API_KEY);
const result = await resend.emails.send(
  { from: mail.from, to: row.recipient_email, replyTo: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text },
  { idempotencyKey: row.dedupe_key },
);
if (result.error) return fail('resend_error');
```
Use `idempotencyKey = codeId`. Do NOT go through `enqueueMail` (payload stored in clear in `sv_mail_outbox`; RESEARCH Pattern 3). Note UI-SPEC open item 5 says "send through existing mail engine with non-deduplicated key"; RESEARCH overrides this for security, planner must reconcile (recommend RESEARCH).

---

### `src/lib/server/signature/clientIp.ts` (utility)

**Analog:** `src/lib/leads/ipHash.ts` lines 14-19; extend with `net.isIP` validation (RESEARCH Pitfall 12):
```typescript
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return null;
  const first = xff.split(',')[0]?.trim();
  return first || null;
}
```
Import `getClientIp` rather than copy if possible; wrap with `isIP(first) ? first : null`. In a server action get headers via `next/headers` `headers()`.

---

### `src/lib/server/mail/signatureCodeEmail.ts` (template)

**Analog:** `src/lib/server/mail/loginCodeEmail.ts`

Copy: `escapeHtml` (20-27, import from here rather than redefine), `LOGIN_EMAIL_FROM` style via `buildFromHeader` (4-7), `splitCode`, dark table layout (60-85), `{subject, html, text}` return (35-102). Code is rendered monospace; no link; footer security line "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail" (45). Expiry line pattern: `Ce code est valable ${expiryMinutes} minutes.` Add a unit test mirroring `loginCodeEmail.test.ts`.

### `src/lib/server/mail/documentSignedEmail.ts` (client confirmation + admin alerts)

**Analog:** `src/lib/server/mail/documentIssuedEmail.ts` (whole file, 78 lines)

Signature `buildDocumentIssuedEmail({documentLabel, projectTitle, revision, portalUrl}): {subject, html, text}`; imports `INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml` from `./inviteEmail` (line 2); CTA button table (44-50) with `Ouvrir mon espace client`; text fallback (62-74). No amounts, no signed link, no attachment. Admin variants use `buildAdminProjectUrl` and button "Ouvrir la fiche projet".

---

### `src/lib/server/mail/rules.ts`, `outbox.ts`, `urls.ts` (modify)

**Analog:** themselves.

rules.ts: extend the three places in lock step (lines 4-19) and add a `dedupeKey` helper (27-42 style, `clamp(...)`, `norm(email)`):
```typescript
export const MAIL_EVENTS = ['client_invited','step_changed','onboarding_completed','document_issued', /* 'document_signed','document_signed_admin','acceptance_refused' */] as const;
export type MailTemplate = 'invite' | 'step_changed' | 'onboarding_completed' | 'document_issued' /* | ... */;
export const MAIL_RULES: Record<MailEvent, Rule> = { ..., document_issued: { template: 'document_issued', delayMs: 0, to: 'client' } };
```
Admin rows use `to: 'admin'` and `ADMIN_NOTIFY_EMAIL` (rules.ts 21), exactly like `onboarding_completed`.

outbox.ts: add imports (11-17) and `case` branches in the `buildMail` switch (59-90) following `case 'document_issued'` (80-87) with `str(p.x)` payload readers. Update `rules.test.ts` and `outbox.test.ts` closed-list assertions (RESEARCH Pitfall 8). Mirror every new template string in the SQL check constraint.

---

### `src/app/espace-client/documents/[id]/signer/actions.ts` (server actions)

**Analog:** `src/app/espace-client/actions.ts`

**Imports + header** (1-14): `'use server'`, `requireClient` from `@/lib/server/auth/dal`, `PROJECT_COPY`, result types from `@/components/portal/project/types`.

**Auth + UUID guard + RLS-first pattern** (236-247):
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function documentDownloadAction(documentId: string): Promise<DownloadResult> {
  const failure = { ok: false as const, message: PROJECT_COPY.documents.portal.downloadFailed };
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return failure;
  if (typeof documentId !== 'string' || !UUID_RE.test(documentId)) return failure;
  const res = await createDocumentDownloadUrl(ctx.supabase, documentId);
  if (!res.ok) return failure;
  return { ok: true, url: res.url };
}
```
**Form-state action** (163-189) for consents: `_prev: PortalActionState, formData: FormData`, `errState(...)`, `actorId: ctx.user.id` (never read the actor from the form), `revalidatePath`. French messages come from `PROJECT_COPY` (key lookup helper `copyForError`, 57-61). `parisTime` / `parisDate` helpers (40-55) give Europe/Paris formatting.

Rules: e-mail target of the code = `ctx.user.email` (session), never a form field (D-04, RESEARCH V3). IP via `clientIp.ts`. Validate inputs with zod (pattern: `schemas.ts` in `src/lib/documents`).

### `src/app/espace-client/documents/[id]/signer/page.tsx` (RSC)

**Analog:** `src/app/espace-client/documents/page.tsx`

Copy shell + guard (1-30, 58-61, 80-82):
```typescript
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Documents' };
const ctx = await requireClient();
if (ctx.status === 'no_access') { return (<ShellMain width="client"><NoAccess action={<SignOutButton />} /></ShellMain>); }
...
<ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
<ShellMain width="client"> ... </ShellMain>
<ShellFooter />
```
Data: RLS-only reads (`ctx.supabase`), `loadDocumentsForProjects` + `loadProjectBundle` + `withStatuses` (documents/page.tsx 34-55) to derive status from facts and detect "replaced by newer version". Dynamic route params pattern: check an existing `[id]` page, `src/app/admin/projets/[id]/page.tsx` (Next 16: params is a Promise).

---

### `src/components/portal/project/SigningFlow.tsx`, `AcceptanceChecklist.tsx` (client components)

**Analog:** `src/components/portal/project/DocumentsList.tsx`

Pattern (lines 1-47): `'use client'`, action passed as a prop (`getDownloadUrl: (id) => Promise<DownloadResult>`), `useTransition`, local error state in `aria-live="polite"` `<p className="pt-error">`, copy from `PROJECT_COPY...`, lucide icons 14/16 px `aria-hidden`:
```typescript
const [, startTransition] = useTransition();
startTransition(async () => {
  try { const res = await getDownloadUrl(id); if (res.ok) window.location.assign(res.url); else setError(copy.downloadFailed); }
  catch { setError(copy.downloadFailed); } finally { setDownloadingId(null); }
});
```
The signed URL is never rendered into the DOM except as the iframe `src` generated for step 1 (UI-SPEC A1); regenerate on "Réessayer".

### `src/components/portal/project/DocumentsList.tsx` (modify)

Add to `DocumentListItem` (lines 12-21) `signedAt?`, and for `to_sign` rows render a link `Lire et signer` (`PenLine`) beside the existing download button (88-97 `pt-btn-text pt-file-action`). For `signed` rows the download action must target the sealed object (new action using `sealDownload.ts`). Existing `d.status === 'signed'` already renders the `Check` icon (line 79). Update `documentsPage.test.ts`/`portalPage.test.ts` deliberately (UI-SPEC open item 2).

---

### Admin: `src/app/admin/projets/actions.ts` (modify) + `IssuedDocumentsList.tsx` / `SnapshotPanel.tsx` / `types.ts`

**Analog:** `src/app/admin/projets/actions.ts` lines 290-313

```typescript
export async function verifyDocumentHashAction(documentId: string): Promise<VerifyResult> {
  const { supabase } = await requireAdmin();
  if (typeof documentId !== 'string' || !uuidRe.test(documentId)) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const res = await verifyDocumentHash(supabase, documentId);
  return res.ok ? { ok: true, match: res.match } : { ok: false, message: PROJECT_COPY.errors.generic };
}
```
New `exportSignatureTrailAction`, `verifySignatureChainAction`, `adminSealedDownloadAction` follow it: `requireAdmin()` first, `uuidRe` guard, then service_role module. The export action returns a JSON string/object for client-side Blob download (file `piste-audit-{reference}.json`).

Replace guard: `checkMessage` (actions.ts 218-234) already maps `signed_no_replace` to `DOC_COPY.signedNoReplace`; `steps.ts:78` already returns `signed_no_replace` from the facts-based check. Phase 14 updates the copy sentence (`copy.ts:197`) per UI-SPEC and adds a new case for the DB code `sv_document_signed` in `issue.ts` (118-129 switch).

UI: `IssuedDocumentsList.tsx` structure (lines 1-60): `useTransition` + `actions` prop typed `Pick<DocumentActions, 'download'|'verify'|'loadSnapshot'>`; add `exportTrail`, `verifyChain`, `downloadSealed` to `DocumentActions` in `types.ts`. The hash-copy and `fullHashId` toggling already exist (line 18) and can be reused for the three SHA-256 values.

---

### `src/lib/signature/*` pure modules

**Analogs:** `src/lib/documents/status.ts` / `steps.ts` (pure, "sûr côté client", no `server-only`, tests colocated).

Header comment convention: `// Module pur, sûr côté client. ...` (status.ts line 1). `verifyChain.ts` must import only `node:crypto` (offline verifier, RESEARCH Code Examples) and must use the same separator `\u001f` and field order as `sv_private.signature_link_hash`. Golden vector from the Supabase branch frozen into `verifyChain.test.ts`.

`consentText.ts` pattern: versioned constant, like `CURRENT_TEMPLATE_VERSION` (types.ts 36-42), and `TemplateVersion = \`v${number}\``. DB `template_version` check is `~ '^v[0-9]+$'` (documents migration line 30).

### Contract v2 template

**Analog:** `src/lib/documents/pdf/templates/contract/v1/` and registry.ts 15-45:
```typescript
contract: { v1: ContractV1 },
...
const template = byVersion?.[snapshot.templateVersion];
if (!template) throw new Error("unknown_template");
```
Add `v2` next to `v1` (never edit v1; issued contracts stay v1), bump `CURRENT_TEMPLATE_VERSION.contract = 'v2'` (types.ts 39), extend `docTypesSql.test.ts`/registry tests, fixtures (`fixtures.ts` has `templateVersion: "v1"` at 81-209).

### Certificate page (pdf-lib, Surface E)

**Analog (fonts/palette only):** `src/lib/documents/pdf/setup.ts` (Manrope 400/700 from `fontData.ts`, `MANROPE_400`, `MANROPE_700` data URIs) and `src/lib/server/documents/render.ts` (hash the final buffer, `createHash('sha256')`, return `{buffer, sha256, size}`). No pdf-lib usage exists yet: see "No analog".

---

### `tests/rls/signature.rls.test.ts`

**Analog:** `tests/rls/documents.rls.test.ts` + `tests/rls/helpers.ts`

Setup (documents.rls.test.ts 1-85): `describe`/`beforeAll` building `clientA`, `clientB`, `projectA/B`, `memberA`, `memberB`, `plain`, `gecko`, `admin` via `makeClient`, `makeProject`, `makeUser`, `addMember`, `makeGeckoAdmin`, `makeAdmin`; `issueTestDocument(projectId, opts)` uploads `MINIMAL_PDF` and calls `sv_issue_document` (helpers.ts 226-256); `afterAll` removes uploaded objects then `cleanup()`. Raw RPC style: `svc().rpc('sv_issue_document', {...})` (documents.rls.test.ts 47-65). Test names should carry the `-t` tags from RESEARCH (`otp`, `concurrency`, `consent`, `append-only`, `tamper`, `chain`, `isolation`, `seal-atomic`, `frozen`, `acceptance`). Config `vitest.rls.config.ts`: `include: ['tests/rls/**/*.rls.test.ts']`, `fileParallelism:false`, env prefix `SV_TEST_`. Tamper test needs a direct DB connection (`SV_TEST_DB_URL`): see `execFileSync` import in documents.rls.test.ts line 1 for how existing tests reach psql. Add a helper in `helpers.ts` (e.g. `issueAndSignTestDocument`) next to `issueTestDocument`. Always the branch, never prod.

## Shared Patterns

### Server-only boundary and service_role
**Source:** `src/lib/server/rpc.ts`, `src/lib/server/documents/issue.ts` line 3
**Apply to:** everything under `src/lib/server/signature/`
`import 'server-only';` first line; service_role only via `createSupabaseAdminClient()` / `callRpc`; precondition comment "l'appelant a exécuté requireAdmin() ou requireClient()" (download.ts line 1, issue.ts line 1).

### Authentication in actions/pages
**Source:** `src/lib/server/auth/dal.ts` (`requireClient` 92-120, `requireAdmin` 70-79)
**Apply to:** all signer actions/pages (`requireClient`), all admin actions (`requireAdmin`)
```typescript
const ctx = await requireClient();
if (ctx.status !== 'ok') return failure;   // no_access
```
Role always from tables (dal.ts comment 10-11), never metadata. `ctx.user.id` is the only source of `actor_id`; `ctx.user.email` the only code destination.

### RLS-first authorization, then service_role path resolution
**Source:** `src/lib/server/documents/download.ts` 21-42
**Apply to:** preview link, sealed download, any read of a document by id

### Append-only / immutability
**Source:** `sv_private.deny_mutation()` (`20261003000000_sv_leads_core.sql` 147-157) and trigger pairs (documents migration 59-67)
**Apply to:** `sv_signature_events`, `sv_document_signatures`, `sv_document_seals`, `sv_acceptance_responses`. `sv_signature_codes` is the one mutable table (attempt counter); keep it out of client grants entirely.

### Error handling and logging
**Source:** `rpc.ts` 8-29, `issue.ts` 138-142
`try/catch` with short fixed log lines, e.g. `console.error('[documents/issue] failed')`; codes only, never e-mail, code, IP or hashes of secrets in logs. SQL errors are `sv_*` codes mapped by `switch (rpc.code)` into app result codes.

### Mail through the outbox
**Source:** `outbox.ts` `enqueueAndSend` (200-213) and RPC-side inserts (documents migration 212-231)
**Apply to:** `document_signed`, `document_signed_admin`, `acceptance_refused`. Post-commit `sendOutboxRow(id)` best-effort, failure never undoes the signature (issue.ts 135-137). Not for the OTP.

### French copy, dates
**Source:** `PROJECT_COPY` in `src/lib/projects/copy.ts`, `formatDateFr` (`@/lib/admin/format`), `parisDate`/`parisTime` (espace-client/actions.ts 40-55)
All strings in `PROJECT_COPY.signature` and `consentText.ts`, none in JSX (UI-SPEC copywriting section). Europe/Paris and fr-FR, U+202F banned in PDF text.

### Document status from facts
**Source:** `src/lib/documents/status.ts` 8-25, `steps.ts` `SIGNING_FACT` 24-28
The "Signé" badge continues to come from facts; the signature creates the fact through `sv_post_project_fact`. Seal existence is additional information (sealed download vs original), never a second source of truth for status.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Certificate generation with `pdf-lib` (inside `seal.ts`, plus a `certificatePage.ts` layout helper) | utility | transform | `pdf-lib` is not installed; existing PDFs use `@react-pdf/renderer` (`render.ts`). Follow RESEARCH Pattern 4; Wave 0 spike must confirm WOFF data URIs from `fontData.ts` load in fontkit, else generate a TTF via `scripts/gen-pdf-fonts.mjs`. |
| `src/app/espace-client/documents/[id]/apercu/route.ts` (only if iframe on signed URL fails) | route handler | streaming | No route handler serving authenticated binary content exists (`src/app/api/*` routes are public form endpoints: `consent`, `contact`, `simulateur`). Reuse byte-loading and hash check from `download.ts`; headers per RESEARCH Pitfall 6. |
| Hash-chain SQL (`append_signature_event`, `sv_verify_signature_chain`) with advisory lock | SQL function | event-driven | No advisory-lock or hash-chain code exists; `sv_lead_events` is append-only but unchained. Use RESEARCH Pattern 1 body; only the trigger/grant/RLS shell has a real analog. |
| OTP table with atomic attempt counter | table + RPC | request-response | No OTP table exists (login codes are handled by Supabase Auth). Use RESEARCH Pattern 3; the throttle (`src/lib/throttle.ts`) is explicitly not suitable. |

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/lib/server/{documents,mail,projects,auth}`, `src/lib/{documents,leads,signature-absent}`, `src/app/{espace-client,admin/projets}`, `src/components/{portal,admin}/projects`, `tests/rls`, `vitest.rls.config.ts`
**Files read:** about 20 (full or targeted ranges)
**Pattern extraction date:** 2026-10-04
