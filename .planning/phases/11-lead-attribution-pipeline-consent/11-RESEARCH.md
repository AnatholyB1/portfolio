# Phase 11: Lead attribution, pipeline & consent - Research

**Researched:** 2026-10-02
**Domain:** Server-side attribution capture (Next.js 16 proxy), Postgres/Supabase lead schema with immutable journal and PII tombstone, CNIL consent banner, PostHog consent gating, admin pipeline/funnel
**Confidence:** MEDIUM (code and library behaviour HIGH; CNIL interpretation MEDIUM-LOW, see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bandeau de consentement et PostHog**
- **D-01:** Avant accord, PostHog tourne **sans cookie ni localStorage** (persistance en mémoire, autocapture désactivée) ; après « Accepter » il passe en persistance complète. Après « Refuser » il reste en mode mémoire. Ce choix est un compromis assumé : la position CNIL sur la mesure d'audience sans cookie est à vérifier par la recherche (voir « Points à vérifier »).
- **D-02:** Le bandeau est une **modale centrée bloquante** : le visiteur doit choisir avant de naviguer. « Accepter » et « Refuser » ont la même taille et le même style (égalité stricte, LEAD-09). Tokens du design system, avec focus piégé et accessible au clavier.
- **D-03:** Le choix est mémorisé **13 mois** (cookie de choix). Un lien « Gérer les cookies » en pied de page rouvre la modale à tout moment.
- **D-04:** Chaque choix est journalisé (date, choix, version du texte, identifiant anonyme aléatoire porté par le cookie de choix, IP hachée comme `ip_hash` existant) via route serveur. **À la soumission d'un formulaire, le dernier choix est rattaché au lead** (preuve plus solide).
- **D-05:** Aucune balise publicitaire ni identifiant de clic (gclid, fbclid, ttclid) n'est chargé ou stocké avant accord (LEAD-01, LEAD-09).

**Capture de la source**
- **D-06:** `proxy.ts` lit les paramètres à l'arrivée et pose un **cookie first-party `sv_attr`** (httpOnly, 30 jours) ; la route serveur le relit à la soumission. Aucun transport par le payload client (falsifiable, perdu à la fermeture d'onglet).
- **D-07:** **UTM seuls et référent avant accord**, au titre de donnée de fonctionnement du lead écrite côté serveur ; les identifiants de clic ne sont ajoutés qu'avec consentement. Tension à noter : D-02 impose le choix avant navigation, mais l'attribution doit rester correcte si le visiteur arrive, choisit, puis soumet.
- **D-08:** Premier contact = **écriture unique** (jamais écrasé). Dernier contact = remplacé à **chaque arrivée avec UTM ou référent externe** (ni direct, ni navigation interne), organique compris.
- **D-09:** Validation par **liste blanche** : `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`, `ttclid` ; longueur max 200 caractères ; normalisation en minuscules ; toute autre clé rejetée. Prépare la convention UTM de la phase 19.
- **D-10:** Page d'atterrissage et référent sont stockés avec chaque jeu (premier / dernier contact).

**Leads, doublons, effacement**
- **D-11:** Modèle : **`sv_leads`** (un par prospect : source figée, statut, jeu premier/dernier contact) + **`sv_lead_contacts`** (un par soumission : réponses du simulateur ou message du formulaire). `lead_events` (journal immuable, append-only) référence le lead.
- **D-12:** Doublon = **même e-mail ou même téléphone normalisés dans les 9 mois** : un contact s'ajoute au lead existant, la source du lead ne change pas, le dernier contact est mis à jour, et l'événement garde la source de cette arrivée. **Une notification admin « lead revenu »** est émise (badge dans la liste et/ou e-mail — format laissé à Claude).
- **D-13:** Après 9 mois, le même prospect crée un **nouveau lead lié à l'ancien** (lien « lead précédent », nouvelle source figée, ancien lead conservé pour l'historique).
- **D-14:** Correction de source : admin seulement, **motif obligatoire**, journalisée dans `lead_events` (LEAD-02).
- **D-15:** Effacement RGPD par **tombstone** : les données personnelles sont masquées ou supprimées (table PII séparée effaçable ou champs remplacés), les `lead_events` et la source restent sans identité, de sorte que l'entonnoir reste juste. Action admin avec motif. Les `lead_events` ne sont ni modifiables ni supprimables (LEAD-03).
- **D-16:** Les `prospects` existants sont migrés ; la purge de 12 mois est réécrite pour épargner les clients convertis et les données comptables (LEAD-06). Table de rétention unique à fixer (blocker STATE.md : purge prospects 12 mois, dédoublonnage 9 mois, factures 10 ans, effacement).
- **D-17:** Le simulateur et le formulaire de contact alimentent le pipeline **sans modifier l'ordre actuel des protections anti-spam** (LEAD-05). Le formulaire de contact n'a pas de téléphone : le doublon se fait alors sur l'e-mail seul.

**Pipeline et entonnoir admin**
- **D-18:** Statuts, dans l'ordre : **Nouveau → Qualifié → RDV → Devis envoyé → Signé**, plus **Perdu**. « Devis envoyé » ne s'active réellement qu'avec la phase 13 ; le statut existe dès maintenant et se pose à la main.
- **D-19:** Vue admin = **tableau filtrable** (statut, source) avec **pastille de statut modifiable en un geste** ; pas de kanban. Marquer « Perdu » demande un **motif choisi dans une liste fermée** avec champ note optionnel (ex. Hors budget, A choisi un concurrent, Sans réponse, Hors cible, Projet abandonné, Autre).
- **D-20:** Entonnoir par **source + campagne + mois** : visites → simulations → leads → qualifiés → RDV → signés. Les **visites** sont des arrivées avec source enregistrées côté serveur dans une table de visites sans identifiant personnel. Le **coût par RDV** est saisi à la main par source/campagne/mois (LEAD-08).
- **D-21 (hérité des phases précédentes):** admin en français uniquement, `/admin` noindex, RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, vues en `security_invoker`.

### Claude's Discretion
- Structure exacte des tables et colonnes, noms de fonctions SQL, découpage des plans.
- Format de la notification « lead revenu » (badge, e-mail ou les deux).
- Texte exact du bandeau et de la politique (à faire relire), taille de l'identifiant anonyme.
- Hachage chaîné ou simple du journal `lead_events` (la recherche proposait « hash-chained » ; seule l'immuabilité est exigée par LEAD-03).
- Liste exacte des motifs de perte, au-delà des exemples ci-dessus.

### Deferred Ideas (OUT OF SCOPE)
- Envoi serveur des conversions Meta CAPI / Google et audiences de relance (ADS-04, ADS-05) — v2 après la phase 19.
- Kanban du pipeline — non retenu pour la phase 11, à reconsidérer si le volume de leads le justifie.
- Convention UTM documentée et taxonomie d'événements avec `event_id` — phase 19 (la liste blanche de D-09 la prépare).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAD-01 | Chaque arrivée avec paramètres enregistre côté serveur UTM, click ids (si consentement), landing, référent, en deux jeux | Section "Attribution capture" (proxy branch, `sv_attr_*` cookies, whitelist parser, click-id gating + reload trick), `sv_visit_counts` |
| LEAD-02 | Source figée à la création ; correction admin avec motif journalisé | `sv_leads.source_*` set only by `sv_ingest_lead`; `sv_correct_lead_source` RPC + `source_corrected` event; no UPDATE path for authenticated |
| LEAD-03 | `lead_events` append-only + anonymisation possible | Immutability triggers + revoke; PII only in `sv_lead_contacts`/`sv_lead_notes`; `sv_erase_lead` tombstone function |
| LEAD-04 | Doublon e-mail/téléphone 9 mois : contact ajouté, source inchangée | `sv_ingest_lead` RPC with advisory lock, normalisers, return-lead flag |
| LEAD-05 | Simulateur + contact alimentent le pipeline sans casser l'ordre anti-spam | Route integration order table; contact route currently has NO spam guard (finding) |
| LEAD-06 | `prospects` migrés, purge 12 mois réécrite | Backfill SQL, `sv_purge_leads()` + `cron.schedule`, retention table |
| LEAD-07 | Liste, pipeline par statut, changement en un geste, motif de perte | `sv_set_lead_status` RPC, admin server actions pattern, table UI |
| LEAD-08 | Entonnoir par source/campagne + coût par RDV manuel | `sv_funnel_v` (security_invoker), `sv_acquisition_costs` |
| LEAD-09 | Bandeau Accepter/Refuser à égalité, journal, aucune balise pub avant accord | Native `<dialog>` modal, `/api/consent`, `sv_consent_log`, PostHog `buildPostHogConfig(consent)` |
</phase_requirements>

## Summary

The phase is mostly well-trodden Next.js/Supabase work on top of the Phase 10 foundation (`sv_*` tables, `sv_private` helpers, migration linter, RLS suite on a Supabase branch, `requireAdmin()` + service_role server actions). The architecture that fits the codebase best: **all writes go through `SECURITY DEFINER` RPCs callable only by `service_role`** (dedupe needs atomicity, the journal must be written in the same transaction as the lead), reads for the admin go through the RLS client with `sv_private.is_admin()` policies, and the funnel is a `security_invoker` view. The existing migration linter (`src/lib/migrationLint.test.ts`) already enforces RLS, revoke, `search_path = ''`, `security_invoker`, and "no write grant to anon/authenticated" on every `sv_*` object, so naming the journal `sv_lead_events` (not bare `lead_events`) puts it under that lint and avoids collisions in the project shared with Gecko.

The riskiest part is not technical, it is legal: **the CNIL does not support D-07 as written.** The audience-measurement exemption covers anonymous statistics for the publisher's own account only; measuring the performance of acquisition channels/ad campaigns is explicitly outside it, and Matomo's CNIL-exemption mode discards UTM values entirely. A first-party `sv_attr` cookie holding UTM/referrer is therefore, on a strict reading of ePrivacy art. 82 (Loi Informatique et Libertés), consent-requiring. The project's own earlier research (PITFALLS #5) reached the same conclusion ("persist a first-touch cookie only after consent"). Recommendation: implement D-06/D-07 as locked but behind a single constant (`ATTR_COOKIE_BEFORE_CONSENT`) so the owner can flip to the strict variant with a one-line change, record the decision as an explicit owner-confirmed risk, and make the **server-side anonymous visit counters** (no cookie, no identifier, no IP) the pre-consent measurement, which are safe.

PostHog: `persistence: 'memory'` and a runtime switch via `posthog.set_config({ persistence: 'localStorage+cookie' })` are verified in the installed `posthog-js@1.396.6` source (`update_config` re-creates the storage and re-saves the in-memory props). Pre-consent PostHog is a CNIL grey zone (not on CNIL's evaluated list as far as found; exemption conditions are strict), so ship it hardened (no autocapture, no replay, `ip: false`, `person_profiles: 'never'` pre-consent) and keep an escape hatch constant to fully opt out on Refuse.

**Primary recommendation:** Build one migration set (`sv_leads`, `sv_lead_contacts`, `sv_lead_events`, `sv_lead_notes`, `sv_visit_counts`, `sv_consent_versions`, `sv_consent_log`, `sv_acquisition_costs`, `sv_funnel_v`, RPCs, tombstone, purge cron) with RPC-only writes, a pure `src/lib/attribution/` module (whitelist parser, normalisers, classifier) used by both `proxy.ts` and the routes, and a native-`<dialog>` consent component whose state drives a pure `buildPostHogConfig()`; extend the RLS suite and migration linter in the same plan as each table.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Parse/validate UTM + referrer, set `sv_attr_*` cookies | Frontend Server (proxy.ts, Node runtime) | — | D-06: server-side, not client-forgeable; runs before render and cache |
| Anonymous visit counters | Frontend Server (proxy → RPC) | Database | No identifier; counter upsert by RPC |
| Read attribution at submission | API / Backend (route handlers) | — | Reads httpOnly cookie, re-validates with same whitelist (never trust cookie) |
| Spam guard, validation, IP hash | API / Backend | — | Unchanged order (LEAD-05) |
| Dedupe, lead/contact/event creation | Database (`sv_ingest_lead` RPC) | API | Atomicity + advisory lock; single transaction with journal |
| Immutability of journal | Database (triggers + revoke) | — | Must hold even for service_role bugs |
| Tombstone / purge | Database (SECURITY DEFINER fn + pg_cron) | API (admin action) | Retention must run without the app |
| Consent modal UI + state | Browser / Client | — | Needs focus trap, cookie read; must NOT make root layout dynamic |
| Consent choice record | API (`/api/consent`) → Database | Browser (cookie read) | Server authoritative for log + id; cookie readable by JS |
| PostHog init/switch | Browser / Client | — | Library is browser-only |
| Admin list/pipeline/funnel | Frontend Server (RSC) | Database (RLS + view) | Reads via RLS client; writes via server actions after `requireAdmin()` |

## Standard Stack

### Core (all already installed; no new dependency required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | `proxy.ts` (Node runtime), route handlers, server actions | Already in use; proxy docs verified [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy] |
| @supabase/supabase-js | ^2.117.2 | RPC calls via `createSupabaseAdminClient()` | Existing pattern (`src/lib/supabase/admin.ts`, `throttle.ts`) |
| zod | ^4.6.5 | Whitelist/consent payload validation | Already used by `prospects-schema.ts` |
| posthog-js | ^1.396.6 (installed 1.396.6) | Consent-gated analytics | Runtime persistence switch verified in installed source [VERIFIED: node_modules/posthog-js/dist/module.js `update_config`] |
| vitest | ^4.1.11 | Unit + RLS suites | Existing configs `vitest.config.ts`, `vitest.rls.config.ts` |
| Postgres / pg_cron | Supabase | RPCs, triggers, cron | pg_cron already created by the prospects migration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto (`createHmac`, `randomUUID`) | built-in | Keyed IP hash, anonymous consent id | In `/api/consent` and route handlers |
| Native `<dialog>` + `showModal()` | browser | Blocking modal with built-in focus trap and inert background | Consent modal; no focus-trap library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | `react-aria`/`radix` dialog | Extra dependency for something the platform does; not worth it |
| Hand phone normaliser | `libphonenumber-js` | Only needed for dedupe key; FR/E.164-style digits normaliser is enough. Adopt libphonenumber only if international numbers become common |
| PostHog `cookieless_mode: 'on_reject'` | `persistence: 'memory'` (locked D-01) | `cookieless_mode` needs a project-level setting and server-side hash; D-01 locks memory. Mention only as fallback |

**Installation:** none. **Version verification:** `posthog-js` 1.396.6 confirmed from `node_modules/posthog-js/package.json`; no new packages are recommended, so slopcheck is not applicable.

## Package Legitimacy Audit

No external package is added by this phase. All libraries above are already in `package.json` and `package-lock.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Visitor navigation (document request)
  │
  ▼
proxy.ts ── private prefixes? ──yes──► existing updateSession + gate (unchanged)
  │ no (public page)
  ├─ skip: non-GET, prefetch/RSC (Sec-Fetch-Dest != document), bots, non-canonical host (previews), sb-* auth cookie
  ├─ parseArrival(url, referer) ──► whitelist(8 keys, ≤200, lowercase) + external referrer (origin+path)
  ├─ no params & no external referrer ──► pass through (direct / internal)
  └─ has params:
       ├─ read consent cookie sv_consent → click ids kept only if choice = accepted
       ├─ Set-Cookie sv_attr_ft (only if absent)  sv_attr_lt (always overwritten)   httpOnly, 30 d
       └─ waitUntil: RPC sv_record_visit(utm_source, utm_medium, utm_campaign, landing_path)  [no id, no IP]

Consent modal (client, <dialog>)
  ├─ reads cookie sv_consent (non-httpOnly) ── none/expired/old version ──► showModal()
  └─ click Accepter/Refuser ──► POST /api/consent ──► throttle ─► sv_consent_log insert ─► Set-Cookie sv_consent (13 mo)
        ├─ PostHog: set_config(memory ↔ localStorage+cookie, autocapture)
        └─ if click ids in current URL and accepted ──► location.reload() (proxy now stores them)

Form submit
  Wizard ──► POST /api/simulateur ─┐   ContactSection ──► POST /api/contact ─┐
     1 json parse  2 isSpamSubmission (silent ok)  3 zod  4 ip hash          │ (contact: new throttle+validation)
     5 read sv_attr_* + sv_consent cookies (re-validate)                     │
     6 supabase.rpc('sv_ingest_lead', …)  ◄──────────────────────────────────┘
          └─ DB tx: advisory lock(email/phone key) → find lead ≤9 mo → insert/append
                    sv_leads | sv_lead_contacts | sv_lead_events(lead_created/contact_added) → {lead_id,is_return}
     7 Resend notification (subject/line "lead revenu" if is_return)

Admin (/admin/leads, /admin/leads/pipeline?, /admin/entonnoir)
  RSC reads via RLS client (is_admin) ──► sv_leads_admin_v / sv_funnel_v (security_invoker)
  Server actions: requireAdmin() ─► service_role RPC sv_set_lead_status | sv_correct_lead_source | sv_erase_lead | upsert cost

pg_cron daily ──► sv_private.purge_leads() ──► sv_erase_lead(system) for stale non-converted leads; purge visit counts/consent log by retention
```

### Recommended Project Structure
```
src/
├── proxy.ts                         # branches: private (existing) | public (attribution)
├── lib/attribution/
│   ├── params.ts                    # ALLOWED_KEYS, parseQuery(), parseReferrer(), normalise
│   ├── touch.ts                     # Touch type, classifyChannel(), mergeFirst/Last (pure)
│   ├── cookie.ts                    # encode/decode sv_attr_ft / sv_attr_lt, size guard
│   └── *.test.ts
├── lib/consent/
│   ├── constants.ts                 # CONSENT_VERSION, COOKIE names, 13-month maxAge, ATTR_COOKIE_BEFORE_CONSENT
│   ├── state.ts                     # parse/serialise sv_consent, needsPrompt() (pure)
│   ├── posthogConfig.ts             # buildPostHogConfig(choice) (pure)
│   └── text.ts                      # versioned banner copy (fr; en/th via translations if chosen)
├── lib/server/leads/
│   ├── ingest.ts                    # server-only: normalise + rpc('sv_ingest_lead')
│   ├── normalise.ts                 # normaliseEmail, normalisePhone (pure, tested)
│   ├── admin.ts                     # server-only: status/source/erase/cost RPC wrappers
│   └── ipHash.ts                    # HMAC IP hash (server-only)
├── app/api/consent/route.ts
├── app/api/simulateur/route.ts      # integration (order preserved)
├── app/api/contact/route.ts         # integration
├── app/admin/leads/…  app/admin/entonnoir/…
├── components/consent/ConsentDialog.tsx, ManageCookiesLink.tsx
└── components/analytics/PostHogProvider.tsx   # consent-aware
supabase/migrations/
├── 2026100x000000_sv_leads_core.sql            # tables, RLS, triggers, RPC ingest
├── …_sv_leads_backfill_purge.sql               # prospects migration, purge rewrite
├── …_sv_consent_visits.sql                     # consent log, visit counts
└── …_sv_funnel_costs.sql                       # view + costs
tests/rls/leads.rls.test.ts, consent.rls.test.ts
```

### Pattern 1: RPC-only writes, SECURITY DEFINER, service_role only
**What:** Every mutation of lead data is a `public.sv_*` function (`security definer`, `set search_path = ''`, `revoke all … from public, anon, authenticated`, `grant execute … to service_role`), exactly like `sv_throttle_hit` in `20261002000000_sv_foundation.sql`. Tables grant `select` to `authenticated` (admin policy) and `select, insert` (events) or `select, insert, update` to `service_role`. The migration linter rule 2 and rule 5 then pass.
**When to use:** ingest, status change, source correction, erase, purge, visit record, consent log insert.
**Example:**
```sql
-- Source: pattern from supabase/migrations/20261002000000_sv_foundation.sql
create or replace function public.sv_ingest_lead(
  p_channel text, p_nom text, p_email text, p_phone text, p_payload jsonb,
  p_first jsonb, p_last jsonb, p_ip_hash text, p_consent jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_phone text := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');
  v_lead public.sv_leads%rowtype;
  v_new boolean := false;
begin
  -- serialise concurrent submissions for the same person
  perform pg_advisory_xact_lock(hashtextextended('sv_lead:' || v_email, 0));
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended('sv_lead:' || v_phone, 0));
  end if;
  select l.* into v_lead
  from public.sv_leads l
  join public.sv_lead_contacts c on c.lead_id = l.id
  where (c.email_norm = v_email or (v_phone is not null and c.phone_norm = v_phone))
    and l.last_contact_at > now() - interval '9 months'
    and l.erased_at is null
  order by l.last_contact_at desc limit 1;
  -- … insert lead (frozen source from p_last, else p_first, else direct) or append; insert contact; insert events
  return jsonb_build_object('lead_id', v_lead.id, 'is_return', not v_new);
end $$;
revoke all on function public.sv_ingest_lead(text,text,text,text,jsonb,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.sv_ingest_lead(text,text,text,text,jsonb,jsonb,jsonb,text,jsonb) to service_role;
```
Note: take the two advisory locks in a deterministic order (email first, then phone) to avoid deadlocks.

### Pattern 2: Immutable journal (triggers + privileges, belt and braces)
```sql
create table public.sv_lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sv_leads(id) on delete restrict,
  type text not null check (type in ('lead_created','contact_added','status_changed',
        'source_corrected','lead_linked','erased','return_acknowledged')),
  actor text not null,                    -- 'visitor' | 'system' | admin user uuid as text
  from_status text, to_status text,
  reason_code text,                       -- closed list; free text goes to sv_lead_notes
  channel text,                           -- 'simulateur' | 'contact'
  touch jsonb,                            -- {utm_source,…,landing,referrer} NO PII, NO click ids unless consented
  created_at timestamptz not null default now()
);
alter table public.sv_lead_events enable row level security;
revoke all on public.sv_lead_events from anon, authenticated, service_role;
grant select on public.sv_lead_events to authenticated;       -- + admin-only policy
grant select, insert on public.sv_lead_events to service_role;  -- no update/delete/truncate for anyone
grant usage on sequence … -- identity: service_role needs none for `generated always` inserts via definer fn

create or replace function sv_private.deny_mutation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin raise exception 'sv_immutable_table' using errcode = 'P0001'; end $$;
revoke all on function sv_private.deny_mutation() from public, anon;

create trigger sv_lead_events_no_upd_del before update or delete on public.sv_lead_events
  for each row execute function sv_private.deny_mutation();
create trigger sv_lead_events_no_truncate before truncate on public.sv_lead_events
  for each statement execute function sv_private.deny_mutation();
```
Consequences the planner must carry: (a) FK from events to leads is `on delete restrict` and **leads are never deleted, only tombstoned**; (b) test cleanup cannot delete test leads (branch is throwaway, use unique emails per run); (c) the migration linter should get a new rule: any table named `*_events` / `*_log` / `*_audit` declared immutable must have the deny trigger.

### Pattern 3: PII tombstone by table split
- `sv_leads`: no personal data (source columns, status, timestamps, `previous_lead_id`, `converted_client_id`, `erased_at`, counters, `unseen_return`). Survives erasure.
- `sv_lead_contacts`: PII (`nom`, `email`, `telephone`, `email_norm`, `phone_norm`, answers/message jsonb, `ip_hash`, consent snapshot). `sv_erase_lead` **deletes** these rows (or nulls columns) and deletes `sv_lead_notes`; sets `sv_leads.erased_at`; appends an `erased` event (reason_code closed list). Events remain; funnel stays correct because every funnel number comes from `sv_leads` columns, `sv_lead_events` and `sv_visit_counts`, never from contacts.
- Free text (loss note, correction note) lives in `sv_lead_notes(lead_id, event_id, body)`, erasable. Event rows carry only closed-list `reason_code`.
- Referrer stored as origin + path only (no query string) and landing as path + whitelisted params only: no personal data in events.

### Pattern 4: Attribution cookies and size
Worst case of D-09 (8 keys × 200 chars × 2 touch sets) plus landing and referrer exceeds the 4096-byte cookie limit [ASSUMED: RFC 6265 practical limit ~4096 bytes per cookie]. Use **two cookies**, `sv_attr_ft` (written once, never overwritten) and `sv_attr_lt` (overwritten on each qualifying arrival), each guarded by a size check that drops `utm_term`, `utm_content` first. Cookie attributes: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, `maxAge=30d`. D-06 names `sv_attr`; this is a mechanical split under the same prefix, flag to the owner in the plan. **The route re-parses the cookie through the same whitelist function; never trust cookie content.**

Rules (D-08): a request is an "arrival" only when it is a document navigation (`Sec-Fetch-Dest: document` and `Sec-Fetch-Mode: navigate`; Next RSC/prefetch fetches have dest `empty` and are skipped) AND (has any whitelisted param OR has an external, non-ignored referrer). First-touch is written on the first such arrival (consistent with LEAD-01 "arrivée avec paramètres"). Direct or internal arrivals never write.

Skip list: non-GET/HEAD; UA matching bot/preview/unfurler patterns; host differing from the canonical `NEXT_PUBLIC_SITE_URL` host (Vercel previews); requests carrying a Supabase `sb-` auth cookie (admin/client browsing); referrers on an ignore list (own domains, `checkout.stripe.com`, supabase auth callbacks).

### Pattern 5: Proxy structure and matcher
`src/proxy.ts` keeps the private branch byte-for-byte (calls `updateSession`); the new public branch must **not** call `updateSession`/`getClaims` (a Supabase round-trip on every public page would be a performance regression). Add a matcher object entry for public paths:
```ts
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy (Negative matching, missing[])
export const config = {
  matcher: [
    '/espace-client/:path*', '/espace-client', '/admin/:path*', '/admin', '/connexion', '/auth/:path*',
    {
      source: '/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```
The matcher must stay a static literal. `src/proxy.test.ts` currently asserts the exact six-entry list and "no catch-all"; it must be rewritten deliberately (private entries preserved; `/api` and assets still excluded; public pattern present). `/` is covered by the public pattern (empty path after the slash). Note overlap: `/connexion` and `/auth/*` match both the private entries and the public pattern; `proxy()` must early-return for private paths before the attribution branch.

### Pattern 6: Consent modal without hurting LCP or caching
- Use native `<dialog>` and `showModal()` inside a client component mounted in `layout.tsx` next to `ClientProviders`. `showModal()` makes the rest of the document inert and traps focus natively; intercept `cancel` (Escape) with `preventDefault()` since the choice is mandatory (D-02). Give `aria-labelledby`/`aria-describedby`; initial focus on the dialog heading (`tabIndex=-1`), not on a button, so neither choice is favoured.
- **Never call `cookies()` in the root layout or in a Server Component to decide whether to render the modal**: it would make every page dynamic and destroy static rendering. Read `document.cookie` client-side after mount (SSR renders nothing; no layout shift because `<dialog>` is top-layer).
- Do not block `/mentions-legales` (and any future cookie-policy page): the visitor must be able to read the information the banner links to. Do not render on private paths (`isPrivatePath`), consistent with `ClientProviders` and `PostHogProvider`.
- Sequence relative to `CinemaIntro` (uses `localStorage.sv_intro_seen`): first-time visitors would get intro and modal together. Planner: show the modal after the intro ends/skips (or verify in a manual pass) — this is the main Core-Value (<60 s) cost of D-02.
- Google exempts legally required cookie interstitials from the intrusive-interstitial penalty [CITED: developers.google.com/search/blog/2016/08/helping-users-easily-access-content-on]; the HTML stays fully present so crawlers see content.
- "Gérer les cookies" link: add to `Footer.tsx` (client component using `LanguageContext`); opens the same dialog through a tiny shared store (`useSyncExternalStore`) or a custom DOM event.

### Pattern 7: PostHog consent gating
Pure `buildPostHogConfig(choice: 'accepted' | 'refused' | 'pending')`:
```ts
// Source: node_modules/@posthog/types/dist/posthog-config.d.ts (persistence, ip, person_profiles…), posthog-js@1.396.6
const common = { api_host: HOST, capture_pageview: false, capture_pageleave: true,
                 respect_dnt: true, disable_session_recording: true };
pending/refused: { ...common, persistence: 'memory', autocapture: false, ip: false, person_profiles: 'never' }
accepted:        { ...common, persistence: 'localStorage+cookie', autocapture: true, ip: true, person_profiles: 'identified_only' }
```
Init once with the `pending` config; on Accept call `posthog.set_config(acceptedConfig)`. Verified in source: `set_config` → `persistence.update_config(new, old)` re-creates the storage backend when `persistence` changed and re-saves the current in-memory props, so the in-memory distinct_id/session props are carried into cookie+localStorage; `sessionPersistence` is derived from the config. After Refuse: stay in memory mode (D-01); expose `PH_CAPTURE_ON_REFUSE = true` constant — set false to call `posthog.opt_out_capturing()` instead (strict fallback). On "Gérer les cookies" → Refuse after previously Accept: call `posthog.reset()` and `set_config` back to memory so existing `ph_*` cookies/localStorage are cleared (verify manually in devtools). In memory mode each full page load creates a fresh distinct_id; SPA navigations keep it. PostHog's own docs list `persistence` values `localStorage|sessionStorage|cookie|memory|localStorage+cookie` [CITED: posthog.com/docs/libraries/js/config].

### Pattern 8: Admin pages
Follow the existing admin pattern: RSC page → `requireAdmin()` → read with the RLS client from a `security_invoker` view (`sv_leads_admin_v`: lead + latest contact + counters) → mutate via `'use server'` actions that call `requireAdmin()` first, then service_role RPC wrappers in `server-only` modules, then `revalidatePath`. Status pill: a `<form action>` per option (works without JS). "Perdu": closed list `lost_reason` check constraint (Hors budget, A choisi un concurrent, Sans réponse, Hors cible, Projet abandonné, Autre) + optional note → `sv_lead_notes`. Admin copy in French only. Add `unseen_return` badge and "lead précédent" link.

### Anti-Patterns to Avoid
- **Passing attribution in the client payload** (rejected by D-06): the Wizard and ContactSection must not send UTM.
- **Upsert on `sv_leads` for dedupe**: overwrites the frozen source. Only `sv_ingest_lead` inserts; nothing else writes `source_*`.
- **Counting funnel stages from current `status`**: a lead lost after RDV vanishes from "RDV". Use write-once `qualified_at`, `rdv_at`, `quote_sent_at`, `signed_at` columns set by `sv_set_lead_status` (a jump to `signed` fills earlier null stages so the funnel is monotone).
- **Counting simulations from contacts**: contacts are erased by tombstone. Count `contact_added`/`lead_created` events.
- **Unsalted `sha256(ip)`**: IPv4 space is 2^32, trivially reversible. For the new consent log use HMAC with a server secret (`SV_IP_HASH_SECRET`). D-04 says "comme `ip_hash` existant": keep the column format (hex), change the derivation for new tables, note it.
- **Canonicalising Gmail addresses** (dots/plus): the permanent test fixture uses plus-addressing (`anatholyb+sv-test@gmail.com`) and distinct people can share nothing here. Normalise only trim + lowercase.
- **Calling `cookies()` in root layout** (kills static rendering).
- **Clearing the consent on `SameSite`/domain changes**: set the consent cookie with `path=/`, `sameSite=lax`, same attributes every time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap / inert background | JS focus trap | Native `<dialog>.showModal()` | Platform-provided, accessible, zero dependency |
| Concurrency-safe dedupe | App-level "select then insert" | `pg_advisory_xact_lock` inside the RPC | Two simultaneous submissions would create two leads |
| Rate limiting | New limiter | Existing `sv_throttle_hit` RPC via `hitThrottle()` | Already built, keyed by hashes |
| Immutability | Application-level "we never update" | Trigger + revoke | Must hold against bugs and service_role |
| Cron scheduling | Vercel cron / route | `pg_cron` already installed | Retention must run without the app; plan tier unknown (STATE blocker) |
| Funnel aggregation | JS reduce over rows | SQL view with `security_invoker` | Linter rule 4 and correct RLS |
| Cookie signing for attribution | HMAC layer | Re-validation through the whitelist at read | Cookie is only the visitor's own claim; a forged value only mislabels their own lead |

**Key insight:** the dangerous parts (dedupe races, immutability, erasure vs journal, funnel correctness after erasure) are all database-shaped; solve them in SQL transactions and test them against the branch, keep TypeScript pure and thin.

## Runtime State Inventory

This phase migrates `prospects` and rewrites a cron job, so the audit applies to those.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `public.prospects` rows in production (count unknown; `reponses_diagnostic`, `services_recommandes` jsonb, `ip_hash` plain sha256, `consentement_rgpd`) | **Data migration**: backfill one `sv_leads` + one `sv_lead_contacts` + `lead_created` event per row, `source_kind='legacy'`, `created_at` preserved, `legacy_prospect_id` column for idempotency (`on conflict do nothing`). Keep `prospects` read-only (no drop in this phase) |
| Live service config | pg_cron job `purge-prospects-12mo` (daily 03:00 UTC) in the shared DB | **Code/SQL edit**: `cron.unschedule` guarded by existence check (`select 1 from cron.job where jobname=…`) then `cron.schedule('sv-purge-leads', …)` |
| OS-registered state | None — verified: no OS task referencing prospects (Vercel/Supabase only) | None |
| Secrets/env vars | New: `SV_IP_HASH_SECRET` (Vercel + `.env.local`); `.env.example` must document it. `SUPABASE_SERVICE_ROLE_KEY` unchanged | Add env + example entry |
| Build artifacts | `src/app/api/simulateur/route.test.ts` asserts the exact `prospects` insert keys and mocks `@/lib/supabase`; `submit.ts` header comments call the backend "unmodifiable" | Rewrite tests to the RPC; update comments |

The current route writes with the legacy `createServiceRoleClient()` from `src/lib/supabase.ts`; new code should use `createSupabaseAdminClient()` (`server-only`, key-mode assertion).

## Retention table (resolves the STATE.md blocker; owner to confirm values marked [ASSUMED])

| Data | Where | Retention | Mechanism | Basis |
|------|-------|-----------|-----------|-------|
| Lead contact PII (non-converted) | `sv_lead_contacts`, `sv_lead_notes` | 12 months after `last_contact_at` (existing project rule, D-16) | `sv_private.purge_leads()` → `sv_erase_lead('system')` | Project decision; CNIL prospect guidance is looser (3 years), so 12 months is conservative [ASSUMED] |
| Lead PII (converted: `converted_client_id` not null or status `signed`) | same | Spared by purge; follows client relationship, revisited in phases 12-15 | Purge predicate | LEAD-06 |
| Dedupe window | `sv_leads.last_contact_at` | 9 months sliding from last contact [ASSUMED: sliding vs from creation] | In `sv_ingest_lead` | D-12/D-13 |
| `sv_lead_events`, `sv_leads` (anonymised) | — | Indefinite, contain no personal data | Never deleted | Funnel integrity, LEAD-03 |
| Accounting documents (invoices, quotes) | later phases | 10 years | Not touched here; purge must never reference them | Code de commerce (accounting retention) [ASSUMED: accountant review already flagged in STATE] |
| Visit counters | `sv_visit_counts` | 25 months | purge in same cron | CNIL audience-measurement ceiling [CITED: cnil.fr audience measurement page] |
| Consent log | `sv_consent_log` | 25 months after row [ASSUMED] | same cron | Proof of consent; owner to confirm |
| Consent snapshot attached to lead contact | `sv_lead_contacts` | Dies with contact PII | tombstone | D-04 |
| Consent cookie | browser | 13 months max (D-03). CNIL recommends re-asking about every 6 months [CITED: cnil.fr FAQ cookies]; keep constant `CONSENT_MAX_AGE_DAYS` | cookie | D-03 |
| Attribution cookies | browser | 30 days | cookie | D-06 |

## Common Pitfalls

### Pitfall 1: Pre-consent `sv_attr` cookie is not covered by the CNIL exemption
**What goes wrong:** An attribution cookie storing UTM/referrer before consent is a non-exempt tracer under art. 82.
**Why:** The exemption covers anonymous audience statistics for the publisher; "mesure des canaux d'acquisition / performance de campagnes" is excluded; Matomo's CNIL mode discards UTM values and keeps only the referrer host [CITED: matomo.org CNIL exemption FAQ].
**How to avoid:** Implement behind `ATTR_COOKIE_BEFORE_CONSENT = true` (D-07 as locked). Strict variant (`false`): pre-consent, write only the anonymous `sv_visit_counts`; set `sv_attr_*` only after Accept; leads from refusers get source `direct/unknown` unless they arrive and submit in one request. Owner must confirm; log in Assumptions (A1).
**Warning signs:** `Set-Cookie: sv_attr_*` on a first request without `sv_consent`.

### Pitfall 2: Click ids lost when the visitor accepts on a landing URL
**What goes wrong:** Visitor lands with `?gclid=…`, modal blocks, they accept, the proxy already ran without consent, the gclid is never stored.
**How to avoid:** After a successful Accept, if the current `location.search` contains a click-id key, call `location.reload()`; the proxy now sees the consent cookie and stores them. No client transport of values.

### Pitfall 3: Contact route has no spam guard
**What goes wrong:** `/api/contact` (verified) has only presence checks and `email.includes('@')`. Writing into `sv_leads` opens a DB-flooding vector that previously only cost Resend emails.
**How to avoid:** Without altering the simulator order (which is untouched), add to the contact route, before any write: JSON parse → honeypot + `formRenderedAt` check using the existing `isSpamSubmission` (add the two hidden fields to `ContactSection`) with the same byte-identical `{ok:true}` silent reject → throttle by hashed IP via `hitThrottle` → validation (zod, length caps) → ingest → emails. Ingest on the contact route is **best-effort** (log and continue to send emails, since the email is today's source of truth); on the simulator route it stays fatal (500 `insert_failed`) as today.

### Pitfall 4: Test fixture collisions with dedupe
**What goes wrong:** Reusing the permanent test client/email in E2E tests dedupes into the previous lead for 9 months; tests asserting "new lead" fail.
**How to avoid:** Tests use unique plus-addresses per run, or assert `is_return`. Never delete test leads (events are immutable); use the throwaway branch.

### Pitfall 5: Admin "marking" path that updates source
**What goes wrong:** A generic `update sv_leads` from an admin action rewrites `source_*` (LEAD-02).
**How to avoid:** No direct table writes by admin code; only the three RPCs. Add a trigger on `sv_leads` raising if `source_*` or `first_touch` columns change except when `current_setting('sv.allow_source_change', true) = 'on'` set locally inside `sv_correct_lead_source`.

### Pitfall 6: Proxy cost and cache side effects
**What goes wrong:** Matcher widened to all pages runs a Node function per navigation; running `updateSession` there adds Supabase latency. Setting cookies on every response could interact with CDN caching [ASSUMED: proxy runs before cache, so cached static pages still receive the Set-Cookie; verify on a Vercel preview].
**How to avoid:** Public branch does string work only; set a cookie only when an arrival qualifies; do the visit RPC in `event.waitUntil` so it never delays the response. Verify `x-vercel-cache` unchanged on a preview.

### Pitfall 7: Hash-based gotchas in the event table
`on delete cascade` on the events FK would fire the delete trigger; use `restrict`. `sv_private.deny_mutation` must exist before the trigger. `truncate` needs its own statement-level trigger.

### Pitfall 8: Mentions légales claims "adresse IP anonymisée"
`src/app/mentions-legales/page.tsx` section 5 states PostHog uses an anonymised IP. PostHog does not anonymise by default; `ip: false` (config) or the project-level "discard client IP" setting does [VERIFIED: `ip` option in @posthog/types posthog-config.d.ts; project setting ASSUMED]. Update the text with the banner and make the claim true or remove it.

### Pitfall 9: Consent text version and language
The log must reference a stored text version. The site is fr/en/th via `LanguageContext`; decide the banner is either FR-only or has per-locale versions, and store `locale` + `version` (see Open Questions).

### Pitfall 10: Simulator consent wording vs relance emails
Current label: « J'accepte que Sèvalys utilise mes réponses pour me recontacter dans le cadre de ce diagnostic. » It covers contact about this diagnostic, not a marketing sequence. B2B prospecting by email to professional addresses is opt-out under L34-5 CPCE (information at collection + easy objection in every message) [CITED via CNIL practical guidance summarised on village-justice.com / donneespersonnelles.fr; MEDIUM]; sole traders can be treated as consumers [ASSUMED]. Phase 11 sends no automated relance, so no wording change is required now; flag for MAIL-03/04 (phase 16) and have the lead store the exact consent text version at submission.

## Code Examples

### Whitelist parser (pure, shared by proxy and routes)
```ts
// Source: derived from D-08/D-09; no external dependency
export const ALLOWED_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ttclid'] as const;
export const CLICK_ID_KEYS = ['gclid','fbclid','ttclid'] as const;
export type AttrParams = Partial<Record<(typeof ALLOWED_KEYS)[number], string>>;

export function parseAttrParams(search: URLSearchParams, opts: { allowClickIds: boolean }): AttrParams {
  const out: AttrParams = {};
  for (const key of ALLOWED_KEYS) {
    if (!opts.allowClickIds && (CLICK_ID_KEYS as readonly string[]).includes(key)) continue;
    const raw = search.get(key);
    if (raw == null) continue;
    const v = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase();
    if (v.length === 0 || v.length > 200) continue;     // drop, never truncate (a cut gclid is useless)
    out[key] = v;
  }
  return out;                                           // any other key is simply ignored
}
```
Edge: `search.get` returns the first occurrence; repeated keys are ignored beyond the first.

### Referrer (external only, no query)
```ts
export function parseReferrer(referer: string | null, siteHost: string, ignored: readonly string[]): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    if (u.hostname === siteHost || u.hostname.endsWith('.' + siteHost) || ignored.includes(u.hostname)) return null;
    return (u.origin + u.pathname).slice(0, 200).toLowerCase();
  } catch { return null; }
}
```

### Normalisers
```ts
export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export function normalisePhone(p: string | undefined): string | null {
  if (!p) return null;
  let d = p.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (/^0\d{9}$/.test(d)) d = '+33' + d.slice(1);       // FR national → E.164
  return /^\+?\d{6,15}$/.test(d) ? d : null;
}
```
The same logic must exist in SQL only if backfill needs it; prefer computing keys in TS and passing them to the RPC (`p_email_norm`, `p_phone_norm`) so there is one implementation; the backfill SQL uses simple lower/trim and a regexp equivalent, covered by a test.

### Consent route skeleton
```ts
// POST /api/consent  { choice: 'accepted'|'refused', version: string }
// 1 zod  2 version ∈ known versions (sv_consent_versions)  3 hitThrottle(hashKey('consent-ip', ip), 60, 20)
// 4 anonId = existing cookie id (uuid) ?? randomUUID()  5 rpc('sv_log_consent', …, ip_hmac)  6 Set-Cookie sv_consent
// cookie value: JSON {v:version, c:'a'|'r', id:anonId, t:epochMs}; NOT httpOnly (client reads it); 13 months; Secure; SameSite=Lax; Path=/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts`, Node runtime default | Next 16.0 | `runtime` export not allowed in proxy [CITED: nextjs.org proxy docs] |
| Third-party focus-trap libs | Native `<dialog>.showModal()` | Baseline 2022 | No dependency |
| Identical Accept/Refuse buttons required | Conseil d'État (2026) accepted non-identical buttons if refusal is immediately accessible, no extra screens [CITED: freenews.fr article, July 2026; decision name not found] | 2026 | D-02's strict equality is stricter than legally necessary; keep it (safest, owner decision) |
| Audience exemption guidance | CNIL deliberation of 4 July 2025 + self-assessment tool for providers | 2025 | Conditions: anonymous stats, own account, no cross-site, cookie ≤13 months, data ≤25 months [CITED: cnil.fr/fr/mesurer-la-frequentation-de-vos-sites-web-et-de-vos-applications] |

**Deprecated/outdated:** `getSession()` server-side (project already forbids); `middleware.ts` file convention.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-07 (UTM + referrer cookie before consent) is a risk under art. 82 because attribution/campaign measurement is outside the CNIL audience exemption | Pitfall 1 | If CNIL tolerates it, no impact (we built a switch); if strict, fine exposure — owner must decide |
| A2 | Pre-consent PostHog in memory mode with `ip:false`, no autocapture, no replay is acceptable/tolerated; PostHog is not on CNIL's evaluated list | Pattern 7 | Could be judged non-exempt tracing; mitigated by `PH_CAPTURE_ON_REFUSE` and `ip:false` |
| A3 | Frozen lead source = last-touch at creation (fallback first-touch, then direct); both touch sets stored | Schema | Funnel attribution differs from a first-touch expectation; ADM-05 revenue attribution uses it |
| A4 | Dedupe window slides from `last_contact_at` rather than lead creation | Retention | Different return/new-lead boundaries |
| A5 | Funnel stage months use the stage-reached timestamp; cost per RDV matched on RDV count of the same month | Funnel | Different month grouping than owner expects |
| A6 | Consent log retention 25 months | Retention table | Proof period too short/long |
| A7 | Proxy-set cookies on cached/static Vercel responses behave normally | Pitfall 6 | Attribution missing on cached pages; verify on preview |
| A8 | 4096-byte cookie limit forces two cookies | Pattern 4 | Could be one cookie with truncation; low impact |
| A9 | PostHog project setting can discard client IPs | Pitfall 8 | Mentions-légales text could stay inaccurate |
| A10 | Sole traders may need opt-in for email prospecting | Pitfall 10 | Phase 16 wording scope |

## Open Questions

1. **Pre-consent attribution cookie (A1)**
   - Known: D-07 locked; research finds it outside CNIL exemption; project PITFALLS recommended post-consent first-touch cookie.
   - Unclear: owner's risk appetite.
   - Recommendation: plan implements the switch; add an explicit owner confirmation checkpoint in the plan (non-blocking, default = D-07).
2. **Banner i18n.** Site is fr/en/th. Recommend FR + EN + TH strings through `translations.ts` with `locale` in the log, or FR-only for a French-targeted audience. Needs owner choice; the legal text must be reviewed either way.
3. **"Coût par RDV saisi à la main" semantics.** Literal reading: admin types a cost-per-RDV per source/campaign/month. Alternative: type monthly spend and derive cost per RDV. Recommendation: store `cost_per_rdv_cents` literally (D-20), display alongside RDV count; trivial to add `spend_cents` later.
4. **Should `lead_events` be renamed `sv_lead_events`?** Recommendation yes (namespace on shared DB, linter coverage); requirement text names `lead_events`, note the deviation in the plan.
5. **Migration of existing `prospects`:** one lead per row (no merge of duplicates). Confirm acceptable given low volume.
6. **Lost-lead reason list beyond the six examples:** use the six in D-19 plus none; add later via migration.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/tests | yes | v26.4.0 | — |
| Supabase CLI | branch creation, migrations | yes | on PATH (`/c/nvm4w/nodejs/supabase`) | Supabase MCP tools |
| `.env.test.local` (RLS branch credentials) | `npm run test:rls` | no (file absent) | — | Create a Supabase branch and fill `SV_TEST_*` (Wave 0 task); RLS tests cannot run until then |
| psql | optional | no | — | Supabase SQL via CLI/MCP |
| Context7 CLI | docs | no | — | Official docs via WebFetch (used) |
| pg_cron on branch | purge job test | assumed yes (extension created in 20260920000000) | — | Test `purge_leads()` function directly; schedule only asserted statically |
| PostHog key | consent gating manual check | env `NEXT_PUBLIC_POSTHOG_KEY` unknown | — | Pure-function tests of `buildPostHogConfig` |

**Missing dependencies with no fallback:** RLS branch credentials (must be provisioned before DB tests).
**Missing with fallback:** psql, ctx7.

## Validation Architecture

(`.planning/config.json` has no `nyquist_validation: false`; section included.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 (node env) |
| Config file | `vitest.config.ts` (unit, `src/**/*.test.ts`); `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, real Supabase branch) |
| Quick run command | `npx vitest run src/lib/attribution src/lib/consent src/lib/server/leads src/proxy.test.ts src/app/api` |
| Full suite command | `npm test` and `npm run test:rls` (branch) |

No DOM test library is installed; UI contracts (equal buttons, dialog attributes, no `cookies()` in layout) are enforced with source-guard tests, the project's established pattern (`layout.test.ts`, `privateShells.test.ts`, `wizardContract.test.ts`), plus extracted pure logic. A manual checklist covers focus trap/keyboard/LCP.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | Whitelist: 8 keys only, >200 dropped, lowercase, others ignored, click ids dropped without consent | unit | `npx vitest run src/lib/attribution/params.test.ts` | Wave 0 |
| LEAD-01 | Arrival rules: direct/internal/prefetch/bot/preview/admin skipped; first-touch write-once, last-touch overwritten | unit (proxy fn with `NextRequest`) | `npx vitest run src/proxy.test.ts` | exists, rewrite |
| LEAD-01 | Click ids absent from cookies when consent not accepted | unit | `npx vitest run src/lib/attribution/cookie.test.ts` | Wave 0 |
| LEAD-02 | `source_*` immutable except via `sv_correct_lead_source`; correction needs reason; event written | RLS/DB | `npx vitest run -c vitest.rls.config.ts tests/rls/leads.rls.test.ts` | Wave 0 |
| LEAD-03 | UPDATE/DELETE/TRUNCATE on `sv_lead_events` fail for service_role, authenticated, anon | RLS/DB | same file | Wave 0 |
| LEAD-03 | `sv_erase_lead` removes PII, keeps events and funnel counts | RLS/DB | same file | Wave 0 |
| LEAD-04 | Same email (case/space) within 9 months → one lead, 2 contacts, source unchanged, `unseen_return`; 10 months → new lead with `previous_lead_id`; phone match; two concurrent calls → one lead | RLS/DB (RPC, time travel via inserting backdated `last_contact_at` with service role) | same file | Wave 0 |
| LEAD-05 | Simulator route: spam silent-reject makes zero RPC/Resend calls; order = parse → spam → zod → ingest → email; ingest failure → 500 and no email | unit (mocked) | `npx vitest run src/app/api/simulateur/route.test.ts` | exists, rewrite |
| LEAD-05 | Contact route: honeypot/too-fast silent ok, throttle, ingest best-effort, emails still sent | unit | `npx vitest run src/app/api/contact` | Wave 0 |
| LEAD-06 | Backfill idempotent; purge spares converted/signed and never touches accounting; rewritten cron name present | RLS/DB + static SQL test | `tests/rls/leads.rls.test.ts`, `src/lib/migrationLint.test.ts` | Wave 0 |
| LEAD-07 | Status RPC: valid transitions, stage timestamps monotone, lost requires closed-list reason; non-admin cannot read leads; admin actions call `requireAdmin` first | RLS/DB + unit | `tests/rls/leads.rls.test.ts`, `src/app/admin/leads/actions.test.ts` | Wave 0 |
| LEAD-08 | `sv_funnel_v` counts per source/campaign/month; erased lead still counted; view is `security_invoker`; client/anon sees nothing | RLS/DB + lint | same + migrationLint | Wave 0 |
| LEAD-09 | `buildPostHogConfig`: pending/refused = memory, autocapture false; accepted = cookie+localStorage | unit | `npx vitest run src/lib/consent/posthogConfig.test.ts` | Wave 0 |
| LEAD-09 | Consent route: invalid version rejected, log row written with version + hmac ip, cookie 13 months, throttle | unit + RLS | `src/app/api/consent/route.test.ts`, `tests/rls/consent.rls.test.ts` | Wave 0 |
| LEAD-09 | Source guard: Accepter and Refuser share the same className/tag; dialog has aria-labelledby; `cancel` prevented; root layout does not import `cookies` | unit (source guard) | `npx vitest run src/components/consent/consentContract.test.ts` | Wave 0 |
| LEAD-09 | No ad tag/click id before consent: grep guard for `fbevents`, `googletagmanager`, `gtag(` in `src` | unit (source guard) | same | Wave 0 |

### Sampling Rate
- **Per task commit:** quick run command above (< 30 s).
- **Per wave merge:** `npm test` + `npm run test:rls` on the branch + `npm run lint`.
- **Phase gate:** full suites green, `rls:canary` (weaken a policy → suite goes red → restore), then `/gsd:verify-work`; manual checklist: keyboard-only pass through the modal, Lighthouse LCP/CLS on `/` unchanged within noise, devtools shows no `ph_*` cookie/localStorage before Accept, `Set-Cookie` inspection on a UTM landing.

### Wave 0 Gaps
- [ ] Provision Supabase test branch and `.env.test.local` (absent today)
- [ ] `tests/rls/helpers.ts`: add `makeLeadViaRpc()`, extend cleanup note (leads/events not deletable)
- [ ] `tests/rls/leads.rls.test.ts`, `tests/rls/consent.rls.test.ts`
- [ ] `src/lib/attribution/*.test.ts`, `src/lib/consent/*.test.ts`, `src/app/api/consent/route.test.ts`, `src/app/api/contact/route.test.ts`, `src/components/consent/consentContract.test.ts`
- [ ] Extend `migrationLint.test.ts`: rule "immutable tables have deny trigger", and keep rules 1-5 (new tables follow `sv_*`)
- [ ] Rewrite `src/proxy.test.ts` matcher expectations and `src/app/api/simulateur/route.test.ts` insert-shape tests

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (admin auth is Phase 10) | existing `requireAdmin()` |
| V3 Session Management | partial | consent/attribution cookies: `httpOnly` (attr), `Secure`, `SameSite=Lax` |
| V4 Access Control | yes | RLS `is_admin()` policies, revoke-then-grant, service_role only in `server-only`, admin actions re-check |
| V5 Input Validation | yes | zod for payloads; whitelist parser; closed-list check constraints; parameterised RPC |
| V6 Cryptography | yes | HMAC (`createHmac`) for IP hash with server secret; `randomUUID` for anon id; never custom crypto |
| V8 Data Protection | yes | PII isolated in erasable tables; no PII in events; no click ids without consent |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged `sv_attr` cookie / forged UTM | Spoofing/Tampering | Re-validate via whitelist; only affects the forger's own lead label; admin can correct with logged reason |
| Spam flooding leads (contact route has no guard) | DoS | Honeypot + timing + `sv_throttle_hit` before any write |
| Journal tampering by compromised service key | Tampering | Triggers + revoked privileges (not just app discipline); test proves service_role cannot update/delete |
| SQL injection via UTM values | Tampering | RPC parameters only; no dynamic SQL; length caps |
| Stored XSS via UTM/referrer shown in admin | Tampering | React escaping; never `dangerouslySetInnerHTML`; email notification uses `escapeHtml` (extend to new fields) |
| IP re-identification from unsalted hash | Info disclosure | HMAC with secret |
| RLS bypass through view | Elevation | `security_invoker = true` (linter rule 4) |
| Privilege confusion with shared Gecko project | Elevation | `sv_` prefix, admin policy via `sv_admins` table only (never metadata) |
| Race creating duplicate leads | Integrity | Advisory locks in the RPC |
| Open redirect / reload loop after consent | Tampering | Reload only same URL, only once (sessionStorage-free flag via cookie presence) |

## Sources

### Primary (HIGH confidence)
- Codebase: `src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/app/api/simulateur/route.ts` (+ test), `src/app/api/contact/route.ts`, `src/lib/simulateur/submit.ts`, `src/lib/prospects-schema.ts`, `src/components/analytics/PostHogProvider.tsx`, `supabase/migrations/*` (all 5), `src/lib/migrationLint.test.ts`, `tests/rls/*`, `src/app/admin/*`, `src/lib/server/auth/*`
- `node_modules/posthog-js` 1.396.6 (`dist/module.js` `set_config`/`update_config`; `@posthog/types/dist/posthog-config.d.ts`) — runtime persistence switch, `ip`, `cookieless_mode`
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy (v16.3.8 docs) — matcher, `missing`, Node runtime, cookies
- https://www.cnil.fr/fr/mesurer-la-frequentation-de-vos-sites-web-et-de-vos-applications — audience exemption conditions (13 mois cookie, 25 mois data, no recoupement)
- https://cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ — refuse as simple as accept; 6-month choice retention recommendation; art. 82 applies to any read/write on terminal

### Secondary (MEDIUM confidence)
- https://matomo.org/faq/how-to/how-do-i-configure-matomo-without-tracking-consent-for-french-visitors-cnil-exemption/ — what an exempt configuration disables (UTM values discarded, referrer host only)
- https://posthog.com/docs/libraries/js/config — persistence values, cookieless_mode, opt-out options
- https://www.quantic-avocats.com/2025/10/03/deliberationcnilcookiesaudience/ — July 2025 CNIL deliberation summary
- https://www.freenews.fr/regulation/cnil-bandeaux-cookies-conseil-etat — Conseil d'État on non-identical buttons (decision reference not found)
- Google Search Central 2016 interstitials post (via search result summaries)

### Tertiary (LOW confidence)
- Web summaries of L34-5 CPCE B2B opt-out (village-justice.com, donneespersonnelles.fr)
- Generic statements that UTM server-side needs no consent (not authoritative; contradicted for cookie persistence)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all verified in repo
- Architecture: HIGH for DB/proxy/route patterns (follow Phase 10 conventions, docs verified); MEDIUM for Vercel cache interaction (A7)
- Pitfalls: MEDIUM-HIGH — code-derived pitfalls verified; CNIL interpretation MEDIUM-LOW
- Legal (CNIL): MEDIUM-LOW — sources are CNIL pages plus secondary summaries; the UTM-before-consent and pre-consent PostHog conclusions are interpretation, flagged A1/A2; no lawyer review

**Research date:** 2026-10-02
**Valid until:** 2026-11-01 for technical items; re-check CNIL guidance before go-live (fast-moving, 2025-2026 changes)
