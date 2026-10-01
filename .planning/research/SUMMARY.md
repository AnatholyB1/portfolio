# Project Research Summary

**Project:** BRICON ANATHOLY / Sèvalys, v2.0 Plateforme Sèvalys
**Domain:** Small-agency client portal and lead back office, added to an existing Next.js 16, Supabase, Resend and Vercel marketing site
**Researched:** 2026-10-01
**Confidence:** MEDIUM. Package versions and repo facts are HIGH. Legal rules, platform limits and Next 16 behaviour come from training knowledge and need verifying.

## Executive Summary

v2.0 turns the price-free marketing site into an operating platform:
- a passwordless client portal at `/espace-client`;
- an admin back office at `/admin`;
- a document, e-signature and payment pipeline (quote, contract, specification, acceptance report, invoice);
- lead attribution with mailing automation.

Build one Next.js app on one Supabase project, with RLS-enforced tables prefixed `sv_` and a `tenant_id` on every table. Project progress is a state machine derived from recorded facts ("document signed", "payment received"). Each fact is written in the same transaction as an outbox row.

No new infrastructure is needed: a Postgres outbox plus cron replaces a queue; pure-JS PDF replaces headless Chrome; hosted Stripe Checkout replaces custom payment UI; an in-house simple e-signature replaces a SaaS.

Build in dependency order: (1) security foundation, (2) lead attribution (data cannot be backfilled), (3) project and step engine, (4) documents, (5) signature, (6) Stripe, (7) remaining mailing, (8) admin forecast, (9) reviews, (10) ads preparation.

Risks are mostly legal and security:
- **Cross-client leaks.** The Supabase project and `auth.users` are shared with Gecko, so "authenticated" must never grant access.
- **E-signature evidence.** A home-made simple signature can carry weak evidentiary value.
- **Stripe webhooks.** A non-idempotent webhook causes duplicate invoices and notifications.
- **Invoicing.** French mentions, gapless numbering and the e-invoicing reform (reception obligation in force as of 2026-10-01, to verify).
- **Consent.** CNIL consent is required for tracking and ad conversions.
- **Reviews.** Review gating and selective moderation are not allowed.

Mitigations: test-enforced RLS isolation; append-only hash-chained audit tables; a `stripe_events` idempotency table; DB-sequence invoice numbers; consent banner before any ad tag; review invitations to every delivered client. A lawyer should review CGV, contract and signature clause; an accountant should review invoices.

## Key Findings

### Recommended Stack

Existing stack unchanged (Next 16.1.6, React 19.2.3, Tailwind v4, supabase-js, Resend 6, zod 4, vitest 4, Vercel). Additions:

- **`@supabase/ssr` ^0.12.7** for cookie sessions. Bump `@supabase/supabase-js` to ^2.114.0 (mandatory peer). `signInWithOtp` with `shouldCreateUser: false`. 6-digit email OTP is the primary login (mail scanners burn magic links).
- **`@react-pdf/renderer` ^4.9.0** for versioned PDF templates in Node runtime, no Chromium. `serverExternalPackages`, local TTF fonts. Spike on Turbopack first.
- **`node:crypto` + Resend** for SHA-256 of the PDF, HMAC-hashed single-use OTP, `timingSafeEqual`. No `otplib`, no PAdES tooling.
- **`stripe` ^23.0.0 with hosted Checkout** (no `@stripe/stripe-js`). Verify webhook on raw body, pin API version, integer cents.
- **Supabase Storage, private buckets.** Direct signed uploads (Vercel 4.5 MB body limit). Downloads via 60–300 s signed URLs.
- **Postgres outbox + Vercel Cron**, or `pg_cron` + `pg_net` if Hobby plan.
- **`recharts` ^3.10.1, `date-fns` ^4.4.0**, admin only, `next/dynamic`. Forecast maths in SQL views.
- **Meta CAPI via plain `fetch`**, first-party UTM capture in TypeScript.
- **Optional:** `pdf-lib` ^1.17.1 only if an audit page must be appended to signed PDFs.

Do not add: Redis/BullMQ, Puppeteer, third-party e-sign SDKs, NextAuth/Clerk, an ORM, a UI kit, Stripe Elements.

### Expected Features

**Must have (table stakes):**
- Invite-only passwordless login, RLS isolation tests, guided onboarding whose company data feeds contracts.
- Stage progress, files and links, document list, action-required inbox, revocable showcase-permission request.
- Versioned PDFs (quote, contract, cahier des charges, PV de recette, invoice) with French legal mentions and gapless numbering.
- Simple e-signature with exportable audit trail and sealed PDF.
- Stripe deposits per stage, state driven by webhooks, receipts, reminders, stage unlock on payment.
- Attribution: first/last-touch UTM, frozen source, immutable `lead_events`, 9-month dedupe, pipeline statuses, funnel by source, manual cost per appointment, RGPD retention.
- Mailing rules (event, template, delay) with idempotency and logs; transactional and marketing separated.
- Admin: project list, prospect pipeline, revenue and cash forecast, manual costs and margin.
- Reviews: single-use verified link, unconditional Google link, moderated publication.

**Should have (cheap differentiators):** per-stage client approval inside the PV de recette; source-to-revenue attribution; template changelog in admin; Review JSON-LD (no promise of stars).

**Defer (v2+):** Meta CAPI / Google offline conversion sending; scenario forecasts; public status pages; live service stats in portal; recurring billing; PA / Factur-X connection.

**Anti-features:** passwords/social login; third-party e-sign SaaS; prices on any public surface; rating-gated review solicitation; CMS for templates; full CRM; in-portal chat; auto-import of ad spend; any edit/delete of `lead_events`.

### Architecture Approach

Three surfaces (public unchanged, `/espace-client`, `/admin`) share one app and one Supabase project. Roles live in tables, never `user_metadata`: `sv_admins` and `sv_client_members`, with `security definer` helpers `sv_is_admin()` and `sv_client_ids()`; policies wrap helpers in `(select ...)`.

**Major components:**
1. **`proxy.ts`**, thin: refresh session cookie, gate portal/admin paths, set attribution cookie. Every Server Component/Action re-checks with `getUser()`; RLS is the real boundary.
2. **`src/lib/server/*`**: framework-free domain services with injected clients, testable in vitest.
3. **Step and document engine:** activation generates a PDF from a versioned template with a frozen data snapshot, stored write-once with SHA-256; client signs via OTP with append-only audit; Checkout; verified webhook records facts; step completion derived from facts, advanced through the outbox.
4. **Outbox consumer:** `after()` happy path + Vercel Cron retries, both calling one idempotent `processOutbox()`. `pg_cron` for pure-SQL jobs (retention).
5. **Admin forecast:** SQL views (`security_invoker`) read through the RLS-scoped client.

**Integration constraints:**
- Keep root layout; make `ClientProviders` and JSON-LD route-aware (no cinema intro, cursor, GSAP on portal/admin). Do not move existing pages into route groups.
- Leave `/api/crm/*` and `/demo` untouched.
- Scope pricing guard tests explicitly: allow prices under `/espace-client`, `/admin` and document templates; never loosen guards globally.
- Existing 12-month purge cron on `prospects` conflicts with 9-month dedupe and converted clients: rewrite it.
- Conflict resolved: STACK suggested `app_metadata` roles; ARCHITECTURE recommends `sv_admins` / `sv_client_members` tables. **Follow ARCHITECTURE** (shared Gecko `auth.users`, multi-user clients).

### Critical Pitfalls

1. **RLS leaks** (shared `auth.users` with Gecko, `using (true)`, views without `security_invoker`, public buckets). Enable RLS in the same migration as each table; two-client isolation tests including a Gecko-user case; run Supabase advisor; `service_role` only in `server-only` modules.
2. **Weak simple e-signature.** Never re-render a signed document; store exact bytes, SHA-256, template version, data snapshot. Hashed single-use OTP (10 min, ≤5 attempts). Append-only hash-chained audit with consent event and certificate page. Convention-de-preuve clause in contract/CGV; call it "signature électronique simple".
3. **Stripe webhook errors.** Webhook is the only source of paid state; raw-body verification; `stripe_events` PK idempotency; monotonic transitions; metadata ids; pinned API version; env-key-mode assertions; async SEPA and refunds; event replay as acceptance test.
4. **Invoicing legality.** Gapless DB-locked numbering; immutability trigger on issued invoices, credit notes for corrections; one legal invoice source (our PDF, not Stripe invoices); mentions test over extracted PDF text; structured invoice data for future Factur-X.
5. **CNIL consent and erasure.** Consent banner (equal-weight Accept/Refuse, consent log) before any ad tag or CAPI; UTM captured server-side at form submit; `lead_events` designed with tombstone/anonymisation capability; rewrite the 12-month purge.
6. **Review compliance.** Invite every delivered client; moderate on legality only with logged reason; "Politique des avis" page; unconditional Google link; don't rely on AggregateRating for the agency's own page.
7. **Also:** SPF/DKIM/DMARC in phase 1 (OTP depends on it); separate transactional/marketing streams; pure-JS PDF with local fonts and direct-to-storage uploads.

## Implications for Roadmap

### Phase 1: Foundation (schema, auth, roles, shell, compliance groundwork)
Delivers: `sv_tenants`, `sv_admins`, `sv_clients`, `sv_client_members` + helpers; `@supabase/ssr`, `proxy.ts`, OTP login, empty `/espace-client` and `/admin` shells; route-aware `ClientProviders`, `noindex`, robots/sitemap exclusions, scoped pricing guards; SPF/DKIM/DMARC; env-key-mode assertion; fix stale hero/contact dates; mentions légales/CGV checklist.
Avoids: RLS leaks, scanner-burned magic links, proxy over-matching, guard weakening.

### Phase 2: Lead attribution, pipeline and consent banner
Delivers: `sv_leads` + immutable hash-chained `sv_lead_events`; UTM capture with allowlist, write-once first touch, separate last touch; 9-month dedupe on normalised email/phone; changes to `/api/simulateur` and `/api/contact` preserving spam-guard order; `prospects` backfill and rewritten retention job; admin lead list, pipeline, funnel views, manual cost per appointment; UTM convention doc; consent banner + log.
Avoids: overwritten first touch, dedupe errors, erasure vs immutable journal, tags before consent.

### Phase 3: Conversion, projects, step engine, mailing skeleton
Delivers: lead-to-client conversion + invite; `sv_projects`, `sv_step_templates` (2–3 generic templates first); portal timeline, onboarding, files/links, action inbox, showcase permission; minimal `sv_outbox`, mail rules, idempotency keys, `sv_mail_log`.

### Phase 4: Document generation
Delivers: template registry with `v{n}` versions; React-PDF with embedded fonts; snapshot + SHA-256 + write-once storage; document lifecycle statuses; gapless numbering function; French mentions test; `Europe/Paris`/`fr-FR` formatting; portal documents tab. First plan: Turbopack/fonts spike.

### Phase 5: E-signature
Delivers: OTP issue/verify with rate limits and consent step; append-only hash-chained `sv_signature_audit`; sealed PDF with certificate page; exportable audit; convention-de-preuve clause; per-stage approval in PV de recette.

### Phase 6: Stripe payments and invoicing
Delivers: payment schedules; hosted Checkout with server-computed amounts; verified idempotent webhook + `sv_stripe_events`; deposit/final invoices and credit notes; stage unlock on payment; receipts and reminders.

### Phase 7: Mailing automation completion
Delivers: full rules and cron reminders (unsigned docs, unpaid deposits, review requests); Resend bounce/complaint webhooks and suppression list; transactional/marketing separation; `List-Unsubscribe`.

### Phase 8: Admin forecast dashboard
Delivers: manual costs; SQL views with explicit buckets (pipeline, signed, invoiced, collected) in integer cents, HT and TTC; margin and cash projection; `recharts` charts; source-to-revenue attribution.

### Phase 9: Verified reviews and schema
Delivers: single-use hashed tokens (60-day expiry), `/avis/[token]`; logged moderation; "Politique des avis" page; unconditional Google link; JSON-LD from published reviews only; vitest guards (no price keys, Google link at every rating).

### Phase 10: Ads preparation
Delivers: event taxonomy and conversion ladder; consent-gated click ids; shared `event_id` design; organic content kit. CAPI/offline conversion sends optional or deferred.

### Phase Ordering Rationale
- Critical path: RLS/roles → documents → signature → Stripe. Attribution and mailing branch off the existing prospects table.
- Attribution second: data cannot be backfilled.
- Consent banner in phase 2: CNIL risk starts as soon as a persistent identifier is stored.
- DNS authentication in phase 1: OTP mail otherwise lands in spam and breaks login/signing.
- Reviews last: need delivered clients.

### Research Flags
**Needs phase research:** P1 (Next 16 `proxy.ts`, `@supabase/ssr`, RLS test strategy, Gecko isolation vs live policies); P2 (CNIL first-party UTM/banner, retention, erasure vs journal); P4 high priority (React-PDF on React 19/Turbopack, invoice mentions, e-invoicing calendar/PA); P5 high priority (legal sufficiency, convention de preuve, optional RFC 3161; legal review); P6 (Stripe v23, SEPA async, acompte flow); P9 (Omnibus/Code de la consommation, B2B applicability, Google self-serving review rule).
**Standard patterns:** P3, P7 (confirm Vercel plan), P8, P10.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versions checked on npm 2026-10-01. Behavioural claims (Next 16 proxy, react-pdf on Turbopack, Vercel cron) from training data. |
| Features | MEDIUM | Common agency-portal patterns and FR/EU rules, no live verification. |
| Architecture | MEDIUM-HIGH | Repo integration points verified; step engine/outbox is a known pattern, not yet validated. |
| Pitfalls | MEDIUM | RGPD, CNIL, eIDAS, Omnibus, invoicing from training knowledge; not legal advice. E-invoicing dates MEDIUM-LOW. |

**Overall confidence:** MEDIUM

### Gaps to Address
- Vercel plan (Hobby vs Pro): decides cron frequency and commercial-use rights; confirm in phase 1.
- Lawyer review (CGV, contract, signature clause) before phase 5 launch; accountant review (VAT status, invoice mentions, Factur-X/PA before Sept 2027) before phase 4.
- CNIL: first-touch UTM before consent? Does simulator consent wording cover nurture emails?
- Shared Gecko project: verify live `gecko_*` policies; consider separate preview/test projects.
- One retention table: 12-month prospect purge, 9-month dedupe, 10-year invoices, erasure rights.
- Review markup: do not promise stars; verify eligibility in phase 9.
- Stripe details (Tax, Checkout vs Payment Links, SEPA): decide in phase 6.

## Sources
**Primary (HIGH):** npm registry 2026-10-01 (`@supabase/ssr` 0.12.7, `@react-pdf/renderer` 4.9.0, `stripe` 23.0.0, `recharts` 3.10.1, `date-fns` 4.4.0, `pdf-lib` 1.17.1); repo files (`src/lib/supabase.ts`, `src/app/api/simulateur/route.ts`, `supabase/migrations/*.sql`, `src/app/layout.tsx`, `.planning/PROJECT.md`).
**Secondary (MEDIUM):** Vercel cron limits, React-PDF compat docs; eIDAS art. 25, Code civil 1366-1367, CNIL guidance; Omnibus / Code de la consommation L111-7-2, Google review policies; CGI 242 nonies A, Code de commerce L441-9; Supabase and Stripe docs.
**Tertiary (LOW):** Next 16 `proxy.ts` details; Vercel function limits; e-invoicing reform dates; practical eIDAS sufficiency; self-serving review rule.
