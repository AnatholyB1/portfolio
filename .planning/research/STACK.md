# Stack Research

**Domain:** Multi-step lead-qualification form ("simulateur de diagnostic") writing into an existing Supabase-backed CRM, inside an existing Next.js 14/16 + React 19 + Supabase app
**Researched:** 2026-09-20
**Confidence:** HIGH (versions verified live against npm registry; codebase patterns verified by reading existing source; Supabase RLS/service-role behavior is HIGH confidence general Supabase knowledge, not project-specific verified)

## Context Note (versions)

The milestone brief describes the app as "Next.js 14". The actual installed `package.json` shows **Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3, @supabase/supabase-js ^2.104.1**. This research uses the real installed versions as ground truth. Nothing recommended below requires touching the framework version — all additions are additive dependencies or plain code, chosen to slot into the current App Router + Route Handler + `@supabase/supabase-js` conventions already used in `src/app/api/contact/route.ts` and `src/app/api/crm/*/route.ts`.

## Recommended Stack

### Core Technologies (no new dependency)

| Technology | Version (installed) | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React `useReducer` / `useState` | React 19.2.3 (installed) | Multi-step wizard state (current step, collected answers, submission status) | The codebase has **zero** form-library usage anywhere — `ContactSection.tsx` drives its form with a single `useState` object + `fetch`. The diagnostic simulator is a fixed, linear sequence of single/multi-choice questions (not free-text-heavy, no dynamic field arrays, no cross-field validation). A `useReducer` with `{ step, answers, status }` is simpler to reason about than any state-management library and adds zero KB to a page that exists specifically to convert visitors — bundle size matters here. |
| Next.js Route Handler | Next 16.1.6 (installed) | `POST` endpoint that validates the final payload and writes to Supabase | Matches the existing convention (`api/contact`, `api/crm/orders`, `api/crm/stock`) exactly: a Route Handler that parses JSON, validates, calls `createServerClient()`, and returns JSON. Introducing Server Actions instead would work technically (Next 16 supports them fully) but would be a second, inconsistent submission pattern in a codebase that has standardized on Route Handlers. Stick with the existing pattern. |
| `@supabase/supabase-js` | `^2.104.1` installed → `2.116.0` latest | Insert the diagnostic answers + contact info into the existing Supabase project | Already the CRM's data client (`src/lib/supabase.ts`). No new database, no new SDK — just a new `.insert()` call against a new table in the same project, following the exact pattern already used in `api/crm/orders/route.ts` (`supabase.from(...).insert(...).select().single()`). Bumping to 2.116.0 is optional routine maintenance, not required for this feature (no breaking API changes between 2.104 and 2.116 for `.from().insert()`). |

### Supporting Libraries (new dependencies — justified individually)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.6.5` | Server-side schema validation of the diagnostic payload before it is written to Supabase | **This is the one new dependency actually worth adding**, and only on the server. Unlike the contact form (4 flat strings, validated with hand-rolled `isNonEmptyString` checks), the diagnostic payload is a **nested, enum-constrained structure**: N question IDs, each with one of a fixed set of answer values, plus contact fields. Those exact enum values are what the recommendation engine keys off of — a typo or unexpected value silently produces a wrong service recommendation and writes bad data permanently into the CRM. A single `z.object({ answers: z.array(z.object({ questionId: z.enum([...]), value: z.enum([...]) })), contact: z.object({ name: z.string().min(1).max(120), email: z.string().email().optional(), phone: z.string().optional(), preferredContact: z.enum(['email','phone']) }) })` schema (name illustrative) gives strict runtime validation, one shared TypeScript type for the route handler + the recommendation function, and clear 400 error responses — for less code than the equivalent hand-rolled guards would need at this payload shape. Used **only inside the Route Handler** (server-only import), so it adds **zero bytes** to the client bundle — the usual "bundle size" objection to adding a validation library does not apply here. |

### What Is Explicitly NOT Needed

| Would-be addition | Why it's not warranted here |
|---|---|
| `react-hook-form` (or Formik) | Value proposition is uncontrolled inputs + complex per-field validation for forms with many free-text fields. This form is a linear wizard of button/radio/checkbox selections with one lightweight text step for contact info at the end. `useReducer` covers it with less code and no re-render/registration model to learn. Revisit only if a later milestone adds many free-text fields with async validation. |
| A rules-engine library (`json-rules-engine`, decision-table libs) | The "recommend relevant services" logic is: N answers → score each of the ~8 services → sort → take top matches. That is a ~30-line pure function (`src/lib/diagnostic/recommend.ts`), not a rules engine problem. A rules engine adds a DSL, indirection, and a dependency for a problem that is a plain object of weights. |
| `nuqs` (URL-synced step state) | Only useful if you need the current step to be a shareable/bookmarkable/back-button URL, or SSR-rendered per step. Nothing in the requirements asks for deep-linking into step 3 of the simulator. Skip for MVP; local component state is enough. If a later analytics need requires funnel-tracking-by-URL, revisit — but analytics is already solved below without any new dependency. |
| CAPTCHA / reCAPTCHA / Cloudflare Turnstile | A public lead-qualification tool's whole job is to reduce friction into a phone call or contact info. Adding a CAPTCHA step to a conversion funnel is a real cost for a marginal spam-prevention gain at this traffic scale. Use a zero-dependency honeypot field (hidden input real users never fill, bots often do) plus a server-side minimum-time-to-submit check (reject submissions completed in <2s) in the Route Handler. No library needed for either. |
| A second Supabase project/instance | The brief is explicit: write into the *existing* Supabase CRM. Do not provision a new project. This does, however, almost certainly mean a **new table** in that same project (see Integration Notes) — the existing schema (`products`, `orders`, `stock`) is scoped to the `/demo` restaurant order-taking use case and has no `prospects`/`leads` table today. |
| Analytics library for step-funnel tracking | `posthog-js@^1.396.6` is already a dependency and already initialized in this app. Fire `posthog.capture('diagnostic_step_completed', { step, questionId })` and `posthog.capture('diagnostic_completed', { recommendedServices })` directly from the wizard's step-transition handler. No new dependency for funnel drop-off analysis. |

## Integration With the Existing Supabase CRM (read this before writing the insert route)

Two integration issues are specific to this milestone and worth flagging explicitly, since the quality gate calls this out:

1. **New table, same project.** `src/lib/supabase.ts` currently only backs `products`, `orders`, `stock` (the restaurant-demo CRM for `/demo`). There is no existing prospects/leads table. This feature needs a new table (e.g. `diagnostic_leads` or `prospects`) created via the Supabase SQL editor (there is no `supabase/` CLI/migrations directory in this repo — schema changes here have so far been made ad hoc through the dashboard; keep doing that unless you want to introduce Supabase CLI migrations as a separate, unrelated infra improvement).

2. **`createServerClient()` uses the anon key, not a service-role key, despite its name/comment.** Reading `src/lib/supabase.ts`:
   ```ts
   export function createServerClient() {
     return createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // <- anon key, both "browser" and "server" clients
     )
   }
   ```
   Both the browser client and the "server" client use the **anon** key. That works today because `orders`/`products`/`stock` presumably have permissive RLS (or RLS disabled) for the restricted demo use case. For a **public, unauthenticated write endpoint** that inserts real prospect PII (name, email/phone) into the CRM, relying on a permissive anon-insert RLS policy is the wrong default. Two options, pick one explicitly during implementation (this is a decision for the architecture/roadmap phase, not just a library choice):
   - **Recommended:** add a `SUPABASE_SERVICE_ROLE_KEY` env var and create a second server-only client (e.g. `createServiceRoleClient()` in `src/lib/supabase.ts`) used specifically by the new Route Handler for this insert, so the write does not depend on RLS policy correctness and RLS on the new table can stay locked down (no anon `SELECT`, no anon `UPDATE`/`DELETE`, INSERT only reachable server-side).
   - Acceptable alternative: keep the anon key, but add a narrow RLS policy on the new table: `CREATE POLICY "public insert only" ON prospects FOR INSERT TO anon WITH CHECK (true);` and explicitly no `SELECT`/`UPDATE`/`DELETE` grants to `anon`.
   Either way: do not reuse `createServerClient()` unmodified and assume it behaves like a service-role client — as written today, it does not.

## Installation

```bash
npm install zod
```

Nothing else needs installing. `@supabase/supabase-js`, `posthog-js`, `resend`, `next`, `react` are already present and sufficient.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain `useReducer` for wizard state | `react-hook-form` | If a later milestone adds several free-text/long-form fields (e.g. an "describe your situation" open text step) with real per-field validation rules, or if you want easy `isDirty`/`isValid` tracking across many inputs. |
| `zod` for server-side validation | Hand-rolled type guards (current contact-route style) | If the payload stays this simple (a handful of enum-valued fields) and the team prefers zero new deps over a shared schema; hand-rolled guards remain acceptable, just more verbose for a nested/enum-heavy shape. |
| Route Handler (`api/simulateur/route.ts`) | Next.js Server Action | If you're comfortable introducing Server Actions as a second submission pattern alongside the existing Route Handlers; Next 16 fully supports them and they'd remove some fetch boilerplate. Not recommended here purely for consistency with `api/contact` and `api/crm/*`. |
| Honeypot + timing check for spam | Cloudflare Turnstile / reCAPTCHA | Only if the honeypot proves insufficient in practice (i.e., you start seeing real bot submissions in the CRM) — add friction reactively, not preemptively. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `react-hook-form` / Formik for this form | Over-engineering for a linear multi-choice wizard; adds a registration/control model for no real benefit here | `useReducer` with `{ step, answers, status }` |
| A rules-engine package for the recommendation logic | The mapping is a static weighted-scoring function over ~8 services, not a rules-authoring problem | A plain typed function in `src/lib/diagnostic/recommend.ts` |
| Zustand/Redux/Jotai for step state | Wizard state is local to one page/component tree; no cross-route or cross-component sharing need has been described | Local `useReducer`, lifted no higher than the `/simulateur` page component |
| CAPTCHA on the diagnostic form | Adds friction to a tool whose entire purpose is lowering friction into a lead; disproportionate for current traffic/spam risk | Honeypot field + server-side submit-timing check |
| Reusing `createServerClient()` as-is for this insert without checking RLS | It uses the anon key; assuming service-role-level write access here is a silent-failure risk (RLS may reject the insert, or worse, may be overly permissive) | Add a service-role client for this route, or add an explicit scoped INSERT-only RLS policy |

## Stack Patterns by Variant

**If the diagnostic form stays a single page with 5-8 steps (as scoped):**
- Use `useReducer` + local component state, no URL sync, no persistence library.
- Because the whole flow completes in one sitting; there's no stated need to resume a session later.

**If product later wants to persist partial/abandoned diagnostic sessions (visitor leaves at step 3):**
- Consider writing a partial row on step 1 (or on a "meaningful progress" step) and `UPDATE`-ing it as steps complete, rather than only inserting on final submit.
- Because that's how you capture "warm but incomplete" leads for follow-up — but this is a product decision for the roadmap/features research, not a stack change; it still uses the same `@supabase/supabase-js` `.insert()`/`.update()` calls, no new library.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `zod@4.6.5` | `typescript@5.9.3` (installed) | zod v4 requires roughly TS 5.5+; installed 5.9.3 is well above the floor. No peer-dependency declarations to worry about — zod has none. |
| `react-hook-form@7.88.0` (if ever added) | `react@19.2.3` (installed) | Verified via npm registry: peerDependencies `"react": "^16.8.0 || ^17 || ^18 || ^19"` — compatible with the installed React 19, should this milestone's scope grow into needing it later. |
| `@supabase/supabase-js@2.116.0` (latest) | `@supabase/supabase-js@^2.104.1` (installed) | Same major/minor line (v2), no breaking API changes for the `.from().insert()`/`.select()` calls used here; bump is optional. |

## Sources

- Read `C:\portfolio\package.json` — installed versions (HIGH confidence, ground truth for this repo).
- Read `C:\portfolio\src\lib\supabase.ts`, `src\app\api\contact\route.ts`, `src\app\api\crm\orders\route.ts`, `src\components\sections\ContactSection.tsx` — existing conventions this research follows (HIGH confidence, direct source inspection).
- `npm view zod version` → `4.6.5`; `npm view @supabase/supabase-js version` → `2.116.0`; `npm view react-hook-form version` → `7.88.0`; `npm view nuqs version` → `2.10.1` — live npm registry query, 2026-09-20 (HIGH confidence, current).
- `npm view react-hook-form peerDependencies` → `{ react: '^16.8.0 || ^17 || ^18 || ^19' }` — live npm registry query (HIGH confidence).
- `npm ls typescript` → `typescript@5.9.3` installed (HIGH confidence, direct inspection).
- Supabase RLS/anon-key-vs-service-role-key semantics — general Supabase platform knowledge (MEDIUM confidence as applied to this specific project, since actual RLS policies on the live Supabase project were not inspected — flagged explicitly as a verify-before-ship item, not asserted as this project's current state).

---
*Stack research for: multi-step lead-qualification form + Supabase CRM integration*
*Researched: 2026-09-20*
