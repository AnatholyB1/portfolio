# Architecture Patterns: v2.0 Plateforme Sèvalys

**Domain:** Agency platform (client portal, documents, e-signature, payments, lead attribution, mailing, admin forecast) added to an existing Next.js 16 + Supabase + Resend + Vercel marketing site
**Researched:** 2026-10-01
**Overall confidence:** MEDIUM-HIGH (codebase facts HIGH; Next 16 / Supabase SSR / Stripe / Vercel Cron specifics from training knowledge, to be verified in phase research)

## Existing facts that constrain the design (verified in repo)

- `src/lib/supabase.ts` exposes three clients: browser anon, a misnamed "server" anon client (used by `/api/crm/*`, untouched), and `createServiceRoleClient()` (used by `/api/simulateur`).
- `prospects` table: RLS enabled, `revoke all from anon, authenticated`, written only by service_role from a Route Handler. pg_cron purges rows at 12 months. Migrations live in `supabase/migrations/` (2 files so far).
- **The Supabase project is shared**: `gecko_*` tables and a `gecko_admins` table already exist, and `auth.users` is shared. Consequence: "authenticated" must never imply any privilege in the Sèvalys schema. A Gecko customer or admin who logs in must get zero access to Sèvalys data. Mirror the `gecko_admins` + `gecko_is_admin()` pattern.
- No `middleware.ts` / `proxy.ts` exists yet. In Next.js 16 `middleware` is renamed `proxy.ts` (Node runtime). Verify in Next 16 docs at phase start.
- Root `layout.tsx` wraps everything in `PostHogProvider > LanguageProvider` and renders `ClientProviders` (cinema intro, custom cursor, GSAP). These must NOT load in the portal/admin.
- Retention conflict to resolve: `prospects` purges at 12 months, but v2.0 wants a 9-month dedupe window, an immutable `lead_events` journal, and a converted-prospect-to-client path. Purge must exclude converted prospects, and `lead_events` retention must be defined (RGPD).
- Pricing guard tests scan public routes. Portal/admin must be outside whatever the guards scan (verify guard globs in `linkAudit.test.ts`, `page.test.ts`, `serviceSchema.test.ts`); add explicit allow for `/espace-client` and `/admin` and keep `noindex`.

## Recommended Architecture

Single Next.js app, route groups for three surfaces, one Supabase project, schema-level separation (`sv_*` tables, or a dedicated `sevalys` schema; recommend dedicated tables prefixed `sv_` in `public` to match the existing `gecko_` convention and avoid exposing a new schema in PostgREST settings).

```
                     Browser
   ┌─────────────┬───────────────┬───────────────┐
   │ (public)    │ (portal)      │ (admin)       │
   │ /, /services│ /espace-client│ /admin        │
   │ /simulateur │  (magic link) │ (admin role)  │
   │ price-free  │ prices OK     │ prices OK     │
   └──────┬──────┴──────┬────────┴──────┬────────┘
          │ proxy.ts: session refresh, gate by path, set first-party UTM cookie
          ▼
   Route Handlers (src/app/api/...)  ── Server Actions (portal/admin mutations)
          │
   src/lib/server/   (service layer, framework-free, unit-testable)
     leads/ projects/ documents/ signature/ payments/ mailing/ reviews/ finance/
          │
   ┌──────┴───────────┬──────────────┬───────────────┐
   Supabase (Postgres  Supabase       Stripe          Resend
   + RLS + Auth +      Storage        (Checkout +     (send + webhooks)
   pg_cron)            (private       webhooks)
                       buckets)
```

### Route structure

| Surface | Path | Layout | Auth | Notes |
|---------|------|--------|------|-------|
| Public (existing, unchanged) | `/`, `/services/*`, `/simulateur`, `/calculateur-roi`, `/mentions-legales`, `/demo` | root layout | none | Price-free, guarded by tests. `/demo` and `/api/crm/*` untouched. |
| Public (new) | `/avis/[token]` | minimal public layout | unique token | Verified review submission. Price-free. `noindex`. |
| Public (new) | `/signer/[token]` optional | minimal | token + OTP | Only if signers need access without portal login; otherwise sign inside portal. Recommend inside portal for v2.0 (client is always a portal user). |
| Portal (new) | `/espace-client/connexion`, `/espace-client` (home/timeline), `/onboarding`, `/projet/[id]`, `/documents`, `/documents/[id]/signer`, `/paiements`, `/fichiers`, `/accord-presentation` | `(portal)` layout, own shell, no cinema/cursor | Supabase Auth magic link, role `client` | `robots: noindex`. Prices allowed. i18n via existing LanguageContext (fr first; en/th keys only if needed, default fr). |
| Admin (new) | `/admin`, `/admin/leads`, `/admin/leads/[id]`, `/admin/projets`, `/admin/projets/[id]`, `/admin/documents`, `/admin/previsions`, `/admin/avis`, `/admin/stats` | `(admin)` layout | Supabase Auth + `sv_admins` | `noindex`, French only. |
| API (new) | `/api/track`, `/api/auth/callback`, `/api/webhooks/stripe`, `/api/webhooks/resend`, `/api/signature/otp`, `/api/signature/verify`, `/api/documents/[id]/pdf`, `/api/cron/*`, `/api/reviews/*` | n/a | per route | Webhooks/cron are public URLs authenticated by signature/secret. |
| API (modified) | `/api/simulateur` | n/a | none | Add attribution capture + `lead_events` write + dedupe; keep spam guard ordering and byte-identical silent reject. |
| Do not touch | `/api/crm/*`, `/demo/feuillette` | | | Constraint. |

Use route groups `(public)`, `(portal)`, `(admin)` only if moving existing pages is avoided. Do NOT move existing public pages into a `(public)` group (risks breaking link audit and sitemap tests). Instead keep existing pages where they are and add `src/app/espace-client/layout.tsx` and `src/app/admin/layout.tsx` as nested layouts. Problem: nested layouts still inherit root layout (PostHog, LanguageProvider, ClientProviders, JSON-LD, fonts). Options:
1. (Recommended) Keep root layout, but make `ClientProviders` and global JSON-LD route-aware: render cinema/cursor only when pathname is not under `/espace-client`, `/admin`, `/avis`. Smallest diff, one modified file. Requires `usePathname` in ClientProviders (already a client component).
2. Multiple root layouts via route groups requires moving every existing page. Rejected for regression risk.

### Auth and role model

- **Auth:** Supabase Auth, `signInWithOtp` (email magic link, `shouldCreateUser: false` for clients so only admin-invited emails can sign in; admin creates the client user via service_role `auth.admin.inviteUserByEmail` or `createUser` on lead conversion). Use `@supabase/ssr` for cookie sessions in Server Components, Route Handlers and `proxy.ts`. Add dependency.
- **Do not use `user_metadata` for roles** (user-editable). Roles live in tables:
  - `sv_admins(user_id pk -> auth.users)` mirrors `gecko_admins`; helper `sv_is_admin()` `security definer`, `stable`, `set search_path = ''`.
  - `sv_client_members(user_id, client_id, role)` links an auth user to a client organisation. Supports several users per client later (multi-tenant ready).
  - Helper `sv_client_ids()` returns the set of client_ids for `auth.uid()`; policies use `client_id in (select sv_client_ids())` (wrap in `(select ...)` so Postgres caches it per statement).
- Optional: custom access token hook to put `sv_role` in the JWT for cheap checks in `proxy.ts`. Not needed v2.0; do the DB lookup in the layout (server) and rely on RLS as the real boundary.
- **proxy.ts responsibilities (thin):** refresh session cookie, redirect unauthenticated `/espace-client/*` to `/espace-client/connexion`, redirect non-admin `/admin/*` to 404, set `sv_attr` first-party cookie on public GET (see attribution). Matcher excludes `/api/webhooks`, `/api/cron`, `/_next`, static. Never treat proxy as the only guard: every Server Component/Action re-checks via `supabase.auth.getUser()` (not `getSession()`), and RLS enforces data access.
- Gecko users sharing `auth.users`: a Gecko customer hitting `/espace-client` authenticates but has no `sv_client_members` row, so RLS returns nothing and the layout shows "no access". Magic link `shouldCreateUser:false` also blocks self-signup.

### Multi-tenant-ready data model

Every business table carries `tenant_id` where tenant = the agency (Sèvalys today, future white-label), and client-owned tables also carry `client_id`. v2.0 seeds a single tenant row. Policies are written against `tenant_id`/`client_id` from day one so a second agency is data, not a migration.

Recommended tables (all `sv_` prefixed, RLS on, `revoke all from anon`; grants to `authenticated` only where a policy exists):

| Table | Purpose | Key columns / notes |
|-------|---------|--------------------|
| `sv_tenants` | agency | id, name, branding jsonb |
| `sv_admins` | admin role | user_id, tenant_id |
| `sv_clients` | client organisation | tenant_id, name, siret, billing address, converted_from_lead_id |
| `sv_client_members` | auth user to client | user_id, client_id, role |
| `sv_leads` | replaces direct use of `prospects` for pipeline | tenant_id, contact fields, status (pipeline enum), first_touch jsonb (frozen), last_touch jsonb, frozen source, dedupe_key (normalized email/phone hash), merged_into |
| `sv_lead_events` | immutable journal | lead_id, type, payload, utm, occurred_at; no UPDATE/DELETE grants + trigger raising on update/delete |
| `sv_projects` | one per engagement | tenant_id, client_id, service_slug, status, current_step_id |
| `sv_project_steps` | ordered steps per project | project_id, key, position, status (pending, active, awaiting_client, done), required_document_kind, required_payment, completed_at |
| `sv_step_templates` | step definitions per service | service_slug, ordered steps; seeded from code or SQL |
| `sv_documents` | generated docs | project_id, kind (devis, contrat, cdc, pv, facture), template_key, template_version, data_snapshot jsonb (frozen render inputs), storage_path, sha256, status (draft, issued, signed, void), amounts |
| `sv_signature_requests` | | document_id, signer_email, otp_hash, otp_expires, attempts, status |
| `sv_signature_audit` | append-only | signature_request_id, event, ip, user_agent, ts, doc_sha256, otp_verified |
| `sv_payments` | | project_id, document_id, stripe_checkout_session_id, stripe_payment_intent_id, amount, status, paid_at |
| `sv_stripe_events` | webhook idempotency | event_id pk, type, processed_at |
| `sv_files` | client files and links | project_id, storage_path or url, kind, uploaded_by |
| `sv_consents` | accord de présentation du projet | project_id, granted, granted_at, scope |
| `sv_reviews` | | project_id, token_hash, rating, body, status, verified bool, published |
| `sv_mail_rules` / `sv_mail_log` | | trigger event, template key, to, status, provider id, idempotency key |
| `sv_costs`, `sv_forecast_items` | admin finance | tenant_id, category, amount, date, recurrence |
| `sv_outbox` | domain event outbox | id, type, payload, created_at, processed_at, attempts |

Storage: private buckets `sv-documents` (PDFs) and `sv-client-files`; paths prefixed `{tenant_id}/{client_id}/...`; storage policies mirror table RLS; clients download via short-lived signed URLs generated server-side. Money in integer cents. Public pages never read these tables.

### Prospect/UTM attribution (data flow)

1. `proxy.ts` (or a tiny client `AttributionCapture` mounted in root layout) reads `utm_source/medium/campaign/content/term`, `gclid`, `fbclid`, referrer, landing path on any public request. Sets first-party cookie `sv_attr` (first-touch written once, last-touch overwritten per new campaign visit). Cookie is first-party, no consent banner implication for pure attribution still needs RGPD review (PostHog already present; check existing consent handling).
2. Simulateur submit (`submit.ts`, Wizard) forwards the attribution payload (read from cookie by the Route Handler server-side, so the client bundle changes minimally). `/api/simulateur` upserts into `sv_leads` with dedupe on normalized email/phone within 9 months (merge: append `lead_events` row `form_resubmitted`, update last_touch, never touch first_touch/source), then inserts `lead_events`.
3. Contact form `/api/contact` gets the same treatment (modified).
4. Migration path for existing `prospects`: backfill into `sv_leads` once, keep `prospects` read-only, drop later. The 12-month purge cron must be replaced by an RGPD retention job that spares converted clients.
5. Funnel stats = SQL views over `sv_lead_events`/`sv_leads` grouped by frozen source, rendered in `/admin/stats`.

Immutability: `revoke update, delete` plus a `before update or delete` trigger on `sv_lead_events` and `sv_signature_audit`.

### Core flow: document generation -> signature -> payment -> step transition

Model the project as a state machine whose transitions are driven by events written to `sv_outbox` inside the same DB transaction as the state change. Never advance steps from a client call or from a webhook handler inline across multiple systems.

```
Admin action / step becomes active
   │ (Postgres function sv_activate_step, SECURITY DEFINER, one transaction)
   ▼
1 GENERATE   step.required_document_kind present
   service: render PDF from versioned template in code
   - template registry src/lib/documents/templates/{kind}/v{n}.tsx
   - input snapshot (client, project, amounts) stored in sv_documents.data_snapshot
   - render with @react-pdf/renderer (server, Node runtime, no headless Chrome on Vercel)
   - upload to private bucket, compute sha256 of bytes, status=issued
   - outbox: document.issued  -> mail "document à signer"
   ▼
2 SIGN       client in portal
   - POST /api/signature/otp: generate 6-digit OTP, store hash+expiry, mail via Resend, rate-limit
   - POST /api/signature/verify: constant-time compare, attempts cap
   - on success, in ONE transaction: write sv_signature_audit (ip, ua, timestamp from DB now(), doc sha256, otp verified), set document status=signed, optionally stamp a signature page appended to a derived PDF (original hash retained), outbox: document.signed
   ▼
3 PAY        if step.required_payment (acompte)
   - Server Action creates Stripe Checkout Session (client_reference_id = payment row id, metadata ids, idempotency key), stores pending sv_payments row
   - client redirected; return page only reads state, never trusts query params
   ▼
4 WEBHOOK    POST /api/webhooks/stripe
   - raw body (`await request.text()`), verify signature with STRIPE_WEBHOOK_SECRET
   - insert event_id into sv_stripe_events (unique) for idempotency; if conflict, 200 and stop
   - checkout.session.completed / payment_intent.succeeded -> sv_payments.status=paid
   - outbox: payment.succeeded
   ▼
5 TRANSITION outbox consumer (sv_advance_project): when step's requirements (doc signed AND payment paid, as configured) are all satisfied, mark step done, activate next step (back to 1), update sv_projects.current_step_id, outbox: step.completed -> mail rule engine
```

Key rules: transitions are idempotent and derived ("is the step complete?" recomputed from facts) rather than incremented; the webhook only records facts. The invoice (facture) document is generated on payment.succeeded or at the invoice step, with a gapless legal numbering sequence (a Postgres sequence per tenant per year; French invoices require continuous numbering, so allocate inside a transaction with `sv_document_counters` row lock, never from app memory).

E-signature scope honesty: "simple" electronic signature under eIDAS is legally admissible, but the burden of proof is on Sèvalys. The audit trail must include document hash before and after, OTP delivery proof, server time, IP, UA, consent checkbox text and version. Flag for legal review (LOW confidence on evidentiary sufficiency; recommend a CGV clause accepting this signature method).

### Outbox consumer and scheduled jobs

Vercel serverless has no always-on worker. Options:
- (Recommended) Process the outbox synchronously-after-response using `after()` from `next/server` for the happy path (low latency), AND a Vercel Cron (`vercel.json`, e.g. every 5 minutes on Pro; Hobby limited to once/day, verify plan) hitting `/api/cron/outbox` (header `Authorization: Bearer CRON_SECRET`) that retries unprocessed rows. Both call the same idempotent `processOutbox()`.
- pg_cron (already enabled and used) for pure-SQL jobs: retention purge, 9-month dedupe window expiry, review-token expiry, overdue-payment flags, forecast materialized view refresh. Use pg_cron + `pg_net` to call the app only if Vercel Cron is not available.
- Vercel Cron jobs: outbox retry, reminder emails (unsigned doc after 3 days, unpaid acompte, review request N days after PV signed), daily digest to admin.

Mailing: a rules table maps `event type -> template key -> recipient resolver`. `sv_mail_log` has a unique idempotency key (`{event_id}:{template}`) so retries never double send. Templates are React Email components in `src/lib/mailing/templates` (add `@react-email/components`, or keep plain HTML functions as in `/api/simulateur` to avoid a dependency; recommend plain typed functions for v2.0). Resend webhook (`/api/webhooks/resend`, svix signature) updates delivered/bounced into `sv_mail_log`. Existing `contact@sevalys.com` sender reused; confirm SPF/DKIM already cover transactional volume.

### Admin dashboard (forecast)

Read-only SQL views (`sv_v_forecast_monthly`, `sv_v_margin_by_project`, `sv_v_cash_projection`) over `sv_documents` (issued, unpaid), `sv_payments` (paid), `sv_costs`, `sv_forecast_items`. Admin pages are Server Components calling views via the user-scoped client (RLS `sv_is_admin()`), charts rendered client-side (recharts or lightweight SVG; pick at phase time). No separate analytics store.

### Reviews

`sv_reviews` token generated when PV is signed (outbox rule). `/avis/[token]` verifies hash(token), one use, then stores review as `verified` (tied to a real project). Admin approves publish. A public read-only view `sv_v_public_reviews` (no PII, first name only, granted to anon) feeds `Review`/`AggregateRating` JSON-LD in the global schema: this modifies `serviceJsonLd`/layout JSON-LD and the schema guard tests (ensure no price keys; `AggregateRating` requires real data, do not render with zero reviews). Revalidate via `revalidateTag` on publish.

## Component Boundaries

| Component | Responsibility | Communicates With | New/Modified |
|-----------|---------------|-------------------|--------------|
| `src/lib/supabase.ts` | add `createSupabaseServerClient()` (ssr cookie-bound) and browser client for portal; keep existing 3 | all server code | MODIFIED (additive only) |
| `src/lib/supabase/ssr.ts` (or in same file) | `@supabase/ssr` helpers | proxy, layouts | NEW |
| `src/proxy.ts` | session refresh, path gating, attribution cookie | Supabase Auth | NEW |
| `src/app/espace-client/**` | portal UI | service layer via Server Actions | NEW |
| `src/app/admin/**` | admin UI | service layer | NEW |
| `src/app/avis/[token]` | review form | reviews service | NEW |
| `src/app/api/webhooks/{stripe,resend}` | verified event ingestion | outbox, payments, mail_log | NEW |
| `src/app/api/cron/*` | scheduled jobs | outbox, mailing | NEW |
| `src/app/api/signature/*` | OTP issue/verify | signature service | NEW |
| `src/lib/server/*` | domain services (leads, projects, documents, signature, payments, mailing, finance) | Supabase service role, Stripe, Resend | NEW |
| `src/lib/documents/templates/*` | versioned PDF templates in code | document service | NEW |
| `src/app/api/simulateur/route.ts`, `src/app/api/contact/route.ts` | add attribution + dedupe + lead_events | leads service | MODIFIED |
| `src/lib/prospects-schema.ts`, `src/lib/simulateur/submit.ts` | extend payload (attribution optional, server reads cookie) | | MODIFIED (small) |
| `src/components/ui/ClientProviders.tsx`, `src/app/layout.tsx` | route-aware: skip cinema/cursor/GSAP and marketing JSON-LD on portal/admin; add review JSON-LD | | MODIFIED |
| `src/app/sitemap.ts`, `robots.ts`, `llms.txt` | exclude portal/admin (disallow `/espace-client`, `/admin`, `/api`) | | MODIFIED |
| Pricing/link/schema vitest guards | confirm scoping excludes portal/admin; add new guards (portal routes noindex, no service_role import in `'use client'`) | | MODIFIED/NEW |
| `src/app/api/crm/*`, `/demo/feuillette`, `src/app/demo` | untouched | | UNCHANGED |
| Navbar | optional "Espace client" link (absolute href `/espace-client`, price-free) | | MODIFIED (optional) |
| PostHog | add `identify` in portal with client id only, no PII; exclude `/admin` | | MODIFIED (small) |

### Data flow summary

Public visit -> attribution cookie -> simulateur/contact POST -> `sv_leads` + `sv_lead_events` -> admin pipeline -> "convert to client" (service-role transaction: create `sv_clients`, auth user via invite, `sv_client_members`, `sv_projects` + steps from templates; lead event `converted`, source frozen onto client) -> magic-link email -> portal -> step engine (generate, sign, pay) -> outbox -> mail/review/forecast.

## Patterns to Follow

### Pattern 1: RLS as the boundary, service role only for system actors
Portal/admin reads and simple writes use the cookie-bound user client under RLS. Service role is limited to: public lead intake, webhooks, cron, OTP issue, conversion. Add a lint/test guard that `createServiceRoleClient` is not imported from files under `src/app/espace-client` or `src/app/admin` or any `'use client'` file.

```sql
create policy "client reads own projects" on sv_projects for select to authenticated
using (client_id in (select sv_client_ids()));
create policy "admin all" on sv_projects for all to authenticated
using ((select sv_is_admin())) with check ((select sv_is_admin()));
```

### Pattern 2: Facts + derived state + outbox
Record facts (signed, paid) transactionally with an outbox row; derive step completion; process outbox idempotently.

### Pattern 3: Frozen snapshots
Documents store the data snapshot and template version used, so a regenerated template never alters an issued/signed document. Signed PDFs are write-once (storage policy forbids overwrite).

### Pattern 4: Thin route handlers, testable services
Keep logic in `src/lib/server/*` with injected clients so vitest (existing runner) can test transitions, OTP, dedupe, webhook idempotency without network, matching the repo's existing test style (`route.test.ts`).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Granting by `authenticated`
Shared `auth.users` with Gecko. Always require membership/admin table checks.

### Anti-Pattern 2: Trusting the Stripe return URL or client call to mark paid
Only the verified webhook (plus optional server-side session retrieve on return page) sets paid.

### Anti-Pattern 3: Parsing JSON before verifying the Stripe webhook
Use raw text body; JSON re-serialization breaks the signature. Do not apply body-parsing middleware or `proxy.ts` to this path.

### Anti-Pattern 4: Headless-Chrome PDF on Vercel
Heavy, cold-start and size limits. Use a pure-JS renderer; set `runtime = 'nodejs'` and an adequate `maxDuration`.

### Anti-Pattern 5: Mutating `prospects`/`lead_events` history
First touch and source are frozen; append events instead.

### Anti-Pattern 6: Putting prices in public-scanned files
Quote/invoice templates and portal strings live under `src/lib/documents` and `src/app/espace-client`; ensure guards don't scan them, but ensure no portal route is linked from price-free public pages in a way that a crawler indexes (noindex + robots disallow).

### Anti-Pattern 7: Roles in `user_metadata`
Editable by the user. Use tables.

## Scalability Considerations

| Concern | At 10 clients | At 1K clients | At 100K |
|---------|---------------|---------------|---------|
| RLS cost | trivial | index `client_id`, `tenant_id`; wrap helper calls in `(select ...)` | partition events tables, materialized views |
| PDF generation | inline in request | move to queue worker (outbox + cron) | dedicated worker |
| Outbox | `after()` + 5-min cron | add `for update skip locked` batching | external queue |
| Mail | direct Resend | rate limit queue | dedicated provider tier |

Realistically this is a single-agency tool; design for tenant_id but do not build tenant admin UI.

## Suggested Build Order (dependency driven)

1. **Foundation: schema, auth, roles, shell.** Migrations for tenants/admins/clients/members + helper functions + RLS tests (pgTAP or vitest against local Supabase), `@supabase/ssr`, `proxy.ts`, magic-link login, empty `/espace-client` and `/admin` shells, route-aware ClientProviders, robots/sitemap exclusions, guard scoping. Everything depends on this. Verify Gecko-user isolation here.
2. **Lead attribution and pipeline.** `sv_leads`, `sv_lead_events`, attribution cookie, modify `/api/simulateur` and `/api/contact`, backfill `prospects`, retention rewrite, admin leads list and funnel stats. Independent of payments; delivers value early and starts accumulating data (attribution cannot be backfilled, so ship early).
3. **Lead to client conversion + projects + steps.** Convert action, invite email, step templates, portal timeline, onboarding, files/links, presentation consent. Needs 1 and 2. Includes the minimal outbox table and mailing rule engine skeleton because step changes already email (Resend).
4. **Document generation.** Template registry, PDF render, storage, numbering, portal documents view, admin issue action. Needs 3.
5. **E-signature.** OTP, audit trail, sign flow, signed-artifact rules. Needs 4. Schedule legal review in parallel.
6. **Stripe payments.** Checkout, webhook, idempotency, payment state in portal, step transition on paid, invoice generation. Needs 4 (and 5 for sign-before-pay gating). Can be developed in parallel with 5 behind the step engine, but integrate after.
7. **Mailing automation completion.** Rules per event, reminders via cron, Resend webhooks, mail log. Partially started in 3; finalize after 5/6 events exist.
8. **Admin forecast dashboard.** Costs, forecast items, views. Needs 4/6 data. Late because it reads accumulated facts.
9. **Verified reviews + schema markup.** Needs completed projects (PV event from 4/5). Modifies JSON-LD and its guard tests.
10. **Ads prep.** UTM convention doc, Meta/Google conversion events (server-side events fired from outbox on `lead.created`, `lead.qualified`, `client.converted`), organic content kit. Needs 2 for event taxonomy; mostly non-code. Meta CAPI/Google need consent handling.

## Research Flags

- Phase 1: Next 16 `proxy.ts` semantics and `@supabase/ssr` cookie handling, RLS test strategy, shared `auth.users` isolation (verify against live Gecko policies).
- Phase 2: RGPD retention for leads and the immutable journal vs right to erasure; dedupe key normalization.
- Phase 4: `@react-pdf/renderer` compatibility with React 19 / Next 16 / Turbopack (verify; fallback is `pdf-lib` or `pdfmake`); font embedding for Space Grotesk/Manrope; French legal mentions on quotes/invoices (numbering, TVA/auto-entrepreneur mention).
- Phase 5: Legal sufficiency of home-made simple signature (needs counsel); timestamp source (consider RFC 3161 TSA as optional hardening).
- Phase 6: Stripe Checkout vs Payment Links, SEPA vs card, Stripe Tax, webhook event set, Vercel function body handling.
- Phase 7: Vercel plan cron frequency limits (Hobby is daily only, verify current).
- Phase 9: `AggregateRating` eligibility rules for self-hosted reviews on a LocalBusiness/Organization (Google may ignore self-serving reviews; verify guidelines).

## Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Existing-code integration points | HIGH | read from repo |
| Auth/RLS model | MEDIUM-HIGH | standard Supabase patterns, shared-project risk from repo evidence |
| Step engine/outbox | MEDIUM | well-known pattern, design not yet validated |
| Next 16 proxy, Vercel cron limits, react-pdf compat | LOW-MEDIUM | from training data, not verified this session |
| eIDAS evidentiary value | LOW | needs legal review |

## Sources

- Repo: `C:\portfolio\src\lib\supabase.ts`, `src\app\api\simulateur\route.ts`, `supabase\migrations\*.sql`, `src\app\layout.tsx`, `.planning\PROJECT.md`
- Supabase docs (RLS, SSR auth, pg_cron), Stripe webhook docs, Next.js 16 proxy docs, Vercel Cron docs: not fetched this session; verify at phase research.
