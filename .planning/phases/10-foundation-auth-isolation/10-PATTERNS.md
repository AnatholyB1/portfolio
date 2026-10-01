# Phase 10: Foundation, auth & isolation - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 46 (new or modified)
**Analogs found:** 33 with a real analog / 46 (13 have none; planner uses RESEARCH.md patterns for those)

Repo reality check: there is no `proxy.ts`/`middleware.ts`, no Server Action, no `server-only` module, no `@supabase/ssr`, no `tests/` dir, no `scripts/*.mjs` except `gen-brand-assets.mjs`, and no `'use client'` form component outside the simulateur wizard. Analogs below are the closest real code. Where a file has none, the RESEARCH.md pattern (cited by section) is the source.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20261002000000_sv_foundation.sql` | migration | CRUD / RLS | `supabase/migrations/20260921000000_gecko_cabane_integration.sql` (+ `20260920000000_create_prospects_table.sql`) | exact (role) |
| `supabase/migrations/<ts>_prospects_explicit_deny.sql`, `<ts>_gecko_fix_function_search_path.sql` (sync prod drift) | migration | CRUD | `20260920000000_create_prospects_table.sql` | role-match |
| `src/lib/privateRoutes.ts` | utility (constants) | transform | `src/lib/serviceIcons.ts` / `src/data/services.ts` | partial |
| `src/lib/priceScope.ts` | utility (constants) | transform | `src/lib/simulateur/priorityOrder.ts` | partial |
| `src/lib/priceScope.test.ts` | test (static) | file-I/O | `src/app/layout.test.ts` + `src/app/linkAudit.test.ts` | exact (static source scan) |
| `src/app/privateShells.test.ts` | test (static) | file-I/O | `src/app/layout.test.ts` | exact |
| `src/lib/migrationLint.test.ts` | test (static) | file-I/O | `src/app/layout.test.ts` (readFileSync idiom) | role-match |
| `src/lib/supabase/env.ts` + `env.test.ts` | utility / test | transform | `src/lib/supabase.ts`, `src/lib/prospects-schema.test.ts` | role-match |
| `src/lib/supabase/server.ts` | service (ssr client) | request-response | none (`src/lib/supabase.ts` for env var names only) | no analog |
| `src/lib/supabase/browser.ts` | service | request-response | `src/lib/supabase.ts` line 7 | partial |
| `src/lib/supabase/proxy.ts` | middleware helper | request-response | none | no analog |
| `src/lib/supabase/admin.ts` | service (service_role, server-only) | CRUD | `src/lib/supabase.ts` `createServiceRoleClient` (lines 18-27) | exact (copy, add `server-only`) |
| `src/proxy.ts` | middleware | request-response | none | no analog |
| `src/lib/server/auth/dal.ts` | service | request-response | none | no analog |
| `src/lib/server/auth/login.ts` | service | event-driven (send mail) | `src/app/api/simulateur/route.ts` | role-match |
| `src/lib/server/auth/throttle.ts` | service | CRUD | `src/app/api/simulateur/route.ts` (ip hash lines 37-42) | partial |
| `src/lib/server/auth/session-age.ts` | service | request-response | none | no analog |
| `src/lib/server/clients/invite.ts` | service | CRUD | `src/app/api/simulateur/route.ts` (service_role insert, lines 44-58) | role-match |
| `src/lib/server/clients/siret.ts` | service | request-response (outbound fetch) | none (RESEARCH.md "SIRET lookup" code) | no analog |
| `src/lib/server/mail/loginCodeEmail.ts` | utility (HTML) | transform | `src/app/api/contact/route.ts` (escapeHtml + html template) | role-match |
| `src/lib/server/**/*.test.ts` (login, throttle, email) | test | request-response | `src/app/api/simulateur/route.test.ts` | exact (mock supabase + resend) |
| `src/lib/server/auth/schemas.ts` (zod email/code/SIRET) | utility | transform | `src/lib/prospects-schema.ts` | exact |
| `src/app/connexion/layout.tsx` | component (layout, metadata) | static | `src/app/calculateur-roi/layout.tsx` | exact |
| `src/app/connexion/page.tsx` (+ `LoginForm` client comp) | component | request-response | `src/components/simulateur/Wizard.tsx` (client form), `.field`/`.submit` CSS | role-match |
| `src/app/connexion/actions.ts` | controller (Server Action) | request-response | `src/app/api/contact/route.ts` | role-match |
| `src/app/auth/confirm/page.tsx` + `actions.ts` | component + controller | request-response | `src/app/calculateur-roi/layout.tsx` (noindex) | partial |
| `src/app/espace-client/layout.tsx` + `page.tsx` | component | request-response | `src/app/calculateur-roi/layout.tsx` | role-match |
| `src/app/admin/layout.tsx` + `page.tsx` + `actions.ts` | component / controller | CRUD | `src/app/calculateur-roi/layout.tsx`, `src/app/api/simulateur/route.ts` | role-match |
| `src/components/portal/*`, `src/components/admin/*` | component | request-response | `src/components/simulateur/Wizard.tsx`, `src/components/ui/SevalysMark.tsx` | partial |
| `src/components/ui/ClientProviders.tsx` (modify) | provider | event-driven | itself (lines 1-20) | exact (in-place) |
| `src/components/analytics/PostHogProvider.tsx` (modify) | provider | event-driven | itself (lines 32-62) | exact (in-place) |
| `src/app/robots.ts` (modify) | route/config | static | itself | exact |
| `src/app/sitemap.ts` / `sitemap.test.ts` / `llms.test.ts` (add cases) | config / test | static | themselves | exact |
| `next.config.ts` (modify: `headers()`) | config | static | itself | exact (in-place) |
| `public/llms.txt` | config | static | n/a | no change expected |
| `vitest.config.ts` (modify include guard) / `vitest.rls.config.ts` | config | n/a | `vitest.config.ts` | exact |
| `tests/rls/{setup,helpers}.ts`, `*.rls.test.ts` | test (integration) | CRUD | `src/app/api/simulateur/route.test.ts` (structure only) | partial |
| `scripts/rls-canary.mjs`, `scripts/verify-email-dns.mjs` | utility script | batch | `scripts/gen-brand-assets.mjs` | role-match |
| `.env.example` (modify) | config | n/a | itself (lines 7, 17-18, 29) | exact |
| `package.json` (deps + scripts) | config | n/a | itself (`"test": "vitest run"`) | exact |

## Pattern Assignments

### `supabase/migrations/20261002000000_sv_foundation.sql` (migration, RLS)

**Analog:** `supabase/migrations/20260921000000_gecko_cabane_integration.sql` (role-table + helper) and `20260920000000_create_prospects_table.sql` (revoke).

**Header-comment convention** (prospects lines 1-8, gecko lines 1-20): file path comment, phase tag, rationale of hardening. Keep this.

**Role table + SECURITY DEFINER helper** (gecko lines 26-50). Copy the shape but follow RESEARCH Pattern 1 differences: schema `sv_private`, `set search_path = ''`, `(select auth.uid())`, revoke from `public, anon` and grant only to `authenticated` (gecko grants to `anon` too: do NOT copy that line).
```sql
create table if not exists public.gecko_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);
alter table public.gecko_admins enable row level security;
create policy "gecko_admins self read" on public.gecko_admins
  for select using (auth.uid() = id);

create or replace function public.gecko_is_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.gecko_admins where id = auth.uid()); $$;
revoke all on function public.gecko_is_admin() from public;
grant execute on function public.gecko_is_admin() to anon, authenticated;
```

**Revoke pattern with explanatory comment** (prospects lines 28-36): RLS-on does not revoke default grants, the revoke is mandatory:
```sql
alter table public.prospects enable row level security;
revoke all on table public.prospects from anon, authenticated;
```
For `sv_*` the revoke is followed by an explicit `grant select ... to authenticated` (RESEARCH Pattern 1, lines 220-237 of RESEARCH.md). Use `create table if not exists` and idempotent seed (`on conflict do nothing`) as in the existing migrations.

**Do not touch** any `gecko_*` object (CONTEXT canonical refs). Exclusivity triggers (D-04) and `sv_login_allowed`, `session_age_ok`, `throttle_hit` functions: no repo analog, use RESEARCH.md.

---

### `src/lib/supabase/admin.ts` (service, CRUD, server-only)

**Analog:** `src/lib/supabase.ts` lines 18-27 (copy body, add `import 'server-only'` first line). Do NOT import from `src/lib/supabase.ts` in portal code (line 7 exports a browser client; file is not server-only).
```ts
export function createServiceRoleClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```
Keep the French "NE JAMAIS importer dans un composant 'use client'" comment. Leave `supabase.ts` additive-only: `createServerClient` (line 11) is used by `/api/crm/*`; env var there is `NEXT_PUBLIC_SUPABASE_ANON_KEY` (line 4), while `.env` pull also has `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (env.ts assertion must handle both).

---

### `src/lib/supabase/server.ts`, `proxy.ts`, `src/proxy.ts`, `dal.ts`, `session-age.ts`

No analog in the repo (no ssr, no proxy, no DAL). Use RESEARCH.md Pattern 2 (`updateSession`, `proxy` with literal `matcher`) and Pattern 4. Conventions to keep from repo: path alias `@/`, French comments, named function exports.

---

### `src/lib/server/auth/login.ts` + `src/lib/server/mail/loginCodeEmail.ts` (service + email, Resend)

**Analog:** `src/app/api/simulateur/route.ts` and `src/app/api/contact/route.ts`.

**Imports pattern** (simulateur lines 1-5):
```ts
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase';   // phase 10: use '@/lib/supabase/admin'
```

**escapeHtml (duplicated per file in repo, simulateur lines 7-13 and contact lines 4-10)**: copy into `loginCodeEmail.ts` or extract; every interpolated value goes through it.
```ts
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

**Resend send + error handling** (contact lines 34-68, simulateur 60-80): `new Resend(process.env.RESEND_API_KEY)` constructed inside the handler, `from: 'Sèvalys <contact@sevalys.com>'` convention, check `result.error`, `console.error('[api/xxx] ...', err)` tag prefix. Phase 10 differs: from is `Sevalys <connexion@sevalys.com>` plus `replyTo: 'contact@sevalys.com'` and a `text` part; on failure do NOT leak to caller (D-09), log only.

**IP hash for throttle keys** (simulateur lines 37-42):
```ts
const forwardedFor = request.headers.get('x-forwarded-for');
const ip = forwardedFor?.split(',')[0]?.trim() || null;
const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
```
In a Server Action get headers via `headers()` from `next/headers` instead of `request`.

**Silent-reject idiom (anti-enumeration precedent)** (simulateur lines 22-29): spam submissions return a response byte-identical to success. Reuse the same idea for D-09: identical response for invited/unknown, no distinguishing status.

---

### `src/lib/server/auth/schemas.ts` (zod validation)

**Analog:** `src/lib/prospects-schema.ts`.
```ts
import { z } from 'zod';
export const prospectSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  email: z.email().trim(),
  ...
});
export type ProspectSubmission = z.infer<typeof prospectSchema>;
```
Zod v4 style (`z.email()`). Keep the file free of `next/server`, Supabase, Resend, `node:crypto` imports (header comment lines 3-6) so client forms can import it. Add `loginEmailSchema`, `otpCodeSchema` (`/^\d{6}$/`), `inviteSchema` (SIRET: strip spaces then `/^\d{14}$/`). Error copy comes from UI-SPEC Copywriting Contract.

---

### `src/app/connexion/actions.ts`, `src/app/admin/actions.ts`, `src/app/auth/confirm/actions.ts` (Server Actions)

No Server Action exists. Closest request-response handler: `src/app/api/simulateur/route.ts`.

**Order of operations to copy** (lines 16-58): parse/validate raw input first -> `safeParse` -> side effect (service_role) -> log with `[tag]` on failure -> uniform JSON-ish result. In Actions return `{ ok, message }` state objects (for `useActionState`) rather than `NextResponse`. Add `'use server'` and `after()` per RESEARCH Pattern 3.

**Tests for these** mock the dependencies exactly like `src/app/api/simulateur/route.test.ts` lines 1-23:
```ts
const createServiceRoleClientMock = vi.fn(() => ({ from: fromMock }));
vi.mock('@/lib/supabase', () => ({ createServiceRoleClient: () => createServiceRoleClientMock() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: sendMock }; } }));
const { POST } = await import('./route');
```
Phase 10: mock `@/lib/supabase/admin` and `server-only` (vitest `environment: 'node'`; `server-only` throws on import outside RSC, so alias or `vi.mock('server-only', () => ({}))` is needed).

---

### `src/app/connexion/layout.tsx`, `espace-client/layout.tsx`, `admin/layout.tsx` (layout, metadata noindex)

**Analog:** `src/app/calculateur-roi/layout.tsx` (exact: existing noindex layout), lines 1-17:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur de ROI · Agent IA téléphonique",
  description: "...",
  // Outil terrain interne utilisé en RDV — pas destiné au référencement public.
  robots: { index: false, follow: false },
};

export default function CalculateurRoiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```
Phase 10 additions: `title` as plain strings (root template `%s · Sèvalys` appends the suffix, so use `"Connexion"`, `"Espace client"`, `"Administration"`, not the full `... | Sèvalys` of UI-SPEC, or the title will double); override `alternates: {}` since root sets `canonical: "/"` (root layout.tsx lines 59-61); optionally `openGraph`/`twitter` not needed. Server Component, no `useLanguage()` (see header comment of `src/app/simulateur/layout.tsx` lines 5-14 on why).

---

### `src/components/ui/ClientProviders.tsx` (modify: route-aware)

**Analog:** itself. Current (lines 1-20):
```tsx
'use client';
import dynamic from 'next/dynamic';
const CustomCursor = dynamic(() => import('@/components/ui/CustomCursor'), { ssr: false });
const CinemaIntro = dynamic(() => import('@/components/ui/CinemaIntro'), { ssr: false });
export const MethodologySectionLazy = dynamic(...);   // keep export
export default function ClientProviders() {
  return (<><CustomCursor /><CinemaIntro /></>);
}
```
Change: `const pathname = usePathname(); if (isPrivatePath(pathname)) return null;` using `src/lib/privateRoutes.ts`. Keep the `MethodologySectionLazy` export untouched. Hooks before early return. `isPrivatePath` must be pure and client-safe (no server imports).

---

### `src/components/analytics/PostHogProvider.tsx` (modify)

**Analog:** itself. Hook points: `PageviewTracker` (lines 32-45) already uses `usePathname`; add a private-path branch there:
```tsx
useEffect(() => {
  if (!KEY || !initialized) return;
  if (isPrivatePath(pathname)) { posthog.opt_out_capturing(); return; }
  posthog.opt_in_capturing();   // only if previously opted out by us
  ...posthog.capture('$pageview', { $current_url: url });
}, [pathname, searchParams]);
```
Note `ensureInit` (lines 18-30) sets `autocapture: true` and `persistence: 'localStorage+cookie'`: on first load of a private path, opt-out must run before autocapture records (consider `opt_out_capturing_by_default` or skipping `ensureInit` for private paths). `if (!KEY) return <>{children}</>` (line 52) stays.

---

### `src/app/robots.ts` (modify), `src/app/sitemap.test.ts`, `src/app/llms.test.ts` (add cases)

**robots analog:** itself, lines 11-13:
```ts
userAgent: "*",
allow: "/",
disallow: ["/api/"],
```
Change to `disallow: ["/api/", ...PRIVATE_PREFIXES]` (`/espace-client`, `/admin`, `/connexion`, `/auth`).

**Sitemap tests** (sitemap.test.ts lines 5-6, 25-29) must keep `5 + services.length + 1`; add a case asserting no URL starts with a private prefix, using the existing helper:
```ts
const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com'
const urls = () => sitemap().map((e) => e.url)
```
**llms.txt** guard idiom (llms.test.ts lines 6-7): `readFileSync(new URL('../../public/llms.txt', import.meta.url), 'utf8')`; add `expect(llms).not.toContain('/espace-client')` etc. Do not edit existing assertions.

---

### `next.config.ts` (modify)

**Analog:** itself (whole file, 8 lines). Add `async headers()` returning `X-Robots-Tag: noindex, nofollow` for the four private sources inside `nextConfig`, keep `reactCompiler: true`.

---

### Static tests: `priceScope.test.ts`, `privateShells.test.ts`, `migrationLint.test.ts`

**Analog:** `src/app/layout.test.ts` lines 1-20 (source-text read, never import server components):
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Read as source text — do NOT import layout.tsx directly ...
const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
expect(layoutSource).not.toContain('priceRange');
```
**Tree-walking analog:** `src/app/linkAudit.test.ts` (walks every `src/**/*.tsx`; see `routeForFile` at line 147 and use at 161). Reuse its walker approach for import-boundary scans (forbidden imports `gsap`, `three`, `@react-three`, `CinemaIntro`, `CustomCursor`, `LanguageContext`, `ClientProviders` in private zones; no `'use client'` file importing `@/lib/supabase/admin`). Vitest `include` is `src/**/*.test.ts` (vitest.config.ts line 7): new unit tests must live under `src/`; `tests/rls/**` is deliberately outside so `npm test` never hits Supabase.

**Pitfall to respect:** `linkAudit.test.ts` requires every internal `href` and `#id` in `src/**/*.tsx` to resolve: portal links (`/`, `/connexion`, `/admin`, `/espace-client`, `/auth/confirm`) must map to existing route files; the disabled nav items must not be `<a href>` (UI-SPEC says not links, which also avoids this).

---

### `vitest.rls.config.ts`, `tests/rls/*`

**Analog:** `vitest.config.ts` (whole file):
```ts
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'], passWithNoTests: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```
RLS config: copy, change `include: ['tests/rls/**/*.rls.test.ts']`, add `testTimeout: 30000`, `fileParallelism: false`. Setup/helpers have no analog: use RESEARCH "Test user creation" snippet and Pitfall 10 guard (refuse prod ref `ubxllsvanurkwkohzxau`).

---

### `scripts/rls-canary.mjs`, `scripts/verify-email-dns.mjs`

**Analog:** `scripts/gen-brand-assets.mjs` (plain `.mjs` node script, wired as `"gen:assets": "node scripts/gen-brand-assets.mjs"` in package.json lines 5-12). Add npm scripts the same way (`"verify:email-dns"`, `"test:rls"`). DNS via `node:dns/promises` (no `dig` on this Windows host).

---

### `.env.example` (modify)

Existing relevant lines: 7 `NEXT_PUBLIC_SITE_URL`, 17-18 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, 29 `RESEND_API_KEY`. Add alongside, same commented-section style: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (or secret key), `SV_LOGIN_ENABLED`, and local-only `SV_TEST_*` (flagged never-on-Vercel).

---

### UI components and CSS (`src/components/portal/*`, `src/components/admin/*`, shell pages)

**Analogs:** `src/components/ui/SevalysMark.tsx` (wordmark for login/headers: `SevalysMark`, `SevalysWordmark`, CSS `.sv-lock*` at globals.css 226-230), `src/components/simulateur/Wizard.tsx` (client multi-step form with `.field`/`.submit`; read it before writing `LoginForm`, not read in this pass).

**Reusable CSS classes** (globals.css, verified): tokens `--bg --acid --ink --ink-dim --ink-faint --line --line-strong --warm` (lines 5-15); `.label` (67, 11px mono, note UI-SPEC says 12px), `.mono` (63), `.btn` / `.btn-primary` / `.btn-ghost` (241-245; `.btn` has `overflow:hidden`, hover `translateY(-2px)` and `.25s` transitions that conflict with UI-SPEC 150-200ms and back-office restraint, so prefer a scoped class), `.field` (324-330, borderless inputs inside a bordered stack, differs from UI-SPEC rounded 8px inputs: new scoped CSS needed), `.submit` (334-336, has `:disabled` styling), `.tg` (279, for "Bientôt" tag), `.crumb-back` (388-389, for "Retour au site"). Reduced motion block at 131 and 373. UI-SPEC says "do not introduce new tokens": scope new rules with a `portal-`/`pt-` prefix in globals.css or a CSS module; check `body` rule at line 41 (and any `cursor: none` on `body`/`*`) so the shells do not hide the system cursor now that `CustomCursor` is not rendered.

**Fonts:** root layout defines `--font-spacegrotesk`, `--font-manrope`, `--font-jetbrains` (layout.tsx lines 11-27) while UI-SPEC/globals reference `--font-display`, `--font-body`, `--font-mono`; use the `globals.css` aliases.

---

## Shared Patterns

### Secret-key isolation (service_role)
**Source:** `src/lib/supabase.ts` lines 18-27 and the route comment at `src/app/api/simulateur/route.ts` line 44.
**Apply to:** every module that writes `sv_*` (invite, login gating, throttle, session-age). Put in `src/lib/supabase/admin.ts` with `import 'server-only'`; never from `'use client'` files (static test).

### Input validation with zod, before side effects
**Source:** `src/lib/prospects-schema.ts` + `src/app/api/simulateur/route.ts` lines 31-35 (`safeParse`, return generic 400 `invalid_payload`).
**Apply to:** all Server Actions (login, verify, invite, SIRET lookup).

### HTML escaping and Resend sending
**Source:** `src/app/api/contact/route.ts` lines 4-10, 34-68.
**Apply to:** login-code email and any invite notification email.

### Server-side logging convention
`console.error('[api/simulateur] insert failed', insertError)` (simulateur lines 56, 78). Use `[auth/login]`, `[admin/invite]` tags; never log email codes, tokens, or raw IP.

### Uniform response to defeat probing
**Source:** `src/app/api/simulateur/route.ts` lines 22-29 (honeypot returns the success body).
**Apply to:** `requestCode` action (D-09).

### Deny-by-default database access
**Source:** `20260920000000_create_prospects_table.sql` lines 28-36 and gecko migration header (lines 8-20).
**Apply to:** all four `sv_*` tables and every `sv_private` function: RLS on, `revoke all ... from anon, authenticated`, targeted grants, no write policy.

### noindex metadata
**Source:** `src/app/calculateur-roi/layout.tsx` line 8 (`robots: { index: false, follow: false }`), plus root canonical override caveat (root `layout.tsx` lines 59-61).
**Apply to:** connexion, auth/confirm (inherits from `/auth` layout if added), espace-client, admin.

### Source-text static tests
**Source:** `src/app/layout.test.ts`, `src/app/llms.test.ts`, `src/app/linkAudit.test.ts`.
**Apply to:** all FOUND-05/06 guards, migration lint, proxy matcher vs `PRIVATE_PREFIXES` equality.

### Mocked-dependency handler tests
**Source:** `src/app/api/simulateur/route.test.ts` lines 1-60 (vi.mock supabase + resend, `await import`, `vi.clearAllMocks` in `beforeEach`).
**Apply to:** login/invite/throttle unit tests.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/proxy.ts`, `src/lib/supabase/proxy.ts` | middleware | request-response | No proxy/middleware exists; use RESEARCH Pattern 2 |
| `src/lib/supabase/server.ts` | service | request-response | No `@supabase/ssr` usage yet; use RESEARCH Pattern 2 / Pitfall 6 |
| `src/lib/server/auth/dal.ts` (`requireAdmin/requireClient`) | service | request-response | No auth layer exists; RESEARCH Anti-Patterns + Pattern 4 |
| `src/lib/server/auth/session-age.ts` | service | request-response | New concept; RESEARCH Pattern 4 |
| `src/lib/server/clients/siret.ts` | service | outbound fetch | No external-API fetch in repo; RESEARCH "SIRET lookup" code |
| Server Actions (`'use server'`, `useActionState`, `after()`) | controller | request-response | None in repo; route handlers are the nearest style |
| SQL: exclusivity triggers, `sv_login_allowed`, `session_age_ok`, `throttle_hit` | migration | CRUD | Gecko migration has only a role helper; RESEARCH Pattern 1 and Pattern 3/4 |
| `tests/rls/*` (real-Postgres integration, user creation) | test | CRUD | Repo has only mocked tests; RESEARCH "Test user creation" and Pitfall 10 |
| `scripts/verify-email-dns.mjs` | script | batch | Only brand-asset script exists; use RESEARCH DNS plan |
| Auth-confirm interstitial page | component | request-response | No equivalent page; UI-SPEC S2 |
| Login OTP cell input (6 cells, one real input) | component | event-driven | No OTP UI; UI-SPEC S1 |
| Admin table + invite form with SIRET blur lookup | component | CRUD | No admin UI; UI-SPEC S4 (read `Wizard.tsx` for client-form conventions first) |
| Test-time `server-only` stub | test config | n/a | New requirement; `vi.mock('server-only', () => ({}))` |

## Metadata

**Analog search scope:** `src/app`, `src/components`, `src/lib`, `src/data`, `supabase/migrations`, `scripts`, root configs (`vitest.config.ts`, `next.config.ts`, `package.json`, `.env.example`).
**Files scanned:** about 95 tracked files listed; 20 read in full or in part.
**Not read (recommend planner reads before the portal UI plan):** `src/components/simulateur/Wizard.tsx`, `src/app/linkAudit.test.ts` (walker implementation), `src/app/globals.css` lines 41 and 131 (body/cursor rules).
**Pattern extraction date:** 2026-10-02
