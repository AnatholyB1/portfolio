# Phase 5: Prospect Capture Backend - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 5 (1 migration, 1 route, 1 lib modification, 1 new schema/utility, 1 test — test/config items listed under "No Analog Found")
**Analogs found:** 3 / 5 (2 files have no in-repo analog because this phase introduces the repo's first tracked migration and first zod schema/test)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `src/app/api/simulateur/route.ts` | route/controller | request-response + CRUD (insert) + event-driven (email on success) | `src/app/api/contact/route.ts` (validate→notify shape) + `src/app/api/crm/orders/route.ts` (Supabase insert shape) | role-match (composite of two analogs, no single exact match exists) |
| `src/lib/supabase.ts` | service/config (client factory) | n/a (client construction) | itself (existing file, additive export) | exact |
| `supabase/migrations/20260920000000_create_prospects_table.sql` | migration | batch (DDL, one-time schema change + scheduled purge) | none tracked in repo (first `.sql` file ever committed here) | no analog — use RESEARCH.md `## Code Examples` DDL directly |
| `src/lib/prospects-schema.ts` | utility (validation) | transform | `src/app/api/contact/route.ts` inline `isNonEmptyString` validation (same *role*, different *mechanism* — hand-rolled vs zod) | partial match — pattern of "validate before acting" carries over, but zod schema shape must come from RESEARCH.md since no zod schema exists anywhere in `src/` |
| `src/app/api/simulateur/route.test.ts` (only if Wave 0 introduces a test framework) | test | n/a | none — zero test files anywhere in this repo | no analog |

## Pattern Assignments

### `src/app/api/simulateur/route.ts` (route/controller, request-response + CRUD + event-driven)

This file has no single exact analog — it must combine two existing patterns: the "validate → act → notify" shape from `src/app/api/contact/route.ts`, and the "server-side Supabase client → insert → handle error" shape from `src/app/api/crm/orders/route.ts`. Follow both together.

**Analog A:** `src/app/api/contact/route.ts` (full file, 71 lines — small enough to have been read in one pass)

Imports pattern (lines 1-2):
```typescript
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
```
Note: `crm/orders/route.ts` uses `NextRequest, NextResponse` from `next/server` and imports the DB client via path alias — combine both import styles:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { Resend } from 'resend'
```

`escapeHtml` helper to duplicate locally, per RESEARCH.md's explicit instruction not to touch `api/contact/route.ts` (lines 4-10):
```typescript
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

Validation-reject pattern — early return with `400` before any side effect (lines 16-32):
```typescript
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = body?.name;
  const email = body?.email;
  // ... field extraction ...

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    // ...
  ) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
```
For the new route, replace this hand-rolled block with `prospectSchema.safeParse(raw)` (see `prospects-schema.ts` below) — same "parse request → 400 on failure → continue" shape, different validation engine per RESEARCH.md's zod recommendation.

Resend send + error handling pattern (lines 34, 40-68):
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
...
const [prospectResult, agencyResult] = await Promise.all([
  resend.emails.send({
    from: 'Sèvalys <contact@sevalys.com>',
    to: email,
    subject: '...',
    html: `...`,
  }),
  resend.emails.send({
    from: 'Sèvalys <contact@sevalys.com>',
    to: 'contact@sevalys.com',
    subject: `Nouveau contact — ${projectType}`,
    html: `...`,
  }),
]);

if (prospectResult.error || agencyResult.error) {
  console.error('[api/contact] Resend send failed', prospectResult.error, agencyResult.error);
  return NextResponse.json({ error: 'send_failed' }, { status: 502 });
}

return NextResponse.json({ ok: true });
```
For `api/simulateur`, only ONE email is needed (internal notification to `contact@sevalys.com`, per CRM-04 — no confirmation email to the prospect was requested in CONTEXT.md), so use the single-send shape, not `Promise.all`. Reuse the `[api/contact]`-style prefixed `console.error` log line, e.g. `console.error('[api/simulateur] insert failed', error)`.

**Analog B:** `src/app/api/crm/orders/route.ts` (full file, 98 lines)

Import + client construction pattern (lines 1-2):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
```
For the new route, swap to `createServiceRoleClient` (the new export — see `src/lib/supabase.ts` pattern below) since this write path must bypass RLS entirely, not reuse the anon-key `createServerClient()`.

Insert + error-handling pattern (lines 76-82):
```typescript
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({ customer_name, items: orderItems, total, pickup_time, status: 'confirmé' })
  .select()
  .single()

if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
```
For `prospects`, mirror this exact shape but with explicit field mapping (never spread the raw body — see RESEARCH.md's "mass assignment" pitfall):
```typescript
const { error } = await supabase.from('prospects').insert({
  nom: p.nom,
  email: p.email,
  telephone: p.telephone,
  reponses_diagnostic: p.reponsesDiagnostic,
  services_recommandes: p.servicesRecommandes,
  consentement_rgpd: p.consentementRgpd,
  ip_hash: ipHash,
})
if (error) {
  console.error('[api/simulateur] insert failed', error)
  return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
}
```
Note: unlike `orders`, do not `.select().single()` the inserted row back — the response only needs `{ ok: true }` (no client-facing use for the returned row in this phase).

Error-response status-code convention across both analogs: `400` invalid payload, `404`/`409` domain-specific conflicts (orders only, not applicable here), `500` on DB/send failure, `502` reserved for upstream-provider failure (contact's Resend case) — for `api/simulateur`, use `500` for both insert and Resend failures since both are server-side infra, consistent with `crm/orders`'s convention of `500` for its own Supabase errors.

---

### `src/lib/supabase.ts` (service/config, additive change)

**Analog:** itself, `src/lib/supabase.ts` (full file, 16 lines — current state)

Current full content (all 16 lines, this is the file to extend, not replace):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client browser (anon key) — pour le dashboard realtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client serveur (service_role) — pour les API routes
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Confirmed live:** the comment on `createServerClient()` ("service_role") is misleading — it actually constructs the client with `NEXT_PUBLIC_SUPABASE_ANON_KEY`, matching RESEARCH.md's finding exactly. CONTEXT.md's "Claude's Discretion" note flags this same discrepancy.

**Pattern to follow when adding `createServiceRoleClient()`:** match the existing function-export shape (not a top-level `const`, so a fresh client is constructed per call, consistent with `createServerClient()`'s existing style), and correct the misleading comment on `createServerClient()` while adding the new function (doc-only fix, not a behavior change):
```typescript
// Client serveur (anon key) — utilisé par les routes CRM existantes
// (nom historique trompeur : utilise bien la clé anon, pas service_role)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Client serveur (service_role) — pour l'écriture prospects uniquement.
// NE JAMAIS importer dans un composant 'use client'. Bypasse RLS par design.
export function createServiceRoleClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```
This exact code block is also given verbatim in RESEARCH.md `## Code Examples`; the analog confirms it is additive (no existing call site of `createServerClient()` needs to change) and shows the correct pre-existing naming/comment convention to match.

---

### `supabase/migrations/20260920000000_create_prospects_table.sql` (migration, DDL)

**No analog in repo** — `Glob("supabase/**/*")` returned zero results; this repo has never had a tracked `.sql` file (confirmed by RESEARCH.md and by this pattern-mapping pass independently). Use the DDL given verbatim in RESEARCH.md `## Architecture Patterns → Pattern 1`, which already encodes:
- `id uuid primary key default gen_random_uuid()` — matches the implicit `id` field usage seen in `crm/orders/route.ts` (`order.id` returned after insert), i.e. this repo's existing tables already use UUID-style `id` + `created_at` columns (inferred from `orders` route's `.gte('created_at', ...)` filter and `order.id` usage), so the new table's `id`/`created_at` columns are consistent with sibling tables even though their DDL isn't tracked.
- `enable row level security` + explicit `revoke all ... from anon, authenticated` — no existing RLS precedent is tracked in-repo to copy from; this is genuinely new ground for this codebase. Follow RESEARCH.md Pattern 1 as the source of truth, not any in-repo file.
- `pg_cron` purge job — same, no in-repo precedent; copy RESEARCH.md's `cron.schedule(...)` block verbatim.

**Column-naming convention inferred from sibling tables:** `crm/orders/route.ts` and `crm/stock/route.ts` both use `snake_case` column names (`customer_name`, `pickup_time`, `stock_qty`, `product_id`) queried via `.eq()`/`.gte()` — the `prospects` table's columns (`reponses_diagnostic`, `services_recommandes`, `consentement_rgpd`, `ip_hash`) already follow this same `snake_case` convention in RESEARCH.md's DDL, confirmed consistent with the rest of the schema.

---

### `src/lib/prospects-schema.ts` (utility/validation, transform)

**Partial analog:** `src/app/api/contact/route.ts` lines 12-14 (validation helper, hand-rolled, not zod):
```typescript
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
```
This is the only existing validation precedent in the repo, but it's a hand-rolled type guard, not a schema library — no zod usage exists anywhere in `src/` (`Grep("zod")` only matched `.planning/` research docs and `package-lock.json`, meaning zod is at most a transitive dependency today, never imported by app code). RESEARCH.md `## Code Examples` provides the full schema to use verbatim:
```typescript
const prospectSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  email: z.email().trim(),
  telephone: z.string().trim().min(6).max(30),
  reponsesDiagnostic: z.array(z.object({
    questionId: z.string(),
    value: z.union([z.string(), z.array(z.string())]),
  })).min(1),
  servicesRecommandes: z.array(z.string()).min(2).max(4),
  consentementRgpd: z.literal(true),
  website: z.string().max(0).optional(),      // honeypot — must arrive empty
  formRenderedAt: z.number(),                  // client epoch ms, wizard mount time
});
```
Use `z.email()` (v4 top-level form), not the deprecated `z.string().email()` chain — RESEARCH.md `## State of the Art` flags this explicitly. Recommend co-locating a pure `isSpamSubmission(payload)` predicate in this same file (honeypot + timing check extracted out of the route handler) so both are unit-testable without mocking `next/server`, per RESEARCH.md's Wave 0 gap notes.

---

## Shared Patterns

### Resend email notification
**Source:** `src/app/api/contact/route.ts` lines 34, 52-62
**Apply to:** `src/app/api/simulateur/route.ts` (CRM-04)
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'Sèvalys <contact@sevalys.com>',
  to: 'contact@sevalys.com',
  subject: 'Nouveau prospect — simulateur',
  html: `<p><strong>Nom :</strong> ${escapeHtml(p.nom)}</p>
         <p><strong>Email :</strong> ${escapeHtml(p.email)}</p>
         <p><strong>Téléphone :</strong> ${escapeHtml(p.telephone)}</p>
         <p><strong>Services recommandés :</strong> ${p.servicesRecommandes.map(escapeHtml).join(', ')}</p>`,
});
```
Always escape every user-supplied string with the local `escapeHtml()` duplicate before interpolating into the HTML body (stored-XSS-in-internal-email mitigation, per RESEARCH.md Security Domain table).

### Supabase server-side client construction
**Source:** `src/lib/supabase.ts` lines 10-15 (existing `createServerClient`, pattern to mirror for the new `createServiceRoleClient`)
**Apply to:** `src/lib/supabase.ts` (new export), consumed by `src/app/api/simulateur/route.ts` only
```typescript
export function createServiceRoleClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```
Must read `process.env.SUPABASE_SERVICE_ROLE_KEY` — never `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — and must only be imported from server-side files (Route Handlers), never a `'use client'` component. This is RESEARCH.md Pitfall 4, directly relevant since every other Supabase env var in this file today is `NEXT_PUBLIC_`-prefixed by habit.

### Error-response shape (validation and server errors)
**Source:** `src/app/api/contact/route.ts` line 31, `src/app/api/crm/orders/route.ts` lines 15, 46, 52, 56-60, 82
**Apply to:** `src/app/api/simulateur/route.ts`
```typescript
return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
// ... and, on DB/send failure:
return NextResponse.json({ error: orderError.message }, { status: 500 })
```
Consistent convention across both existing route families: `{ error: <string> }` body, HTTP status communicates the failure category. Success responses use `{ ok: true }` (contact route) or a data-bearing object (`orders` route) — for `api/simulateur`, `{ ok: true }` is correct per RESEARCH.md's spec (no client-facing use of the inserted row).

### Explicit field-mapping on insert (no raw-body spread)
**Source:** `src/app/api/crm/orders/route.ts` line 78
**Apply to:** `src/app/api/simulateur/route.ts` — mandatory per RESEARCH.md's mass-assignment mitigation (Security Domain table)
```typescript
.insert({ customer_name, items: orderItems, total, pickup_time, status: 'confirmé' })
```
Every existing insert call in this repo already maps fields explicitly rather than spreading `req.body`/`raw` — the new route must follow this, using the zod-parsed `p` object's fields individually, never `supabase.from('prospects').insert(raw)`.

## No Analog Found

Files/artifacts with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/migrations/20260920000000_create_prospects_table.sql` | migration | batch (DDL) | Zero `.sql` files tracked anywhere in this repo — first schema-as-code artifact. Use RESEARCH.md `## Architecture Patterns → Pattern 1` DDL verbatim; apply via Supabase SQL Editor or MCP `execute_sql`, gated behind `checkpoint:human-verify` per RESEARCH.md Pitfall 3. |
| `src/lib/prospects-schema.ts` (zod schema itself) | utility/validation | transform | No zod import exists anywhere in `src/` today (only present in `package-lock.json` as a transitive dep, and in `.planning/` docs) — only the *role* (validate-before-act) has a hand-rolled precedent in `api/contact/route.ts`; the schema shape itself must come from RESEARCH.md `## Code Examples`. |
| `src/app/api/simulateur/route.test.ts` + vitest config (Wave 0, if test framework is introduced) | test / config | n/a | Confirmed zero test files/config anywhere in this repo (`vitest.config.*`, `jest.config.*`, `*.test.*`, `*.spec.*` all absent). No in-repo pattern to copy — planner must decide (per RESEARCH.md Wave 0 Gaps) whether to introduce `vitest` fresh or rely solely on the manual curl checklist documented in RESEARCH.md `## Validation Architecture`. |

## Metadata

**Analog search scope:** `src/app/api/**`, `src/lib/supabase.ts`, `supabase/**` (empty), `package.json`/`package-lock.json` (dependency check for `zod`)
**Files scanned:** `src/app/api/contact/route.ts`, `src/app/api/crm/orders/route.ts`, `src/app/api/crm/stock/route.ts`, `src/app/api/crm/products/route.ts` (globbed, not read — same shape as `stock`/`orders`), `src/lib/supabase.ts`, `package.json`
**Pattern extraction date:** 2026-09-20
