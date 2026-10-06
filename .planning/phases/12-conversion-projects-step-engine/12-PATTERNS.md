# Phase 12: Conversion, projects & step engine - Pattern Map

**Mapped:** 2026-10-03
**Files analyzed:** 38 new/modified
**Analogs found:** 36 / 38 (2 partial, no exact analog: cron route, Storage signed upload)

Note: line numbers refer to the files as read on 2026-10-03. `src/proxy.ts` has uncommitted changes in the working tree; its `config.matcher` (line ~129) lists only `/espace-client`, `/admin`, `/connexion`, `/auth`, so `/api/cron/*` is not intercepted (good, no change required).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20261004000000_sv_projects_engine.sql` | migration | CRUD + append-only | `supabase/migrations/20261003000000_sv_leads_core.sql` | exact |
| `src/lib/projects/steps.ts` (pure: STEPS, FACT_TYPES, `deriveProjectState`) | utility (pure) | transform | `src/lib/admin/leadLabels.ts` (client-safe pure labels) | role-match |
| `src/lib/projects/onboardingSchema.ts` | utility (zod) | transform | `src/lib/admin/inviteSchema.ts` + `leadSchemas.ts` | exact |
| `src/lib/projects/blocking.ts` (waitingOn, dormant, `DORMANT_AFTER_DAYS`) | utility (pure) | transform | `src/lib/admin/funnel.ts` (pure compute) | role-match |
| `src/lib/projects/consent.ts` (`PRESENTATION_CONSENT`) | utility (const) | n/a | `src/lib/admin/leadLabels.ts` | role-match |
| `src/lib/projects/copy.ts` (FR labels, step copy) | utility (const) | n/a | `INVITE_COPY` in `inviteSchema.ts`, `ADMIN_COPY` in `leadLabels.ts` | exact |
| `src/lib/server/projects/convert.ts` | service (server-only) | request-response, multi-step + compensation | `src/lib/server/clients/invite.ts` | exact |
| `src/lib/server/projects/facts.ts` | service (RPC wrapper) | CRUD (append) | `src/lib/server/leads/admin.ts` | exact |
| `src/lib/server/projects/files.ts` | service | file-I/O (signed URLs) | none in repo (`invite.ts` for server-only shape) | partial |
| `src/lib/server/projects/onboarding.ts` | service | CRUD (upsert) | `src/lib/server/leads/admin.ts` | role-match |
| `src/lib/server/projects/activity.ts` | service (read, uses `sv_find_auth_user`) | request-response | `invite.ts` lines 60-65 (`sv_find_auth_user`) | partial |
| `src/lib/server/mail/outbox.ts` | service | event-driven / batch | `invite.ts` `sendInvitationEmail` (Resend) + `leads/admin.ts` `call()` | role-match |
| `src/lib/server/mail/rules.ts` | config (typed table) | n/a | `leadLabels.ts` (typed `Record`) | role-match |
| `src/lib/server/mail/stepChangedEmail.ts`, `onboardingCompletedEmail.ts` | utility (template) | transform | `src/lib/server/mail/inviteEmail.ts` | exact |
| `src/lib/server/clients/invite.ts` (modify: route through outbox, split checks) | service | request-response | itself | exact |
| `src/app/api/cron/mail/route.ts` | route | batch, secret-guarded | `src/app/api/consent/route.ts` (route shape only) | partial |
| `vercel.json` | config | n/a | none | no analog |
| `src/app/admin/leads/actions.ts` (modify: `convertLeadAction`) | controller (Server Action) | request-response | same file + `src/app/admin/actions.ts` `inviteClientAction` | exact |
| `src/app/admin/projets/actions.ts` (post fact, revoke, add link, upload) | controller | request-response | `src/app/admin/leads/actions.ts` | exact |
| `src/app/admin/projets/page.tsx` | component (server page) | request-response, filter/sort via GET | `src/app/admin/leads/page.tsx` | exact |
| `src/app/admin/projets/[id]/page.tsx` | component (server page) | request-response | `src/app/admin/leads/[id]/page.tsx` | exact |
| `src/components/admin/AdminNav.tsx` (modify: `projets`) | component | n/a | itself | exact |
| `src/components/admin/projects/ProjectsTable.tsx` | component | n/a | `src/components/admin/leads/LeadsTable.tsx` | exact |
| `src/components/admin/projects/ProjectFilters.tsx` | component | GET query | `src/components/admin/leads/LeadFilters.tsx` | exact |
| `src/components/admin/projects/PostFactForm.tsx`, `RevokePanel.tsx` | component (client form) | request-response | `src/components/admin/leads/LostPanel.tsx`, `CorrectSourceForm.tsx` | exact |
| `src/components/admin/projects/FactJournal.tsx` | component | n/a | `src/components/admin/leads/LeadJournal.tsx` | exact |
| `src/components/admin/leads/ConvertDialog.tsx` | component (client dialog) | request-response | `src/components/admin/InviteForm.tsx` | exact |
| `src/components/admin/projects/projects.css` | style | n/a | `src/components/admin/leads/leads.css` | exact |
| `src/app/admin/leads/[id]/page.tsx` (modify: button + converted badge) | component | n/a | itself | exact |
| `src/app/espace-client/page.tsx` (rewrite: frise, who-waits, cards) | component (server page) | request-response | itself + `admin/leads/[id]/page.tsx` | role-match |
| `src/app/espace-client/actions.ts` (onboarding save, consent, upload, download) | controller | request-response | `src/app/admin/leads/actions.ts` (swap `requireAdmin` for `requireClient`) | role-match |
| `src/components/portal/project/{Timeline,WhoWaits,OnboardingCard,FilesCard,LinksCard,ConsentCard}.tsx` | component | request-response | `InviteForm.tsx`, `LostPanel.tsx` (forms); `NoAccess.tsx` (cards) | role-match |
| `src/components/portal/client.css` (extend `pt-step-*`, `pt-who-*`, `pt-onb-*`, `pt-file-*`) | style | n/a | itself | exact |
| `tests/rls/{projects,facts,files,mailoutbox,convert,consents}.rls.test.ts` | test | RLS on Supabase branch | `tests/rls/leads.rls.test.ts` | exact |
| `tests/rls/helpers.ts` (modify: `makeProject`, `postFact`, tolerant `cleanup`) | test util | n/a | itself | exact |
| Unit tests: `steps.test.ts`, `onboardingSchema.test.ts`, `blocking.test.ts`, `convert.test.ts`, `outbox.test.ts`, `rules.test.ts`, cron `route.test.ts`, UI guards | test | n/a | `src/app/admin/actions.test.ts`, `src/components/admin/leads/leadsUi.test.ts`, `src/app/api/consent/route.test.ts` | exact |

## Pattern Assignments

### `supabase/migrations/20261004000000_sv_projects_engine.sql` (migration, CRUD + append-only)

**Analog:** `supabase/migrations/20261003000000_sv_leads_core.sql` (tables, grants, policies, `deny_mutation`, RPC); `20261002000000_sv_foundation.sql` (helpers).

**Table + RLS + grants pattern** (leads_core lines 97-122, sv_lead_events):
```sql
create table if not exists public.sv_lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sv_leads (id) on delete restrict,
  type text not null check (type in (...)),
  actor text not null,
  ...
  created_at timestamptz not null default now()
);
alter table public.sv_lead_events enable row level security;
revoke all on public.sv_lead_events from anon, authenticated, service_role;
grant select on public.sv_lead_events to authenticated;
grant select, insert on public.sv_lead_events to service_role;

drop policy if exists sv_lead_events_admin_read on public.sv_lead_events;
create policy sv_lead_events_admin_read on public.sv_lead_events
  for select to authenticated
  using ((select sv_private.is_admin()));
```
Use this for `sv_project_facts`, `sv_project_consents`, `sv_project_fact_notes` (admin-only read, like `sv_lead_notes`, lines 124-141). Child tables readable by the owner client use `(select sv_private.is_admin()) or client_id in (select sv_private.client_ids())` (foundation lines 169-172).

**Append-only trigger pattern** (leads_core lines 159-167): reuse the existing function, do not redefine it unless needed.
```sql
drop trigger if exists sv_lead_events_no_upd_del on public.sv_lead_events;
create trigger sv_lead_events_no_upd_del
  before update or delete on public.sv_lead_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_lead_events_no_truncate on public.sv_lead_events;
create trigger sv_lead_events_no_truncate
  before truncate on public.sv_lead_events
  for each statement execute function sv_private.deny_mutation();
```
Apply to `sv_project_facts` and `sv_project_consents`. Actor columns are plain `uuid` WITHOUT FK; `project_id -> client_id` FK is `on delete restrict` (RESEARCH Pitfall 1). Note the existing `sv_leads.converted_client_id` is `on delete set null` (leads_core line 43), which is allowed since `sv_leads` has no update-deny trigger.

**Helper pattern for `sv_private.project_ids()`** (foundation lines 104-114):
```sql
create or replace function sv_private.client_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select client_id from public.sv_client_members where user_id = (select auth.uid()); $$;
revoke all on function sv_private.client_ids() from public, anon;
grant execute on function sv_private.client_ids() to authenticated;
```

**RPC pattern** (leads_core lines 360-434, `sv_set_lead_status`): `security definer`, `set search_path = ''`, `select ... for update`, named exceptions `sv_*` with `errcode = 'P0001'`, idempotent early return `jsonb_build_object(..., 'changed', false)`, then:
```sql
revoke all on function public.sv_set_lead_status(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sv_set_lead_status(uuid, text, uuid, text, text) to service_role;
```
Copy for `sv_convert_lead` (lock lead `for update`, check `erased_at`, `converted_client_id`, status in `qualified|rdv|quote_sent|signed`; update `converted_client_id` is NOT protected by `protect_lead_source`, lines 190-197), `sv_post_project_fact` (lock `sv_projects` row `for update`), `sv_claim_due_mail` (`for update skip locked`).

**CHECK extension:** `sv_lead_events.type` check (lines 100-103) lacks `'lead_converted'`; migration must drop and re-add the constraint (name unverified, A3 in RESEARCH: verify on branch with `pg_constraint`).

**Bucket:** the only storage precedent is Gecko (`20260921000000_gecko_cabane_integration.sql` line 205 `insert into storage.buckets (id, name, public)`). Create `sv-project-files` private with `file_size_limit` and `allowed_mime_types`, no `storage.objects` policy. Do not copy the Gecko policies (lines 209-215).

**View pattern** (leads_core lines 568-584): `create or replace view ... with (security_invoker = true)`, `revoke all ... from anon`, `grant select ... to authenticated`.

---

### `src/lib/server/projects/convert.ts` (service, request-response with compensation)

**Analog:** `src/lib/server/clients/invite.ts`

**Imports / server-only** (lines 1-10):
```typescript
import 'server-only';
import { inviteSchema } from '@/lib/admin/inviteSchema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, isLoginEnabled } from '@/lib/supabase/env';
```

**Result union + PRECONDITION comment** (lines 12-34): copy the discriminated `{ ok: true ... } | { ok: false; code: ... }` shape and the "PRECONDITION: requireAdmin() already ran" docblock.

**Role/duplicate checks to extract and share** (lines 47-65):
```typescript
const adminRow = await admin.from('sv_admins').select('user_id').eq('email', email).limit(1);
if (adminRow.error) return fail('lookup_admin');
if (adminRow.data && adminRow.data.length > 0) return { ok: false, code: 'role_conflict' };
const memberRow = await admin.from('sv_client_members').select('user_id').eq('invited_email', email).limit(1);
...
const existing = await admin.rpc('sv_find_auth_user', { p_email: email });
if (Array.isArray(existing.data) ? existing.data.length > 0 : Boolean(existing.data)) {
  return { ok: false, code: 'existing_account' };
}
```
**createUser + compensation** (lines 67-84):
```typescript
const created = await admin.auth.admin.createUser({ email, email_confirm: true });
const userId = created.data?.user?.id;
if (created.error || !userId) return fail('create_user');
const rollback = async () => {
  try { await admin.auth.admin.deleteUser(userId); } catch { console.error('[admin/invite] rollback failed'); }
};
```
Phase 12 change: after `createUser`, call ONE RPC `sv_convert_lead` (client + member + project + lead link + lead_event + outbox row); on error call `rollback()` (only `deleteUser`, no manual client delete). Map `sv_lead_already_converted`, `sv_lead_not_convertible`, `sv_role_conflict` messages (see `call()` code extraction below). Mail failure never rolls back (invite.ts line 126 comment, `mailSent` flag).

**Error-code extraction + log hygiene** (from `src/lib/server/leads/admin.ts` lines 13-28):
```typescript
async function call(fn: string, run: () => RpcOut): Promise<AdminRpcResult> {
  try {
    const { data, error } = await run();
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : '';
      const code = msg.startsWith('sv_') ? msg.split(/[\s:]/)[0] : 'unknown';
      console.error(`[admin/leads] ${fn} ${code}`);   // code only, no PII
      return { ok: false, code };
    }
    return { ok: true, data };
  } catch { ... }
}
```
**Test analog:** `src/lib/server/clients/invite.test.ts` (mocks Resend and admin client). Update it when invitation moves to the outbox.

---

### `src/lib/server/projects/facts.ts`, `onboarding.ts` (service, RPC wrappers)

**Analog:** `src/lib/server/leads/admin.ts` (lines 30-46 shown above).
```typescript
export function setLeadStatus(a: { leadId: string; status: string; actor: string; ... }) {
  return call('sv_set_lead_status', () =>
    createSupabaseAdminClient().rpc('sv_set_lead_status', {
      p_lead_id: a.leadId, p_status: a.status, p_actor: a.actor, ...
    }),
  );
}
```
One exported function per RPC (`postProjectFact`, etc.), file starts with `import 'server-only';`. Extract `call()` into a shared module or copy it (it is not exported today).

---

### `src/lib/projects/steps.ts` (pure utility)

**Analog:** `src/lib/admin/leadLabels.ts` (lines 1-13): `as const` tuples + `Record<Union, string>` labels, "Module sûr côté client", no server imports. Use the RESEARCH `GATES` / `effectiveTypes` / `currentStep` sketch (RESEARCH lines 296-311). Export `STEPS` with French names from UI-SPEC (Onboarding, Cadrage et devis, Contrat et acompte, Production, Recette, Livraison et solde). Tested by colocated `steps.test.ts` (Vitest, no DB).

---

### `src/lib/projects/onboardingSchema.ts` (zod)

**Analog:** `src/lib/admin/inviteSchema.ts` (lines 1-40) and `leadSchemas.ts`:
```typescript
import { z } from 'zod';
export const inviteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().trim().toLowerCase().max(254),
  siret: z.string().transform((s) => s.replace(/\s/g, '')).pipe(z.string().regex(/^\d{14}$/)),
  ...
});
export const INVITE_COPY = { siretInvalid: '...', ... };
```
Zod v4 style (`z.email()`, `z.string().uuid()` also used in `leadSchemas.ts` line 6). Keep a `*_COPY` object next to schemas for French messages. For URL fields, validate protocol `https:` (RESEARCH security table).

---

### `src/app/admin/leads/actions.ts` (add `convertLeadAction`) and `src/app/admin/projets/actions.ts`

**Analog:** `src/app/admin/leads/actions.ts`

**Imports and state type** (lines 1-28):
```typescript
'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
export type LeadActionState = { status: 'idle' | 'success' | 'error'; message?: string };
function str(fd: FormData, key: string): string { const v = fd.get(key); return typeof v === 'string' ? v : ''; }
function err(message: string): LeadActionState { return { status: 'error', message }; }
function refresh(leadId: string) { revalidatePath('/admin/leads'); revalidatePath(`/admin/leads/${leadId}`); }
```
**Guard-first action pattern** (lines 30-55):
```typescript
// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-21).
export async function setStatusAction(_prev: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const { user } = await requireAdmin();
  const parsed = statusSchema.safeParse({ leadId: str(formData, 'leadId'), status: str(formData, 'status') });
  if (!parsed.success) return err(ADMIN_COPY.statusError);
  const res = await setLeadStatus({ ..., actor: user.id });
  if (!res.ok) return err(ADMIN_COPY.statusError);
  refresh(parsed.data.leadId);
  return { status: 'success', message: ... };
}
```
**Company-from-FormData reuse** for conversion: `src/app/admin/actions.ts` lines 19-45 (`COMPANY_FIELDS`, `field()`, `buildCompany()`), and the `switch (result.code)` mapping to `INVITE_COPY` (lines 74-91). Prefer exporting `buildCompany` rather than duplicating. Throttle pattern for resend actions: lines 94-124 (`hitThrottle`, `throttleKey` with sha256).

**Test analog:** `src/app/admin/actions.test.ts` lines 1-60: `vi.mock('@/lib/server/auth/dal')`, `requireAdmin.mockRejectedValue(new Error('NOT_FOUND'))` then assert the service was not called; `vi.mock('next/cache')`.

---

### `src/app/espace-client/actions.ts` (client Server Actions)

**Analog:** `src/app/admin/leads/actions.ts` structure with `requireClient()` from `src/lib/server/auth/dal.ts` (lines 92-122):
```typescript
export async function requireClient(): Promise<ClientContext> {
  const session = await getVerifiedSession();
  if (!session) redirect('/connexion?next=/espace-client');
  ... if (!member || !client) return { status: 'no_access', user: session.user };
  return { status: 'ok', supabase: session.supabase, user: session.user, client: { id, name } };
}
```
Rules: `client_id` always comes from `ctx.client.id`, never from FormData; return early when `ctx.status !== 'ok'`; ownership of a `projectId` is verified by reading `sv_projects` with `ctx.supabase` (RLS) before any service_role call. Writes go through `server-only` modules (RPC), not through the user client (tables are select-only to `authenticated`).

---

### `src/app/admin/projets/page.tsx` (server page, filter/sort via GET)

**Analog:** `src/app/admin/leads/page.tsx`

**Shell + guard + RLS read** (lines 1-17, 41-66):
```typescript
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads' };
type SearchParams = Record<string, string | string[] | undefined>;
function one(v: string | string[] | undefined): string | undefined { return Array.isArray(v) ? v[0] : v; }
...
const { supabase } = await requireAdmin();           // read via RLS client, never service_role
const sp = await searchParams;
const statut = rawStatut && (STATUS_ORDER as readonly string[]).includes(rawStatut) ? rawStatut : undefined; // whitelist query params
```
**Layout** (lines 92-98): `<ShellHeader variant="admin" .../> <ShellMain width="admin"><div className="pt-admin" style={{display:'flex',flexDirection:'column',gap:32}}><AdminNav current="..."/><section className="pt-card">...`.
**Empty states** (lines 111-130): `pt-empty` + `pt-heading` + `pt-helper` + `Reset` Link; same two variants (no data / filters) required by UI-SPEC. Pager: `pt-lead-pager` (lines 134-147).
Difference: sort/filter by stage and blocage happen in memory after `deriveProjectState` (RESEARCH Pattern 7), not in the Supabase query.

---

### `src/app/admin/projets/[id]/page.tsx` (server page, sheet)

**Analog:** `src/app/admin/leads/[id]/page.tsx`
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { supabase } = await requireAdmin();
const { id } = await params;
if (!UUID_RE.test(id)) notFound();
const { data } = await supabase.from('...').select('explicit, columns').eq('id', id).maybeSingle();
if (!data) notFound();
const [{ data: a }, { data: b }] = await Promise.all([ supabase.from(...)..., supabase.from(...)... ]);
```
Layout: `pt-lead-header`, `pt-lead-grid` with `pt-lead-main` / `pt-lead-side` (lines 97-141). Back link: this page uses `<Link className="pt-btn-text">Retour aux leads</Link>` (UI-SPEC mentions `pt-back`; check `admin.css`). Casting rows via `as unknown as Row[]` is the local convention.

---

### `src/components/admin/leads/ConvertDialog.tsx` (client dialog reusing invite form)

**Analog:** `src/components/admin/InviteForm.tsx`. UI-SPEC says to reuse, not duplicate, the lookup/readback logic. Plan should extract the SIRET lookup + company readback (lines 44-354: `onSiretChange`, `runLookup`, `applyCompany`, `showSummary` / `showInputs`, hidden fields `CompanyHidden`, `HIDDEN_KEYS`) into a shared component with props for prefilled `name`/`email` and the `formAction`. Keep these load-bearing details:
```typescript
const [state, formAction, pending] = useActionState(async (prev, fd) => { const result = await inviteClientAction(prev, fd); if (result.status === 'success') resetAll(); return result; }, INITIAL);
<form action={formAction} noValidate onSubmit={(e) => { if (loading) e.preventDefault(); }}>
<button type="submit" className="pt-btn-primary" disabled={pending || loading}>
```
Messages: `<p className="pt-error"><AlertCircle size={16} aria-hidden="true" />...` inside `aria-live="polite"` div (lines 332-345). Dialog is a native `<dialog>` with `showModal()` (UI-SPEC), no existing dialog analog in repo.

---

### `src/components/admin/projects/PostFactForm.tsx` / `RevokePanel.tsx` (client form + inline panel)

**Analog:** `src/components/admin/leads/LostPanel.tsx` (lines 12-67)
```typescript
'use client';
const [state, formAction, pending] = useActionState(markLostAction, INITIAL);
useEffect(() => { if (state.status === 'success') onClose(); }, [state, onClose]);
<form action={formAction} className="pt-lead-panel">
  <input type="hidden" name="leadId" value={leadId} />
  <textarea id=... name="note" maxLength={NOTE_MAX} rows={3} ... />
  <p className="pt-field-help">{note.length} / {NOTE_MAX}</p>
  {state.status === 'error' ? <p className="pt-error" aria-live="polite">{state.message}</p> : null}
  <div className="pt-lead-panel-actions">
    <button type="submit" className="pt-btn-primary" disabled={!reason || pending}>...</button>
    <button type="button" className="pt-btn-ghost" onClick={onClose}>...</button>
```
`RevokePanel` follows exactly this (reason 10-500 chars, `--warm` ghost confirm). Also see `CorrectSourceForm.tsx` for a form with a mandatory reason of 10-500 chars (schema `correctionSchema`).

---

### `src/components/admin/projects/ProjectsTable.tsx`, `ProjectFilters.tsx`, `FactJournal.tsx`

**Analogs:** `LeadsTable.tsx` (typed `Row` interface, `orDash`, `pt-table pt-admin-table`, `<caption className="pt-sr-only">`, `data-label` on each td, `th scope="col"`), `LeadFilters.tsx` (GET form), `LeadJournal.tsx` (`EventRow`/`NoteRow`, `actorLabel`, `EM_DASH`, `formatDateFr` from `@/lib/admin/format`). Badges use `pt-lead-badge` with lucide icons size 14 (`RotateCcw` example, `LeadsTable.tsx` lines 27-33). Admin-only note text goes in a separate table read by the admin client only (Pitfall 4).

---

### `src/app/espace-client/page.tsx` (rewrite)

**Analog:** itself (lines 1-67): keep the shell and `NoAccess` branch:
```typescript
export const dynamic = 'force-dynamic';
const ctx = await requireClient();
if (ctx.status === 'no_access') {
  return (<ShellMain width="client"><NoAccess action={<SignOutButton />} /></ShellMain>);
}
return (<><ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} /><ShellMain width="client">...<ShellFooter /></>);
```
Keep the "Votre interlocuteur" block (lines 54-61) at the bottom, per UI-SPEC. Data reads use `ctx.supabase` (RLS), explicit column lists, `Promise.all` pattern from `admin/leads/[id]/page.tsx` lines 57-72. Existing classes `pt-card pt-client`, `pt-client-block`, `pt-client-list`, `pt-client-contact`.

---

### `src/lib/server/mail/outbox.ts` and `rules.ts`, new email templates

**Analog (send):** `invite.ts` lines 142-160
```typescript
async function sendInvitationEmail(email: string, clientName: string): Promise<boolean> {
  try {
    const mail = buildInviteEmail({ clientName, loginUrl: buildLoginUrl(email) });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: INVITE_EMAIL_FROM, to: email, replyTo: INVITE_EMAIL_REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text });
    if (result.error) console.error('[admin/invite] mail send failed');
    return !result.error;
  } catch { console.error('[admin/invite] mail send failed'); return false; }
}
```
Phase 12: same, but second arg `{ idempotencyKey: row.dedupe_key }`, status transitions `pending -> sending -> sent|failed`, never throw into the business operation, no PII in logs or `last_error`. `buildLoginUrl(email)` (lines 138-140) is exported and reusable.

**Analog (template):** `src/lib/server/mail/inviteEmail.ts`: `buildFromHeader` constants (lines 5-6), local `escapeHtml` (lines 11-18; consider exporting it), `{ subject, html, text }` return, inline styles on `#111213` card, CTA `#C4F542`, no image/pixel, no price. New templates (`step_changed`, `onboarding_completed`) copy this structure; test analog `inviteEmail.test.ts`.

**`rules.ts`:** `Record<MailEvent, Rule>` typed table; analog is the typed `Record<LeadStatus, string>` in `leadLabels.ts` (lines 5-12).

---

### `src/app/api/cron/mail/route.ts` (route, batch)

**Partial analog:** `src/app/api/consent/route.ts` (Next route handler imports `NextResponse` from `next/server`, `zod`, `hitThrottle`). There is no cron route and no bearer-secret check in the repo; use RESEARCH Pattern 3: `GET`, compare `request.headers.get('authorization')` to `` `Bearer ${process.env.CRON_SECRET}` `` in constant time, return 401 otherwise, then call `processDueMail()`. Test analog: `src/app/api/consent/route.test.ts`. Confirm `/api/cron` is absent from `PRIVATE_PREFIXES`/`PROTECTED_PREFIXES` in `src/lib/privateRoutes.ts` (lines 5-8) and from `src/proxy.ts` matcher (it is).

---

### `src/lib/server/projects/files.ts` (service, file I/O)

**No in-repo analog** for Storage. Reuse only: `import 'server-only'`, `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`), `call()` error hygiene. Follow RESEARCH Pattern 5 and Code Examples (`createSignedUploadUrl`, `createSignedUrl(path, 120, { download })`). Authorization = read the `sv_project_files` row with the user's RLS client first (same idea as `admin/leads/actions.ts` `eraseLeadAction` lines 112-129, which reads through `supabase` from `requireAdmin()` before calling the service_role function).

---

### `tests/rls/*.rls.test.ts` and `tests/rls/helpers.ts`

**Analog:** `tests/rls/leads.rls.test.ts` (lines 1-52):
```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, anonClient, cleanup, makeAdmin, makeClient, makeGeckoAdmin, makeLeadViaRpc, makeUser, svc, uniqueEmail, type TestUser } from './helpers';
beforeAll(async () => {
  adminUser = await makeUser('leadadmin'); await makeAdmin(adminUser);
  plainUser = await makeUser('leadplain'); memberUser = await makeUser('leadmember');
  const c = await makeClient('RLS Leads Client'); await addMember(c.id, memberUser);
  geckoUser = await makeUser('leadgecko'); await makeGeckoAdmin(geckoUser);
});
afterAll(cleanup);
// assertion style:
const { error } = await svc().from('sv_leads').update(patch).eq('id', lead.lead_id);
expect(error?.message, JSON.stringify(patch)).toContain('sv_source_frozen');
```
Helpers to add in `helpers.ts` following `makeLeadViaRpc` (lines 117-146, calls an RPC through `svc()` and throws `new Error(\`... failed: ${error.message}\`)`): `makeProject(clientId, opts)`, `postFact(projectId, type, ...)`. `cleanup()` (lines 162-169) deletes clients then users; adjust to tolerate client deletion failures when projects exist (see lines 159-161 comment about leads/events, same rationale). Use `uniqueEmail()` and `randomSiret()`. Tests required per RESEARCH: client A vs B, anon, Gecko user, admin, immutability of facts/consents, double conversion (`sv_lead_already_converted`), bucket access denied.

**Source-guard unit tests:** `src/components/admin/leads/leadsUi.test.ts` lines 1-40 (read page source with `readFileSync`, assert `requireAdmin()` precedes the data read, assert no `createSupabaseAdminClient`, banned strings `gsap`, `CustomCursor`, `dangerouslySetInnerHTML`). Copy for new admin projects pages and portal components; add a no-price/no-euro assertion on new copy.

## Shared Patterns

### Admin guard before any privileged call
**Source:** `src/lib/server/auth/dal.ts` lines 71-81, applied in `src/app/admin/leads/actions.ts`
```typescript
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const session = await getVerifiedSession();
  if (!session) redirect('/connexion?next=/admin');
  const { data: admin } = await session.supabase.from('sv_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!admin) notFound();
  return session;
}
```
**Apply to:** every admin page and Server Action (call before validation), including project actions and convert.

### Client guard, client_id from session
**Source:** `dal.ts` lines 92-122 (`requireClient`). **Apply to:** all `/espace-client` pages and actions.

### service_role confinement
**Source:** `src/lib/supabase/admin.ts` (`import 'server-only'`, comment "NE JAMAIS importer dans un composant 'use client'"). Pages read through the RLS client from `requireAdmin()`/`requireClient()`; service_role only inside `src/lib/server/**` modules. Guarded by source tests (`leadsUi.test.ts` lines 17-20).

### RPC error codes, no PII in logs
**Source:** `src/lib/server/leads/admin.ts` lines 13-28 (shown above). **Apply to:** all new `src/lib/server/projects/*.ts` and `mail/outbox.ts`.

### Server Action state + `useActionState`
**Source:** `LeadActionState` / `InviteState` (`{ status: 'idle'|'success'|'error'; message? }`), consumed with `useActionState(action, INITIAL)` in `LostPanel.tsx` and `InviteForm.tsx`. **Apply to:** all new forms; `pending` disables the submit button (prevents double conversion).

### Append-only + RPC-only writes
**Source:** `20261003000000_sv_leads_core.sql` lines 97-122, 147-167, 360-434. **Apply to:** facts, consents, fact notes, outbox writes; `revoke all ... from public, anon, authenticated` then `grant execute ... to service_role` on every RPC.

### French copy objects
**Source:** `INVITE_COPY` (`src/lib/admin/inviteSchema.ts`), `ADMIN_COPY` / `*_LABELS` (`src/lib/admin/leadLabels.ts`). **Apply to:** a `PROJECT_COPY` module holding all strings from the UI-SPEC copywriting contract; schemas in client-safe modules (zod only, no server imports).

### Date/format helpers
**Source:** `src/lib/admin/format.ts` (`formatDateFr`, `EM_DASH`, `normalizeSiretInput`). Extend with fr-FR long date / "{n} jours" durations in Europe/Paris per UI-SPEC.

### Styling
**Source:** `src/components/portal/client.css`, `src/components/admin/admin.css`, `src/components/admin/leads/leads.css` (scoped `.pt-root` / `.pt-admin`; reuse `pt-card`, `pt-table`, `pt-lead-*`, `pt-error|warn|success`). New rules: no 12px, no `--ink-faint` text, no new sizes.

### Private routes
**Source:** `src/lib/privateRoutes.ts` lines 5-8 and `src/proxy.ts` `config.matcher`. New pages (`/admin/projets`, `/espace-client/...`) are already covered by the `/admin` and `/espace-client` prefixes; no change needed.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `vercel.json` | config | cron schedule | File does not exist; use `{ "crons": [{ "path": "/api/cron/mail", "schedule": "0 6 * * *" }] }` (daily only, Hobby constraint) |
| `src/app/api/cron/mail/route.ts` bearer check | route | batch | No cron endpoint or `CRON_SECRET` pattern exists; only the generic route shape from `api/consent/route.ts` |
| `src/lib/server/projects/files.ts` (Storage signed upload/download) | service | file-I/O | No Storage usage in app code; only Gecko SQL bucket creation exists |
| Native `<dialog>` modal (ConvertDialog shell) | component | UI | No dialog component in repo; `LostPanel` is an inline panel. Follow UI-SPEC S4 |
| `<progress>`-based upload UI, timeline `<ol>` | component | UI | No equivalents; follow UI-SPEC |

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/lib/server/{clients,leads,mail,auth}`, `src/lib/admin`, `src/lib/supabase`, `src/app/{admin,espace-client,api}`, `src/components/{admin,portal}`, `tests/rls/`, `src/proxy.ts`, `src/lib/privateRoutes.ts`
**Files scanned:** ~35 (read in full or targeted ranges)
**Pattern extraction date:** 2026-10-03
