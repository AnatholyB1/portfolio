# Phase 13: Document generation - Pattern Map

**Mapped:** 2026-10-03
**Files analyzed:** 41 new or modified files
**Analogs found:** 36 / 41 (5 have no codebase analog: PDF stack, see end)

All analogs come from phase 12 (projects engine) and the mail engine. Line numbers refer to the files as read on 2026-10-03.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/2026100x_sv_documents.sql` | migration | CRUD + append-only | `supabase/migrations/20261004000000_sv_projects_engine.sql` | exact |
| `src/lib/documentsMigration.test.ts` | test (static SQL) | transform | `src/lib/projectsMigration.test.ts` | exact |
| `src/lib/migrationLint.test.ts` (modify `APPEND_ONLY_TABLES`) | test | transform | itself, line 103 | exact |
| `tests/rls/documents.rls.test.ts` | test (RLS integration) | request-response | `tests/rls/files.rls.test.ts` + `tests/rls/facts.rls.test.ts` | exact |
| `src/lib/documents/types.ts`, `money.ts`, `seller.ts`, `registry.ts`, `schemas.ts`, `steps.ts` | utility (pure) | transform | `src/lib/projects/steps.ts`, `src/lib/projects/schemas.ts`, `src/lib/projects/offers.ts` | role-match |
| `src/lib/documents/status.ts` | utility (pure) | transform | `src/lib/projects/steps.ts` (`effectiveFacts`, `deriveProjectState`) | exact |
| `src/lib/documents/legalMentions.ts` + `legalMentions.test.ts` | utility + test | transform | none for PDF; test style from `src/lib/server/mail/projectEmails.test.ts` | partial |
| `src/lib/documents/fontData.ts`, `pdf/setup.ts`, `pdf/primitives.tsx`, `pdf/templates/<type>/v1/*.tsx` | component (PDF) | transform | none | no analog |
| `src/lib/server/documents/render.ts` | service | transform | none (use RESEARCH Pattern 1); `server-only` header from `files.ts` | partial |
| `src/lib/server/documents/issue.ts` | service | request-response + event-driven (RPC + mail) | `src/lib/server/projects/facts.ts` (`post`, `notifyStepChange`) + `convert.ts` | exact |
| `src/lib/server/documents/read.ts` | service | CRUD (read) | `src/lib/server/projects/read.ts` | exact |
| `src/lib/server/documents/download.ts` | service | request-response | `src/lib/server/projects/files.ts` `createDownloadUrl` (106-131) | exact |
| `src/app/admin/projets/actions.ts` (add preview/issue/download actions) | controller (server action) | request-response | same file, `postFactAction` + `adminDownloadAction` | exact |
| `src/app/admin/projets/documents.actions.test.ts` | test | request-response | `src/app/admin/projets/actions.test.ts` | exact |
| `src/app/espace-client/documents/page.tsx` | route (RSC) | CRUD (read) | `src/app/espace-client/page.tsx` | exact |
| `src/app/espace-client/actions.ts` (add `documentDownloadAction`) | controller | request-response | same file, `downloadAction` (227-233) | exact |
| `src/components/admin/projects/DocumentsPanel.tsx` + per-type forms + `DocumentPreview`, `IssuedDocumentsList`, `SnapshotPanel` | component | request-response | `PostFactForm.tsx`, `RevokePanel.tsx`, `FactJournal.tsx` | role-match |
| `src/components/portal/project/DocumentsList.tsx` | component | request-response | `src/components/portal/project/FilesPanel.tsx` | exact |
| `src/components/portal/project/ClientNav.tsx` (modify) | component | static | itself | exact |
| `src/components/portal/project/portalPage.test.ts` (modify) | test | transform | itself, lines 57-62 | exact |
| `src/components/admin/projects/projectSheetUi.test.ts` (modify) | test | transform | itself | exact |
| `src/components/portal/project/documentsPage.test.ts` | test | transform | `portalPage.test.ts` | exact |
| `src/lib/server/mail/rules.ts` (modify) | config | event-driven | itself | exact |
| `src/lib/server/mail/outbox.ts` (modify `buildMail`) | service | event-driven | itself, lines 50-78 | exact |
| `src/lib/server/mail/documentIssuedEmail.ts` + test | utility | transform | `stepChangedEmail.ts` + `projectEmails.test.ts` | exact |
| `src/lib/server/mail/rules.test.ts` (modify) | test | transform | itself | exact |
| `src/lib/projects/copy.ts` (add `PROJECT_COPY.documents`) | config | static | itself | exact |
| `next.config.ts` (add `serverExternalPackages`) | config | static | itself | exact |

## Pattern Assignments

### `supabase/migrations/2026100x_sv_documents.sql` (migration, append-only CRUD)

**Analog:** `supabase/migrations/20261004000000_sv_projects_engine.sql`

**Header and decision traceability** (lines 1-22): file starts with a comment block naming the phase, requirements, "NOT applied by plan ..." and the decisions implemented. Keep this.

**Table + RLS + grants, append-only with admin-only sibling** (lines 73-137, `sv_project_facts` and `sv_project_fact_notes`). Copy this exact shape for `sv_project_documents` and `sv_document_snapshots`:
```sql
create table if not exists public.sv_project_facts (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  ...
);
alter table public.sv_project_facts enable row level security;
revoke all on public.sv_project_facts from anon, authenticated, service_role;
grant select (id, project_id, type, target_fact_id, actor_kind, occurred_at, created_at)
  on public.sv_project_facts to authenticated;
grant select, insert on public.sv_project_facts to service_role;
create index if not exists sv_project_facts_project_idx on public.sv_project_facts (project_id);

drop policy if exists sv_project_facts_read on public.sv_project_facts;
create policy sv_project_facts_read on public.sv_project_facts
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_project_facts_no_upd_del on public.sv_project_facts;
create trigger sv_project_facts_no_upd_del
  before update or delete on public.sv_project_facts
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_facts_no_truncate on public.sv_project_facts;
create trigger sv_project_facts_no_truncate
  before truncate on public.sv_project_facts
  for each statement execute function sv_private.deny_mutation();
```
For documents: column-level `grant select (...)` to `authenticated` listing every column EXCEPT `storage_path` (precedent: `sv_project_facts` omits `actor_id`). `service_role` gets `select, insert` only (no update). Admin-only snapshot table: copy `sv_project_fact_notes` (lines 113-137), policy `using ((select sv_private.is_admin()))`.

**Private bucket, no storage policy** (lines 317-337): copy the `insert into storage.buckets ... on conflict (id) do nothing;` block with id `sv-documents`, `public false`, `file_size_limit 10485760`, `allowed_mime_types array['application/pdf']`. The file must never contain the string `storage.objects` (asserted by `projectsMigration.test.ts` line 50, extend to new migration).

**Closed-list swap on `sv_mail_outbox`** (pattern lines 293-315, `sv_lead_events` constraint swap with `pg_constraint` lookup). Original constraints are inline (line 264-265): `event_type ... check (event_type in ('client_invited','step_changed','onboarding_completed'))` and `template ... check (template in ('invite','step_changed','onboarding_completed'))`. The two lists need two separate lookups (RESEARCH caveat: the `template` list does not contain `client_invited`). Match with `ilike '%step_changed%' and ilike '%onboarding_completed%'` and distinguish by whether the def contains `event_type` vs `template`; verify `conname` on the branch.

**RPC pattern** (lines 477-566, `sv_post_project_fact`): `language plpgsql security definer set search_path = ''`, lock with `perform 1 from public.sv_projects where id = p_project_id for update; if not found then raise exception 'sv_project_not_found' using errcode = 'P0001';`, error codes always start with `sv_` (so `callRpc` forwards them), then:
```sql
revoke all on function public.sv_post_project_fact(uuid, text, text, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.sv_post_project_fact(uuid, text, text, uuid, bigint, text) to service_role;
```
`sv_issue_document` also inserts outbox rows like `sv_convert_lead` (lines 418-426):
```sql
insert into public.sv_mail_outbox (
  event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
) values (
  'client_invited', 'invite', v_email, 'client',
  'client_invited:' || v_client_id::text || ':' || v_email,
  jsonb_build_object('clientName', p_name), v_client_id, v_project_id
)
on conflict (dedupe_key) do nothing
returning id into v_outbox_id;
```
For documents: loop over `sv_client_members.invited_email` for the project's client, `dedupe_key = 'document_issued:' || id || ':' || email`, payload without any price. Remember `returning id` inside a loop must be collected into an array to return `outbox_ids`.

**Lint constraints to satisfy** (`src/lib/migrationLint.test.ts`): Rule 1 (RLS + `revoke all ... from anon, authenticated` on every `public.sv_*` table), Rule 2 (`set search_path = ''` and revoke per function), Rule 5 (no write grant to anon/authenticated), Rule 6 (append-only tables need both deny triggers, requires adding names to `APPEND_ONLY_TABLES`).

---

### `src/lib/migrationLint.test.ts` (modify)

**Analog:** itself, line 103:
```ts
const APPEND_ONLY_TABLES = ['sv_project_facts', 'sv_project_fact_notes', 'sv_project_consents'];
```
Append `'sv_project_documents'`, `'sv_document_snapshots'`. Optionally add the two fixture tests modelled on lines 192-213 (non-compliant fixture is reported, compliant one passes).

---

### `src/lib/documentsMigration.test.ts` (test, static SQL)

**Analog:** `src/lib/projectsMigration.test.ts`

**Core pattern** (lines 1-33, 49-67): read the migration with `readFileSync(new URL(...))`, `stripComments`, then assertions:
```ts
it('never stores a step (no current_step), no storage objects policy, no cascade or set null', () => {
  expect(sql).not.toMatch(/current_step/i);
  expect(sql).not.toMatch(/storage\.objects/i);
  expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
});
it('every public function is granted to service_role only', () => {
  const fns = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(sv_\w+)\s*\(/gi)].map((m) => m[1]);
  for (const fn of fns) {
    expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+service_role`, 'i'));
    ...
  }
});
```
Reuse `closedList(column)` (lines 27-33) to parse the new `doc_type` list and the two reworked outbox lists, and assert they equal `MAIL_EVENTS` and the `MailTemplate` union (RESEARCH Pitfall 9). Also assert: no `update` grant to service_role on documents, partial unique indexes present, bucket `public false`, `storage_path` absent from the `authenticated` column grant.

---

### `tests/rls/documents.rls.test.ts` (RLS integration)

**Analog:** `tests/rls/files.rls.test.ts` (storage side) and `tests/rls/facts.rls.test.ts` (append-only side; not read in full, mirror its UPDATE/DELETE/TRUNCATE-denied assertions)

**Imports and fixtures** (files.rls.test.ts lines 1-52):
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, anonClient, cleanup, makeAdmin, makeClient, makeGeckoAdmin, makeProject, makeUser, svc, type TestUser } from './helpers';
...
beforeAll(async () => {
  clientA = await makeClient('RLS Files A');
  ...
  await addMember(clientA.id, memberA);
  await makeGeckoAdmin(gecko);
  await makeAdmin(admin);
});
afterAll(async () => { await svc().storage.from(BUCKET).remove([objectPath]); await cleanup(); });
```
**Actor matrix** (lines 90-105): iterate `[anon, memberA, memberB, plain, gecko, admin]` and assert none but service role can list/download from `sv-documents`. Add: second upload to the same path with `upsert:false` fails (RESEARCH A2), `storage_path` not selectable by `authenticated`, snapshot rows readable only by admin, replacement race yields one head. Signed URL test (lines 107-117) can be reused verbatim for `createSignedUrl(path, 2, { download })` expiry. Uses the permanent-test-fixture rule: never delete prod "Test E2E Sèvalys" (these tests run on the branch only).

---

### `src/lib/documents/status.ts` (utility, pure transform)

**Analog:** `src/lib/projects/steps.ts`

**Reuse, do not reimplement** (lines 126-133):
```ts
export function effectiveFacts(facts: Fact[]): Fact[] {
  const revoked = new Set<number>();
  for (const x of facts) {
    if (x.type === 'fact_revoked' && x.targetFactId !== null) revoked.add(x.targetFactId);
  }
  return facts.filter((x) => x.type !== 'fact_revoked' && !revoked.has(x.id));
}
```
Module-level conventions (header comment lines 1-2): "pur, dérivé des faits. Module sûr côté client", no `server-only`, no imports of server code. `documentStatus(doc, facts, replacedBy)` maps `quote -> quote_accepted`, `contract -> contract_signed`, `acceptance -> acceptance_signed`, `spec -> 'issued'`; replaced wins. Fact type strings come from `FACT_TYPES` (lines 3-12). Test file `status.test.ts` colocated, modelled on `src/lib/projects/steps.test.ts` (including a revoked-fact case).

### `src/lib/documents/steps.ts` (step guard)

**Analog:** `src/lib/projects/steps.ts` `STEPS` (lines 48-104, `index: 1..6`) and `isFactAhead` (199-204). Guard map `quote/spec -> 2`, `contract -> 3`, `acceptance -> 5`, `invoice -> 6`, compared to `deriveProjectState(facts, startedAt).currentStep` (lines 156-197). Use `StepIndex` type. Note `currentStep` is `null` when done.

### `src/lib/documents/schemas.ts` (zod input per type)

**Analog:** `src/lib/projects/schemas.ts` (lines 1-61)
```ts
import { z } from 'zod';
const uuid = z.string().uuid();
export const postFactSchema = z.object({
  projectId: uuid,
  type: z.enum([...]),
  note: z.string().trim().max(500).optional(),
});
export const revokeFactSchema = z.object({
  projectId: uuid,
  factId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(10).max(500),
});
```
Zod 4 syntax (`z.url()`). Same style: `trim()`, explicit `max`, `z.coerce.number().int()` for form-sourced numbers. Add `documentId: uuid` (idempotency key), cents as integers, line cap 30, textarea caps 4000/2000, control-character stripping.

### `src/lib/documents/seller.ts`, `registry.ts`, `money.ts`, `types.ts`

**Analog for constants-with-labels:** `src/lib/projects/steps.ts` (`FACT_LABELS: Record<FactType,string>` line 25, `as const` arrays) and `src/lib/projects/offers.ts` (`OFFER_LABELS`, `OFFER_SLUGS`). Follow: `export const DOC_TYPES = [...] as const; export type DocType = (typeof DOC_TYPES)[number]; export const DOC_LABELS: Record<DocType, string>`. A static test should assert `DOC_TYPES` minus `invoice` equals the SQL `doc_type` list (same trick as `projectsMigration.test.ts` fact types). Do NOT use `Intl.NumberFormat('fr-FR')` in `money.ts` (U+202F bug); the existing `formatDateFr` in `src/lib/admin/format.ts` returns `JJ/MM/AAAA` (lines 14-24), not the "12 octobre 2026" the UI-SPEC wants, so add a separate long-date formatter in `money.ts` or `format` using `timeZone: 'Europe/Paris'` like the existing one.

---

### `src/lib/server/documents/issue.ts` (service, request-response + event-driven)

**Analog:** `src/lib/server/projects/facts.ts` and `convert.ts`

**Imports and precondition header** (facts.ts lines 1-17):
```ts
// ... PRECONDITION : l'appelant a déjà exécuté requireAdmin() ... Ce module écrit en service_role.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { callRpc } from '@/lib/server/rpc';
import { enqueueAndSend } from '@/lib/server/mail/outbox';
import { dedupeKey } from '@/lib/server/mail/rules';
```
**RPC call with result mapping** (facts.ts lines 132-145; convert.ts 71-103 for the `switch (rpc.code)` mapping of `sv_*` codes to short result codes):
```ts
const res = await callRpc<{ fact_id: number | null; changed: boolean }>(
  'projects/facts', 'sv_post_project_fact', { p_project_id: ..., p_type: ... },
);
if (!res.ok) return { ok: false, code: res.code };
```
For issue: `callRpc<{ document_id: string; outbox_ids: string[] }>('documents/issue', 'sv_issue_document', {...})`; map `sv_document_replaces_mismatch`, PK conflict to `already_issued`.

**Mail after commit, never blocking** (facts.ts 89-122, `notifyStepChange` and `memberEmails` 74-87): best-effort send, result enum `'sent'|'pending'|'failed'|'none'`, wrapped in try/catch with generic `console.error('[projects/facts] notify failed')`. For documents, rows are already in the outbox from the RPC, so call `sendOutboxRow(id)` (outbox.ts 163-184) for each returned id and let the cron (`processDueMail`, outbox.ts 201-217) drain failures. Do not use `enqueueAndSend` here.

**Upload ordering:** upload to `sv-documents` first with `upsert:false`, then RPC (RESEARCH Pitfall 4). Path `${projectId}/${documentId}.pdf` with `documentId = crypto.randomUUID()` (same call style as files.ts line 32). Hash the exact buffer uploaded: `createHash('sha256').update(buffer).digest('hex')`.

**Logging rule** (all analogs): generic codes only, e.g. `console.error('[projects/files] insert failed')`, never PII or amounts.

### `src/lib/server/documents/read.ts` (service, read)

**Analog:** `src/lib/server/projects/read.ts`

**Explicit columns, RLS client passed in, mapper per row** (lines 12-24, 81-92):
```ts
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const FILE_COLS = 'id, project_id, storage_path, filename, mime, size_bytes, uploaded_by_kind, status, created_at, ready_at';
const toFile = (d: Row): FileRow => ({ id: d.id, projectId: d.project_id, ..., sizeBytes: Number(d.size_bytes), ... });
```
`DOCUMENT_COLS` must exclude `storage_path` (column grant excludes it). Header comment style (lines 1-3): "Toutes les lectures passent par le client RLS de l'appelant avec des colonnes explicites." Snapshot read (admin only) uses a second query on `sv_document_snapshots` via the admin's RLS client, which returns nothing for clients by policy. Facts for status come from `loadProjectBundle(...).facts` (already mapped by `toFact`, lines 74-80), so `loadProjectDocuments` should take `rls` and a `projectId`, and the page passes facts to `documentStatus`.

### `src/lib/server/documents/download.ts` (service, request-response)

**Analog:** `src/lib/server/projects/files.ts` `createDownloadUrl` (lines 106-131)
```ts
export async function createDownloadUrl(rls: SupabaseClient, fileId: string):
  Promise<{ ok: true; url: string } | { ok: false; code: 'not_found' | 'error' }> {
  try {
    const row = await rls.from('sv_project_files').select('id, storage_path, filename, status').eq('id', fileId).maybeSingle();
    if (row.error || !row.data || row.data.status !== 'ready') return { ok: false, code: 'not_found' };
    const signed = await createSupabaseAdminClient()
      .storage.from(SV_FILES_BUCKET)
      .createSignedUrl(String(row.data.storage_path), SIGNED_DOWNLOAD_SECONDS, { download: String(row.data.filename) });
    ...
```
Differences: bucket `sv-documents`; the RLS client cannot select `storage_path` (not granted), so read `id, project_id, filename` via RLS to authorize, then resolve `storage_path` via the admin client by id in server-only code. Reuse `SIGNED_DOWNLOAD_SECONDS` from `src/lib/projects/fileRules.ts` if it is 120 s, else define a constant. The `getAccessibleProject` check in `access.ts` (lines 5-17) is the RLS-read-as-authorization idiom.

---

### `src/app/admin/projets/actions.ts` (modify: add `previewDocumentAction`, `issueDocumentAction`, `adminDocumentDownloadAction`, optional `verifyDocumentHashAction`)

**Analog:** same file

**Guard order, copy exactly** (lines 69-93): `requireAdmin()` FIRST, then zod `safeParse`, then `getAccessibleProject(supabase, projectId)`, then the server module:
```ts
export async function postFactAction(_prev: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = postFactSchema.safeParse({ projectId: str(formData, 'projectId'), ... });
  if (!parsed.success) return err(PROJECT_COPY.errors.generic);
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return err(PROJECT_COPY.errors.generic);
  }
  const res = await postProjectFact({ ..., actorKind: 'admin', actorId: user.id, ... });
  return factOutcome(res, parsed.data.projectId);
}
```
**Result shape and refresh** (lines 22-26, 37-41, 56-67): `ProjectActionState { status, message, mailLine }`, `refresh(projectId)` calls `revalidatePath('/admin/projets')`, `/admin/projets/${id}`, `/espace-client`; add `/espace-client/documents`. Reuse the `mailLine` mapping (lines 43-54) for the "mail failed but issued" warning.

**Typed (non-FormData) action for download** (lines 170-178, copy for `adminDocumentDownloadAction`):
```ts
export async function adminDownloadAction(fileId: string): Promise<DownloadResult> {
  const { supabase } = await requireAdmin();
  if (typeof fileId !== 'string' || fileId.length === 0) {
    return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  }
  const res = await createDownloadUrl(supabase, fileId);
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  return { ok: true, url: res.url };
}
```
`previewDocumentAction` returns `{ ok: true; pdfBase64: string }` (use a typed object like `DownloadResult` in `src/components/portal/project/types.ts` lines 9) and writes nothing. Step guard and prerequisite (contract needs active quote, PV needs active spec) are checked server-side in both preview and issue; re-read the prerequisite snapshot on the server, never trust form pre-fill.

### `src/app/admin/projets/documents.actions.test.ts`

**Analog:** `src/app/admin/projets/actions.test.ts` (lines 1-80): mock `@/lib/server/auth/dal`, `@/lib/server/projects/access`, `next/cache`, and the new server modules with `vi.fn()` wrappers, then `const {...} = await import('./actions')`; `beforeEach` sets `requireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase })`. Keep the `guarded` table (line 77+) pattern: for each action, assert that when `requireAdmin` rejects, no server module was called, and add that preview never calls the upload/RPC module.

---

### `src/app/espace-client/documents/page.tsx` (RSC route)

**Analog:** `src/app/espace-client/page.tsx`

**Imports/guards** (lines 1-31, 54-67): `requireClient()`, `ctx.status === 'no_access'` returns `<NoAccess action={<SignOutButton />} />` inside `ShellMain width="client"`; `export const dynamic = 'force-dynamic';`; styles `import '@/components/portal/client.css'; import '@/components/portal/project/project.css';`. Project list via `loadClientProjects(ctx.supabase)` and `ProjectSelector` (line 109) only; ALL reads through `ctx.supabase`.
```tsx
<ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
<ShellMain width="client">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
    <ClientNav />
    ...
```
Constraints from `portalPage.test.ts`: the page must not contain `createSupabaseAdminClient`, `service_role`, `gsap`, `CustomCursor`, `CinemaIntro`, `dangerouslySetInnerHTML`, and neither the page nor its parts may match `/€|\beuros?\b|\bprix\b/i` (line 42). Do not show amounts, SHA-256 or template version to the client. Dates via `formatDateFr` (`src/lib/admin/format.ts`) or the new long formatter, but the "Émis le" copy must stay free of "prix". Use `PROJECT_COPY.documents.*` for strings (including the empty state heading/body).

### `src/app/espace-client/actions.ts` (modify)

**Analog:** same file, lines 227-233:
```ts
export async function downloadAction(fileId: string): Promise<DownloadResult> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  const res = await createDownloadUrl(ctx.supabase, String(fileId));
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  return { ok: true, url: res.url };
}
```
Add `documentDownloadAction` the same way calling `createDocumentDownloadUrl(ctx.supabase, id)`.

---

### `src/components/portal/project/DocumentsList.tsx` (client component, download)

**Analog:** `src/components/portal/project/FilesPanel.tsx`

**Download flow** (lines 120-137):
```tsx
function onDownload(id: string) {
  setError(null);
  setDownloadingId(id);
  startTransition(async () => {
    try {
      const res = await getDownloadUrl(id);
      if (res.ok) { window.location.assign(res.url); } else { setError(PROJECT_COPY.errors.downloadFailed); }
    } catch { setError(PROJECT_COPY.errors.downloadFailed); }
    finally { setDownloadingId(null); }
  });
}
```
**Table markup** (lines 187-229): `<table className="pt-table"><caption className="pt-sr-only">...`, `th scope="col"`, `td data-label="..."`, button `className="pt-btn-text pt-file-action"` with `<Download size={16} aria-hidden="true" />` and label switching to `PROJECT_COPY.files.preparing` while `disabled`. Live region `<div aria-live="polite">` with `pt-error` / `pt-success`. Pass the action as a prop (`getDownloadUrl: (id) => Promise<DownloadResult>`), as `FilesPanelProps` does in `types.ts` (lines 20-35), so the same component serves any viewer. New classes go under `.pt-root` in `project.css` with prefix `pt-doc-*`. The status badge copies the `pt-step-badge` look; no new tokens.

### `src/components/portal/project/ClientNav.tsx` (modify)

**Analog:** itself (lines 5-27). Replace the disabled Documents `<span>` (lines 14-18) by a `<Link href="/espace-client/documents">`; `aria-current="page"` and `pt-client-nav-active` must become conditional per page. Because `ClientNav` is currently a server component with no props, add a `current: 'projet' | 'documents'` prop and update `espace-client/page.tsx` (two usages, lines 83 and 108) to pass `current="projet"`. Keep `Paiements (bientôt)` untouched.

### `src/components/portal/project/portalPage.test.ts` (modify)

**Analog:** itself, lines 57-62:
```ts
it('nav marks Projet current and disables the rest', () => {
  const nav = read('./ClientNav.tsx');
  expect(nav).toContain('aria-current="page"');
  expect(nav).toContain('Documents (bientôt)');   // must change deliberately
  expect(nav).toContain('Paiements (bientôt)');
});
```
Replace the `Documents (bientôt)` assertion with a check for `href="/espace-client/documents"`. Do the same change in the plan that edits `ClientNav.tsx`. Also: the `parts` array (line 7) is where new portal files can be appended so they inherit the no-price check, and the section order test (line 22) must still pass, so do not add new `<DocumentsList>` into `/espace-client/page.tsx`.

### `src/components/admin/projects/DocumentsPanel.tsx` and per-type forms (client components)

**Analog:** `PostFactForm.tsx`, `RevokePanel.tsx`

**Form + server action via `useActionState`** (PostFactForm.tsx lines 19-23, 36-38, 79-94):
```tsx
const [state, formAction, pending] = useActionState(async (prev: ProjectActionState, fd: FormData) => postFactAction(prev, fd), INITIAL);
...
<form action={formAction} className="pt-lead-form">
  <input type="hidden" name="projectId" value={projectId} />
...
<div aria-live="polite">
  {state.status === 'error' ? (<p className="pt-error"><AlertCircle size={16} aria-hidden="true" /> {state.message}</p>) : null}
  {state.status === 'success' ? (<p className="pt-success"><CheckCircle2 size={16} aria-hidden="true" /> {state.message}{state.mailLine ? <span> {state.mailLine}</span> : null}</p>) : null}
</div>
<button type="submit" className="pt-btn-primary" disabled={!current || pending}>
```
Labels use `className="pt-lead-label"`, counters `className="pt-field-help"` with `{note.length} / {NOTE_MAX}` (lines 75-77), the exact pattern for the 4000-char section counters. Imports `'../leads/leads.css'` for shared admin form classes.

**Inline confirm panel** (RevokePanel.tsx lines 35-72): `className="pt-lead-panel"`, actions row `pt-lead-panel-actions`, `pt-btn-ghost` / `pt-btn-text`, `useEffect(() => { if (state.status === 'success') onClose(); }, ...)`. Reuse for "Confirmer l'émission" / "Annuler". Do not use the warm-colored destructive style (the UI-SPEC says issuing is not destructive); use `pt-btn-primary` for confirm.

**Preview and issue are not plain form actions:** preview returns base64, so those are called as typed actions from a client handler (like `getDownloadUrl` in FilesPanel), with a blob URL in an `<iframe>`; keep `documentId` in `useState(() => crypto.randomUUID())` per form open for idempotency.

**Placement constraint:** `src/components/admin/projects/projectSheetUi.test.ts` forbids `createSupabaseAdminClient`, `@/lib/supabase/admin`, `gsap`, `CustomCursor`, `dangerouslySetInnerHTML` and `/€|\beuros?\b|\bprix\b/i` in `page.tsx`, `FactJournal.tsx`, `ProjectSideCards.tsx` (lines 20-25, 56-60). The admin page.tsx must not contain `€` or "prix"; all pricing UI lives in the new `DocumentsPanel*` files, which are not in that test's file list (add them to a NEW test, not the price-free list). In `[id]/page.tsx` mount the section after `<FilesPanel .../>` (line 135), inside `pt-lead-main`:
```tsx
<DocumentsPanel projectId={project.id} ... />
```
passing already-loaded `facts`, `state`, `onboarding`, and documents from `loadProjectDocuments(supabase, id)`. Add `<DocumentsPanel` and the new action names to the "wires ..." assertion in `projectSheetUi.test.ts` (lines 28-36).

---

### `src/lib/server/mail/rules.ts` (modify)

**Analog:** itself (lines 4-33). Extension points, all four in the same file:
```ts
export const MAIL_EVENTS = ['client_invited', 'step_changed', 'onboarding_completed'] as const;   // + 'document_issued'
export type MailTemplate = 'invite' | 'step_changed' | 'onboarding_completed';                    // + 'document_issued'
export const MAIL_RULES: Record<MailEvent, Rule> = { ... document_issued: { template: 'document_issued', delayMs: 0, to: 'client' } };
export const dedupeKey = { ..., documentIssued(documentId: string, email: string): string { return clamp(`document_issued:${documentId}:${norm(email)}`); } };
```
The TS `dedupeKey.documentIssued` must produce exactly the string the SQL RPC builds (`'document_issued:' || id || ':' || email`, email lowercased); add a unit test comparing both.

### `src/lib/server/mail/outbox.ts` (modify `buildMail`)

**Analog:** itself, lines 50-78. Add a case before `default` (lines 74-75):
```ts
case 'document_issued':
  mail = buildDocumentIssuedEmail({
    documentLabel: str(p.documentLabel),
    projectTitle: str(p.projectTitle),
    revision: typeof p.revision === 'number' ? p.revision : 1,
    portalUrl: `${buildPortalUrl()}/documents`,
  });
  break;
```
`str()` helper at line 48; `buildPortalUrl` from `./urls` (urls.ts line 9). If the helper `buildPortalUrl()` stays unchanged, add `buildPortalDocumentsUrl()` in `urls.ts` instead of string concatenation.

### `src/lib/server/mail/documentIssuedEmail.ts` + test

**Analog:** `stepChangedEmail.ts` (whole file, 73 lines) and `projectEmails.test.ts`

Copy the dark-table HTML template and `text` array verbatim, changing: subject `Nouveau document : ${documentLabel} — ${projectTitle}` (or `Nouvelle version : ...` when `revision > 1`), body copy per UI-SPEC "Issue e-mail", CTA `Ouvrir mon espace client`. Imports:
```ts
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';
```
Always `escapeHtml` every interpolated value. Test file copies `projectEmails.test.ts` assertions: exact subject, CTA and URL in html and text, escaping of `<script>`, and the "no price or tracking pixel" block (lines 32-41: no `<img`, `€`, `prix`, `tarif`). No signed URL in the mail.

### `src/lib/server/mail/rules.test.ts` (modify)

**Analog:** itself. Line 6 title "has exactly the three events" and line 14-21 (`@ts-expect-error` partial record, missing `onboarding_completed`) must be updated to four events; add `expect(MAIL_RULES.document_issued.to).toBe('client')` and `dedupeKey.documentIssued('d1','A@X.fr')` to `'document_issued:d1:a@x.fr'`.

### `src/lib/projects/copy.ts` (modify)

**Analog:** itself. Add a `documents: { ... }` group to the `PROJECT_COPY` `as const` object (lines 3-139) with the UI-SPEC copywriting contract strings, using the same style as `files` (lines 97-112: plain strings plus function-valued entries like `added: (name: string) => ...`). Keep all strings for the portal side free of price words (`copy.ts` is checked by `portalPage.test.ts` for specific strings only, but portal components import it, so keep amounts out of the portal subset). Header comment says "Aucun prix (D-22)"; admin-only price copy for the quote form (e.g. "Prix unitaire HT") should go in `src/lib/documents/types.ts` labels, not here, to keep that file price-free.

### `next.config.ts` (modify)

**Analog:** itself (lines 3-19). Add inside `nextConfig`:
```ts
serverExternalPackages: ['@react-pdf/renderer'],
```
Next config has an existing static-source test against `PRIVATE_PREFIXES` for headers; do not alter `headers()`. Add the Documents route needs no new header: `/espace-client/:path*` already covers `/espace-client/documents`.

---

## Shared Patterns

### Authorization: RLS read, then service_role
**Source:** `src/lib/server/projects/access.ts` lines 5-17; `src/app/admin/projets/actions.ts` lines 69-93
**Apply to:** `issue.ts`, `download.ts`, all new admin/portal actions
Server action calls `requireAdmin()` / `requireClient()` first, validates with zod, calls `getAccessibleProject(rls, projectId)` (RLS-visible means allowed), only then enters a `server-only` module that uses `createSupabaseAdminClient()`. Every server-only module that writes carries a header comment with the PRECONDITION line (facts.ts lines 1-4).

### Error handling and logging
**Source:** `src/lib/server/rpc.ts` lines 7-25; `files.ts` lines 62-65
**Apply to:** all `src/lib/server/documents/*`
Return discriminated unions `{ ok: true, ... } | { ok: false; code: string }`; wrap in `try/catch` and log only `console.error('[documents/<module>] <what> failed')`. Never log emails, amounts, paths. Use `callRpc(scope, fn, args)` for every RPC; `sv_*` message prefixes become codes.

### Server-only boundary
**Source:** `import 'server-only'` as first import (files.ts line 3, facts.ts line 5, outbox.ts line 4); vitest alias stub in `vitest.config.ts` (line 13)
**Apply to:** everything in `src/lib/server/documents/`. `src/lib/documents/` stays pure and importable by client components (priceScope whitelists both `src/lib/documents` and `src/lib/server`, `src/lib/priceScope.ts` lines 16-17).

### Append-only plus replacement chain
**Source:** `20261004000000_sv_projects_engine.sql` lines 73-137 (deny_mutation triggers, restrict FKs, no FK to `auth.users`, comment at lines 20-21)
**Apply to:** both new tables. All FKs `on delete restrict` (static test forbids `cascade|set null`), `issued_by uuid null` with no FK.

### Price zones
**Source:** `src/lib/priceScope.ts` lines 8-18
**Apply to:** file placement. Templates and money code under `src/lib/documents/` and `src/lib/server/`, admin forms under `src/components/admin/`, portal under `src/components/portal/` and `src/app/espace-client/`. Nothing under `src/pdf/` (not a whitelisted zone, RESEARCH note). Portal files still must not contain price tokens (portalPage.test.ts line 42).

### Test conventions
**Source:** `src/app/admin/projets/actions.test.ts` (vi.mock of dal/access/server modules, `await import('./actions')`), `projectsMigration.test.ts` (static SQL), `portalPage.test.ts` and `projectSheetUi.test.ts` (source-text guards via `readFileSync(new URL(rel, import.meta.url))`), `tests/rls/*.rls.test.ts` (branch)
**Apply to:** each plan. Vitest `include` is `src/**/*.test.ts`, so PDF tests must be `.ts` files importing `.tsx` templates (RESEARCH, verified in the spike). Long real-render tests need an explicit timeout (e.g. `it(..., 20_000)`).

### Private, noindex, French-only shells
**Source:** `next.config.ts` lines 7-17 and `src/app/privateShells.test.ts` (not read)
**Apply to:** the new route `/espace-client/documents` is covered by `"/espace-client/:path*"`; verify the privateShells test still passes after adding the route.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/documents/fontData.ts` | config (generated) | static | No embedded assets exist; generate base64 data URIs from Fontsource Manrope WOFF Latin 400/700 per RESEARCH Standard Stack (use a one-off script, commit the output) |
| `src/lib/documents/pdf/setup.ts` | utility | transform | No PDF code in repo; use RESEARCH Pattern 1 (`Font.register`, `registerHyphenationCallback((w) => [w])`, idempotent `setupPdf()`) |
| `src/lib/documents/pdf/primitives.tsx` and `templates/<type>/v1/*.tsx` | component (PDF) | transform | No `@react-pdf/renderer` in `package.json`; follow UI-SPEC Surface C for layout (A4, margins 48/48/64/48, Manrope 400/700, hex colors) and RESEARCH Pattern 1 (pure function of a frozen snapshot, no `new Date()`) |
| `src/lib/server/documents/render.ts` | service | transform | Use RESEARCH Pattern 1 (`renderToBuffer` + `createHash`); only the `import 'server-only'` header and the discriminated-result style come from the repo |
| `src/lib/documents/legalMentions.ts` and `.test.ts` | utility + test | transform | No text-extraction tests exist; use RESEARCH "Extract and assert text in Vitest" (`unpdf` `getDocumentProxy` + `extractText`, `normalizeText`, non-vacuity test) |

## Metadata

**Analog search scope:** `supabase/migrations/`, `tests/rls/`, `src/lib/server/{projects,mail}/`, `src/lib/projects/`, `src/lib/admin/`, `src/lib/*.test.ts`, `src/app/admin/projets/`, `src/app/espace-client/`, `src/components/{admin/projects,portal/project}/`, root config files
**Files scanned:** about 45 (read in full or by targeted range)
**Pattern extraction date:** 2026-10-03

Notes for the planner:
1. `formatDateFr` produces `JJ/MM/AAAA`; the UI-SPEC wants "12 octobre 2026" in PDFs and `formatDateFr` in the portal. Decide one (portal list can keep `JJ/MM/AAAA` via `formatDateFr`; PDFs need a new long-form formatter).
2. `ClientNav` currently takes no props; making the active link dynamic requires touching `espace-client/page.tsx` in the same plan.
3. `portalPage.test.ts` line 60 and `rules.test.ts` lines 6-21 encode the pre-phase-13 state and must be edited deliberately in the plans that change those files.
4. The admin `[id]/page.tsx` is under a no-price source guard, so keep `€` and "prix" out of it and put pricing UI in new component files.
