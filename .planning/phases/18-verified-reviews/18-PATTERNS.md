# Phase 18: Verified reviews - Pattern Map

**Mapped:** 2026-10-08
**Files analyzed:** 33 (new or modified)
**Analogs found:** 31 / 33

Line numbers refer to the files as read on 2026-10-08. Paths are relative to `C:\portfolio`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20261010000000_sv_reviews.sql` | migration | CRUD + append-only audit | `supabase/migrations/20261008000000_sv_mail_automation.sql` | exact |
| `src/lib/reviews/token.ts` | utility | transform (HMAC) | `src/lib/server/mail/unsubscribeToken.ts` | exact |
| `src/lib/reviews/publicReviews.ts` | service | request-response (RPC read) | `src/lib/throttle.ts` | role-match |
| `src/lib/reviews/reviewJsonLd.ts` | utility | transform | `src/lib/serviceJsonLd.ts` | exact |
| `src/lib/reviews/reviewJsonLd.test.ts` | test | transform | `src/lib/serviceSchema.test.ts` | exact |
| `src/lib/reviews/schema.ts` | utility | validation | `src/lib/contact-schema.ts` (not read) and zod usage in `reminderHold.actions.ts` | role-match |
| `src/lib/reviews/googleUrl.ts` | utility | transform | `reviewRequestContent` URL check in `reminderEmails.ts` L61-67 | partial |
| `src/lib/reviews/token.test.ts`, `schema.test.ts`, `googleUrl.test.ts` | test | transform | `src/lib/server/mail/*.test.ts` (unsubscribe token test) | role-match |
| `src/lib/server/reviews/*` (ensureLink, moderation wrappers) | service | request-response (RPC) | `src/lib/server/reminders/holds.ts` + `reminderHold.actions.ts` | role-match |
| `src/lib/server/reminders/sweep.ts` (modify) | service | batch | itself | exact |
| `src/lib/server/mail/{rules,outbox,reminderEmails,urls}.ts` (modify) | service | event-driven | themselves | exact |
| `src/lib/privateRoutes.ts` (modify) | config | n/a | itself | exact |
| `src/lib/priceScope.ts` (modify) | config | n/a | itself | exact |
| `src/lib/throttle.ts` (modify: add kind `'review-ip'`) | utility | request-response | itself | exact |
| `src/app/avis/page.tsx` | component (page) | request-response (SSR, revalidate) | `src/app/mentions-legales/page.tsx` | role-match |
| `src/app/avis/[token]/layout.tsx` | component (layout) | n/a | `src/app/desinscription/layout.tsx` | exact |
| `src/app/avis/[token]/page.tsx` | component (page) | request-response (GET read-only) | `src/app/desinscription/page.tsx` | exact |
| `src/app/avis/[token]/ReviewForm.tsx`, `ReviewRatingInput.tsx`, `ReviewThankYou.tsx` | component | request-response | `src/components/portal/AuthCard.tsx` + `LoginForm.tsx` | role-match |
| `src/app/api/avis/route.ts` | route | request-response (POST) | `src/app/api/unsubscribe/route.ts` + `src/app/api/contact/route.ts` | exact |
| `src/app/api/avis/recent/route.ts` | route | request-response (cached GET) | `src/app/api/unsubscribe/route.ts` (response helpers) | partial |
| `src/components/sections/AvisExcerpt.tsx` | component | request-response (client fetch) | `src/components/sections/Partners.tsx` (placement) | partial |
| `src/app/page.tsx` (modify) | component | n/a | itself | exact |
| `src/app/politique-des-avis/page.tsx` | component (page) | static | `src/app/mentions-legales/page.tsx` | exact |
| `src/app/admin/avis/page.tsx` + `avis.actions.ts` | controller (server action) + page | CRUD | `src/app/admin/projets/reminderHold.actions.ts` + `src/app/admin/projets/page.tsx` | exact |
| `src/components/layout/Footer.tsx` (modify) | component | n/a | itself L32-39 | exact |
| `src/app/sitemap.ts`, `public/llms.txt`, `src/app/robots.ts`, `next.config.ts` (modify) | config | n/a | themselves | exact |
| `tests/rls/reviews.rls.test.ts` | test | CRUD | `tests/rls/mailautomation.rls.test.ts` | exact |
| `src/lib/server/reminders/sweep.test.ts`, `outbox.test.ts`, `rules.test.ts`, `privateRoutes.test.ts`, `priceScope.test.ts`, `sitemap.test.ts`, `llms.test.ts`, `proxy.test.ts` (modify) | test | n/a | themselves | exact |
| `src/app/avis/**/*.test.ts` (Google link x5 ratings, policy sections, no-price) | test | n/a | `src/lib/serviceSchema.test.ts` (source-reading tests) | role-match |

## Pattern Assignments

### `supabase/migrations/20261010000000_sv_reviews.sql` (migration)

**Analog:** `supabase/migrations/20261008000000_sv_mail_automation.sql`

**Closed-list extension (no hard-coded constraint name)** (lines 34-54). Copy the loop; change the `ilike` marker to a string from the latest list (`%mail_suppression_admin%`), and append `'review_published_admin'`, `'review_hidden'` to both lists:
```sql
do $$
declare
  v_name text;
begin
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_event_type_check;
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_template_check;
  for v_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%credit_note_issued%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', ... 'review_request', 'mail_suppression_admin'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in (... 'review_request', 'mail_suppression_admin'));
end;
$$;
```

**Append-only table + RLS + admin-read policy** (lines 154-179, `sv_reminder_holds`; reuse for `sv_review_moderation_log` and `sv_review_link_events`):
```sql
create table if not exists public.sv_reminder_holds (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  action text not null check (action in ('suspend', 'resume')),
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.sv_reminder_holds enable row level security;
revoke all on public.sv_reminder_holds from anon, authenticated, service_role;
grant select on public.sv_reminder_holds to service_role;
grant select on public.sv_reminder_holds to authenticated;
create index if not exists sv_reminder_holds_project_idx on public.sv_reminder_holds (project_id, id desc);

drop policy if exists sv_reminder_holds_admin_read on public.sv_reminder_holds;
create policy sv_reminder_holds_admin_read on public.sv_reminder_holds
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_reminder_holds_no_upd_del on public.sv_reminder_holds;
create trigger sv_reminder_holds_no_upd_del
  before update or delete on public.sv_reminder_holds
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_reminder_holds_no_truncate on public.sv_reminder_holds;
create trigger sv_reminder_holds_no_truncate
  before truncate on public.sv_reminder_holds
  for each statement execute function sv_private.deny_mutation();
```
Apply the same `deny_mutation` pair (update/delete AND truncate) to `sv_reviews` (content immutable). `sv_review_links` gets only a delete/truncate denial plus a set-once trigger on `used_at`, `invalidated_at`, `invalidated_by`. Reason `check (char_length(btrim(reason)) between 3 and 300)` pattern is at lines 124-129 (`lifts`); use `between 3 and 500` for `detail`.

**Admin-actor RPC with advisory lock and skip of pending outbox rows** (lines 470-524, `sv_set_reminder_hold`). Template for `sv_moderate_review`, `sv_reissue_review_link`:
```sql
create or replace function public.sv_set_reminder_hold(p_project_id uuid, p_action text, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (select 1 from public.sv_admins a where a.user_id = p_actor_id) then
    raise exception 'sv_not_admin' using errcode = 'P0001';
  end if;
  ...
  perform pg_advisory_xact_lock(hashtextextended('sv_hold:' || p_project_id::text, 0));
  ...
    update public.sv_mail_outbox
    set status = 'skipped', last_error = 'reminder_hold'
    where project_id = p_project_id
      and status in ('pending', 'failed')
      and event_type in ('document_reminder', 'document_reminder_admin', 'review_request');
  ...
  return jsonb_build_object('outcome', 'unchanged', 'skipped', 0);
end;
$$;
revoke all on function public.sv_set_reminder_hold(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.sv_set_reminder_hold(uuid, text, uuid) to service_role;
```
Use the same skip statement (with `last_error = 'review_filed'` / `'link_reissued'`) in `sv_submit_review` and `sv_reissue_review_link`.

**Outbox insert from inside an RPC (admin alert for a new review)** (lines 259-273, `sv_private.queue_suppression_alert`):
```sql
insert into public.sv_mail_outbox (
  event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id
) values (
  'mail_suppression_admin', 'mail_suppression_admin', v_admin, 'admin',
  'mail_suppression_admin:' || p_suppression_id::text,
  jsonb_build_object(...), v_client_id
)
on conflict (dedupe_key) do nothing
returning id into v_id;
```
Return the outbox ids as `jsonb_build_object('outcome', ..., 'outbox_ids', to_jsonb(v_ids))` (lines 419) so the route can call `sendOutboxRow`.

**Single-use consume (new, no analog):** `select ... from public.sv_review_links where token_hash = $1 for update`, check `used_at`, `invalidated_at`, `expires_at`, insert review, set `used_at`. The nearest locking idiom is the advisory lock in `sv_record_unsubscribe` (lines 399-408). Error codes use `raise exception '<code>' using errcode = 'P0001'`.

---

### `src/lib/reviews/token.ts` (utility, transform)

**Analog:** `src/lib/server/mail/unsubscribeToken.ts`

**Secret guard and HMAC pattern** (lines 1-26):
```ts
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_TOKEN = 600;

export function unsubscribeSecret(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.UNSUBSCRIBE_SECRET;
  return typeof v === 'string' && v.length >= 32 ? v : null;
}

function mac(address: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(`unsub:v1:${address}`).digest();
}
```
Adapt: `reviewSecret()` reads `REVIEW_TOKEN_SECRET` (>= 32 chars, null when missing so the caller fails closed), `deriveReviewToken(linkId, secret)` = `createHmac('sha256', secret).update('review:v1:' + linkId).digest('base64url')`, `hashReviewToken(token)` = sha256 hex. Keep the length bound check before hashing (`MAX_TOKEN` pattern at line 31, use 64) and the `try/catch` returning `null` (lines 29-47). No address, token or body in logs. Keep `import 'server-only'` (it is used by the mail and sweep side); the public data module in `src/lib/reviews/publicReviews.ts` also imports it.

---

### `src/lib/reviews/publicReviews.ts` (service, request-response)

**Analog:** `src/lib/throttle.ts` (lives outside `src/lib/server` so public pages may import it; priceScope guard (b))

**Pattern** (lines 1-8, 23-39):
```ts
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
// Hors de src/lib/server pour rester importable par le code public (routes /api, proxy),
// cf. priceScope.test.ts règle (b).

export async function hitThrottle(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_throttle_hit', { ... });
    if (error) { console.error('[auth/throttle] rpc failed'); return false; }
    return data === true;
  } catch {
    console.error('[auth/throttle] unexpected failure');
    return false;
  }
}
```
For `getPublishedReviews(limit)` call `sv_public_reviews` the same way, fail to `[]`, log a fixed string only, return display columns only (never `project_id`, `link_id`, e-mail). JSON-LD and the excerpt must both read this single function (Pitfall 7).

Throttle for the submit route: add `'review-ip'` to `ThrottleKind` (lines 10-16) and call `hitThrottle(hashKey('review-ip', ip ?? 'unknown'), 600, N)`.

---

### `src/lib/reviews/reviewJsonLd.ts` (utility, transform) and its test

**Analog:** `src/lib/serviceJsonLd.ts`

**Purity rule and header comment** (lines 1-4): no `next/*`, React, Supabase imports.

**Builder shape** (lines 14-25) uses `'@context'`, `'@type'`, `'@id': \`${pageUrl}#faq\``. Serialize only with the existing `buildJsonLdScript` (lines 36-38), which escapes `<`:
```ts
export function buildJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```
Import it from `@/lib/serviceJsonLd`; do not add a second serializer. Use the `buildReviewJsonLd` body from RESEARCH.md Pattern 4.

**Test analog:** `src/lib/serviceSchema.test.ts` lines 26-35 and 72-77, the banned-key walk:
```ts
function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [k, ...collectKeys(v)]);
  }
  return [];
}
it('carries no price fields (D-03)', () => {
  const keys = collectKeys(catalog);
  for (const banned of ['price', 'priceRange', 'priceCurrency', 'offers', 'lowPrice', 'highPrice']) {
    expect(keys).not.toContain(banned);
  }
});
```
Extend `banned` with `aggregateRating`, `AggregateRating` (also check values), `ratingCount`, `reviewCount`. Also use the source-reading style of lines 84-103 (`readFileSync` of `src/app/avis/page.tsx`) to assert `AggregateRating` never appears and that the JSON-LD only comes from `getPublishedReviews`. Fixture: three reviews, one hidden, assert only two are marked up.

---

### `src/app/api/avis/route.ts` (route, request-response POST)

**Analogs:** `src/app/api/unsubscribe/route.ts` (RPC + outbox send + 303), `src/app/api/contact/route.ts` (throttle + zod).

**Imports and response helpers** (unsubscribe lines 1-22):
```ts
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_HEADERS = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };
```
**RPC then send the queued outbox rows, never fail the request on mail error** (lines 45-60):
```ts
const rpc = await callRpc<Recorded>('mail/unsubscribe', 'sv_record_unsubscribe', { ... });
if (!rpc.ok) return text('retry', 500);
const raws = (rpc.data ?? {}).outbox_ids;
const ids = Array.isArray(raws) ? raws.filter((x): x is string => typeof x === 'string') : [];
if (ids.length > 0) {
  try { await Promise.all(ids.map((x) => sendOutboxRow(x))); }
  catch { console.error('[mail/unsubscribe] mail_failed'); }
}
```
**Throttle + safeParse** (contact lines 30-38):
```ts
const ip = getClientIp(request.headers);
const allowed = await hitThrottle(hashKey('contact-ip', ip ?? 'unknown'), 600, 5);
if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
const parsed = contactSchema.safeParse(raw);
if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
```
Copy `getClientIp` from `@/lib/leads/ipHash`. Redirect to the thank-you state with `303` and `location: new URL(...)` (unsubscribe lines 62-67). Must add `src/app/api/avis` to `PRICE_ALLOWED_ZONES` (it imports `src/lib/server`).

---

### `src/app/avis/[token]/layout.tsx` (layout)

**Analog:** `src/app/desinscription/layout.tsx` (lines 1-19), copy verbatim and change the title:
```tsx
import type { Metadata } from "next";
import "../../portal.css";   // one level deeper than desinscription: adjust path

export const metadata: Metadata = {
  title: "Votre avis",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  alternates: {},
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="pt-root">{children}</div>;
}
```

### `src/app/avis/[token]/page.tsx` (page, GET read-only)

**Analog:** `src/app/desinscription/page.tsx`

**Pattern** (lines 1-48): `export const dynamic = 'force-dynamic'`, `AuthCard` wrapper, French `pt-helper` paragraphs, `CONTACT = 'contact@sevalys.com'` mailto, and a single generic fallback card when the token does not verify (lines 39-48). GET never writes (line 8 comment). Use `params: Promise<{ token: string }>` and `await params` (desinscription awaits `searchParams` at line 19). Form submission posts to `/api/avis` (compare line 58: `<form method="post" action=...>` with `pt-btn-primary`). Invalid, used, expired, invalidated all render the same markup and status.

---

### `src/app/politique-des-avis/page.tsx` and `src/app/avis/page.tsx` (public pages)

**Analog:** `src/app/mentions-legales/page.tsx`

**Imports, metadata, Section helper, shell** (lines 1-39):
```tsx
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = { title: '...', description: '...', robots: { index: true, follow: true } };

const Section = ({ title, id, children }: {...}) => (
  <div className="mb-10" id={id}>
    <h2 className="text-xl font-bold text-[var(--ink)] mb-4 pb-2 border-b border-[var(--line)]">{title}</h2>
    <div className="text-[var(--ink-dim)] leading-relaxed space-y-2 text-sm">{children}</div>
  </div>
);
...
<Navbar />
<main className="min-h-screen bg-[var(--bg)] pt-32 pb-20 px-4">
  <div className="max-w-3xl mx-auto">
    <p className="text-xs font-mono tracking-[0.3em] text-[var(--acid)]/70 uppercase mb-3">{'// INFORMATIONS LÉGALES'}</p>
```
Link style (lines 48-53): `className="text-[var(--acid)] hover:text-[var(--acid)]/80 underline underline-offset-2 transition-colors"`. Follow the 11 sections from UI-SPEC. `/avis` embeds one `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLdScript(...) }} />` per review (serviceJsonLd pattern). Public pages must import only `src/lib/reviews/*`, never `src/lib/server/*`.

---

### `src/app/admin/avis/avis.actions.ts` (server action) and `page.tsx`

**Analog:** `src/app/admin/projets/reminderHold.actions.ts` (lines 1-55), copy as the template:
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth/dal';
import { callRpc } from '@/lib/server/rpc';

export type HoldActionState = { ok: boolean; message: string | null };
const GENERIC_MSG = 'Le changement a échoué. Réessayez dans un instant.';
const schema = z.object({ projectId: z.string().uuid(), action: z.enum(['suspend', 'resume']) });
function str(fd: FormData, key: string): string { const v = fd.get(key); return typeof v === 'string' ? v : ''; }

export async function setReminderHoldAction(_prev: HoldActionState, formData: FormData): Promise<HoldActionState> {
  const { user } = await requireAdmin();
  const parsed = schema.safeParse({ ... });
  if (!parsed.success) return { ok: false, message: GENERIC_MSG };
  const res = await callRpc<{ outcome?: string }>('admin/projets', 'sv_set_reminder_hold', {
    p_project_id: parsed.data.projectId, p_action: parsed.data.action, p_actor_id: user.id,
  });
  if (!res.ok) return { ok: false, message: GENERIC_MSG };
  const outcome = res.data?.outcome;
  if (outcome === 'suspended' || ...) { revalidatePath(...); return { ok: true, message: ... }; }
  return { ok: false, message: GENERIC_MSG };
}
```
Adapt: `reason: z.enum(['defamation_or_insult','third_party_personal_data','illegal_content','inauthentic'])`, `detail: z.string().trim().min(3).max(500)`. On hide, send the returned client-notice outbox ids with `sendOutboxRow` (as in `api/unsubscribe`). Test companion: `reminderHold.actions.test.ts` (2.9K) as the template for `avis.actions.test.ts`. Page shell: `src/app/admin/projets/page.tsx` (not read in full; mimic its `requireAdmin()` + list pattern).

---

### `src/lib/server/reminders/sweep.ts` (modify)

Self-analog. Change points:
- Line 23: `export type ReviewLink = (projectId: string) => string | null;` now returns a link id; payload becomes `{ projectTitle, linkId, stage }`.
- Lines 180-203: the review block. Keep the `eligibleReviewProjects` set and the stage filter; replace `reviewUrl: url` (line 198) with `linkId`. Exclude projects that already have a review (reads from `sv_reviews.project_id`), so the existing `staleIds` logic (lines 206-217) skips pending rows.
- Lines 248-255: `sweepReminders` builds `reviewLink` from a default `() => null`. Add an async pre-step before `planReminders` that calls `sv_ensure_review_link` for projects with `elapsed 7..60`, and builds the `Map` consumed by the pure planner. Preserve the fail-closed `catch` with fixed log strings (lines 354-358) and `readAll`/`scoped` pagination helpers (lines 225-238, 285-292). Add a `review_config_invalid` log when `REVIEW_GOOGLE_URL` or `REVIEW_TOKEN_SECRET` is invalid and enqueue nothing.

### `src/lib/server/mail/outbox.ts`, `rules.ts`, `reminderEmails.ts` (modify)

- `rules.ts` lines 4-22 (`MAIL_EVENTS`), 24-41 (`MailTemplate`), 50-68 (`MAIL_RULES`), 76-130 (`dedupeKey`): add `review_published_admin` (`to: 'admin'`, transactional) and `review_hidden` (`to: 'client'`, transactional), plus `dedupeKey.reviewPublishedAdmin(reviewId)` and `dedupeKey.reviewHidden(moderationId, email)` using `clamp(\`...\`)` style. `review_request` remains `marketing`. Update `rules.test.ts`.
- `outbox.ts` lines 97-111, marketing branch: replace `reviewUrl: str(p.reviewUrl)` (line 104) by `reviewUrl: buildReviewUrl(deriveReviewToken(str(p.linkId), reviewSecret()!))`; throw `review_token_unavailable` when the secret is missing (same shape as `unsubscribe_unavailable`, line 99). Add `buildReviewUrl` to `urls.ts` beside `buildUnsubscribePageUrl`. The non-marketing `switch (row.template)` (line 113+) gets the two new cases.
- `reminderEmails.ts` lines 56-85: `reviewRequestContent` already enforces `https:` and builds `MarketingContent`; keep. Add `reviewPublishedAdminEmail` and `reviewHiddenEmail` modeled on `mailSuppressionAdminEmail` (lines 93-112) using `emailLayout({ subject, heading, paragraphs, button, url })`. Copy from UI-SPEC copywriting for the hidden notice.

### `src/lib/privateRoutes.ts` (modify)

Self-analog (lines 5-19). Do not add `/avis` to `PRIVATE_PREFIXES` (it would make the indexable `/avis` private). Extend `isPrivatePath`:
```ts
return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  || pathname.startsWith('/avis/');
```
Update `privateRoutes.test.ts`, `proxy.test.ts` (`/avis/abc` private branch, `/avis` not), `robots.ts` (`Disallow: /avis/`), `next.config.ts` headers (`/avis/:path+` noindex), `sitemap.test.ts` cross-check. `src/proxy.ts` line 29 already routes by `isPrivatePath`, so no proxy code change is needed.

### `src/lib/priceScope.ts` (modify)

Add after line 17 (precedent entry):
```ts
{ path: 'src/app/api/avis', reason: "Dépôt d'avis (jeton à usage unique) : route serveur sans page, écrit l'avis et alerte l'admin." },
```
Update the pinned count in `priceScope.test.ts` (14 to 15). `src/app/avis`, `src/app/politique-des-avis`, `src/components/sections/AvisExcerpt.tsx`, and `src/lib/reviews` stay OUT of the allowed zones.

### `src/components/layout/Footer.tsx` (modify)

Insert in the `foot-links` block (lines 32-39), next to the legal link:
```tsx
<a href="/mentions-legales">{f.legal}</a>
<Link href="/politique-des-avis">Politique des avis</Link>
```
Hardcoded FR label avoids touching `translations.test.ts` parity; if a translation key is preferred, add it in all three languages.

### `src/components/sections/AvisExcerpt.tsx` and `src/app/page.tsx` (modify)

`page.tsx` is `'use client'` (confirmed by RESEARCH), so the component is a client fetch of `/api/avis/recent`, renders `null` while loading, on error, or when empty. Insert between `<Partners` and `<ContactSection` in `page.tsx` (these markers do not appear in a grep of `src/app/page.tsx` from this run because the imports are likely aliased, so the planner must open `page.tsx` to find the exact line). Existing `page.test.ts` only checks the relative order of listed markers.

### `src/app/sitemap.ts`, `public/llms.txt`

`sitemap.ts` line 21 is the pattern:
```ts
`${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", ...
```
Add `/avis` and `/politique-des-avis` the same way; update the count assertion in `sitemap.test.ts` (`5 + services.length + 1` to `+ 3`). `llms.test.ts` forbids "tarif" and private routes: do not list `/avis/<token>`.

### `tests/rls/reviews.rls.test.ts`

**Analog:** `tests/rls/mailautomation.rls.test.ts`

**Header and helpers pattern** (lines 1-27, 42-62): import from `./helpers` (`anonClient`, `cleanup`, `dbQuery`, `makeAdmin`, `makeClient`, `makeProject`, `makeUser`, `reachContractSigned`, `svc`, `uniqueEmail`, ...), declare `const TABLES = [...] as const` (new tables), per-test `outboxBy(type, key)` helper reading `sv_mail_outbox` through `svc()`. Add helpers in `helpers.ts` for reaching `acceptance_signed` (extend the `reachContractSigned`-style helpers) and wrappers for the new RPCs. Required cases: anon/authenticated denied on new tables and RPCs, update/delete/truncate denied on log and reviews (service_role included), concurrent submit with `Promise.all` (one wins, second returns link-used), expiry boundary, unhide logged, closed-reason enum and mandatory detail enforced, non-admin actor rejected (`sv_not_admin`). Reuse the permanent "Test E2E Sèvalys" client; never delete it.

## Shared Patterns

### Service-role confinement and fixed-string logging
**Source:** `src/lib/server/mail/unsubscribeToken.ts` (header comment L4-6), `src/app/api/unsubscribe/route.ts` L11, `src/lib/throttle.ts` L6-7
**Apply to:** every new server module and route
No token, e-mail, IP or review body in logs, only fixed strings such as `console.error('[mail/unsubscribe] mail_failed')`. `import 'server-only'` on anything touching the admin client.

### RPC invocation
**Source:** `src/app/admin/projets/reminderHold.actions.ts` L34-39 and `src/app/api/unsubscribe/route.ts` L45-50
**Apply to:** admin actions, submit route, sweep link creation
`callRpc<T>('scope/name', 'sv_function', { p_... })`, check `res.ok`, read `res.data?.outcome`, map known outcomes, generic French error otherwise.

### Admin guard
**Source:** `src/app/admin/projets/reminderHold.actions.ts` L26 `const { user } = await requireAdmin();` and SQL `exists (select 1 from public.sv_admins a where a.user_id = p_actor_id)` (migration L440, L484)
**Apply to:** all moderation and reissue actions and RPCs

### Append-only audit + closed lists via content loop
**Source:** migration `20261008000000_sv_mail_automation.sql` L34-54, L154-179
**Apply to:** `sv_review_moderation_log`, `sv_review_link_events`, `sv_reviews`, and the outbox constraint extension

### Private token page shell
**Source:** `src/app/desinscription/layout.tsx` + `page.tsx` + `AuthCard`
**Apply to:** `/avis/[token]` layout, page, and thank-you/invalid states

### JSON-LD serialization
**Source:** `src/lib/serviceJsonLd.ts` L36-38 `buildJsonLdScript`
**Apply to:** `/avis` page only (D-04)

### Pinned tests that must change in the same task as the code (Pitfall 5)
`priceScope.test.ts` (14 to 15 zones), `privateRoutes.test.ts` (path table), `sitemap.test.ts` (url count and next.config cross-check), `llms.test.ts`, `rules.test.ts`, `sweep.test.ts` and `outbox.test.ts` / `reminderEmails.test.ts` (`reviewUrl` to `linkId`), `proxy.test.ts`.

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|---|---|---|---|
| `sv_submit_review` single-use consume with row lock (`for update`) | RPC | transactional write | No existing RPC consumes a one-time token; closest idiom is advisory lock in `sv_record_unsubscribe` (L399). Use RESEARCH "Single-use atomicity". |
| `ReviewRatingInput` (radiogroup with roving tabindex, lucide `Star`) | component | interactive form | No rating or radiogroup component in `src/components`. Follow UI-SPEC section 1; `OtpInput.tsx` is the nearest custom keyboard-handling input. |
| Admin `<dialog>` confirm with focus trap | component | interactive | UI-SPEC says "native dialog pattern already used in admin (or inline panel if none exists)"; not verified in this run. Planner should grep `src/components/admin` and `src/app/admin` for `<dialog`. |
| `GET /api/avis/recent` cached public route | route | cached read | No existing cached public GET route found; use `export const revalidate` / `cache-control: s-maxage` and the `text()` helper style of `api/unsubscribe/route.ts`. |
| `src/lib/reviews/googleUrl.ts` | utility | validation | Only partial analog: https check in `reminderEmails.ts` L61-67 (`new URL(...).protocol === 'https:'` inside try/catch). |

## Metadata

**Analog search scope:** `src/app` (desinscription, mentions-legales, api/unsubscribe, api/contact, admin/projets), `src/lib` (server/mail, server/reminders, serviceJsonLd, serviceSchema.test, throttle, privateRoutes, priceScope), `src/components` (portal, layout, sections), `supabase/migrations`, `tests/rls`
**Files read:** about 20 (full or targeted); `contact-schema.ts`, `proxy.ts` body, `page.tsx`, `llms.txt`, `robots.ts` were only grepped
**Pattern extraction date:** 2026-10-08
