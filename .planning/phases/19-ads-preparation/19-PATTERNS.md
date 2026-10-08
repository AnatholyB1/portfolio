# Phase 19: Ads preparation - Pattern Map

**Mapped:** 2026-10-08
**Files analyzed:** 22 (9 new, 13 modified)
**Analogs found:** 21 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/attribution/utm.ts` (new) | utility (pure rules) | transform | `src/lib/attribution/params.ts` | exact |
| `src/lib/attribution/utm.test.ts` (new) | test | transform | `src/lib/attribution/params.test.ts` | exact |
| `src/lib/attribution/params.ts` (mod) | utility | transform | itself | n/a |
| `src/lib/attribution/touch.ts` (mod, `Touch.raw`) | utility | transform | itself | n/a |
| `src/lib/attribution/cookie.ts` (mod, field `w`, size guard) | utility | transform | itself | n/a |
| `src/lib/leads/requestAttribution.ts` (mod) | service | request-response | itself | n/a |
| `src/lib/leads/ingest.ts` (mod, `p_source` keys) | service | CRUD (RPC) | itself | n/a |
| `src/lib/ads/events.ts` (new) | utility (pure taxonomy + uuid v5) | transform | `src/lib/attribution/params.ts` (constants + pure fns) | role-match |
| `src/lib/ads/events.test.ts` (new) | test | transform | `src/lib/attribution/params.test.ts` | role-match |
| `src/lib/server/ads/conversions.ts` (new) | service (server-only loader) | CRUD read | `src/lib/server/reviews/admin.ts` | exact |
| `supabase/migrations/20261011000000_sv_ads_conversions.sql` (new) | migration | event-driven (trigger) | `20261003000000_sv_leads_core.sql` | exact |
| `src/lib/adsMigration.test.ts` (new) | test (static SQL) | transform | `src/lib/pilotageMigration.test.ts` | exact |
| `tests/rls/ads.rls.test.ts` (new) | test (RLS, branch) | request-response | `tests/rls/funnel.rls.test.ts` | exact |
| `src/app/admin/liens/page.tsx` (new) | route (server page) | request-response | `src/app/admin/avis/page.tsx` | exact |
| `src/components/admin/links/LinkBuilder.tsx` (new) | component (client) | event-driven (live compute) | `src/components/admin/leads/CorrectSourceForm.tsx` | role-match |
| `src/components/admin/links/links.css` (new) | config (css) | n/a | `src/components/admin/leads/leads.css` | role-match |
| `src/components/admin/AdminNav.tsx` (mod) | component | n/a | itself | n/a |
| `src/components/admin/funnel/FunnelTable.tsx` + `src/lib/admin/funnel.ts` (mod) | component + utility | transform | themselves | n/a |
| `src/components/admin/leads/LeadsTable.tsx` (mod) | component | n/a | `ReturnBadge` in same file | exact |
| `src/components/admin/leads/AttributionCard.tsx` (mod) | component | n/a | itself | n/a |
| `src/components/admin/leads/ConversionsCard.tsx` (new) | component (server) | CRUD read | `AttributionCard.tsx` | exact |
| `src/app/admin/leads/[id]/page.tsx` (mod) | route | request-response | itself | n/a |
| `docs/convention-utm.md` (new) | doc | n/a | `docs/strategie-seo-geo-llm-2026-09.md` | partial (format only) |

## Pattern Assignments

### `src/lib/attribution/utm.ts` (utility, transform)

**Analog:** `src/lib/attribution/params.ts` (lines 1-45)

Pure module: no `next/*`, supabase or `node:*` import (proxy runs on edge). Header comment, exported `as const` lists, derived types, pure functions.

```typescript
// Pure attribution parsing (no next/*, supabase or node:* imports).
export const ALLOWED_KEYS = ['utm_source', ... ] as const;
export const MAX_VALUE_LENGTH = 200;
export type AttrKey = (typeof ALLOWED_KEYS)[number];
export type AttrParams = Partial<Record<AttrKey, string>>;
```

Import `type AttrParams` from `./params`. Canonicalisation hooks into `parseAttrParams` at the point where utm values are lowercased (lines 36-42), AFTER `v.toLowerCase()` and BEFORE `out[key] = v`:

```typescript
let v = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim();
if (!click) v = v.toLowerCase();
if (v.length === 0 || v.length > MAX_VALUE_LENGTH) continue;
out[key] = v;
```

Keep it idempotent (`decodeTouch` re-runs `parseAttrParams`, cookie.ts line 83). Raw alias values need a side channel: `parseAttrParams` returns only `AttrParams`; the planner must either add a sibling function (e.g. `parseAttrParamsWithRaw`) or an optional out-param, keeping the existing signature so `params.test.ts` and the proxy stay valid. Only evaluate `assessUtm` when a `utm_*` key is present (referrer-derived sources from `classifyChannel`, touch.ts lines 66-74, are never flagged).

Classification shape to reuse for the channel: `classifyChannel` (touch.ts 55-76) already reads `p.utm_source/utm_medium/utm_campaign`; canonical values flow through with no change.

### `src/lib/attribution/cookie.ts` + `touch.ts` (modifications)

- `Touch` type is `{ params, landing, referrer, at }` (touch.ts line 3); add optional `raw?`.
- `serialise` (cookie.ts line 34) writes `{ p, l, r, a }`; add `w` only when `raw` present.
- `encodeTouch` size guard (lines 44-58) drops fields in order `utm_term, utm_content`, then referrer, then `utm_campaign, ttclid, fbclid, gclid, utm_medium`. Drop `w` FIRST (before utm_term).
- `decodeTouch` (lines 79-92) rebuilds params via `parseAttrParams`; add `raw` validation there (strings only, <= 200).
- Update `cookie.test.ts`, `touch.test.ts`, `params.test.ts` (pins `ALLOWED_KEYS` length 8, line 13: unchanged).

### `src/lib/leads/ingest.ts` + `requestAttribution.ts` (modifications)

`ingest.ts` line 31 sends `p_source: a.source` (a `ChannelSource`). Extend the jsonb with `nonconformity` and `raw` so the 13-arg RPC signature stays unchanged (`ingest.ts` lines 22-38). `requestAttribution.ts` line 48 builds `source: classifyChannel(lastTouch ?? firstTouch)`; compute `assessUtm` there and extend `RequestAttribution` / `ChannelSource`. `ingest.test.ts` asserts `p_source: i.attribution.source` (research note): update that assertion deliberately.

Error-log convention to keep (ingest.ts lines 39-42): code only, never PII.

```typescript
console.error('[leads/ingest] rpc failed', error.code ?? 'unknown');
```

### `src/lib/ads/events.ts` (utility, transform)

**Analog:** `src/lib/attribution/params.ts` for style (closed `as const` list + derived type). Server-only vs pure: RESEARCH Code Examples use `node:crypto`; this must NOT be imported from `src/lib/attribution` or any proxy-bundled module. Mark the file `import 'server-only'` only if it never needs browser use (D-07 says no browser event now). `src/lib/ads` must stay price-free (`priceScope.ts` zones).

Use the RESEARCH snippet verbatim (`uuidV5`, `eventIdFor`, `EVENT_NAMESPACE = '87713031-3054-582f-9073-0aa58d13d20e'`). Golden vector for the test: lead `00000000-0000-4000-8000-000000000001` + `lead_submitted` -> `c2906e05-76be-58a0-b812-a56ec50f0a76`.

### `src/lib/server/ads/conversions.ts` (service, CRUD read)

**Analog:** `src/lib/server/reviews/admin.ts` (lines 1-60)

```typescript
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const REVIEW_COLS = 'id, project_id, ...';
export async function loadAdminReviews(supabase: SupabaseClient): Promise<AdminReview[]> {
  const { data: reviews, error } = await supabase
    .from('sv_reviews').select(REVIEW_COLS).order('published_at', { ascending: false });
  if (error) throw new Error('reviews_read_failed');
```

Reads go through the caller's RLS client (admin policy), never `service_role`. Select `sv_conversion_events` by `lead_id`, ordered by rank/occurred_at. Prices allowed here (`src/lib/server` zone).

### `supabase/migrations/20261011000000_sv_ads_conversions.sql` (migration)

**Analog:** `supabase/migrations/20261003000000_sv_leads_core.sql`

Table + RLS + grants block (lines 97-122), copy exactly:

```sql
alter table public.sv_lead_events enable row level security;
revoke all on public.sv_lead_events from anon, authenticated, service_role;
grant select on public.sv_lead_events to authenticated;
grant select, insert on public.sv_lead_events to service_role;
create index if not exists sv_lead_events_lead_idx on public.sv_lead_events (lead_id, created_at);
drop policy if exists sv_lead_events_admin_read on public.sv_lead_events;
create policy sv_lead_events_admin_read on public.sv_lead_events
  for select to authenticated
  using ((select sv_private.is_admin()));
```

For `sv_conversion_events` grant only `select` to `authenticated` and `service_role` (writes only via the SECURITY DEFINER trigger).

Append-only (lines 147-167): reuse the existing `sv_private.deny_mutation()` (do not redefine), add per-table triggers:

```sql
drop trigger if exists sv_lead_events_no_upd_del on public.sv_lead_events;
create trigger sv_lead_events_no_upd_del
  before update or delete on public.sv_lead_events
  for each row execute function sv_private.deny_mutation();
create trigger sv_lead_events_no_truncate
  before truncate on public.sv_lead_events
  for each statement execute function sv_private.deny_mutation();
```

Function boilerplate (lines 147-157, 180-204) for `sv_private.emit_conversions()`:

```sql
create or replace function sv_private.emit_conversions()
returns trigger language plpgsql security definer set search_path = '' as $$ ... $$;
revoke all on function sv_private.emit_conversions() from public, anon;
```

Trigger timing facts (lines 410-423): `sv_set_lead_status` UPDATEs `sv_leads` (with `coalesce(qualified_at, now())` etc., lines 414-417, jumps fill lower stages; internal rank there is qualified=1..signed=4, different from the journal rank lead=1..signed=4) THEN inserts `sv_lead_events` `status_changed`, so an AFTER INSERT trigger on `sv_lead_events` sees stage timestamps. `sv_ingest_lead` inserts the lead before `lead_created` (lines ~296, 339). Do NOT redefine `sv_set_lead_status`.

Frozen-source trigger (lines 180-209): add `source_nonconformity` / `source_raw` to the `is distinct from` list in `protect_lead_source`, so redefine it with `create or replace`. `sv_correct_lead_source` (line 436) sets `sv.allow_source_change`; extend it to clear `source_nonconformity`.

`create or replace function public.sv_ingest_lead(...)` must keep the exact 13-type signature and the revoke/grant lines (lines 357-358):

```sql
revoke all on function public.sv_ingest_lead(text, text, text, text, text, text, jsonb, boolean, jsonb, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.sv_ingest_lead(text, text, text, text, text, text, jsonb, boolean, jsonb, jsonb, jsonb, text, jsonb) to service_role;
```

Read the full body (lines 215-356) before redefining; only add the two new column writes from `p_source`. `sv_leads_admin_v` (around line 583) must be recreated/extended at the END of the column list if the admin reads the flag through it (append-only for `create or replace view`). Funnel view `sv_funnel_v` is in `20261003010000_sv_consent_funnel.sql` (Pitfall 6 in RESEARCH: avoid touching the 9-column union; prefer a separate count).

Migration must satisfy `migrationLint.test.ts` (RLS enabled, revoke all, `set search_path = ''`, exact revoke lines).

### `src/lib/adsMigration.test.ts` (static SQL test)

**Analog:** `src/lib/pilotageMigration.test.ts` (lines 1-80). Copy the helpers `stripComments`, `fnBody`, `quoted` and the per-table assertions (RLS on, `revoke all ... from anon, authenticated, service_role`, `grant select ... to authenticated`, admin policy regex). Ordering test:

```typescript
expect(files.indexOf(NAME)).toBeGreaterThan(files.indexOf('20261010000000_sv_reviews.sql'));
```

Add TS<->SQL parity (SQL `event_name` CHECK list is a subset of `EVENT_NAMES`) and a "no PII column names" assertion.

### `tests/rls/ads.rls.test.ts` (RLS, branch only)

**Analog:** `tests/rls/funnel.rls.test.ts` (lines 1-60)

```typescript
import { anonClient, cleanup, makeAdmin, makeLeadViaRpc, makeUser, svc, uniqueEmail, type TestUser } from './helpers';
beforeAll(async () => { adminUser = await makeUser('funneladmin'); await makeAdmin(adminUser); plainUser = await makeUser('funnelplain'); });
afterAll(cleanup);
const a = await makeLeadViaRpc({ p_email: emailA, p_email_norm: emailA, p_channel: 'simulateur', p_source: touch });
svc().rpc('sv_set_lead_status', { p_lead_id: id, p_status: status, ... })
```

Cover: golden vector DB == TS, replay idempotent, jump emits all ranks, backward emits nothing, lost does not cancel, value at signed from head quote / NULL without quote, anon/non-admin denied, update/delete/truncate denied. Runs via `vitest.rls.config.ts` on the dedicated branch only (never prod; reuse the permanent test client policy for any prod check).

### `src/app/admin/liens/page.tsx` (route, request-response)

**Analog:** `src/app/admin/avis/page.tsx` (lines 1-52, 112-141)

```tsx
import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Avis' };

export default async function AdminAvisPage() {
  const { supabase } = await requireAdmin();
  ...
  return (<>
    <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
    <ShellMain width="admin">
      <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <AdminNav current="avis" />
        <section className="pt-card" aria-labelledby="avis-title">
          <h1 id="avis-title" className="pt-heading" style={{ marginBottom: 16 }}>
```

Note: existing admin pages declare `metadata = { title: ... }` only; the UI-SPEC wants `robots: noindex` explicitly. Check `src/lib/privateRoutes.ts` / `src/app/admin/layout.tsx` for existing noindex handling before adding it per page. The static "Convention" card is server-rendered from `utm.ts` constants (pass vocab to the client `LinkBuilder` as props or import directly; the module is pure so both work). Destination select values come from an allowlist of site paths, origin from `NEXT_PUBLIC_SITE_URL`.

### `src/components/admin/links/LinkBuilder.tsx` (client component)

**Analog:** `src/components/admin/leads/CorrectSourceForm.tsx` (lines 1-74): `'use client'`, lucide icons (`AlertCircle`, `CheckCircle2`; use `TriangleAlert`), label/input class conventions (`pt-lead-label`, `pt-field-help`), `aria-live="polite"` status region, `pt-btn-primary`, CSS import at top.

```tsx
'use client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import './leads.css';
...
<label htmlFor="cs-campaign" className="pt-lead-label">Campagne</label>
<input id="cs-campaign" name="campaign" type="text" maxLength={200} aria-describedby="cs-campaign-help" />
<p id="cs-campaign-help" className="pt-field-help">...</p>
<div aria-live="polite"> ... <p className="pt-success"><CheckCircle2 size={16} aria-hidden="true" /> ...</p></div>
```

Difference: no `useActionState`/server action (live computation, no submit; use `useState` + debounce 300ms, `onSubmit` preventDefault). Imports `buildTrackedUrl`/`assessUtm` from `@/lib/attribution/utm` so the generated link is never non-conformant.

### `src/components/admin/links/links.css`

**Analog:** `src/components/admin/leads/leads.css` (scope under `.pt-admin`, existing `.pt-admin .pt-lead-badge` at line 107 for the badge; focus ring selector list to extend; 44px targets).

### `src/components/admin/AdminNav.tsx` (mod)

Lines 4-14: extend union and `ITEMS`:

```typescript
export type AdminNavItem = 'clients' | 'leads' | 'projets' | 'entonnoir' | 'pilotage' | 'avis' | 'emails';
{ key: 'entonnoir', href: '/admin/entonnoir', label: 'Entonnoir' },
// insert here: { key: 'liens', href: '/admin/liens', label: 'Liens' },
{ key: 'pilotage', ... }
```

Update any AdminNav test key list.

### Funnel indicator (`FunnelTable.tsx`, `funnel.ts`)

`FunnelRow` (funnel.ts 3-14) and `groupFunnelRows` (20-44, accumulates via `STAGES` loop and an explicit object literal) and the `total` reducer plus `totalRow` literal in FunnelTable (lines 36-53) all enumerate fields; add an optional `nonconformingLeads` field and update each. Badge goes in the source cell, line 79:

```tsx
<th scope="row">{r.source || '—'}</th>
```

`rows` come from the funnel page loader (`src/app/admin/entonnoir/page.tsx`, not read here; the planner should read it to see how the view is queried). Keep the 9 visible columns.

### `LeadsTable.tsx` (mod)

Source cell (lines 61-64) and the in-file badge component (lines 25-29):

```tsx
<td role="cell" data-label="Source">
  {orDash(r.source_source)} / {orDash(r.source_medium)}
  {r.source_campaign ? <span className="pt-lead-sub">{r.source_campaign}</span> : null}
function ReturnBadge() { return (<span className="pt-lead-badge">...
```

Add a sibling `OffConventionBadge` with the same markup; row type (lines 10-12) gains `source_nonconformity`; the list query must select it (via `sv_leads_admin_v`, see migration note).

### `AttributionCard.tsx` (mod) and `ConversionsCard.tsx` (new)

**Analog:** `src/components/admin/leads/AttributionCard.tsx` (lines 1-60): helpers `rec()`, `text()`, `EM_DASH`, `pt-summary` dl, `pt-lead-subhead`, `pt-lead-trunc` with `title`, `section.pt-card` + `h2.pt-heading` with `aria-labelledby`. Add the notice block above the first `Touch` and a "Reçu : {raw}" line under the affected `dd`. `ConversionsCard` copies the same section/dl structure; use `formatDateFr` and `EM_DASH` from `@/lib/admin/format`, `formatEuroCents` from `@/lib/admin/funnel` (already used for euros in FunnelTable).

### `src/app/admin/leads/[id]/page.tsx` (mod)

Lead select list at lines 62-68 (`sv_leads_admin_v`, explicit column string; add `source_nonconformity, source_raw`), `LeadDetail` interface (42-55), parallel loads (72-87), card placement in `pt-lead-side` (lines 190-206): render `<ConversionsCard>` right after `<AttributionCard firstTouch=... />` (line 191). Fetch conversions through the new loader with the same `supabase` RLS client.

## Shared Patterns

### Admin guard and RLS client
**Source:** `src/app/admin/avis/page.tsx` line 22 `const { supabase } = await requireAdmin();` from `@/lib/server/auth/dal`. **Apply to:** `/admin/liens`, lead detail changes, `conversions.ts` loader. Never `service_role` in page code.

### Server-only boundaries
`import 'server-only'` at top (ingest.ts, requestAttribution.ts, reviews/admin.ts). **Apply to:** `src/lib/server/ads/conversions.ts`. Pure modules (`utm.ts`, `params.ts`) must have no `next/*` or `node:*` imports.

### Table security (RLS + append-only)
**Source:** leads_core migration lines 97-122, 147-167. **Apply to:** `sv_conversion_events`.

### Error handling
Admin loaders throw short codes (`throw new Error('reviews_read_failed')`) and pages catch to `null`, then render `<p className="pt-error">Impossible de charger ...</p>` (avis/page.tsx lines 24-30, 52-53). Ingest logs code only, no PII.

### Admin UI vocabulary
Reuse classes `pt-card`, `pt-heading`, `pt-helper`, `pt-summary`, `pt-lead-badge`, `pt-lead-subhead`, `pt-lead-trunc`, `pt-error`, `pt-success`, `pt-btn-primary`, `pt-empty`; text rendered as React text only (no `dangerouslySetInnerHTML`); French copy per UI-SPEC.

### Price scope
`src/lib/ads` and `src/lib/attribution` stay price-free; value display only in `src/lib/server` and `src/components/admin` (`priceScope.ts`). Run `priceScope.test.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| SQL UUIDv5 (`uuid_generate_v5` or `sv_private.uuid_v5`) | function | transform | No existing migration references `extensions.` or uuid-ossp; Wave 0 branch probe required |
| `docs/convention-utm.md` | doc | n/a | Only a SEO strategy doc exists in `docs/`; free-form French markdown following UI-SPEC/D-01..D-03 tables |
| Row-level jump logic in the conversions trigger | trigger | event-driven | No existing AFTER INSERT trigger on a journal table; follow RESEARCH Patterns 4-5 (use `sv_set_lead_status` stage `*_at` columns) |

## Metadata

**Analog search scope:** `src/lib/attribution`, `src/lib/leads`, `src/lib/admin`, `src/lib/server/reviews`, `src/app/admin`, `src/components/admin`, `supabase/migrations`, `tests/rls`.
**Not read (planner should read before editing):** `src/proxy.ts`, `src/lib/leads/visits.ts`, `src/app/admin/entonnoir/page.tsx`, `20261003010000_sv_consent_funnel.sql` (`sv_funnel_v`, `sv_record_visit`), `sv_ingest_lead` body (migration lines 215-356), `src/lib/server/pilotage/quotes.ts`.
**Pattern extraction date:** 2026-10-08
