# Technology Stack: v2.0 Plateforme Sèvalys (additions only)

**Project:** BRICON ANATHOLY / Sèvalys
**Researched:** 2026-10-01
**Scope:** New capabilities only. Existing stack (Next.js 16.1.6, React 19.2.3, TS, Tailwind v4, Supabase JS, Resend 6, zod 4, vitest 4, Vercel) is unchanged.
**Version check:** the npm registry was queried on 2026-10-01 (`npm view`). Context7 was not used, so behavioural claims below are MEDIUM unless marked otherwise.

## Recommended Additions

### Auth (passwordless client portal + admin role)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@supabase/ssr` | ^0.12.7 | Cookie-based Supabase session in Server Components, route handlers and the proxy | Official package for Next App Router. Do not use the deprecated `auth-helpers`. |
| `@supabase/supabase-js` | **bump to ^2.114.0** | Peer requirement of `@supabase/ssr` 0.12.7 | The repo has ^2.104.1, so the bump is mandatory. |

Integration:
- **Magic link / email OTP**: use `signInWithOtp({ email, options: { shouldCreateUser: false } })`. Clients are created by the admin (prospect to client conversion), so strangers cannot self-register.
- **Sending**: configure Supabase custom SMTP pointing at Resend, so auth mails come from the sevalys domain. No extra library.
- **Next 16 proxy**: in Next 16 `middleware.ts` is renamed `proxy.ts`. Use it only to refresh the session cookie. Do not put authorization there (see Pitfalls).
- **Roles**: put `role` ('admin' | 'client') in `app_metadata` (server-writable only, never `user_metadata`). Add `clients.user_id` and `projects.client_id`.
  - RLS pattern for clients: `client_id in (select id from clients where user_id = (select auth.uid()))`.
  - RLS pattern for admin: `(select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'`.
  - Wrap `auth.uid()` in `select` so Postgres caches it (performance).
- **Clients**: three of them.
  - Browser/anon client for the portal.
  - Server client (cookies) for authenticated reads.
  - Service-role client, server-only, for webhooks, cron, `lead_events` writes and signature audit writes. Never import it into a client component. The existing insert-only prospects RLS stays untouched.
- **Link scanners**: corporate mail scanners prefetch magic links and burn them. Prefer the 6-digit email OTP (`verifyOtp`) as the primary flow, with the link as secondary. This is a known passwordless gotcha. MEDIUM confidence.

### PDF generation (quote, contract, spec, acceptance report, invoice)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@react-pdf/renderer` | ^4.9.0 | Versioned templates as React components, rendered server-side with `renderToBuffer` | Pure JS, no headless browser, so it fits a Vercel function easily (no ~60MB Chromium, no cold-start pain). React 19 is supported since v4.1 (peer `^19`). "Templates in code", versioned in git, matches the scoping decision. |
| `pdf-lib` | ^1.17.1 (optional, add only if needed) | Post-process: stamp the hash/footer, append an audit-trail page, merge | Only if the signed PDF must carry the signature certificate page. Last release is old but the library is stable. |

Integration:
- Render in a Node-runtime route handler or server action (`export const runtime = 'nodejs'`). Never edge.
- Add `serverExternalPackages: ['@react-pdf/renderer']` in `next.config.ts`. Known React-PDF crash reports in App Router stem from duplicate React instances or bundling. Do the Phase-1 spike for this on Turbopack (LOW-MEDIUM: Next 16 specifics not verified).
- Register fonts (Manrope/Space Grotesk TTF) from local files. Do not rely on `next/font`. Use the Latin range so accents render. Bundle the TTFs via `outputFileTracingIncludes` if they are read through `fs`.
- Template versioning: `src/pdf/templates/<doc>/v1/…` plus a `template_version` column on each stored `documents` row. Store the generated PDF in Storage and its SHA-256 in the table. Never regenerate a signed document: store it immutably.
- French invoice mandatory mentions (SIREN, TVA or "TVA non applicable art. 293 B", penalties, numbering sequence without gaps) belong in the template and a DB sequence. The numbering must come from a Postgres sequence or an atomic function, not app code.

### E-signature maison (simple eIDAS)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `node:crypto` (built-in) | n/a | SHA-256 of the PDF, `randomInt` for the OTP, `timingSafeEqual`, HMAC to hash the OTP at rest | No dependency needed. |
| Resend (existing) | ^6.28.1 | OTP delivery by email | Already in the stack. |

- Do **not** add `otplib`. It is for TOTP authenticator apps. The OTP here is a one-time code mailed to the signer: 6 digits, 10 min TTL, max 5 attempts, stored only as an HMAC.
- Do **not** add `@signpdf/signpdf` or PAdES tooling. That is for cryptographic certificates (advanced/qualified level) and is out of scope for a "simple" signature.
- Audit trail: an append-only `signature_events` table (document_hash, signer email, OTP sent/verified, IP from `x-forwarded-for`, user agent, `now()` server time). Block UPDATE/DELETE with RLS and a trigger. Also hash-chain the events (each row stores the previous row's hash) so tampering is visible.
- Timestamp: DB server time is acceptable for simple eIDAS. A qualified RFC 3161 TSA is optional hardening, flagged as a gap and not needed at launch.
- Legal point: eIDAS (Reg. 910/2014) art. 25 and the French Civil Code art. 1366-1367 give a simple signature admissibility. The burden of proof lies on Sèvalys, which is why the audit trail is the product. Recommend a lawyer review of the contract and CGV text before launch. MEDIUM confidence, not legal advice.

### Payments
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `stripe` | ^23.0.0 | Server SDK: Checkout Sessions, webhooks | Official. Use hosted **Stripe Checkout** (redirect). This keeps PCI scope at SAQ-A and needs no client SDK. |
| `@stripe/stripe-js` | ^9.17.0 | **Do not add** unless embedded Elements are chosen later | Hosted Checkout makes it unnecessary. |

Integration:
- One Checkout Session per deposit/step, `mode: 'payment'`, with `metadata: { project_id, step_id, document_id }` and `client_reference_id`.
- Webhook route `src/app/api/stripe/webhook/route.ts` (Node runtime). Read the body with `await req.text()` and verify with `stripe.webhooks.constructEvent` (v23: check whether async `constructEventAsync` is preferred; check the changelog at install time). Reading `req.json()` breaks the signature check.
- Idempotency: `stripe_events(event_id pk)` table, insert-or-ignore before processing. Handle `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`. Payment state in DB is driven **only by the webhook**, never by the success redirect.
- Pin the API version explicitly in the client constructor. Stripe majors move the default version, and the pin avoids silent change.
- Stripe Tax and Stripe invoicing: **not** used. Invoices are our own PDFs (a scoping decision). Record the Stripe payment id on the invoice.
- Money: integer cents everywhere (`bigint` or `int`), currency `eur`.

### File storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Storage (existing project) | n/a | Private buckets: `client-files`, `documents` | Same auth/RLS model as the tables, with no new vendor. |

- Private buckets only. Path convention `{client_id}/{project_id}/…`, with storage RLS policies on the path prefix against `clients.user_id`.
- **Vercel body limit is 4.5 MB per function request.** Client uploads must go direct to Storage via `createSignedUploadUrl` and not through a route handler. Downloads use short-lived signed URLs (60-300 s).
- Generated PDFs are written by the service-role client.
- Do not add S3, Cloudflare R2 or UploadThing. Volumes are tiny and a second auth model is cost without benefit.

### Scheduled / automated mailing (job "queue")
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Postgres **outbox table** `mail_queue` | n/a | Durable queue: status transitions enqueue rows (DB trigger or server action) | Survives crashes and is auditable. Fits a small agency's volume. |
| Vercel Cron (`vercel.json` crons) | n/a | Drains the outbox via `GET /api/cron/mail` | Zero new dependency. |
| Supabase `pg_cron` + `pg_net` (alternative) | n/a | Calls the same endpoint every few minutes | Use this if the Vercel plan is Hobby. |

- **Plan constraint (verified via web search, MEDIUM):** Vercel Hobby cron runs at most once per day (2 jobs), Pro allows per-minute. The Hobby ToS also bars commercial use, and this is a commercial platform taking payments, so Pro is expected anyway. Confirm the plan in Phase 1. If on Hobby, use `pg_cron` to hit the endpoint every 5 min.
- Protect cron endpoints with `Authorization: Bearer ${CRON_SECRET}` (Vercel sends it automatically).
- Drain with `FOR UPDATE SKIP LOCKED`, attempt counters and `sent_at`. Pass a Resend `Idempotency-Key` header per row to prevent double sends.
- Reminders (unpaid deposit, unsigned document, review request after acceptance) are rows with a future `send_after`.
- Do **not** add BullMQ (needs Redis plus a persistent worker, which Vercel cannot host). Do **not** add Inngest, Trigger.dev or QStash for now. Revisit only if workflows need long-running multi-step retries.
- Email templates: Resend already accepts React components. `@react-email/components` is optional and nice for design-system consistency. Verify its version when adding it.
- RGPD: transactional mails (contract, invoice, OTP) are fine. Marketing/review-request sequences need a consent or legitimate-interest basis, with an unsubscribe link and a `mail_optout` flag.

### Admin dashboard charts
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `recharts` | ^3.10.1 | Revenue / costs / margin / cash forecast, funnel-by-source bars | The most common React chart library, with v3 supporting React 19. Declarative, themeable with the CSS vars (acid `#C4F542`, warm `#E07856`). |
| `date-fns` | ^4.4.0 | Month bucketing for the forecast | Light, tree-shakable. The French locale is built in. |

- Admin-only client components. Load via `next/dynamic` so recharts never touches the public bundle (consistent with the existing ClientProviders `ssr:false` pattern for client boundaries).
- Do the forecast math in SQL views or RPC functions (`monthly_forecast`) and keep the UI dumb. Test the maths with vitest against fixtures.
- Alternative if the bundle is a concern: hand-rolled SVG for 3 simple charts. Recharts is still the default recommendation because of the time saved.
- Do not add Chart.js, Tremor or D3 directly.

### Attribution / ads conversions
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| No new package | n/a | First-party UTM capture in a cookie, copied into `lead_events` | Plain TS plus zod (existing). |
| Meta Conversions API via `fetch` (server) | n/a | Server events (Lead, Purchase) with hashed email | The SDK `facebook-nodejs-business-sdk` is heavy and unnecessary for 2-3 events. |
| Google Ads | n/a | gtag (client) plus later offline conversion import via gclid | Store `gclid`/`fbclid`/`fbc`/`fbp` at capture time. |
| PostHog (existing) | ^1.396.6 | Product analytics | Already installed. |

- **CNIL/ePrivacy:** ad pixels and non-essential cookies need prior consent. Add a consent banner, with a store of consent choice, **before** loading Meta/Google tags. A lightweight custom banner fits the design system, or a small vetted CMP. UTM capture stored first-party for lead handling should be documented in the privacy policy. This is a real scope item, not just a package.
- Review schema: `Review`/`AggregateRating` are plain JSON-LD, added to the existing global JSON-LD. Only emit it from verified reviews stored in DB. Google's self-serving review rule means the rating on the organization's own page may not earn rich results, so avoid promising stars in SERP (MEDIUM, verify at Phase time). Keep the existing no-price guard tests green: no price keys.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF | `@react-pdf/renderer` | `puppeteer-core` + `@sparticuz/chromium` (153.0.0) | Large binary, slow cold starts, version pinning pain on Vercel. Only worth it for HTML/CSS-faithful layouts, which these business documents do not need. |
| PDF | `@react-pdf/renderer` | `pdfmake`, `jsPDF` | Imperative APIs, so templates are less maintainable and not shared with the React skills in the repo. |
| Auth | Supabase Auth OTP/magic link | NextAuth/Auth.js, Clerk | A second user store, which breaks RLS-by-`auth.uid()`. |
| Signature | In-house | Yousign, DocuSign, Universign | Rejected by the scoping decision (no third party). Keep as a fallback for contracts needing an advanced signature. |
| Payments | Hosted Checkout | Elements/Payment Element | Extra client code and PCI scope with no benefit for deposits. |
| Queue | Postgres outbox + cron | Inngest, QStash, BullMQ | New vendor/infra for a few hundred mails per month. |
| Charts | recharts | Tremor, Chart.js | Tremor is an extra dependency layer and conflicts with the custom design system. Chart.js needs a wrapper. |
| Storage | Supabase Storage | S3/R2/UploadThing | Second auth model. |

## Installation

```bash
# Auth + PDF + payments + charts
npm install @supabase/ssr@^0.12.7 @supabase/supabase-js@^2.114.0 @react-pdf/renderer@^4.9.0 stripe@^23.0.0 recharts@^3.10.1 date-fns@^4.4.0

# Optional, only if the audit-trail page must be appended to signed PDFs
npm install pdf-lib@^1.17.1
```

No new dev dependencies are needed. Use vitest (existing) for the forecast maths, the hash-chain, OTP logic, webhook idempotency and RLS policy SQL tests. Add the Stripe CLI (`stripe listen`) as a local tool and not as a package.

Environment variables to add: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `OTP_HMAC_SECRET`, Meta CAPI token (later).

## What NOT to add
- Redis/BullMQ/Upstash, Inngest, Trigger.dev (no worker host, and the outbox suffices).
- Puppeteer/Chromium for PDFs.
- `otplib`, `@signpdf/*`, third-party e-sign SDKs.
- `@stripe/stripe-js` / Elements (until embedded payment is requested).
- NextAuth/Clerk/Auth0.
- An ORM (Prisma/Drizzle). The repo uses supabase-js plus SQL migrations. Generate types with `supabase gen types typescript`.
- Any UI kit (shadcn/Tremor/MUI). The design system is custom.
- Facebook business SDK.

## Integration Risks to Spike Early
1. `@react-pdf/renderer` under Next 16 Turbopack on Vercel: font bundling, `serverExternalPackages` (Phase 1 spike).
2. Magic-link prefetch by mail scanners: use OTP code login as the default.
3. Vercel plan (cron frequency, commercial use): confirm before the mailing design is finalized.
4. Stripe v23 breaking changes versus older tutorials (API version pin, webhook helper): read the changelog at install time.

## Sources
- npm registry queries on 2026-10-01 for versions: `@supabase/ssr` 0.12.7 (peer supabase-js ^2.114.0), `@react-pdf/renderer` 4.9.0 (peer react up to ^19), `stripe` 23.0.0, `@stripe/stripe-js` 9.17.0, `recharts` 3.10.1, `date-fns` 4.4.0, `pdf-lib` 1.17.1, `@sparticuz/chromium` 153.0.0 (HIGH for versions).
- Vercel cron limits (Hobby daily, Pro per minute): https://steadycron.com/guides/vercel-cron-limits/ and https://cronuru.com/guides/vercel-cron (MEDIUM, verify on vercel.com/docs/cron-jobs).
- React-PDF compatibility and Next App Router issues: https://react-pdf.org/compatibility and https://github.com/diegomura/react-pdf/issues/3285 (MEDIUM).
- Supabase RLS/auth patterns, Stripe webhook raw-body, Vercel 4.5 MB body limit, eIDAS art. 25: training knowledge (LOW-MEDIUM, verify via Context7/official docs during phase research).
