# Phase 10: Foundation, auth & isolation - Research

**Researched:** 2026-10-01
**Domain:** Supabase Auth (email OTP, SSR cookies) + RLS isolation on a shared multi-app Supabase project + Next.js 16 `proxy.ts` + Resend/DNS deliverability
**Confidence:** MEDIUM-HIGH (live DB/DNS/API facts HIGH; Supabase branching-from-CLI mechanics and a few auth API details MEDIUM, flagged for a Wave 0 spike)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** L'admin invite un client depuis un formulaire dans `/admin` : e-mail, nom du client et **SIRET**. Route serveur (service_role) crée `sv_clients` + le premier membre invité.
- **D-02:** Les informations publiques de l'entreprise sont récupérées automatiquement à partir du SIRET (API publique gratuite type recherche-entreprises.api.gouv.fr — à valider par la recherche) ; l'admin peut corriger/compléter si la recherche échoue. Le SIRET et les données récupérées sont stockés sur `sv_clients` (alimenteront contrat/facture, phases 13/15).
- **D-03:** Un client (entreprise) peut avoir plusieurs utilisateurs via `sv_client_members`. En phase 10, seul l'admin ajoute un membre.
- **D-04:** Rôles **exclusifs** : un e-mail admin ne peut pas être membre client (et inversement). Contrainte appliquée côté base/route d'invitation.
- **D-05:** Premier admin : le compte `contact@sevalys.com` — vérifier s'il existe déjà dans `auth.users` du projet Supabase, sinon le créer — puis l'insérer dans `sv_admins` via script/migration idempotent (pas d'auto-promotion possible depuis l'app).
- **D-06 (hérité de la recherche):** Rôles en tables (`sv_admins`, `sv_client_members`), jamais `user_metadata`/`app_metadata` ; « authentifié » n'accorde jamais d'accès. `signInWithOtp` avec `shouldCreateUser: false`.
- **D-07:** Une seule page `/connexion` ; redirection selon le rôle après vérification (admin → `/admin`, client → `/espace-client`).
- **D-08:** Session de **30 jours pour tous** (admin compris).
- **D-09:** Anti-énumération : réponse identique (« Si cette adresse est invitée, un code vient d'être envoyé ») quelle que soit l'adresse ; aucun e-mail envoyé aux non-invités ; limitation de débit.
- **D-10:** E-mail du code en français, expéditeur `Sevalys <connexion@sevalys.com>`, code à 6 chiffres bien visible, lien de secours, mention d'expiration. Le code est le chemin principal (les scanners d'e-mails brûlent les liens).
- **D-11:** Thème = tokens/variables CSS et polices du design system existant, version sobre type back-office ; **sans** intro cinéma, curseur custom ni GSAP (providers conditionnés par route).
- **D-12:** **Français uniquement** pour le portail et l'admin (pas de LanguageContext).
- **D-13:** Après login — Client : en-tête avec nom de l'entreprise, navigation squelette (Projet, Documents, Paiements, désactivés « bientôt »), déconnexion. Admin : liste des clients invités + formulaire d'invitation.
- **D-14:** Pas de navbar publique dans les coquilles ; seulement un lien discret « Retour au site » dans le pied.
- **D-15:** `noindex`, hors sitemap et `llms.txt`, `Disallow` dans robots pour `/espace-client`, `/admin`, `/connexion`.
- **D-16:** Tests RLS sur une **branche Supabase dédiée** (aucune écriture dans la base prod partagée avec Gecko) : migrations appliquées, utilisateurs de test créés/supprimés par les suites. Scénarios : client A vs client B, anonyme, utilisateur Gecko authentifié ; les tests doivent échouer si une politique est affaiblie.
- **D-17:** Gardes « aucun prix » : les tests existants restent limités aux chemins publics ; `/espace-client`, `/admin` et les futurs modèles de documents sont exclus via une liste explicite et documentée.
- **D-18:** Hérités de la recherche : RLS activée dans la même migration que chaque table ; vues en `security_invoker` ; `service_role` uniquement dans des modules `server-only` ; avis Supabase advisor lancé ; assertion du mode de clés d'environnement.
- **D-19:** Domaine d'envoi : `sevalys.com` via Resend (pas de sous-domaine pour l'instant). SPF/DKIM fournis par Resend, DMARC à ajouter ; l'admin ajoute les enregistrements chez le registrar.
- **D-20:** Critère « vérifié » avant d'activer le login : domaine « verified » dans Resend **+** enregistrements SPF/DKIM/DMARC confirmés par `dig` **+** e-mail de test reçu en boîte de réception (Gmail) avec en-têtes SPF/DKIM/DMARC = pass.

### Claude's Discretion
Structure exacte des tables/colonnes, noms de helpers SQL, découpage des plans, choix de la limitation de débit, détails du formulaire et de la gestion d'erreur SIRET, organisation des route groups Next.js (`proxy.ts`).

### Deferred Ideas (OUT OF SCOPE)
- Ajout d'un membre client par le client lui-même (self-service) — phase ultérieure.
- Sous-domaine d'envoi dédié (`mail.sevalys.com`) pour séparer la réputation marketing — à reconsidérer en phase 16.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Login sans mot de passe par code à 6 chiffres (lien en secours) | "Auth flow" pattern: server-gated `generateLink` + Resend send + `verifyOtp`; interstitial confirm page for the fallback link |
| FOUND-02 | Aucun compte créé librement, accès sur invitation | Shared-project finding: `auth.users` signup is open (44 users, Ziko/Gecko). "No free account" must be enforced at the *authorization* layer (role tables), not at `auth.users`; pre-account-takeover pitfall |
| FOUND-03 | Rôles en tables, jamais déduits de « authentifié » | `sv_admins`, `sv_client_members`, `sv_private.is_admin()/client_ids()`, revoke-then-grant, exclusivity triggers |
| FOUND-04 | Tests d'isolation A vs B, anon, Gecko | Branch-based RLS suite (`tests/rls/`), safety guard against prod ref, mutation canary, static migration lint |
| FOUND-05 | Coquilles noindex sans cinéma/curseur/GSAP | Route-aware `ClientProviders` + `PostHogProvider`, metadata overrides, robots/sitemap/llms, import-boundary test |
| FOUND-06 | Gardes « aucun prix » scopées | Inventory of existing guards (all file-scoped, none scans `src/**`); add zone constants + boundary test |
| FOUND-07 | SPF/DKIM/DMARC vérifiés avant login | Live DNS audit of sevalys.com (existing Brevo DMARC, no root SPF, Resend DKIM present) + verification script + Gmail header check |
</phase_requirements>

## Summary

The Supabase project `portfolio` (ref `ubxllsvanurkwkohzxau`, eu-west-3) is **a shared hub, not a Sèvalys-only database**: it holds 44 `auth.users` (Ziko consumers, RH app, Gecko, this portfolio), ~130 `ziko_*` tables, `rh_*`, `gecko_*`, `orders/products` (demo CRM) and `prospects`. Email signup is evidently open (all users have provider `email`). Consequences that reshape the phase: (1) "authenticated" is meaningless as a privilege signal, (2) FOUND-02 cannot be satisfied by "no row in `auth.users`" because any visitor can already self-register through the public Auth API; it must be satisfied by "a self-registered user has zero rights in `sv_*`", (3) **project-wide Auth settings must not be touched** (SMTP, email templates, OTP length/expiry, session time-box) because Ziko and Gecko share them, and (4) default Postgres privileges on this project grant ALL on every new `public` table and EXECUTE on every new function to `anon` and `authenticated`, so every `sv_*` table and function needs an explicit revoke-then-grant.

For login, do **not** use `signInWithOtp` + the project email template. Instead the server gates on the role tables first, then calls `auth.admin.generateLink({type:'magiclink'})`, takes `email_otp` (6 digits) and `hashed_token`, and sends the branded French email itself via Resend from `connexion@sevalys.com`. This satisfies D-09 (no email to non-invited addresses, including Ziko/Gecko users), D-10 (custom template, code primary, fallback link) and leaves the shared Auth config untouched. The code is verified with `verifyOtp({email, token, type:'email'})` through an `@supabase/ssr` server client so the session lands in cookies. The 30-day cap (D-08) cannot use Supabase's time-box (Pro-only AND project-wide) nor `cookieOptions.maxAge` (ignored by `@supabase/ssr`); enforce it server-side by comparing `auth.sessions.created_at` (looked up from the JWT `session_id` claim) to now.

DNS audit: DMARC already exists on `sevalys.com` (`p=none`, reports to Brevo), Resend DKIM (`resend._domainkey`) and a `send.sevalys.com` return-path already exist, there is **no root SPF record** (Google Workspace MX present), and Brevo DKIM CNAMEs exist. So FOUND-07 is mostly "edit the existing DMARC (do not add a second), add a root SPF, then run the three-part verification of D-20".

**Primary recommendation:** Build `sv_*` tables behind `sv_private` SECURITY DEFINER helpers with explicit revokes; gate login server-side by role tables and send the OTP email yourself via Resend; enforce session age from `auth.sessions`; run RLS tests on a persistent-or-ephemeral Supabase branch guarded against the prod ref; keep the root layout and make `ClientProviders`/`PostHogProvider` pathname-aware.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role/membership truth | Database (tables + RLS) | — | Shared `auth.users`; only tables can express "invited". JWT metadata is user-influenced or stale |
| Session cookie refresh | Frontend Server (`proxy.ts`) | — | `@supabase/ssr` requirement; thin, no authorization decisions |
| Authorization (admin vs client vs nobody) | API/Backend (server DAL `requireAdmin/requireClient` in every page, layout, action) | Database (RLS as real boundary) | Next docs: Server Functions are POSTs to the page route, layouts do not re-render on navigation, proxy matcher may miss them |
| OTP issuance + email | API/Backend (Server Action, service_role, `server-only`) | Resend | Must gate on role tables before any email goes out |
| OTP verification / cookie set | API/Backend (Server Action with ssr client) | — | Cookies must be written server-side |
| SIRET lookup | API/Backend (server fetch to recherche-entreprises) | Browser (form only) | Avoid CORS/rate-limit exposure, validate and normalise server-side |
| Invitation (create auth user + `sv_clients` + member) | API/Backend (service_role) | Database (exclusivity triggers) | Admin-only, bypasses RLS by design |
| Provider gating (cinema/cursor/PostHog) | Browser (`usePathname` in client providers) | — | Root layout must stay static; pathname only available in client components |
| Indexing exclusion | Frontend Server (metadata, robots.ts) + CDN headers (`next.config` headers) | — | Belt and braces (D-15) |
| Isolation proof | Database branch + Vitest (`tests/rls`) | CI static lint | RLS cannot be unit-tested without a real Postgres |
| Email authentication (SPF/DKIM/DMARC) | DNS (Cloudflare) | Resend | Domain-level, human step |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.12.7 (latest, modified 2026-09-08) | Cookie sessions in Server Components, Actions, Route Handlers, `proxy.ts` | Official package for Next App Router [VERIFIED: npm registry; official docs supabase.com/docs/guides/auth/server-side/nextjs] |
| `@supabase/supabase-js` | bump `^2.104.1` → `^2.114.0` (latest 2.117.2) | Peer requirement of ssr 0.12.7 (`^2.114.0`) | `npm view @supabase/ssr peerDependencies` [VERIFIED: npm registry] |
| `server-only` | 0.0.1 | Build-time guarantee that service_role modules never reach a client bundle | Next-recommended marker package [ASSUMED: not re-read in Next docs this session; slopcheck OK, no repo linked] |
| `resend` | existing ^6.28.1 | Send OTP email from `connexion@sevalys.com` | Already used by `/api/contact`, `/api/simulateur` |
| `zod` | existing ^4.6.5 | Validate email, 6-digit code, SIRET (14 digits) | Already in repo |
| `vitest` | existing ^4.1.11 | Static tests + separate RLS integration config | Already in repo |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Supabase CLI | installed 2.116.0 (2.119.0 available) | `branches create/get/delete`, `db query --linked`, `migration list/repair` | Branch lifecycle, prod read-only inspection. Logged in already (`projects list` works) [VERIFIED: local run] |
| Resend domains API / dashboard | — | Check domain `verified` status | D-20 step 1 |
| `node:dns/promises` or `nslookup` | — | DNS record verification on Windows (no `dig` installed) | D-20 step 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateLink` + own Resend email | `signInWithOtp` + edit Magic Link template + custom SMTP | Template/SMTP are **project-wide** (would change Ziko/Gecko auth mails), emails any existing auth user including non-invited Ziko users, 30/h custom-SMTP default cap. Rejected |
| `auth.sessions.created_at` age check | Supabase "Time-box user sessions" | Pro-only and project-wide (would log out Ziko users). Rejected |
| `auth.sessions.created_at` age check | Signed `sv_session_start` cookie | Fallback if the `session_id` claim lookup fails in the spike; weaker (client holds it) |
| Supabase branch for RLS tests | Local `supabase start` + pgTAP | Docker is **not installed** on this machine, so local stack is unavailable. Branch is also the locked decision D-16 |
| DB table throttle | Upstash/Redis | New vendor for one endpoint; table + SQL function is enough |

**Installation:**
```bash
npm install @supabase/ssr@^0.12.7 @supabase/supabase-js@^2.114.0 server-only
```

**Version verification:** `npm view @supabase/ssr version` → 0.12.7; `npm view @supabase/supabase-js version` → 2.117.2; `npm view @supabase/ssr peerDependencies` → `{ '@supabase/supabase-js': '^2.114.0' }`; `scripts.postinstall` empty for `@supabase/ssr`. Installed Next is 16.1.6 (docs now at 16.3.8; `proxy.ts` API unchanged).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@supabase/ssr` | npm | multi-year (official Supabase) | high | github.com/supabase/ssr | [OK] (`slopcheck scan --pkg npm`) | Approved |
| `server-only` | npm | multi-year (React/Vercel maintained) | very high | none linked | [OK] with note "no source repo linked" | Approved; tag [ASSUMED] for provenance, planner may add a `checkpoint:human-verify` |
| `@supabase/supabase-js` | npm | official, already installed | very high | github.com/supabase/supabase-js | not rerun (already a dependency; version bump only) | Approved |

Note: `slopcheck install` defaults to PyPI and falsely reports npm names as SLOP; use `slopcheck scan --pkg npm <name>`. **Packages removed:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 Admin (browser)                         Invited client (browser)              Anyone / Ziko / Gecko user
      |                                          |                                      |
 /admin invite form                     /connexion  (email field)                 direct Supabase Auth API
      |                                          |                                (cannot be disabled: shared)
      v                                          v                                      |
 Server Action invite             Server Action requestCode(email)                      v
 (requireAdmin, service_role)       1 zod + throttle (DB fn)                    auth.users row may be created
  1 SIRET -> recherche-entreprises   2 ALWAYS return same message                      BUT
  2 lookup/create auth user          3 after(): service_role lookup:              no sv_admins / sv_client_members row
  3 insert sv_clients                   is email in sv_admins or                  => RLS returns nothing,
  4 insert sv_client_members            sv_client_members ?                       /admin 404, /espace-client "no access"
  5 send invite mail (Resend)           no  -> send nothing
      |                                 yes -> admin.generateLink(magiclink)
      v                                        -> email_otp + hashed_token
  Postgres (sv_* + RLS)                        -> Resend: "Sevalys <connexion@sevalys.com>"
   triggers: role exclusivity                          code + fallback link /auth/confirm?token_hash=..
                                                         |
              /connexion step 2: code ---------------> Server Action verifyCode
                                                       supabase.auth.verifyOtp({email,token,type:'email'})
              /auth/confirm (GET = interstitial page,  (@supabase/ssr server client writes sb-* cookies)
               POST button = verifyOtp(token_hash))              |
                                                                 v
                                           role lookup (RLS client) -> redirect /admin | /espace-client
                                                                 |
   Every request to /espace-client|/admin|/connexion|/auth  ->  proxy.ts (matcher limited to these)
        getClaims() refresh cookies; no session -> /connexion?next=...
   Every page/layout/action -> DAL requireAdmin()/requireClient():
        getUser() + sv role check + session age <= 30d (auth.sessions.created_at) -> else signOut
```

### Recommended Project Structure
```
src/
├── proxy.ts                              # thin: session refresh + unauth redirect; literal matcher
├── lib/
│   ├── privateRoutes.ts                  # PRIVATE_PREFIXES (single source for providers, robots, tests)
│   ├── priceScope.ts                     # PRICE_ALLOWED_ZONES / PRICE_FREE_GUARDED_FILES (D-17)
│   ├── supabase.ts                       # existing, additive only (DO NOT edit createServerClient: used by /api/crm)
│   └── supabase/
│       ├── env.ts                        # key-mode assertion (D-18)
│       ├── server.ts                     # createSupabaseServerClient() (ssr, cookies)  [server-only]
│       ├── browser.ts                    # createBrowserClient() (only if a client component needs it)
│       ├── proxy.ts                      # updateSession(request) helper
│       └── admin.ts                      # service_role client                           [server-only]
│   └── server/
│       ├── auth/ (dal.ts requireAdmin/requireClient, login.ts, throttle.ts, session-age.ts)
│       ├── clients/ (invite.ts, siret.ts)
│       └── mail/ (loginCodeEmail.ts)     # plain typed HTML function, FR, escapeHtml
├── app/
│   ├── connexion/{layout.tsx,page.tsx,actions.ts}
│   ├── auth/confirm/{page.tsx,actions.ts}   # interstitial for fallback link
│   ├── espace-client/{layout.tsx,page.tsx}
│   └── admin/{layout.tsx,page.tsx,actions.ts}
├── components/{portal,admin}/            # may later contain prices (price-allowed zones)
supabase/migrations/20261002000000_sv_foundation.sql
tests/rls/*.rls.test.ts + vitest.rls.config.ts   # OUTSIDE src/ so `npm test` never picks them up
```

### Pattern 1: Migration skeleton (revoke-then-grant, private helpers, RLS in the same file)
**What:** Every `sv_*` table: `enable row level security` + `revoke all ... from anon, authenticated` + explicit `grant select` + policies `to authenticated`, in the same migration. Helpers in non-exposed schema.
**Why the revoke is mandatory:** live default ACLs grant `arwdDxtm` to `anon` and `authenticated` on new tables and `X` (execute) on functions [VERIFIED: `pg_default_acl` on project].
```sql
-- Source: supabase.com/docs/guides/database/postgres/row-level-security (grants + policies; (select auth.uid()) caching)
create schema if not exists sv_private;
revoke all on schema sv_private from public, anon;
grant usage on schema sv_private to authenticated;

create table public.sv_tenants (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.sv_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.sv_tenants(id),
  created_at timestamptz not null default now());
create table public.sv_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.sv_tenants(id),
  name text not null check (char_length(trim(name)) > 0),
  siret text not null unique check (siret ~ '^[0-9]{14}$'),
  siren text generated always as (left(siret, 9)) stored,
  company jsonb,                      -- snapshot from recherche-entreprises (minimised, no dirigeants)
  company_source text not null default 'api' check (company_source in ('api','manual')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now());
create table public.sv_client_members (
  client_id uuid not null references public.sv_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (client_id, user_id));
create index on public.sv_client_members (user_id);

alter table public.sv_tenants enable row level security;  -- all four, same file
-- ... alter table ... enable row level security for each
revoke all on public.sv_tenants, public.sv_admins, public.sv_clients, public.sv_client_members from anon, authenticated;
grant select on public.sv_admins, public.sv_clients, public.sv_client_members to authenticated;

create function sv_private.is_admin() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.sv_admins where user_id = (select auth.uid())) $$;
create function sv_private.client_ids() returns setof uuid language sql stable security definer set search_path = '' as
$$ select client_id from public.sv_client_members where user_id = (select auth.uid()) $$;
revoke all on function sv_private.is_admin(), sv_private.client_ids() from public, anon;
grant execute on function sv_private.is_admin(), sv_private.client_ids() to authenticated;

create policy sv_admins_self on public.sv_admins for select to authenticated using (user_id = (select auth.uid()));
create policy sv_clients_read on public.sv_clients for select to authenticated
  using ((select sv_private.is_admin()) or id in (select sv_private.client_ids()));
create policy sv_members_read on public.sv_client_members for select to authenticated
  using ((select sv_private.is_admin()) or user_id = (select auth.uid()));
-- no insert/update/delete policy or grant: writes are service_role only in phase 10
```
Exclusivity (D-04): `before insert` triggers on `sv_admins` (reject if `user_id` in `sv_client_members`) and on `sv_client_members` (reject if in `sv_admins`), both `security definer`. Idempotent first-admin seed (D-05): `insert into sv_admins select id, <tenant> from auth.users where lower(email)='contact@sevalys.com' on conflict do nothing` (on a branch this inserts zero rows, which is correct).

### Pattern 2: `@supabase/ssr` + Next 16 proxy
```ts
// src/lib/supabase/proxy.ts  -- Source: supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,   // or legacy anon key (see env assertion)
    { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        } } });
  const { data } = await supabase.auth.getClaims();  // validates JWT signature; never getSession() in server code
  return { response, claims: data?.claims ?? null };
}
```
```ts
// src/proxy.ts  (file name for Next 16; "middleware.ts" is never called as the Supabase docs warn)
export async function proxy(request: NextRequest) { /* updateSession; no claims + path under /espace-client|/admin -> redirect /connexion?next= */ }
export const config = { matcher: ['/espace-client/:path*', '/admin/:path*', '/connexion', '/auth/:path*'] }; // literal constants only
```
Matcher values must be static constants (Next docs), so the literal list lives in `proxy.ts` and a Vitest test asserts it equals `PRIVATE_PREFIXES`. Do **not** run the proxy on the whole site (public pages and `/api/*` untouched; PITFALLS "over-matching").

### Pattern 3: Server-gated OTP issue (FOUND-01, D-09, D-10)
```ts
// src/lib/server/auth/login.ts  [server-only]
export async function issueLoginCode(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const admin = createServiceRoleClient();
  // 1. membership first (never call generateLink for unknown or non-invited emails: magiclink CREATES missing users)
  const { data: allowed } = await admin.rpc('sv_login_allowed', { p_email: email }); // service_role-only SQL fn joining auth.users
  if (!allowed) return;                                   // silent: same response, no email
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data) return;
  const { email_otp, hashed_token } = data.properties;    // email_otp: 6 digits; hashed_token: for the fallback link
  await resend.emails.send({
    from: 'Sevalys <connexion@sevalys.com>', replyTo: 'contact@sevalys.com',
    to: email, subject: 'Votre code de connexion Sèvalys',
    html: loginCodeEmail({ code: email_otp, link: `${SITE}/auth/confirm?token_hash=${hashed_token}&type=email` }),
    text: '...' });
}
// Server Action: validate -> throttle(email hash, ip hash) -> after(() => issueLoginCode(email)) -> return the SAME message always
```
Using `after()` from `next/server` makes response time independent of whether an email was sent (timing side-channel).
Verification: `supabase.auth.verifyOtp({ email, token, type: 'email' })` in a Server Action with the ssr client; then role lookup via the RLS client; non-role users get `signOut()` plus a generic error.
**Fallback link:** `GET /auth/confirm` renders a page with a button only (does not consume the token, so mail scanners that prefetch the URL do not burn it); the button submits a Server Action calling `verifyOtp({ token_hash, type: 'email' })` [type value ASSUMED; spike on branch, `magiclink` is the legacy alias].

### Pattern 4: Session 30-day cap (D-08)
`@supabase/ssr` overwrites `cookieOptions.maxAge` with 400 days on every write [CITED: github.com/supabase/ssr/issues/40 via search; MEDIUM]. Supabase time-box is Pro-only and project-wide [CITED: supabase.com/docs/guides/auth/sessions]. Therefore: DAL reads `session_id` from `getClaims()` and calls `sv_private.session_age_ok(session_id)` (service_role-only SQL fn: `select created_at > now() - interval '30 days' from auth.sessions where id = $1`). `auth.sessions` has `id, user_id, created_at, refreshed_at, not_after, ...` [VERIFIED: live information_schema]. `created_at` is fixed for the life of the session across refresh rotation [ASSUMED, verify in spike]; on expiry call `signOut()` and redirect `/connexion`. Run it in the DAL (not proxy) to avoid a DB call on every asset-less proxy hit.

### Pattern 5: Route-aware providers (FOUND-05, D-11/D-12)
Keep the root layout and all existing page locations (existing tests read `./layout.tsx`, `./page.tsx`, `calculateur-roi/page.tsx`, `services/page.tsx` by relative path; `linkAudit` and sitemap logic depend on current layout; a root-layout split via route groups would force moving them: rejected).
- `ClientProviders`: add `usePathname()`; return `null` when `isPrivatePath(pathname)`. `CinemaIntro`/`CustomCursor` are `dynamic(ssr:false)`, so they are never even loaded.
- `PostHogProvider`: autocapture is `true` and pageviews are manual. On private paths call `posthog.opt_out_capturing()` and skip `$pageview`; call `opt_in_capturing()` when returning to a public path (client navigation is SPA). No PII/client data may reach PostHog (portal shows contracts/prices later).
- `LanguageProvider` stays in root but portal/admin never call `useLanguage()` (D-12). GSAP/three are only imported inside public section components, so they are not in portal bundles; enforce with a static import-boundary test.
- Root JSON-LD `<Script strategy="beforeInteractive">` stays (harmless noise on noindex pages; making it route-aware needs a request-time header read that would make the whole site dynamic: do not).
- Metadata: each of `espace-client/layout.tsx`, `admin/layout.tsx`, `connexion/layout.tsx` exports `robots: { index:false, follow:false }` and **overrides `alternates`** (root sets `canonical: "/"`, which children inherit; metadata merges per top-level key, so set `alternates: {}` or the page's own canonical-free object) and `title`.
- `next.config.ts`: add `headers()` returning `X-Robots-Tag: noindex, nofollow` for `/espace-client/:path*`, `/admin/:path*`, `/connexion`, `/auth/:path*`.
- `robots.ts`: add the four prefixes to `disallow` (D-15). Trade-off noted: Disallow stops crawlers reading the noindex meta; acceptable because nothing public links to these paths.

### Anti-Patterns to Avoid
- **Authorization in `proxy.ts` only / in layouts only.** Server Actions are POSTs to the route and a matcher change silently removes coverage; layouts do not re-render on navigation. Re-check in every page and action via the DAL [CITED: nextjs.org proxy docs, "Good to know" on Server Functions].
- **`getSession()` in server code**, and `getClaims()` for destructive/admin mutations: use `getUser()` (network-verified, sees revoked sessions) inside `requireAdmin()` for mutations; `getClaims()` is fine in the proxy for refresh [claim that getClaims ignores revocation until expiry is ASSUMED].
- **Changing project-wide Auth config** (SMTP, templates, OTP length/expiry, time-box, signup toggle, JWT expiry): Ziko/Gecko depend on them.
- **Calling `generateLink`/`signInWithOtp` for unvetted emails** (creates users / mails Ziko customers).
- **Importing `createServiceRoleClient` from `src/lib/supabase.ts` in portal code.** That file is also imported by client components (`export const supabase` browser client) so it is not `server-only`. Create `src/lib/supabase/admin.ts` with `import 'server-only'` and leave the old file additive-only.
- **A blanket "no price" scan of `src/**`**: `calculateur-roi/page.tsx` legitimately contains `€` (3 hits); it would fail immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookies (chunking, refresh) | custom cookie JWT code | `@supabase/ssr` `createServerClient` | Cookie chunking/refresh races are subtle |
| JWT verification | manual `jose` verify | `supabase.auth.getClaims()` | Handles JWKS/asymmetric keys |
| OTP generation/storage for login | own code table | `auth.admin.generateLink` `email_otp` + `verifyOtp` | Supabase stores/hashes/expires/limits it |
| SIRET company data | scraping/INSEE token flow | recherche-entreprises.api.gouv.fr (no auth) | Free, open, verified live |
| Email auth records | hand-made DKIM | Resend-provided records + `_dmarc` edit | Resend validates |
| Password-less rate-limiting infra | Redis | Postgres table + SQL fn (`sv_private.throttle_hit(key, window, max)`) | One endpoint, no new vendor |
| Role checks in JWT claims | custom access-token hook | table lookup + RLS | Decided D-06; hook is optional later |

**Key insight:** the dangerous part of this phase is not code volume, it is *ambient authority* in a shared database. Every shortcut that relies on "logged in", on JWT metadata, or on project-wide Auth settings is a cross-app regression risk.

## Runtime State Inventory

Not a rename/refactor phase; however the phase writes into live shared state. Items that must be treated explicitly:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Prod DB: 44 `auth.users`, `contact@sevalys.com` **already exists** and is not in `gecko_admins`; 3 `gecko_admins`; `prospects` table; pg_cron job `purge-prospects-12mo`; no `sv_*` tables | New migration + idempotent seed of `sv_admins` from existing user. No data migration |
| Live service config | Supabase Auth settings (templates, SMTP, signup, OTP expiry, JWT expiry) shared with Ziko/Gecko; Resend domain; Cloudflare DNS | **Do not modify Auth settings.** Read-only inspection in dashboard (confirm-email setting, OTP expiry value, signup enabled). DNS edits only as listed in "DNS plan" |
| OS-registered state | None | None |
| Secrets/env vars | `.env.example` documents `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `.env` (Vercel pull) contains `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.local` has only SITE_URL, PostHog, RESEND. Need `SUPABASE_SERVICE_ROLE_KEY`/secret key, `RESEND_API_KEY` on Vercel | Add key-mode assertion; update `.env.example`; add `SV_TEST_*` vars (local only, never Vercel) |
| Build artifacts | None | None |
| **Migration history drift** | Remote `schema_migrations` versions differ from repo filenames (remote `20260920083556 create_prospects_table`, `20260921010000 prospects_explicit_deny`, `20260921202340 gecko_cabane_integration`, `20260921202354 gecko_fix_function_search_path`, plus other apps' migrations); repo has `20260920000000`, `20260921000000` | Do **not** `supabase db push` to prod blindly. Use `supabase migration list --linked`, then either `migration repair` or apply the new migration via `supabase db query --linked -f` and insert the version row. For the branch, add the two missing portfolio/gecko-relevant migrations to the repo (prospects_explicit_deny; gecko_fix_function_search_path = `alter function ... set search_path = public` on the two trigger functions) so the branch mirrors prod. Do not import other apps' migrations |

## Common Pitfalls

### Pitfall 1: Pre-account takeover through open signup (CRITICAL, FOUND-02/03)
**What goes wrong:** Anyone can create an `auth.users` row with any email (and a password of their choosing) through the public Auth API. If an admin later invites that email and the server attaches the member row to the *existing* user id, the attacker already knows its password. With email confirmation off, the pre-created account is even already confirmed.
**How to avoid:** In the invite route, look up the auth user by email (service_role-only SQL fn on `auth.users`). If none: `auth.admin.createUser({ email, email_confirm: true })` with **no password**. If one exists: if it has `last_sign_in_at is not null` or any other-app footprint, stop and require explicit admin action (rare: e.g. `contact@sevalys.com`); if never signed in, delete and recreate it. Never expose or accept password login in the portal; fresh users have no password so `/token?grant_type=password` is impossible for them.
**Warning signs:** invite flow uses `listUsers` then reuses an id without checking sign-in history.

### Pitfall 2: `generateLink` magiclink creates users
**What goes wrong:** calling it for an unknown email silently creates a user (and mails nothing, but now the auth user exists).
**How to avoid:** the membership lookup runs first (Pattern 3); throttled; invite uses `createUser`.

### Pitfall 3: Default privileges expose new tables/functions
**What goes wrong:** `anon` and `authenticated` get full table rights and function EXECUTE by default [VERIFIED live]. A missing policy then fails closed only because RLS is on; a forgotten `enable row level security` is a total leak (existing `gecko_admins` shows full anon grants protected only by RLS).
**How to avoid:** revoke-then-grant in the same migration; static lint test (see Validation); run the Supabase security advisor on the branch and on prod after apply (D-18).

### Pitfall 4: Link scanners burn magic links
**How to avoid:** code is primary; fallback link lands on an interstitial page that needs a click/POST.

### Pitfall 5: Resend click tracking rewrites auth links
**How to avoid:** make sure open/click tracking is off for the sending domain (Resend domain settings) so `token_hash` URLs are not wrapped [ASSUMED default off; verify in dashboard].

### Pitfall 6: `verifyOtp` cookies not set
**What goes wrong:** verifying in a Route Handler/Action with the wrong client leaves the session only in memory.
**How to avoid:** use the ssr server client (`cookies()` adapter with `getAll/setAll`) in Server Actions; `setAll` may throw in Server Components (wrap try/catch there, proxy refreshes).

### Pitfall 7: Existing tests that look related but are not scoped how you expect
**What goes wrong:** assuming a global price scan exists, or that adding portal pages is harmless: `linkAudit.test.ts` walks every `src/**/*.tsx` and requires every internal `href` and `#id` to resolve (route groups are supported by its `routeForFile`), so portal links must point at routes that exist; `sitemap.test.ts` asserts `5 + services.length + 1` URLs (portal routes must NOT be added); `layout.test.ts` reads root `layout.tsx` source for `priceRange`.
**How to avoid:** see "No-price guard scoping" below.

### Pitfall 8: DMARC/SPF edits that break other senders
**What goes wrong:** adding a second `_dmarc` or second SPF TXT invalidates both (only one record allowed each). Existing DMARC reports go to Brevo; Google Workspace and Brevo also send as `@sevalys.com`.
**How to avoid:** edit the existing `_dmarc` record in place; add (not replace) the new `rua`; stay at `p=none` for this phase.

### Pitfall 9: Supabase branch does not equal prod
**What goes wrong:** a branch is "data-less" and built from repo migrations only; repo is missing two prod migrations (see Runtime State Inventory), so gecko function search_path and the explicit prospects deny policy differ.
**How to avoid:** sync those two into the repo first; the isolation suite asserts gecko tables are unreadable by non-admin users on the branch.

### Pitfall 10: Test suite pointed at prod
**How to avoid:** `tests/rls/setup.ts` reads `SV_TEST_SUPABASE_URL`, refuses to run if the URL contains `ubxllsvanurkwkohzxau` or if `SV_TEST_ALLOW` is unset; uses its own service key; cleans up created users in `afterAll`.

### Pitfall 11: PostHog autocapture on login/portal pages
Autocapture records clicks/text; persists in localStorage+cookie. Opt out on private paths (Pattern 5).

## Code Examples

### SIRET lookup (D-02) — shape verified live on 2026-10-01
```ts
// src/lib/server/clients/siret.ts  [server-only]
// GET https://recherche-entreprises.api.gouv.fr/search?q=<14 digits>&per_page=1   (no auth, CORS open, JSON)
// Limit: 7 calls/s, 429 + Retry-After when exceeded [CITED: search results quoting the API terms; data.gouv.fr dataservice]
const SIRET = /^\d{14}$/;
export async function lookupSiret(siretRaw: string) {
  const siret = siretRaw.replace(/\s/g, '');
  if (!SIRET.test(siret)) return { ok: false as const, reason: 'invalid' };
  const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`, { signal: AbortSignal.timeout(5000), next: { revalidate: 0 } });
  if (res.status === 429) return { ok: false as const, reason: 'rate_limited' };
  if (!res.ok) return { ok: false as const, reason: 'unavailable' };
  const { results } = await res.json();
  const r = results?.[0];
  // IMPORTANT: q is fuzzy full-text (q=abc returns 200 + a random company). Confirm the exact SIRET came back.
  const etab = r && (r.siege?.siret === siret ? r.siege : r.matching_etablissements?.find((e: any) => e.siret === siret));
  if (!etab) return { ok: false as const, reason: 'not_found' };
  return { ok: true as const, data: {
    siren: r.siren, siret, nom: r.nom_complet, adresse: etab.adresse, code_postal: etab.code_postal, commune: etab.libelle_commune,
    forme_juridique_code: r.nature_juridique,            // INSEE code e.g. "5510"; map to a label later
    naf: etab.activite_principale ?? r.activite_principale, // e.g. "53.10Z"
    etat_administratif: etab.etat_administratif,         // "A" = active
    categorie_entreprise: r.categorie_entreprise, date_creation: r.date_creation,
    tva_intracom: r.tva ?? null } };                     // top-level `tva` key exists; inspect shape in spike
}
```
Response top-level keys: `results, total_results, page, per_page, total_pages`. Each result has `siren, nom_complet, nom_raison_sociale, siege{...,siret,adresse,code_postal,libelle_commune,activite_principale,etat_administratif}, nature_juridique, categorie_entreprise, tranche_effectif_salarie, dirigeants[], matching_etablissements[], finances, complements, tva` [VERIFIED: live call]. **Data minimisation:** do not persist `dirigeants` (personal data); store only the fields above. Treat the API as best-effort (D-02: admin can edit/complete; set `company_source='manual'`). Optional Luhn check as a *warning* only (some valid SIRETs, e.g. La Poste headquarter, fail Luhn).

### Login-code email (D-10)
Plain typed HTML function (repo precedent in `/api/simulateur`), `escapeHtml` on interpolated values, big monospaced code (JetBrains Mono per design system), text part, mention "valable 1 heure" **only after reading the project's actual OTP expiry in the dashboard** (default 3600 s [CITED: supabase.com/docs/guides/auth/passwordless-login/auth-email-otp]; the setting is shared, so display whatever is configured, do not change it). Subject FR. `replyTo: contact@sevalys.com` since `connexion@` has no mailbox.

### Test user creation for RLS suite
```ts
// tests/rls/helpers.ts
const svc = createClient(URL, SECRET_KEY, { auth: { persistSession: false } });
async function makeUser(email: string) {
  const { data } = await svc.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true });
  const c = createClient(URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password });   // real JWT, goes through real RLS
  return { id: data.user!.id, client: c };
}
```

## DNS plan for FOUND-07 (live audit of sevalys.com, 2026-10-01, Cloudflare DNS)

| Record | Observed | Action |
|--------|----------|--------|
| `resend._domainkey.sevalys.com` TXT | present (RSA key) | none; confirm Resend dashboard shows Verified |
| `send.sevalys.com` | CNAME → `send.forge.rmta.net`; TXT `v=spf1 ip4:... ~all`; MX → `feedback.forge.rmta.net` | none (return-path subdomain); confirm in Resend which records it expects [provider of `rmta.net` not independently confirmed] |
| `sevalys.com` root SPF | **absent** (only google-site-verification x2 and `brevo-code`); MX = `smtp.google.com` | add ONE root TXT, e.g. `v=spf1 include:_spf.google.com include:spf.brevo.com ~all` after confirming which services send as @sevalys.com [include hosts ASSUMED from memory] |
| `_dmarc.sevalys.com` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | **edit in place**, keep Brevo rua, add own rua (e.g. `rua=mailto:rua@dmarc.brevo.com,mailto:contact@sevalys.com`). Keep `p=none` this phase; tighten later per Resend guidance (none → quarantine → reject) [CITED: resend.com/docs/dashboard/domains/dmarc] |
| Brevo DKIM | `brevo1/brevo2._domainkey` CNAMEs present | none |

DMARC for Resend mail passes through the aligned DKIM signature (`d=sevalys.com`) even without root SPF. Verification (D-20): (1) Resend domain status `verified`; (2) records via `node -e "require('dns/promises').resolveTxt(...)"` or `nslookup -type=TXT` (no `dig` on this Windows machine); (3) send a real login-code email to a Gmail inbox, "Show original": `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Make the login Server Action refuse to send (feature flag `SV_LOGIN_ENABLED`) until the human check is recorded.

## No-price guard scoping (FOUND-06, D-17)

Inventory of existing guards (all verified by reading):
- `src/app/layout.test.ts`: root `layout.tsx` source has no `priceRange`.
- `src/app/llms.test.ts`: `public/llms.txt` has no price wording.
- `src/lib/serviceSchema.test.ts`: service JSON-LD builders carry no price keys; `/services/[slug]/layout.tsx` Service-free.
- `src/lib/translations.test.ts`: `PRICE_PATTERN` over `t.services.pages`, `SIMU_PRICE_PATTERN` over `t.simulateur`.
- `src/data/services.test.ts`: `services/page.tsx` has no `€|prix|tarif`.
- `src/app/page.test.ts`, `simulateur/layout.test.ts`, `calculateur-roi/page.test.ts`: file-specific.
**None scans a directory tree**, so portal/admin code cannot trip them today. FOUND-06 therefore means making the scope explicit and preventing leakage:
1. `src/lib/priceScope.ts`: `PRICE_ALLOWED_ZONES = ['src/app/espace-client','src/app/admin','src/app/connexion','src/components/portal','src/components/admin','src/lib/documents','src/lib/server']` with a comment per zone; `GUARDED_PUBLIC_FILES` list (the files above).
2. New `src/lib/priceScope.test.ts`: (a) no guarded file lies inside an allowed zone; (b) no file outside the allowed zones imports from an allowed zone (prevents a priced component being pulled into a public page); (c) `sitemap()` URLs, `llms.txt`, `robots` contain/deny none of `PRIVATE_PREFIXES`; (d) portal/admin/connexion `layout.tsx` export `robots.index === false`; (e) files in the private zones do not import `gsap`, `three`, `@react-three`, `CinemaIntro`, `CustomCursor`, `LanguageContext`, `ClientProviders`; (f) no `'use client'` file imports `@/lib/supabase/admin` or `server-only` modules.
3. Do not edit existing guard tests except to add cases.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` (Node runtime default) | Next 16.0 | Supabase docs: a `proxy.ts` is never called on Next 15; on 16 `middleware.ts` is the one ignored/deprecated [CITED: both docs] |
| `getSession()` server-side | `getClaims()` (JWT signature check) / `getUser()` | 2025 | Never trust `getSession()` in server code |
| `anon` / `service_role` JWT keys | `sb_publishable_…` / `sb_secret_…` | Legacy keys "deprecated by end of 2026" [CITED: supabase docs via search; MEDIUM] | Add a key-mode assertion; `@supabase/ssr` takes either as 2nd arg |
| `auth-helpers` | `@supabase/ssr` | 2024 | Use ssr only |

**Deprecated:** `@supabase/auth-helpers-*`, `middleware.ts` on Next 16.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `verifyOtp` accepts `type:'email'` for both the 6-digit code and `token_hash` from a `generateLink({type:'magiclink'})` | Pattern 3 | Login fails; fall back to `type:'magiclink'`; spike on branch in Wave 0 |
| A2 | `auth.sessions.created_at` is stable across refresh-token rotation and `session_id` is present in `getClaims()` claims | Pattern 4 | 30-day cap would not work; fallback signed `sv_session_start` cookie |
| A3 | `getClaims()` does not detect server-side revocation before JWT expiry (hence `getUser()` for mutations) | Anti-Patterns | Only a hardening choice; low |
| A4 | Open/click tracking is off for the Resend sending domain | Pitfall 5 | Fallback links break; check dashboard |
| A5 | `server-only` is the Next-recommended package (not re-read in docs this session) | Standard Stack | None practical |
| A6 | SPF includes `_spf.google.com` / `spf.brevo.com` are the right hosts; which services send as @sevalys.com is unknown | DNS plan | Mail from a missing sender fails SPF; confirm sending services with the owner first |
| A7 | Email signup and "confirm email" settings on the shared project (signup evidently open from user data; confirm-email state unknown) | Pitfall 1 | Defines severity of pre-account takeover; Pitfall 1 mitigation is safe either way |
| A8 | Supabase Branching is available on this org's plan (CLI `branches list` returned an empty list; 3 active projects suggests a paid org; price $0.01344/branch-hour, compute credits do not apply [CITED: search results]) | Validation | If unavailable, use the existing scratch project `ziko-migration-scratch` or a fresh free scratch project as the "branch" |
| A9 | `supabase branches create` without GitHub integration applies `supabase/migrations/*` to the new branch | Validation | If not, `supabase link --project-ref <branch>` + `supabase db push`, or `db query -f` per file |
| A10 | recherche-entreprises limit remains 7 req/s | SIRET | Low; admin-triggered, single call per invite |

## Open Questions (RESOLVED)

1. **Plan check (Supabase and Vercel).** Is the Supabase org on Pro (branching) and Vercel on Pro (cron/commercial use)? Vercel is only a STATE.md blocker for later phases (cron) but commercial-use terms apply now. Recommendation: first Wave 0 task = human check; `supabase branches create` is the empirical test; `get_cost`/`confirm_cost` is needed through the MCP route, and `create_branch` is uncallable in project-scoped MCP mode (supabase/mcp issue #285), so use the CLI. Prefer an ephemeral branch per test session (pennies) over a persistent one (~$9.70/month).
   **RESOLVED:** plan 10-07 Task 3 step 1 (`supabase branches create` is the empirical test; if branching is unavailable it STOPS with a checkpoint:decision: enable branching/Pro, dedicated free scratch project, or pause; never a silent fallback). Vercel commercial-use terms are an existing STATE.md blocker for later phases, not a phase 10 gate.
2. **Auth settings of the shared project** (signup enabled, confirm-email, OTP expiry, rate limits): read-only look in the dashboard by the owner; determines the "valable X" copy and Pitfall 1 severity.
   **RESOLVED:** auth settings are read-only for this project and never patched. OTP expiry is read in plan 10-04 Task 1 (Management API `mailer_otp_exp`, else "unknown" and the email says "durée limitée"), confirmed by the owner in plan 10-13 Task 2 and set as `SV_OTP_EXPIRY_MINUTES`. Signup stays enabled on the shared project (Ziko/Gecko need it); plan 10-07 `selfsignup.rls.test.ts` proves a self-registered user has no role and reads zero sv_* rows, and login issuance never uses Supabase templates (D-06 amendment), so Pitfall 1 does not apply.
3. **Who else sends as `@sevalys.com`** (Google Workspace, Brevo, Resend)? Needed before writing the root SPF.
   **RESOLVED:** plan 10-03 Task 2 step 1 (owner lists the senders; the single root SPF keeps only those includes; DMARC edited in place keeping the Brevo rua).
4. **Is `contact@sevalys.com` used as a Ziko/RH/Gecko login?** It exists in `auth.users` (not a Gecko admin). Making it an `sv_admin` is safe for isolation, but if that email has a password and is used elsewhere nothing changes for those apps. Confirm with owner.
   **RESOLVED:** owner answers in plan 10-03 Task 2 (recorded in SUMMARY) and re-confirms at the prod DDL gate in plan 10-12 Task 2. Isolation does not depend on the answer: the admin seed (D-05) promotes only that existing account by explicit owner decision, while client invitations refuse any address that already exists in the shared `auth.users` (plan 10-09 `existing_account`, never reused or deleted).
5. **Admin lockout/recovery**: only one admin. Recommendation: allow a second admin row via the same idempotent script; no UI.
   **RESOLVED (user decision 2026-10-02):** plan 10-09 Task 3 ships `scripts/sv-add-admin.mjs` (service_role, idempotent, refuses client members per D-04, dry-run by default without `--yes`), documented as the admin recovery path; plan 10-12 Task 3 dry-runs it read-only against prod (expects `already_admin` for contact@sevalys.com).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | everything | ✓ | Next 16.1.6 installed; npm registry reachable | — |
| Supabase CLI | branches, prod read-only inspection, migrations | ✓ | 2.116.0, logged in, project `ubxllsvanurkwkohzxau` visible, not linked (`--linked` needs `supabase link` or use `--project-ref` together with `--linked`) | update to 2.119.0 optional |
| Docker | local Supabase / pgTAP | ✗ | — | Branch (D-16) |
| Supabase Branching (plan) | D-16 | ? | `branches list` OK (empty) | scratch project |
| Resend | login mail | ✓ (key in `.env.local`) | domain verification unconfirmed | — |
| `dig` | D-20 (as worded) | ✗ (Windows) | `nslookup` works, `node dns` works | use nslookup/Node |
| Cloudflare DNS access | FOUND-07 | human step | NS = odin/romina.ns.cloudflare.com | — |
| Gmail inbox | D-20 header check | human step | — | — |
| recherche-entreprises API | D-02 | ✓ | HTTP 200, 10 rapid calls OK | manual company entry |
| slopcheck | package audit | ✓ (installed via pip) | use `scan --pkg npm` | — |

**Missing with no fallback:** none (Docker absent but branch is the chosen path).
**Missing with fallback:** Docker, `dig`.

## Validation Architecture

> `workflow.nyquist_validation` absent from `.planning/config.json` → treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (`environment: 'node'`, `include: ['src/**/*.test.ts']`, alias `@`) |
| Config file | `vitest.config.ts` (unit/static) + NEW `vitest.rls.config.ts` (include `tests/rls/**/*.rls.test.ts`, `testTimeout` 30000, `fileParallelism: false`) |
| Quick run command | `npm test` (static + unit only; never touches Supabase) |
| Full suite command | `npm test && npx vitest run -c vitest.rls.config.ts` (needs `SV_TEST_*` env, branch up) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Code email built with 6-digit code + fallback link + FR text; throttle returns identical message for invited/unknown; verify flow redirect by role | unit (mocked supabase/resend) + RLS-suite e2e on branch | `npx vitest run src/lib/server/auth` ; branch: `-c vitest.rls.config.ts auth.rls` | ❌ Wave 0 |
| FOUND-02 | Self-registered user (signUp via publishable key) has zero rows in all `sv_*`; `requestCode` for unknown email sends no mail and responds identically | RLS integration + unit | `-c vitest.rls.config.ts selfsignup` | ❌ Wave 0 |
| FOUND-03 | Migration lint: every `create table public.sv_*` has `enable row level security` + `revoke all` in same file; every `sv_*` function revoked from public/anon; no `user_metadata`/`app_metadata` in policies; views `security_invoker` | static (reads `supabase/migrations/*.sql`) | `npx vitest run src/lib/migrationLint.test.ts` | ❌ Wave 0 |
| FOUND-03 | Exclusivity: insert admin that is client member (and reverse) raises | RLS integration | `-c vitest.rls.config.ts roles.rls` | ❌ Wave 0 |
| FOUND-04 | Client A cannot read B's `sv_clients`/members; A reads own (positive control); anon gets 401/empty/permission denied on every `sv_*`; plain Gecko-authenticated user and Gecko admin read zero `sv_*` rows and cannot write; client cannot read `sv_admins` of others, cannot insert/update/delete anything; sv admin cannot read gecko admin-only data (reservations) | RLS integration on branch | `-c vitest.rls.config.ts isolation.rls` | ❌ Wave 0 |
| FOUND-04 | "Fails if weakened": mutation canary: apply `create policy ... using (true)` / drop RLS on the branch, rerun, assert RED, then restore | scripted manual-once (`scripts/rls-canary.mjs` via `supabase db query`) documented in plan verification | `node scripts/rls-canary.mjs` | ❌ Wave 0 |
| FOUND-05 | Private layouts export `robots.index=false`; sitemap/llms/robots exclude prefixes; no forbidden imports in private zones; `proxy.ts` matcher literal equals `PRIVATE_PREFIXES`; `ClientProviders` renders null on private paths (unit with mocked `usePathname`) | static + unit | `npx vitest run src/lib/priceScope.test.ts src/app/sitemap.test.ts src/app/privateShells.test.ts` | ❌ Wave 0 |
| FOUND-06 | Zone constants, boundary tests (Section "No-price guard scoping"); existing guards still green | static | `npx vitest run src/lib/priceScope.test.ts` + full `npm test` | ❌ Wave 0 |
| FOUND-07 | `scripts/verify-email-dns.mjs` resolves DKIM/SPF/DMARC and prints pass/fail; Resend domain status; human Gmail header check recorded in a VERIFICATION note | script + manual-only (justified: needs real inbox) | `node scripts/verify-email-dns.mjs` | ❌ Wave 0 |
| D-18 | Env key-mode assertion (`env.ts`): publishable+secret or legacy+legacy, never mixed; service_role module imports `server-only` | unit/static | `npx vitest run src/lib/supabase/env.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (static/unit, seconds, no network)
- **Per wave merge:** `npm test` + RLS suite on a fresh branch (`SV_TEST_ALLOW=1`)
- **Phase gate:** full suite green, mutation canary demonstrated RED once, Supabase security advisor clean on branch then on prod after apply, `npm run build` + `npm run lint`, DNS script + Gmail header evidence, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/rls/{setup,helpers}.ts`, `vitest.rls.config.ts`, `tests/rls/isolation.rls.test.ts`, `roles.rls.test.ts`, `selfsignup.rls.test.ts`, `auth.rls.test.ts`
- [ ] `src/lib/migrationLint.test.ts`, `src/lib/priceScope.test.ts`, `src/app/privateShells.test.ts`, `src/lib/supabase/env.test.ts`, throttle/login-email unit tests
- [ ] `scripts/rls-canary.mjs`, `scripts/verify-email-dns.mjs`
- [ ] Spike (first plan): on a branch confirm A1, A2, A9, `generateLink` return shape, and that `tests` can create/sign in/delete users
- [ ] Framework install: none (Vitest present)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Email OTP via Supabase Auth, server-gated; no passwords for portal users; per-email and per-IP throttle; generic responses |
| V3 Session Management | yes | `@supabase/ssr` httpOnly-capable cookies, refresh in proxy, 30-day server-side cap from `auth.sessions`, `signOut` action, `getUser()` for mutations |
| V4 Access Control | yes | Role tables + RLS + DAL checks in every page/action; revoke-then-grant; exclusivity triggers |
| V5 Input Validation | yes | zod (email, 6-digit code, 14-digit SIRET, name length); `escapeHtml` in email HTML |
| V6 Cryptography | yes | No hand-rolled crypto; Supabase OTP; IP hashing with `node:crypto` sha256 (existing pattern) for throttle keys |
| V8 Data Protection | yes | Minimise SIRET payload (no `dirigeants`), no PII to PostHog on private routes |
| V13/V14 Config | yes | Env key-mode assertion, `server-only`, security headers/robots, advisor run |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant read (client A reads B) | Information disclosure | RLS `client_id in (select sv_private.client_ids())`, tested A vs B |
| Ambient "authenticated" privilege from other apps' users | Elevation of privilege | No policy keyed on `authenticated` alone; role tables |
| Pre-account takeover via open signup | Spoofing | Create fresh passwordless user at invite; reject/recreate pre-existing never-signed-in users |
| Email enumeration | Information disclosure | Identical response, `after()` send, throttle |
| OTP brute force / email bombing | DoS / Spoofing | Supabase verifyOtp limits + own throttle (per email hash and IP hash, DB fn) |
| Magic-link prefetch burn | Tampering/DoS | Code primary; interstitial confirm page |
| service_role in client bundle | Elevation | `server-only` module + static test |
| Self-assigned admin | Elevation | No insert grant/policy on `sv_admins`; seed by migration/script only; role never from `user_metadata` |
| Stale session beyond 30 d | Elevation | DAL age check from `auth.sessions` |
| Open redirect via `next` param | Tampering | Allow only relative paths beginning with `/espace-client` or `/admin` |
| Mail spoofing of sevalys.com | Spoofing | SPF/DKIM/DMARC (FOUND-07) |
| SECURITY DEFINER function abuse | Elevation | `set search_path = ''`, non-exposed schema, revoke from public/anon |

## Sources

### Primary (HIGH confidence)
- Live inspection 2026-10-01 (read-only via Supabase CLI `db query --linked`): `pg_policies`, `pg_default_acl`, `information_schema`, `auth.users` counts, `supabase_migrations.schema_migrations`, `pg_extension`, `cron.job`
- Live DNS (nslookup via 8.8.8.8) for sevalys.com; live HTTP calls to recherche-entreprises.api.gouv.fr
- nextjs.org/docs/app/api-reference/file-conventions/proxy (v16.3.8 docs): proxy.ts location, matcher constants, Node runtime, Server Function note
- supabase.com/docs/guides/auth/server-side/nextjs: `proxy.ts` on Next 16, `getClaims`, publishable key
- supabase.com/docs/guides/auth/passwordless-login/auth-email-otp, `/auth/sessions`, `/auth/auth-smtp`, `/database/postgres/row-level-security`, `reference/javascript/auth-admin-generatelink`
- resend.com/docs/send-with-supabase-smtp, resend.com/docs/dashboard/domains/dmarc
- npm registry: `@supabase/ssr` 0.12.7 + peer deps, `supabase-js` 2.117.2; repo files listed in CONTEXT

### Secondary (MEDIUM confidence)
- Web search: Supabase branching price $0.01344/branch/hour, Pro plan, compute credits do not apply; MCP `create_branch` needs `confirm_cost`, uncallable project-scoped (supabase/mcp #285)
- Web search: recherche-entreprises 7 req/s, 429 + Retry-After; data.gouv.fr dataservice page
- Web search: `@supabase/ssr` forces cookie maxAge 400 days (supabase/ssr issue #40)

### Tertiary (LOW confidence)
- Behaviour of `signInWithOtp` picking Confirm-signup vs Magic-Link template for existing users (GitHub discussions): irrelevant once `generateLink` + own mail is used
- Provider identity of `*.rmta.net` return-path

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, official docs + registry
- Architecture: MEDIUM-HIGH, patterns documented; A1/A2/A9 need a one-hour spike
- Shared-DB findings (privileges, policies, drift, user counts): HIGH, measured live
- Pitfalls: HIGH for shared-project ones, MEDIUM for Supabase API behaviours
- DNS/Resend: HIGH on observed records, MEDIUM on target SPF includes

**Research date:** 2026-10-01
**Valid until:** 2026-10-31 (Supabase key deprecation and `@supabase/ssr` move quickly; re-check versions at plan execution)
