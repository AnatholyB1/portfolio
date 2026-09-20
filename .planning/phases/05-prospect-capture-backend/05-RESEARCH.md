# Phase 5: Prospect Capture Backend - Research

**Researched:** 2026-09-20
**Domain:** Supabase table + RLS design, Next.js Route Handler spam guard, Resend notification, scheduled data purge — for a new public lead-capture write path on an existing small agency site
**Confidence:** HIGH (codebase patterns, RLS/grant semantics, and package facts verified directly; MEDIUM on exact rate-limit/purge scheduling ergonomics since no live Supabase project was inspected via MCP in this session)

## Summary

This phase adds exactly one new piece of durable state (a `prospects` table) and one new write path (`src/app/api/simulateur/route.ts`, callable now via curl and later by Phase 7's UI) to a codebase that has zero tracked schema, zero test framework, and exactly one precedent for "validate then act" (`src/app/api/contact/route.ts`). The biggest concrete finding of this research — not present in the prior milestone-level STACK.md/PITFALLS.md — is that **a real Supabase `service_role` key already exists, populated, in this repo's `.env`** (`SUPABASE_SERVICE_ROLE_KEY`, confirmed non-empty, 221 chars), unused by any code today. This changes the "Claude's Discretion" RLS/key decision left open in CONTEXT.md: introducing a service-role write path is no longer "a new pattern requiring new secrets" (as STACK.md assumed) — it is wiring up a credential that is already provisioned. This tips the recommendation toward the safer option: `anon` gets **zero** grants on the new table (no insert, no select, no update, no delete), and the only write path is the server-side Route Handler using `service_role`.

No migration tooling exists in this repo (no `supabase/` directory, project is not `supabase link`-ed), but the Supabase CLI **is** installed globally (v2.116.0) and Supabase MCP tools are available in this environment. The recommended path is to write the DDL as a tracked `supabase/migrations/*.sql` file (starting schema-as-code for this project) and apply it via the Supabase SQL Editor or MCP `execute_sql`, gated behind a `checkpoint:human-verify` — an agent should not silently run irreversible DDL/DML against a production Supabase project.

Spam protection maps directly to the phase's literal success criterion ("honeypot-filled or too-fast... rejected before being written to the database"): a hidden honeypot field plus a submit-timing check, both validated server-side in the Route Handler, no library needed. Because the recommended architecture removes all `anon` grants on the table, the classic "bot bypasses your app and hits the Supabase REST endpoint directly with the public anon key" attack (flagged as Pitfall 4 in prior research) is structurally closed off, not just discouraged.

Retention/purge (D-04, 12 months) has a native, zero-new-infrastructure answer: `pg_cron`, bundled in Supabase on every plan including free tier, scheduled with one `cron.schedule(...)` SQL call in the same migration.

**Primary recommendation:** Create `prospects` table with RLS enabled and **no policies/grants for `anon`**; write via a new `createServiceRoleClient()` in `src/lib/supabase.ts` used only by `src/app/api/simulateur/route.ts`; validate the payload with `zod`; reject honeypot-filled/too-fast submissions before any Supabase call; notify `contact@sevalys.com` via the existing Resend pattern; schedule a `pg_cron` job in the same migration to delete rows older than 12 months.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Payload validation (shape/enum/required fields) | API / Backend | — | Zod runs server-side only in the Route Handler; client-side (Phase 7) validation is UX sugar, never trusted |
| Spam/bot rejection (honeypot + timing) | API / Backend | — | Must happen before any DB write per the phase's own success criteria; cannot be enforced client-side |
| Row persistence | Database / Storage | API / Backend | Supabase table is system of record; the Route Handler is the only writer |
| Access control (who can read/write rows) | Database / Storage | API / Backend | RLS + grants on the table are the actual enforcement point; the Route Handler is a convenience/validation layer in front of it, not the security boundary |
| Email notification on new prospect | API / Backend | External (Resend) | Fired synchronously after a successful insert, same pattern as `/api/contact` |
| 12-month retention purge | Database / Storage | — | `pg_cron` runs inside Postgres itself — no app-tier or external scheduler needed |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Nom, email, ET téléphone sont tous les trois obligatoires sur le formulaire de capture (pas seulement nom+email comme `/api/contact` aujourd'hui) — décision explicite pour garantir un canal d'appel direct, cohérent avec le CTA "appeler" mis en avant partout.
- **D-02:** Pas de champ "nom d'entreprise / secteur" — reste volontairement minimal (nom, email, téléphone uniquement). Le contexte métier se précise à l'oral lors de l'appel de suivi.
- **D-03:** La table stocke, en plus des 2-4 services recommandés, les réponses brutes du prospect à chaque question du simulateur (pas seulement le résultat agrégé) — pour que l'équipe puisse personnaliser l'appel de suivi ("vous avez indiqué X"). Le schéma doit donc prévoir un champ structuré (ex. JSON) pour les réponses, en plus du/des champ(s) pour les services recommandés.
- **D-04:** Rétention de 12 mois pour un prospect non converti, puis suppression automatique. Cette durée doit être mentionnée explicitement dans la case de consentement Art. 13 du formulaire (Phase 7) et implémentée comme politique de purge côté données (ce phase pose le schéma ; le mécanisme de purge — cron/scheduled function ou check applicatif — doit être planifié ici puisque c'est une propriété de la donnée stockée, pas de l'UI).

### Claude's Discretion

- Choix technique RLS/clé : le pattern existant du repo (`src/lib/supabase.ts`, `createServerClient()`) utilise en réalité la clé **anon**, pas une clé service-role, malgré le commentaire trompeur dans le code. Pour la table prospects, Claude doit décider entre (a) réutiliser ce même pattern anon-key + une politique RLS INSERT-only stricte scoped à cette table (cohérent avec l'existant), ou (b) introduire une vraie clé service-role pour l'API route d'écriture (plus sûr mais nouveau pattern dans ce repo). Recommandation research (STACK.md/PITFALLS.md) : option (a) avec RLS bien scopée est suffisante et plus cohérente avec le reste du code — à confirmer/exécuter au planning.
  **→ This phase's research updates that recommendation — see "New Finding: service_role key already provisioned" below. Option (b) is now the recommended default.**
- Mécanisme anti-spam exact (honeypot vs rate-limit vs les deux) : CAPTCHA explicitement déconseillé par la recherche (friction excessive pour l'audience PME locale visée) — Claude choisit l'implémentation technique (honeypot + rate-limit léger recommandé par PITFALLS.md).
- Mécanisme de purge à 12 mois (cron Supabase / Edge Function scheduled / vérification applicative au prochain accès) — détail d'implémentation, pas une question de vision.

### Deferred Ideas (OUT OF SCOPE)

- Company name / sector field on the capture form — explicitly rejected (D-02), not deferred to a future phase, just excluded from this milestone's scope.
- Formal CRM pipeline (stages, scoring, lead routing) — already captured in `.planning/REQUIREMENTS.md` as CRM2-01 (v2 requirement), reconfirmed here as out of scope for Phase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRM-01 | Chaque soumission du simulateur crée un enregistrement prospect dans une nouvelle table Supabase dédiée (même projet Supabase, pas de réutilisation du schéma products/orders/stock) | `## Standard Stack` (table DDL), `## Code Examples` (migration file), same Supabase project confirmed via existing `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars — no new project needed |
| CRM-02 | La table prospects est protégée par une politique RLS insert-only côté écriture publique | `## Architecture Patterns` → Pattern 1 (RLS/grants design), `## New Finding` section — recommends zero `anon` grants + service-role write path, with the anon-insert-policy alternative documented as a fallback |
| CRM-03 | La soumission du simulateur est protégée contre le spam (rate-limiting et/ou honeypot) | `## Code Examples` → honeypot + timing-check Route Handler; `## Common Pitfalls` → Pitfall 2 (direct-REST bypass) explains why this phase's recommended architecture also closes the bypass vector |
| CRM-04 | Une notification email (via Resend, cohérent avec `/api/contact`) informe l'équipe Sèvalys de chaque nouveau prospect | `## Code Examples` → Resend notification block, reusing the exact pattern from `src/app/api/contact/route.ts` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

`C:\portfolio\CLAUDE.md` (project-level, checked into the repo) requires:

- Before answering architecture/codebase questions in this project, read `graphify-out/GRAPH_REPORT.md` first — **done for this research** (see Sources; graph is from 2026-05-16, ~4 months old, predates this milestone — its file-level structure is still accurate but treat any semantic inference from it as approximate).
- After modifying code files in a session, run `graphify update .` (AST-only, no API cost) to keep the graph current. **The plan for this phase must include this as a final task** after all code changes land (new route, new `supabase.ts` export, new migration file).
- If `graphify-out/wiki/index.md` exists, navigate it instead of raw files — checked, it does not exist in this repo; raw file reads were used instead (consistent with the fallback the rule allows).

No other project-specific coding/security conventions were found in `CLAUDE.md` beyond the graphify rules above.

## New Finding: `service_role` key already provisioned, unused

`C:\portfolio\.env` (gitignored via `.env*` in `.gitignore` — not committed) contains, alongside the already-used `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

- `SUPABASE_SERVICE_ROLE_KEY` — **populated** (confirmed non-empty, 221 characters — consistent with a real Supabase JWT service-role key; value itself was not read into this document)
- `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, full `POSTGRES_*` connection strings — also populated, also unused by any current code

`[VERIFIED: local .env inspection, length-only, no value disclosed]`

None of `src/lib/supabase.ts`, `src/app/api/crm/*`, or `src/app/api/contact/route.ts` reference `SUPABASE_SERVICE_ROLE_KEY` today — `createServerClient()` uses the anon key exclusively (confirmed by direct read, matches prior STACK.md/ARCHITECTURE.md findings).

**Why this matters for CRM-02's RLS/key decision:** the prior milestone research (STACK.md, PITFALLS.md) recommended the anon-key + scoped-RLS-policy approach (option a) partly because a service-role client was framed as "a new pattern in this repo" with an implied provisioning cost. That framing was based on what the code does, not what secrets are available. Since the credential already exists and is already in the environment (local `.env`, and presumably mirrored in Vercel's project environment variables — verify this specifically, see Open Questions), wiring it up is a small, low-risk addition: one new exported function in `src/lib/supabase.ts`, used by exactly one new Route Handler, never exposed to the browser.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `^2.104.1` installed (latest `2.116.0`) `[VERIFIED: npm registry]` | Insert into the new `prospects` table | Already the project's only DB client; no new SDK |
| Next.js Route Handler | `16.1.6` installed `[VERIFIED: package.json]` | `POST /api/simulateur` endpoint | Matches `api/contact`, `api/crm/orders` exactly — the only submission pattern used anywhere in this codebase |
| `zod` | `^4.6.5` `[VERIFIED: npm registry, official repo github.com/colinhacks/zod, created 2020]` | Server-side schema validation of the nested diagnostic payload | New dependency, server-only import (zero client bundle cost); the payload is nested/enum-heavy in a way the existing `isNonEmptyString` hand-rolled pattern in `api/contact` doesn't scale to cleanly. Use the **v4 top-level format functions** (`z.email()`), not the deprecated `z.string().email()` chained form `[VERIFIED: zod.dev/v4/changelog]` |
| `resend` | `^6.28.1` installed `[VERIFIED: package.json]` | Team notification email on new prospect | Already the project's only email provider (`RESEND_API_KEY` already configured) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node built-in `crypto` | n/a (stdlib) | `sha256` hash of the submitter's IP for the optional `ip_hash` column | No new dependency — `import { createHash } from 'node:crypto'`. Store a hash, never the raw IP, to minimize PII per RGPD data-minimization (D-04's retention context) |
| Postgres `pgcrypto` (`gen_random_uuid()`) | bundled in Supabase | Primary key generation | Already available by default on every Supabase project — do not generate UUIDs in JS |
| Postgres `pg_cron` | bundled in Supabase, all plans incl. free tier `[VERIFIED via WebSearch, cross-checked: supabase.com/docs/guides/database/extensions/pg_cron, supabase.com/docs/guides/cron, community discussion supabase#37405]` | 12-month retention purge (D-04) | Enable once via Dashboard → Database → Extensions (or `create extension if not exists pg_cron;` in SQL Editor), then `cron.schedule(...)` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pg_cron` for purge | Supabase Edge Function on a schedule (Supabase Cron → Edge Function trigger) | More moving parts (function deploy, auth, cold starts) for a single `DELETE` statement; only worth it if the purge needed to call an external API (e.g., notify before deleting) — D-04 doesn't require that |
| `pg_cron` for purge | Application-level check-on-request ("purge on next access") | No new infrastructure, but unreliable (only runs if traffic hits the check path) and harder to verify/test than a scheduled SQL job; last-resort fallback only |
| Service-role write path | Anon-key + scoped `INSERT`-only RLS policy (CONTEXT.md's option a) | Still viable and simpler to reason about for a team unfamiliar with service-role semantics; documented in full below as the alternative. Given the key already exists, service-role is no longer the higher-effort option |
| `zod` | Hand-rolled type guards (current `api/contact` style) | Remains acceptable for a flat 3-field payload; the diagnostic payload's nested `reponses_diagnostic` array makes zod meaningfully less code |

**Installation:**
```bash
npm install zod
```

**Version verification:** `npm view zod version` → `4.6.5`; `npm view resend version` → `6.28.1` (matches installed); `npm view @supabase/supabase-js version` → `2.116.0` (installed `^2.104.1`, no breaking changes for `.from().insert()` between these). All checked live against the npm registry 2026-09-20.

## Package Legitimacy Audit

`slopcheck` was installed successfully (`pip install slopcheck`) and run against every package this phase would add or newly wire up.

```
slopcheck install zod resend @supabase/supabase-js
  [OK] zod (npm)
  [OK] resend (npm)
  [OK] @supabase/supabase-js (npm)
  scanned 3 packages — 3 OK
```

(The command also attempted to actually run `npm install` as a side effect and hit an unrelated Windows subprocess `FileNotFoundError` after the scan completed — the scan/verdict output above is unaffected and complete. No packages were installed by this research step.)

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `zod` | npm | created 2020-03-07 (~6 yrs) | github.com/colinhacks/zod | [OK] | Approved — new dependency for this phase |
| `resend` | npm | created 2017-02-25 (repo; package itself newer, already installed & in production use in this repo) | github.com/resend/resend-node | [OK] | Approved — already a dependency, reused as-is |
| `@supabase/supabase-js` | npm | already installed, official Supabase SDK | github.com/supabase/supabase-js | [OK] | Approved — already a dependency, reused as-is |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No `postinstall` scripts found on any of the three packages (`npm view <pkg> scripts.postinstall` returned empty for all).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client (Phase 7 wizard — out of scope here, but this IS its API)    │
│    POST /api/simulateur  { nom, email, telephone, reponses,          │
│      servicesRecommandes, consentementRgpd, website(honeypot),       │
│      formRenderedAt }                                                │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  src/app/api/simulateur/route.ts  (Next.js Route Handler, Node       │
│  runtime — needs `node:crypto`, do not mark `edge`)                  │
│                                                                       │
│  1. parse JSON                                                       │
│  2. honeypot check → if `website` non-empty: return 200 {ok:true}    │
│     WITHOUT inserting/emailing (silent reject, no signal to bot)     │
│  3. timing check → if now - formRenderedAt < 2000ms: same silent     │
│     reject                                                           │
│  4. zod.safeParse(payload) → 400 on failure                          │
│  5. hash IP (sha256) → ip_hash                                       │
│  6. createServiceRoleClient().from('prospects').insert({...})        │
│  7. on success → Resend: one email to contact@sevalys.com            │
│  8. return { ok: true }                                              │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase (same project as products/orders/stock)                    │
│    table public.prospects — RLS enabled, ZERO grants for anon/       │
│    authenticated. Only the service_role connection (server-only,     │
│    never sent to the browser) can write.                             │
│    pg_cron job (daily) → DELETE WHERE created_at < now() - 12 months │
└─────────────────────────────────────────────────────────────────────┘
                                 ▼
                    contact@sevalys.com inbox (Resend notification)
```

### Recommended Project Structure

```
supabase/
└── migrations/
    └── 20260920000000_create_prospects_table.sql   # NEW — first tracked migration in this repo

src/
├── app/
│   └── api/
│       └── simulateur/
│           └── route.ts          # NEW — POST-only, validate → spam-check → insert → notify
├── lib/
│   ├── supabase.ts                # MODIFIED — add createServiceRoleClient(), fix misleading
│   │                               #   comment on createServerClient() (still anon-key, doc-only fix)
│   └── prospects-schema.ts        # NEW (recommended) — shared zod schema + TS type, importable
│                                   #   by both this route and Phase 7's client code for type reuse
```

### Pattern 1: Table + RLS with zero anon grants, service-role-only writes

**What:** `prospects` table has RLS **enabled** but carries no policy that grants `anon`/`authenticated` anything. All privileges are explicitly revoked from those roles. The only writer is the Route Handler, using a Postgres role (`service_role`) that bypasses RLS by design.

**When to use:** Any public-facing lead/contact-capture table where the write must be validated server-side (honeypot, timing, enum checks) before landing in the DB, and where "can a bot skip my Next.js code and hit Supabase directly with the public key" must be structurally impossible, not just discouraged by policy wording.

**Example (migration file):**
```sql
-- supabase/migrations/20260920000000_create_prospects_table.sql

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null check (char_length(trim(nom)) > 0),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone text not null check (char_length(trim(telephone)) > 0),
  reponses_diagnostic jsonb not null,
  services_recommandes jsonb not null,
  consentement_rgpd boolean not null,
  ip_hash text,
  constraint consentement_requis check (consentement_rgpd = true)
);

comment on table public.prospects is
  'Diagnostic simulator leads (Sèvalys v1.1, Phase 5/7). Dedicated table — NOT the products/orders/stock demo CRM. 12-month retention via pg_cron, see purge job below.';

alter table public.prospects enable row level security;

-- No anon/authenticated policy is created on purpose. Explicitly revoke
-- any default privileges Supabase may have applied at table-creation time
-- (defense in depth — see "GRANT vs RLS" note below):
revoke all on table public.prospects from anon, authenticated;

-- 12-month retention purge (D-04)
create extension if not exists pg_cron;

select cron.schedule(
  'purge-prospects-12mo',
  '0 3 * * *', -- daily, 03:00 UTC
  $$ delete from public.prospects where created_at < now() - interval '12 months' $$
);
```

**Trade-offs:** Pro — no direct-REST-bypass attack surface at all (Pitfall 2 below); RLS + grants are layered as Supabase's own docs recommend ("Grants decide whether a role can run an operation at all. Policies decide which rows.") `[CITED: supabase.com/docs/guides/database/postgres/row-level-security]`. Con — requires wiring a new `service_role` client into `src/lib/supabase.ts`, a genuinely new pattern in this codebase (mitigated: the credential already exists, see New Finding above); anyone debugging via the Supabase dashboard's "run as anon" RLS simulator will correctly see zero access, which is sometimes confused for "broken" rather than "intended."

### Pattern 1-alt: Anon-key + scoped INSERT-only RLS policy (fallback if service-role is rejected at planning)

**What:** Keep using `createServerClient()` (anon key) for this route too, but scope the table's RLS to allow exactly one operation for `anon`.

**Example:**
```sql
alter table public.prospects enable row level security;
revoke all on table public.prospects from anon;
grant insert on table public.prospects to anon;

create policy "prospects_insert_anon_only"
on public.prospects
for insert
to anon
with check (true);
-- Deliberately no select/update/delete policy or grant for anon.
```

**Trade-offs:** Pro — no new secret/client pattern, consistent with every existing route in this repo. Con — the anon key is public (shipped in the JS bundle for the browser Supabase client); anyone who extracts it can `INSERT` directly against Supabase's REST endpoint, bypassing this phase's honeypot/timing checks entirely (Pitfall 2). `with check (true)` also means Postgres-level `CHECK` constraints (the `consentement_requis` constraint, the email regex) become the *only* remaining validation on a direct-bypass write — still meaningfully better than nothing, but weaker than the service-role path.

### Pattern 2: Honeypot + timing check, silent-reject (no library)

**What:** The client (Phase 7) renders a visually-hidden input (CSS, not `display:none`/`type=hidden` — some bots specifically skip those) and records `formRenderedAt = Date.now()` when the wizard mounts. Both travel in the final POST body. The Route Handler rejects silently — returns the same `{ ok: true }` shape a legitimate submission gets — instead of a 4xx, so a scripted bot gets no signal that it was detected.

**Example:**
```typescript
// src/app/api/simulateur/route.ts (excerpt)
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase';

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

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!raw) return Response.json({ error: 'invalid_payload' }, { status: 400 });

  // Silent reject: honeypot filled, or submitted too fast to be human
  const tooFast = typeof raw.formRenderedAt === 'number'
    && Date.now() - raw.formRenderedAt < 2000;
  if (raw.website || tooFast) {
    return Response.json({ ok: true }); // no insert, no email — bot gets no signal
  }

  const parsed = prospectSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const p = parsed.data;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('prospects').insert({
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    reponses_diagnostic: p.reponsesDiagnostic,
    services_recommandes: p.servicesRecommandes,
    consentement_rgpd: p.consentementRgpd,
    ip_hash: ipHash,
  });
  if (error) {
    console.error('[api/simulateur] insert failed', error);
    return Response.json({ error: 'insert_failed' }, { status: 500 });
  }

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
  // Reuse the exact 4-line escapeHtml() helper from src/app/api/contact/route.ts,
  // duplicated locally rather than extracted, to avoid touching that file at all.

  return Response.json({ ok: true });
}
```

**When to use:** This is the entire spam-guard scope required by CRM-03's literal success criteria. No external service, no CAPTCHA (explicitly rejected in CONTEXT.md discretion notes).

### Anti-Patterns to Avoid

- **Inserting from the browser client directly:** no code in this repo does this today (even VAPI's `orders` writes go through a server route) — the new table must not be the first exception.
- **Returning a distinct error code for honeypot/timing rejection:** tips off bots that they were detected; always return the same success shape as a real submission (silent reject).
- **Relying on `NEXT_PUBLIC_SUPABASE_ANON_KEY` for this write while believing RLS alone "protects" it:** RLS protects *rows*, grants protect *operations* — both must be locked down together, not just one.
- **Skipping the `revoke all ... from anon, authenticated` step:** some existing Supabase projects grant default privileges to these roles at table-creation time; RLS being "enabled" does not itself remove a prior GRANT — must be explicit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| UUID primary keys | JS `crypto.randomUUID()` inserted from the app | Postgres `gen_random_uuid()` as the column default | Keeps ID generation atomic with the insert, works even for rows created by future admin tooling, zero app code |
| Scheduled purge | A Next.js API route hit by an external cron service (cron-job.org, GitHub Actions schedule, Vercel Cron) | `pg_cron` inside Supabase | Zero new infrastructure, zero new secret/webhook to secure, already bundled free — the "don't build a scheduler" case is unusually clear-cut here |
| Nested payload validation | Hand-rolled recursive type guards | `zod` | The payload has a variable-length array of question/answer pairs; zod's `.array()`/`.union()` composition is materially less code and gives one shared TS type |
| HTML escaping for the notification email | A sanitization library (`dompurify`, etc.) | The existing 4-line `escapeHtml()` pattern already used in `api/contact/route.ts` | Overkill for escaping plain-text form fields into an HTML email; the existing pattern is sufficient and consistent |

**Key insight:** Every "don't hand-roll" item above already has a zero-dependency, standard-library or already-provisioned answer — this phase adds exactly one new npm dependency (`zod`).

## Common Pitfalls

### Pitfall 1: Assuming "insert-only RLS policy" requires an `anon` policy to exist

**What goes wrong:** A literal reading of CRM-02 ("politique RLS insert-only côté écriture publique") can be misread as "there must be a `CREATE POLICY ... FOR INSERT TO anon`" — leading straight to Pattern 1-alt even when Pattern 1 (service-role, zero anon grants) is available and more secure.
**Why it happens:** The requirement describes an *outcome* (public writes are insert-only; no public read/update/delete), not a specific SQL construct.
**How to avoid:** Confirm with the planner/user which architecture satisfies CRM-02's intent — this research recommends Pattern 1, with Pattern 1-alt fully documented as a valid, simpler fallback if the team prefers to avoid introducing `service_role` usage.
**Warning signs:** A PLAN that creates an `anon` insert policy without first checking whether `SUPABASE_SERVICE_ROLE_KEY` is already available (it is — see New Finding).

### Pitfall 2: Direct-REST bypass of the app's spam guard, if the anon-key path is chosen

**What goes wrong:** If Pattern 1-alt is used (anon-key insert policy), the honeypot/timing check in the Route Handler only protects submissions that go *through* `/api/simulateur`. The public anon key is shipped in the browser bundle; a bot that extracts it can `POST` straight to `https://<project>.supabase.co/rest/v1/prospects` with the anon key and the `apikey`/`Authorization` headers, skipping the Next.js route (and its honeypot/timing check) entirely. Only the table's Postgres `CHECK` constraints (email regex, `consentement_requis`) would still apply.
**Why it happens:** RLS governs *rows*, not *how the request arrived* — there is no way to require "must come from our Next.js server" at the RLS layer when using a public, client-shippable key.
**How to avoid:** Prefer Pattern 1 (service-role, zero anon grants) — this closes the bypass structurally, since `anon` has no `INSERT` grant at all. If Pattern 1-alt is chosen anyway (e.g. for consistency reasons), document this as an accepted residual risk given the explicit no-CAPTCHA, low-current-traffic context, and keep the `CHECK` constraints strict as a second line of defense.
**Warning signs:** Prospect rows in the DB with garbage/enum-violating `services_recommandes` values, or a burst of rows with no correlation to the site's actual traffic in analytics.

### Pitfall 3: `pg_cron` scheduled inside a migration that's never actually applied

**What goes wrong:** Because this repo has no CI/CD step that runs `supabase db push`, and no linked project (`supabase link` has never been run here), a migration file committed to `supabase/migrations/` does **nothing** on its own — the SQL editor or CLI must be used to actually apply it to the live project.
**Why it happens:** Writing the `.sql` file feels like "done" because it's the correct, trackable artifact — but this repo's schema has always been applied ad hoc through the dashboard (confirmed: zero `.sql` files existed anywhere in this repo prior to this phase).
**How to avoid:** The plan must include an explicit apply step — either "run this SQL in the Supabase SQL Editor" or "run `supabase link --project-ref <ref>` then `supabase db push`" — as a `checkpoint:human-verify` task, not assume the migration file alone satisfies CRM-01/02/04.
**Warning signs:** `curl`-testing the route in dev returns a Postgres "relation does not exist" or RLS-denial error because the table was never actually created in the live project.

### Pitfall 4: `NEXT_PUBLIC_*` accidentally prefixed on the service-role key

**What goes wrong:** Next.js inlines any env var prefixed `NEXT_PUBLIC_` into the client bundle at build time. `SUPABASE_SERVICE_ROLE_KEY` in `.env` is correctly **not** prefixed — but a careless copy-paste when wiring `createServiceRoleClient()` could introduce a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` variable by habit (mirroring the existing `NEXT_PUBLIC_SUPABASE_ANON_KEY` naming), which would leak full DB-bypass credentials into every page's client bundle.
**Why it happens:** Every other Supabase env var in this project is `NEXT_PUBLIC_`-prefixed; pattern-matching without checking is an easy mistake.
**How to avoid:** `createServiceRoleClient()` must read `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) and must only ever be called from server-side code (Route Handlers) — never imported into a `'use client'` component.
**Warning signs:** `grep -r "SUPABASE_SERVICE_ROLE" .next/static` returning any match after a build — this must always return nothing.

## Code Examples

### `src/lib/supabase.ts` — add service-role client (additive change)

```typescript
// Source: pattern derived from existing createServerClient() in this file,
// service_role semantics per Supabase docs (supabase.com/docs/guides/api/api-keys)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client browser (anon key) — pour le dashboard realtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `z.string().email()` | `z.email()` (top-level format function) | Zod v4 (this project installs `^4.6.5`) | The chained form still works but logs a deprecation warning; new code in this phase should use the v4 form directly |
| Google FAQ rich results as an SEO payoff for structured data | N/A for this phase — noted from prior PITFALLS.md, not directly relevant to CRM-01..04, included only to avoid the planner assuming this phase's JSON-LD-adjacent work has a rich-snippet payoff (it doesn't; not in this phase's scope anyway) | May 2026 (Google deprecation) | Not applicable to Phase 5's scope — flagged only to avoid cross-phase confusion |

**Deprecated/outdated:** None specific to this phase's actual dependencies beyond the zod v4 note above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | `SUPABASE_SERVICE_ROLE_KEY` in local `.env` is mirrored in the production deployment's environment variables (Vercel project settings) | New Finding, Pattern 1 | If not mirrored, the service-role write path would work in local dev but 500 in production until the env var is added to Vercel — must be verified before/during planning, not assumed |
| A2 | The Supabase project has not already had custom default-privilege changes applied (e.g., `ALTER DEFAULT PRIVILEGES`) that would grant `anon` broader access than a fresh project | Pattern 1 | Could mean `revoke all on table public.prospects from anon, authenticated;` is necessary-but-not-sufficient if some other mechanism re-grants access — the migration should be verified against the live project (via Supabase MCP `list_tables`/advisors, or dashboard) after applying, not just trusted from the SQL alone |
| A3 | `2000ms` is a reasonable "too fast to be human" threshold for the timing check | Pattern 2 | Untested against this specific audience/flow (Phase 7 hasn't been built yet); if the simulator wizard is very short, legitimate fast users could be caught — the exact threshold should be revisited once Phase 7's step count/UX is known, not treated as final |

## Open Questions (RESOLVED)

1. **Is `SUPABASE_SERVICE_ROLE_KEY` set in the production (Vercel) environment, not just local `.env`?**
   - What we know: it's populated locally.
   - What's unclear: whether it's mirrored to Vercel's project environment variables (no `.vercel/` directory or `vercel.json` found in this repo to check programmatically).
   - Recommendation: confirm with the user before/at planning, or have the plan's execution phase include a verification step against the deployed environment (not just local dev) before considering CRM-01/02/04 fully done.
   - **RESOLVED: 05-03-PLAN.md Task 1** queries the Vercel MCP for the env var name in Production, records present/absent/could-not-determine in the SUMMARY, and treats absence as a documented "Production blocker" rather than silently proceeding.

2. **Does the project's Supabase plan/tier have any restriction on `pg_cron`?**
   - What we know: `pg_cron` is documented as available on all plans including free tier.
   - What's unclear: this specific project's exact plan tier was not inspected (would require Supabase MCP/dashboard access with the actual project selected).
   - Recommendation: verify via Supabase MCP (`list_extensions` or similar) or dashboard during the apply step; if unexpectedly restricted, fall back to a Vercel Cron hitting a small authenticated purge Route Handler as the documented alternative.
   - **RESOLVED: 05-02-PLAN.md Task 3** verifies `pg_cron` availability during the apply step; if `create extension pg_cron` fails on the live project's tier, the task stops and flags D-04 as blocked with the documented Vercel Cron fallback, instead of silently dropping the retention requirement.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Supabase CLI | Applying the migration via `supabase link` + `supabase db push` | ✓ | 2.116.0 | Use Supabase SQL Editor (paste-and-run) or Supabase MCP `execute_sql` instead — no CLI linking required |
| Supabase MCP tools | Alternative to CLI for applying schema + checking RLS/security advisories | ✓ (available in this environment per system context) | — | Dashboard SQL Editor |
| `SUPABASE_SERVICE_ROLE_KEY` (local) | `createServiceRoleClient()` | ✓ | populated, 221 chars | — |
| `SUPABASE_SERVICE_ROLE_KEY` (Vercel/production) | Same, in deployed environment | **Unverified** | — | See Open Question 1 — must confirm before shipping |
| `RESEND_API_KEY` | Team notification email | ✓ (already used by `/api/contact`) | — | — |
| `pg_cron` extension | 12-month retention purge | Documented as available (not directly inspected for this specific project) | — | Vercel Cron → authenticated purge Route Handler |
| Node.js test framework (vitest/jest) | Automated unit tests for validation/spam-guard logic | ✗ — none found anywhere in this repo | — | See Validation Architecture below |

**Missing dependencies with no fallback:** none — every missing/unverified item above has a documented fallback or a clear verification step.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None installed** — no `vitest.config.*`, `jest.config.*`, `__tests__/`, or `*.test.*`/`*.spec.*` files exist anywhere in this repo (confirmed by search) |
| Config file | none — see Wave 0 |
| Quick run command | n/a until Wave 0 introduces a framework |
| Full suite command | n/a |

This is consistent with the rest of the project: zero automated tests exist for `api/contact`, `api/crm/*`, or anything else. This phase is explicitly designed to be curl-testable without any UI (per the phase description), which is the project's de facto verification method today.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| CRM-01 | Valid submission creates a `prospects` row | integration (curl against dev server + real/staging Supabase) | `curl -X POST localhost:3000/api/simulateur -d '{...valid payload...}'` then verify via Supabase MCP `execute_sql` or dashboard | ❌ Wave 0 (manual checklist, no automated harness for live Supabase writes recommended for this small-scale phase) |
| CRM-02 | `anon` role cannot select/update/delete `prospects` rows | manual (Supabase dashboard RLS policy tester, or `curl` with the anon key against the REST endpoint expecting 401/403) | n/a — documented as a manual verification step | ❌ Wave 0 |
| CRM-03 | Honeypot-filled or too-fast submission does not create a row | unit (pure function extraction) + manual curl | `pytest`-equivalent: extract the honeypot/timing predicate into a small pure function (e.g. `isSpamSubmission(payload)`) and unit-test it with `vitest run` | ❌ Wave 0 — needs both the framework and the extracted function |
| CRM-04 | Successful insert triggers exactly one Resend call to `contact@sevalys.com` | unit (mock Resend client) | `vitest run src/app/api/simulateur/route.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** manual curl smoke test against local dev + a disposable/test row in Supabase (delete after verifying)
- **Per wave merge:** re-run the curl checklist for CRM-01 through CRM-04 end to end
- **Phase gate:** RLS manually verified via Supabase dashboard's policy simulator (or MCP) before `/gsd:verify-work`; no automated full-suite exists to gate on

### Wave 0 Gaps

- [ ] Install `vitest` (or team's preferred minimal test runner) — this repo has zero test infrastructure; introducing it is in scope for this phase specifically because CRM-03's spam-guard logic (`isSpamSubmission`) and CRM-04's notification trigger are pure-enough functions to unit test cheaply
- [ ] `src/lib/prospects-schema.ts` — extract the zod schema + a small `isSpamSubmission(payload)` predicate out of the route handler so both are independently testable without mocking `next/server`
- [ ] `src/app/api/simulateur/route.test.ts` — covers CRM-03 (honeypot/timing) and CRM-04 (Resend call triggered on success), with the Supabase and Resend clients mocked
- [ ] Manual curl checklist (documented in the phase's SUMMARY, not automated) for CRM-01 (row actually persists) and CRM-02 (RLS denies anon read/update/delete) — live-Supabase-dependent behavior is deliberately kept manual for a project this size rather than standing up a test Supabase project

*Introducing a test framework here is a judgment call given this phase adds the project's first meaningfully-testable pure logic (validation + spam predicate); if the planner prefers to keep the zero-test-infrastructure status quo, the manual curl checklist alone still covers all four requirements, just with lower regression protection going forward.*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | No | This is an intentionally unauthenticated public endpoint (lead capture) |
| V3 Session Management | No | No session/cookie involved |
| V4 Access Control | Yes | RLS + grants on `prospects` (Pattern 1) — the actual access-control boundary is the database, not the Route Handler |
| V5 Input Validation | Yes | `zod` schema, server-side only, whitelist-style (`.insert({ ...explicit fields })`, never a raw body spread) |
| V6 Cryptography | Yes | `sha256` hash (Node `crypto`) for `ip_hash` — never store raw IP; `SUPABASE_SERVICE_ROLE_KEY`/`RESEND_API_KEY` handled via existing env-var convention, never hardcoded |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Direct-REST bypass of app-level spam guard using the public anon key | Tampering / Elevation of Privilege | Pattern 1 (zero anon grants) closes this structurally; Pattern 1-alt relies on RLS `CHECK` constraints as a weaker fallback |
| Mass assignment (client sends extra/unexpected fields that get inserted verbatim) | Tampering | `.insert({ nom: p.nom, email: p.email, ... })` with explicit field mapping from the parsed zod object — never `supabase.from('prospects').insert(rawBody)` |
| Stored XSS in the internal notification email (prospect-supplied text rendered as HTML) | Tampering / Information Disclosure (against the internal viewer, e.g. Outlook/Gmail rendering) | Reuse `escapeHtml()` on every user-supplied string before interpolating into the Resend HTML body, exactly as `api/contact` already does |
| Automated spam/bot flooding a public write endpoint | Denial of Service (resource/inbox exhaustion) | Honeypot + timing check (CRM-03); explicitly no CAPTCHA per CONTEXT.md discretion notes |
| Service-role credential leaking to the client bundle | Information Disclosure / Elevation of Privilege | Never prefix with `NEXT_PUBLIC_`; only call `createServiceRoleClient()` from server-side files; verify with a post-build grep (Pitfall 4) |

## Sources

### Primary (HIGH confidence)
- Direct reads: `src/lib/supabase.ts`, `src/app/api/contact/route.ts`, `src/app/api/crm/orders/route.ts`, `package.json`, `.env.example`, `.gitignore`, `.planning/phases/05-prospect-capture-backend/05-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `C:\portfolio\CLAUDE.md`, `graphify-out/GRAPH_REPORT.md`
- Local `.env` inspection (variable-name and length-only, no secret values read or written to this document) — confirmed `SUPABASE_SERVICE_ROLE_KEY` populated and unused by current code
- `npm view zod version` → `4.6.5`; `npm view resend version` → `6.28.1`; `npm view @supabase/supabase-js version` → `2.116.0`; `npm view <pkg> scripts.postinstall` (all empty) — live npm registry, 2026-09-20
- `slopcheck install zod resend @supabase/supabase-js` → 3/3 `[OK]`
- `supabase --version` → `2.116.0` (CLI confirmed installed locally)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — GRANT vs RLS interaction, exact `WITH CHECK` syntax, default-privilege caveat
- [Migration guide | Zod](https://zod.dev/v4/changelog) — `z.email()` replacing `z.string().email()` in v4

### Secondary (MEDIUM confidence)
- [pg_cron: Schedule Recurring Jobs with Cron Syntax in Postgres | Supabase Docs](https://supabase.com/docs/guides/database/extensions/pg_cron) and [Cron | Supabase Docs](https://supabase.com/docs/guides/cron) — `cron.schedule(...)` syntax, free-tier availability, cross-checked against [supabase#37405 discussion](https://github.com/orgs/supabase/discussions/37405)
- [Securing your API | Supabase Docs](https://supabase.com/docs/guides/api/securing-your-api) — Supabase's own `private.rate_limits` pre-request-function pattern (considered, not recommended for this phase — see Alternatives Considered)
- Prior milestone research: `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` (2026-09-20, same day) — reused for codebase conventions and prior pitfall analysis; this phase's research explicitly revises their anon-key-vs-service-role recommendation based on the new `.env` finding

### Tertiary (LOW confidence)
- In-memory/per-instance rate-limiting patterns for Next.js Route Handlers on serverless (WebSearch, multiple blog sources, not officially documented) — noted but not recommended as this phase's primary spam control; honeypot + timing (Pattern 2) is sufficient for the literal CRM-03 scope and the explicit no-CAPTCHA constraint

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions/legitimacy verified live; zod v4 API confirmed against official changelog
- Architecture (RLS/service-role): HIGH on the mechanics (Supabase docs, direct codebase read of the existing anon-key pattern), MEDIUM on whether the service-role key is actually mirrored to production (Open Question 1 — genuinely unverified, not just hedged)
- Pitfalls: HIGH — grounded in direct grant/RLS semantics and this specific codebase's conventions
- Retention/purge mechanism: HIGH on `pg_cron` availability (multiple cross-checked sources), MEDIUM on this specific project's plan tier (not inspected live)

**Research date:** 2026-09-20
**Valid until:** 30 days (Supabase/Next.js/zod are all stable-ish; re-verify `SUPABASE_SERVICE_ROLE_KEY` production availability and this project's Supabase plan tier at planning/execution time regardless of this date, since those weren't verified live against the deployed project)
