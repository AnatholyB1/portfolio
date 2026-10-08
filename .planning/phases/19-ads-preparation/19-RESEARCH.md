# Phase 19: Ads preparation - Research

**Researched:** 2026-10-08
**Domain:** UTM convention (pure TS rules module), closed event taxonomy, deterministic event_id (UUIDv5), server-side conversion journal (Supabase/Postgres)
**Confidence:** HIGH on codebase integration, MEDIUM on platform dedup naming (not re-verified this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `utm_source` = plateforme, `utm_medium` = type. `utm_source` in `meta`, `google`, `gbp`; `utm_medium` in `paid_social`, `cpc`, `organic`, `referral`. Meta Ads = `meta`/`paid_social`, Google Ads = `google`/`cpc`, Google Business = `gbp`/`organic`. Google Ads and Google Business stay distinct sources.
- **D-02:** `utm_campaign` = `offre_cible_aaaamm` (ex. `agent-vocal_restaurants_202611`); `utm_content` = variante de création (`video-a`, `carrousel-1`); `utm_term` = mot-clé Google Ads uniquement. Minuscules, sans accents ni espaces, tirets pour les mots, séparateur `_` entre les trois blocs, ~60 caractères maximum.
- **D-03:** Alias -> valeur canonique à la capture (table en code): `facebook`, `fb`, `instagram`, `ig` -> `meta`; `adwords`, `googleads`, `google-ads` -> `google`, etc. UTM conforme passe tel quel. Valeur canonique stockée; valeur brute conservée pour l'audit.
- **D-04:** UTM hors convention conservé et marqué « hors convention » avec un motif (source inconnue, medium inconnu, campagne mal formée). Jamais de perte de lead ni de source; liste blanche de clés (phase 11 D-09) inchangée. Indicateur visible dans l'entonnoir et la fiche lead admin.
- **D-05:** Documentation dans le repo + générateur de liens admin. Page admin compose l'URL de destination avec UTM valides et la valide contre le même module de règles que la capture (module pur partagé avec `src/lib/attribution/`). Lien du profil Google Business = `gbp`/`organic`.
- **D-06:** Liste fermée en code, snake_case: `page_view_attributed`, `simulator_started`, `simulator_completed`, `lead_submitted`, `lead_qualified`, `rdv_booked`, `quote_sent`, `deal_signed`, `lead_lost`. Quatre conversions: `lead_submitted`, `lead_qualified`, `rdv_booked`, `deal_signed`; les autres = suivi.
- **D-07:** Définis et journalisés côté serveur, aucun envoi. Chaque changement de statut de lead (et la soumission) enregistre l'événement avec son `event_id` (`sv_lead_events` ou table dédiée, au planificateur). Aucun envoi Meta CAPI/Google (ADS-04); aucun nouvel événement navigateur.
- **D-08:** Propriétés sans PII: `event_name`, `event_id`, `occurred_at`, `lead_id`, source et campagne figées, identifiants de clic seulement si consentement, `value` + `currency`. Aucun e-mail ni téléphone dans le journal.
- **D-09:** Quatre rangs: Lead = `new` (création), Qualifié = `qualified`, RDV = `rdv`, Signé = `signed`. `quote_sent` = suivi sans rang; `lost` = sortie qui n'annule pas les conversions émises. Une conversion par rang et par lead.
- **D-10:** `event_id` déterministe par lead + étape (ex. UUIDv5 de `lead_id` + nom d'événement), identique côté navigateur et serveur, avec clé d'unicité (une émission par rang et par lead, rejouable sans doublon). Avant lead (visite, simulateur): UUID aléatoire posé par le proxy.
- **D-11:** Valeur réelle à Signé seulement: `deal_signed` porte le total du devis actif en centimes + `EUR` (instantanés de devis, phase 17 D-02); Lead, Qualifié, RDV sans montant. Aucune valeur estimée.
- **D-12:** Capture first-party par `proxy.ts` (cookie `sv_attr_*`), premier contact écrit une fois, dernier contact remplacé, click ids seulement après consentement et sensibles à la casse. Statuts `new -> qualified -> rdv -> quote_sent -> signed` + `lost`, journal en ajout seul.
- **D-13:** RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche dédiée, admin en français, `noindex`, sans cinéma/curseur/GSAP, garde « aucun prix » du site public inchangée. Client de test permanent « Test E2E Sèvalys » réutilisé.

### Claude's Discretion
- Structure des tables et colonnes (marquage hors convention, valeur brute, journal des conversions), noms de fonctions SQL, découpage des plans.
- Liste exacte des alias et vocabulaire de `utm_medium` au-delà des exemples; longueur maximale précise des blocs de campagne.
- Emplacement du document de convention (`docs/`) et de la page du générateur dans la navigation admin.
- Rétro-marquage ou non des leads existants (probablement non).

### Deferred Ideas (OUT OF SCOPE)
- Envoi serveur Meta CAPI / Google (ADS-04); audiences de relance (ADS-05); kit de contenu organique (ADS-03); hachage e-mail/téléphone; valeurs estimées par rang; événements navigateur PostHog par étape.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADS-01 | Convention UTM Meta/Google/Google Business documentée et appliquée par la capture (LEAD-01) | New pure module `src/lib/attribution/utm.ts` (vocabulary, aliases, `assessUtm`), wired into `parseAttrParams`/proxy/`requestAttribution`; flag persisted at `sv_ingest_lead`; doc in `docs/`; admin link generator reusing the module |
| ADS-02 | Taxonomie d'événements + échelle Lead/Qualifié/RDV/Signé avec `event_id` partagé | New pure `src/lib/ads/events.ts` (closed list, ranks, UUIDv5 helper); `sv_conversion_events` journal filled by an AFTER INSERT trigger on `sv_lead_events`; value from active quote snapshot at `signed` |
</phase_requirements>

## Summary

The existing attribution stack is already structured for this phase: `parseAttrParams` is the single whitelist/lowercase point reused by proxy, cookie decode and request attribution; `classifyChannel` derives the `source/medium/campaign` that is frozen into `sv_leads.source_*` and used by `sv_record_visit` and `sv_funnel_v`. Normalising aliases inside the pure attribution layer therefore makes visits, leads and funnel agree on canonical values with no schema change for the canonical part. Only the non-conformity marker and raw audit values need storage.

Conversions: `sv_set_lead_status` is the ONLY path that changes status (admin-driven; no automatic `signed` from the signature flow, verified by grep), and `sv_ingest_lead` is the only creation path. Both already write `sv_lead_events` (append-only). An AFTER INSERT trigger on `sv_lead_events` (types `lead_created`, `status_changed`) can emit conversion rows atomically without redefining `sv_set_lead_status`. Status jumps fill earlier stages (`qualified_at` etc. are `coalesce`d), so the trigger must emit every missing rank up to the target, not just the target.

UUIDv5 is verified to be reproducible: node `crypto` SHA-1 implementation reproduces the canonical `uuid5('www.example.com', DNS) = 2ed6657d-e927-568b-95e1-2665a8aea6a2`. Namespace proposed below is itself derived from DNS so it is reproducible by anyone.

**Primary recommendation:** Pure `utm.ts` + `ads/events.ts` modules; additive migration `20261011000000_sv_ads_conversions.sql` (new table `sv_conversion_events`, new columns on `sv_leads`, `create or replace sv_ingest_lead` same signature, trigger on `sv_lead_events`, funnel view extended at the end); admin page `/admin/liens` (generator) + indicator in lead detail and funnel.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UTM rules (vocab, aliases, validation) | Pure shared module (`src/lib/attribution/utm.ts`) | Edge proxy, API routes, admin client form | One source of truth, no `next/*`/node imports (proxy runs on edge) |
| Alias normalisation at capture | Frontend Server (proxy.ts) | Route handlers re-validate via `decodeTouch` | Cookie holds canonical values |
| Non-conformity flag persistence | Database (`sv_leads` columns via `sv_ingest_lead`) | API/server (`ingest.ts` builds payload) | Frozen with the lead, needed by SQL funnel view |
| Link generator | Admin page (server component + small client form) | Pure module for validation | Same rules as capture |
| Event taxonomy / rank ladder | Pure module (TS) mirrored by SQL CHECK | Database | Closed list, parity test TS<->SQL |
| event_id derivation | Database (trigger) | Pure TS helper (same algorithm, golden vector) | Journal written in DB transaction; TS helper for future ADS-04/browser |
| Conversion journal | Database (append-only table) | Server-only loader for admin display | Atomic with status change |
| Quote value at `signed` | Database (reads `sv_project_documents` + `sv_document_snapshots`) | — | Same transaction, no race |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing: Next 16.1.6, Vitest ^4.1.11, Supabase (shared project) | as installed | Everything | No new runtime needed |
| `uuid` | 14.0.2 (npm modified 2026-08-18) | `v5()` for the TS helper + test golden vectors | Standard, sync, browser+node. OPTIONAL: node `crypto` can do v5 in ~6 lines and was verified here; use `uuid` only if the helper must run in the browser bundle synchronously |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `uuid` dep | 6-line SHA-1 v5 using `node:crypto` in a server-only helper | No dependency, but not browser-safe. D-07 says no new browser event, so server-only is sufficient now; browser need arrives with ADS-04 |
| Trigger on `sv_lead_events` | Redefine `sv_set_lead_status` + `sv_ingest_lead` | Trigger = smaller diff, covers any future writer; redefining = more explicit. Recommend trigger |
| Separate `sv_conversion_events` | Add types to `sv_lead_events` | `sv_lead_events` has no `event_id/value` columns and its type CHECK is a drop/re-add dance (see projects_engine migration pattern); dedicated table is cleaner and queryable by ADS-04 |

**Installation (only if `uuid` is chosen):** `npm install uuid`
**Version verification:** `npm view uuid version` -> 14.0.2 [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| uuid | npm | many yrs | very high | github.com/uuidjs/uuid | [OK] | Approved (optional; no postinstall script returned by `npm view uuid scripts.postinstall`) |

**Packages removed ([SLOP]):** none. **Flagged ([SUS]):** none.

## Architecture Patterns

### System Architecture Diagram

```
Ad click (?utm_*)                     Admin: /admin/liens (generator)
      |                                        |
      v                                        v
 proxy.ts --parseAttrParams--> utm.ts <---- same rules module ----+
      |        (lowercase + canonicalise alias; keep raw if changed)|
      v                                                             |
 Touch{params(canonical), raw?} --cookie sv_attr_ft/lt--> route handlers (contact, simulateur)
      |                                                    readAttribution -> classifyChannel
      |  recordVisit(canonical source/medium/campaign)                |
      v                                                               v
 sv_visit_counts                                          ingestLead -> sv_ingest_lead (p_source + flags/raw)
                                                                      |
                                       sv_leads(+source_nonconformity, source_raw) + sv_lead_events('lead_created')
                                                                      |
Admin sets status -> sv_set_lead_status -> UPDATE sv_leads + INSERT sv_lead_events('status_changed')
                                                                      |
                              AFTER INSERT trigger (sv_private.emit_conversions)
                                   emits missing ranks (<= target) ON CONFLICT DO NOTHING
                                                                      v
                        sv_conversion_events (append-only; event_id = uuid_v5(NS, lead_id||':'||event_name);
                         value = active quote totalCents at deal_signed)  --> (ADS-04 later) CAPI sender
```

### Recommended Project Structure
```
src/lib/attribution/utm.ts (+ utm.test.ts)   # vocab, ALIASES, assessUtm(), canonicaliseUtm(), buildTrackedUrl()
src/lib/ads/events.ts (+ events.test.ts)     # EVENT_NAMES, CONVERSION_RANKS, eventIdFor(), namespace const
src/lib/server/ads/conversions.ts            # server-only loader for admin display (RLS client)
src/app/admin/liens/page.tsx + actions       # generator (requireAdmin, noindex)
src/components/admin/links/LinkBuilder.tsx   # client form, calls pure module
docs/convention-utm.md                       # convention, examples, alias table
supabase/migrations/20261011000000_sv_ads_conversions.sql
src/lib/adsMigration.test.ts                 # static checks (pattern: pilotageMigration.test.ts)
tests/rls/ads.rls.test.ts                    # branch RLS suite
```

### Pattern 1: Canonicalise inside `parseAttrParams` (idempotent)
`decodeTouch` re-runs `parseAttrParams` on cookie params, so canonicalisation MUST be idempotent (canonical value maps to itself). Keep the existing flow: strip control chars, trim, lowercase for utm keys, drop empty/>200, THEN map alias for `utm_source`/`utm_medium` only. Do not rewrite campaign/content/term (flag, never rewrite).

Raw preservation: add optional `raw?: Partial<Record<'utm_source'|'utm_medium', string>>` to `Touch` only when an alias changed the value (cookie field `w`, tiny). Reasons are NOT stored in the cookie: they are recomputed from canonical params by `assessUtm(params)` (deterministic). Update `serialise`/`decodeTouch` in `cookie.ts` and keep the size-guard order.

```typescript
// utm.ts (pure, no imports from next/* or node:*)
export const UTM_SOURCES = ['meta', 'google', 'gbp'] as const;
export const UTM_MEDIUMS = ['paid_social', 'cpc', 'organic', 'referral'] as const;
export const SOURCE_ALIASES: Record<string, string> = {
  facebook: 'meta', fb: 'meta', instagram: 'meta', ig: 'meta', 'facebook-ads': 'meta', meta_ads: 'meta',
  adwords: 'google', googleads: 'google', 'google-ads': 'google', google_ads: 'google',
  gmb: 'gbp', 'google-business': 'gbp', googlebusiness: 'gbp', gmaps: 'gbp',
};
export const MEDIUM_ALIASES: Record<string, string> = {
  paid: 'paid_social', paidsocial: 'paid_social', 'paid-social': 'paid_social', social_paid: 'paid_social',
  ppc: 'cpc', paid_search: 'cpc', 'paid-search': 'cpc',
  seo: 'organic', local: 'organic',
};
export const CAMPAIGN_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*_[a-z0-9]+(?:-[a-z0-9]+)*_(20\d{2})(0[1-9]|1[0-2])$/;
export const CAMPAIGN_MAX = 60;
export type NonConformity = 'source_missing' | 'source_unknown' | 'medium_missing' | 'medium_unknown' | 'campaign_malformed' | 'content_malformed';
export function assessUtm(p: AttrParams): { conform: boolean; reasons: NonConformity[] } { /* ... */ }
```
Rules: assess only when ANY utm_* present (gclid-only or referrer-only arrivals are not flagged). `utm_term` is never flagged. A missing `utm_campaign` on a conformant source/medium: flag `campaign_malformed` only if present and invalid; absent campaign = not flagged (decision for planner; recommend not flagged on organic gbp links, flagged otherwise is over-engineering). The alias lists above are Claude's discretion proposals [ASSUMED]; final list is the planner's/user's call.

### Pattern 2: Persist the flag through the existing `p_source` jsonb
`sv_ingest_lead(p_source jsonb)` already reads `kind/source/medium/campaign`. Add keys `nonconformity` (array of reasons) and `raw` to the jsonb built in `ingest.ts` (from `RequestAttribution`, computed with `assessUtm(lastTouch ?? firstTouch).params`). This keeps the 13-arg RPC signature unchanged (no overload creation, no grant re-issue). The migration still needs `create or replace function public.sv_ingest_lead(<same 13 types>)` with the same revoke/grant lines. NOTE `ingest.test.ts` line ~47 asserts `p_source: i.attribution.source`; extend `RequestAttribution.source`/ingest to avoid breaking it, or update that assertion deliberately.

Columns on `sv_leads` (nullable, additive): `source_nonconformity text[] null`, `source_raw jsonb null`. Add them to `protect_lead_source` frozen list and let `sv_correct_lead_source` clear `source_nonconformity` inside its `sv.allow_source_change` window (admin attested correction; the original raw stays for audit, journal event `source_corrected` already records from/to). No retro-marking of existing leads (columns null = not assessed).

### Pattern 3: Conversion journal table
```sql
create table if not exists public.sv_conversion_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sv_leads (id) on delete restrict,
  event_name text not null check (event_name in ('lead_submitted','lead_qualified','rdv_booked','quote_sent','deal_signed','lead_lost')),
  rank smallint null check (rank between 1 and 4),            -- 1..4 for the four conversions, null for tracking
  event_id uuid not null unique,
  source_event_id bigint null references public.sv_lead_events (id) on delete restrict,
  occurred_at timestamptz not null,
  source_source text not null, source_medium text not null, source_campaign text null,
  click_ids jsonb null,                                       -- gclid/fbclid/ttclid copied from lead last_touch (already consent-gated at cookie level)
  value_cents bigint null check (value_cents is null or value_cents >= 0),
  currency text null check (currency is null or currency = 'EUR'),
  check ((value_cents is null) = (currency is null)),
  created_at timestamptz not null default now()
);
create unique index sv_conversion_events_lead_name_uidx
  on public.sv_conversion_events (lead_id, event_name) where event_name <> 'lead_lost';
```
`page_view_attributed`, `simulator_started`, `simulator_completed` are in the TS taxonomy but NOT in the server journal (pre-lead, random UUID by proxy per D-10, no new browser events per D-07): the TS list is the closed superset; the SQL CHECK lists only the lead-bound names. A parity test asserts `SQL list ⊂ TS list` and ranks match.
Keep `lead_lost` event_id = uuid_v5(NS, lead_id||':lead_lost:'||sv_lead_events.id) so repeated lost->reopen->lost cycles stay unique while replay of the same journal row is idempotent.
Privileges: `enable row level security; revoke all ... from anon, authenticated, service_role; grant select to authenticated; grant select to service_role;` plus admin-read policy `(select sv_private.is_admin())`. No insert grant needed: only the SECURITY DEFINER trigger function writes (stricter than prior tables; ADS-04 can add what it needs). Append-only: `sv_private.deny_mutation()` triggers for update/delete and truncate (same as `sv_lead_events`).

### Pattern 4: Trigger emission with jump handling
```sql
create or replace function sv_private.emit_conversions() returns trigger
language plpgsql security definer set search_path = '' as $$
-- on NEW.type = 'lead_created' -> rank 1 lead_submitted (occurred_at = lead.created_at)
-- on NEW.type = 'status_changed' and NEW.to_status in (qualified,rdv,quote_sent,signed):
--    for each rank r in 2..target_rank where not exists: insert, occurred_at = lead.<stage>_at (coalesce now())
--    quote_sent (tracking) inserted when to_status in (quote_sent, signed)
-- on to_status = 'lost' -> lead_lost (tracking), no rank
-- insert ... on conflict do nothing  (replay-safe)
$$;
```
Why trigger runs correctly: in `sv_set_lead_status` the lead UPDATE precedes the event INSERT, and in `sv_ingest_lead` the lead INSERT precedes `lead_created`, so lead timestamps exist. Ranks: new=1, qualified=2, rdv=3, signed=4 in the journal (rank 1 = Lead). Backward moves (e.g. `signed -> new`) emit nothing. Reopened leads re-passing a rank hit the unique index and no-op (satisfies "one conversion per rank per lead").
Existing leads (pre-migration) are not backfilled; when an old `qualified` lead moves to `rdv`, the trigger emits missing lower ranks using the lead's stage timestamps so the ladder is complete and honest (`occurred_at` = `qualified_at`, `created_at`). If the planner prefers strictly forward-only, emit only ranks > previous stage; decide explicitly.

### Pattern 5: Value at `deal_signed`
Inside the trigger, for target `signed`:
```sql
select (s.data->>'totalCents')::bigint
from public.sv_projects p
join public.sv_project_documents d on d.project_id = p.id and d.doc_type = 'quote'
join public.sv_document_snapshots s on s.document_id = d.id
where p.lead_id = NEW.lead_id
  and s.data->>'docType' = 'quote'
  and jsonb_typeof(s.data->'totalCents') = 'number'
  and not exists (select 1 from public.sv_project_documents r where r.replaces_document_id = d.id)  -- chain head = active quote
order by d.issued_at desc limit 1;
```
Matches TS `quoteTotalCents` (docType 'quote', safe non-negative integer) and `chainHeads` (head = not replaced). If no project/quote exists at signed time (project is created at lead conversion; admin may set `signed` before), value stays NULL (no estimate, D-11) and the row is still emitted. Because the journal is append-only and unique per lead/name, a NULL value cannot be patched later: accept and surface "valeur manquante" in the admin display; ADS-04 may decide on a correcting revision. Flag this as a known limitation to the user (Open Question 2). Multiple projects per lead: take the most recent head quote; document in code comment.
Pilotage uses signature facts for signed CA (`signedInRange`); the journal's value is the active quote at the moment the admin marks `signed`, per D-11. These can differ for amendments, intentionally.

### Pattern 6: event_id derivation
Namespace (reproducible, project-specific): `NS = uuid5('events.sevalys.com', DNS_NAMESPACE) = 87713031-3054-582f-9073-0aa58d13d20e` [VERIFIED: computed in this session with node crypto; algorithm validated against uuid5('www.example.com', DNS) = 2ed6657d-e927-568b-95e1-2665a8aea6a2].
Name = `${lead_id lowercase}:${event_name}`. Golden vector: lead `00000000-0000-4000-8000-000000000001` + `lead_submitted` -> `c2906e05-76be-58a0-b812-a56ec50f0a76`.
SQL: `extensions.uuid_generate_v5(ns, name)` requires uuid-ossp installed in the `extensions` schema (Supabase default, but NOT verified on this project: no existing migration references `extensions.` or uuid-ossp). Wave 0 task: `select extensions.uuid_generate_v5('87713031-3054-582f-9073-0aa58d13d20e', 'x')` on the branch. Fallback if absent: private function `sv_private.uuid_v5(ns uuid, name text)` using `extensions.digest(...,'sha1')` (pgcrypto) or `sha1` via `encode(digest())` and bit-setting of version/variant; if neither extension exists, create the extension in the migration (`create extension if not exists "uuid-ossp" with schema extensions`). An RLS test must assert DB value == TS golden vector (this is what "identique côté navigateur et serveur" is enforced by).

### Anti-Patterns to Avoid
- Rewriting campaign/content (only source/medium aliases are rewritten; everything else is flagged as is).
- Putting prices/value in anything under `src/lib/attribution` or public paths: value lives in DB and `src/lib/server`/admin only (priceScope; `src/lib/server` and `src/components/admin` are allowed zones, `src/lib/ads` is NOT in `PRICE_ALLOWED_ZONES`: keep it price-free, or add a justified zone).
- Hashing or storing email/phone in the journal (D-08).
- Using `now()` for earlier-rank `occurred_at` on jumps.
- Redefining `sv_set_lead_status` unnecessarily (high regression risk on `leads.rls.test.ts`, 16 references).
- Hardcoding the `sv_lead_events` type CHECK name (existing pattern uses `pg_get_constraintdef ilike` lookup); this phase does not need new `sv_lead_events` types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUIDv5 in TS | Custom bit twiddling | `uuid` v5 or the verified node-crypto snippet + golden vectors | RFC 4122 version/variant bits |
| UUIDv5 in SQL | Custom hashing | `extensions.uuid_generate_v5` | Standard function |
| Append-only | New immutability logic | `sv_private.deny_mutation()` triggers | Existing pattern |
| Admin guard | Own auth | `requireAdmin()` | Existing; RLS admin policy via `sv_private.is_admin()` |
| URL composition | String concat | `URL` + `URLSearchParams` | Encoding correctness |
| Quote total | New parser | Mirror `quoteTotalCents` / chain-head logic | Consistency with pilotage |

## Runtime State Inventory
Not a rename/refactor phase, but one data-state note: existing `sv_leads` rows and existing `sv_attr_*` cookies (30 d) contain un-normalised values. Cookies are re-parsed by `decodeTouch` so aliases get canonicalised on next read automatically (raw lost for already-set cookies, acceptable). Existing leads: columns null, no retro-marking, no conversion backfill (see Pattern 4 for jump behaviour). OS-registered state, secrets/env vars, build artifacts: None - verified (no new env var needed; no renamed identifiers).

## Common Pitfalls

### Pitfall 1: Non-idempotent canonicalisation
`decodeTouch` re-parses. If `meta` were remapped again or reasons were stored non-deterministically, first-touch could drift. Test: `parse(parse(x)) == parse(x)` for every alias.
### Pitfall 2: Cookie size and `encodeTouch` drop order
Adding `w` (raw) must be dropped early in the size guard (before utm_term). Update `cookie.test.ts`.
### Pitfall 3: Ranks vs jumps
`sv_set_lead_status` fills earlier stage timestamps on a jump; emitting only the target rank breaks "Lead/Qualifié/RDV/Signé all present" and breaks funnel parity (`sv_funnel_v` counts by `*_at` timestamps). Add a parity RLS test: for every lead, ranks emitted == non-null stage timestamps.
### Pitfall 4: `value` null at signed
See Pattern 5; make it explicit in UI and docs.
### Pitfall 5: `protect_lead_source` trigger
New source columns must be settable at INSERT (fine) and only changed under `sv.allow_source_change`. If not added to the frozen list, any UPDATE may silently alter the audit trail.
### Pitfall 6: Funnel view column order
`create or replace view` only allows appending columns at the end; add `nonconforming_leads bigint` last and keep `FunnelRow` type/`groupFunnelRows` (src/lib/admin/funnel.ts) and `FunnelTable.tsx`/its tests in sync. The `stages` union has 9 positional columns: adding a 10th needs every branch updated. Alternative: compute the funnel flag in a separate small query/count per source+campaign to avoid touching the union.
### Pitfall 7: Erasure
`sv_erase_lead` deletes contacts/notes only; journal has no PII, FK restrict is fine. Click ids in the journal are consent-gated pseudo-identifiers; document that they are retained with the tombstone (check against retention purge `20261003020000_sv_leads_backfill_purge.sql` and `retention.rls.test.ts`; if the purge nulls touches/click ids, the journal's `click_ids` must follow the same rule).
### Pitfall 8: Referrer-derived sources
`classifyChannel` returns host-based sources for non-UTM arrivals (e.g. `google.com`/`organic`); these must never be flagged. Only evaluate when a utm_* param is present.

## Code Examples

### TS helper (server-only or pure with node:crypto injected)
```typescript
import { createHash } from 'node:crypto';
export const EVENT_NAMESPACE = '87713031-3054-582f-9073-0aa58d13d20e';
export function uuidV5(name: string, ns: string): string {
  const h = createHash('sha1').update(Buffer.concat([Buffer.from(ns.replace(/-/g, ''), 'hex'), Buffer.from(name)])).digest();
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
export const eventIdFor = (leadId: string, eventName: string) => uuidV5(`${leadId.toLowerCase()}:${eventName}`, EVENT_NAMESPACE);
```
(If it must be shared with browser code, use `uuid` `v5` instead; do not import `node:crypto` into a pure shared module that proxy bundles.)

### Link generator output
Compose with `new URL(destination)` restricted to the site's own origin (`NEXT_PUBLIC_SITE_URL`), set utm_* via `searchParams.set`, validate with `assessUtm`; the builder cannot emit a non-conformant URL (UI offers selects for source/medium, free text only for offre/cible/mois/variant slugged by the module). GBP preset: `gbp`/`organic`, campaign e.g. `fiche-google_local_202611`.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Platform-specific dedup ids | Single deterministic id reused as Meta `event_id` and Google `transaction_id`/`order_id` | One id per lead+stage |

Platform naming for later ADS-04 (naming only, nothing is sent now) [ASSUMED, from training; re-verify at ADS-04 planning]: Meta Pixel+CAPI deduplicate on the pair `event_name` + `event_id` (same values on both channels, within a ~48 h window); Google Ads conversion imports/enhanced conversions dedupe on `transaction_id` (`order_id`). Therefore keep `event_name` stable per stage and keep `event_id` per lead+stage; map internal names to platform names (`lead_submitted`->`Lead`, `deal_signed`->`Purchase`) in ADS-04, not now.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Alias and medium-alias lists (beyond the CONTEXT examples) | Pattern 1 | Cosmetic; user/planner may edit |
| A2 | `extensions.uuid_generate_v5` available on the Supabase project | Pattern 6 | Migration fails; fallback documented, Wave 0 check |
| A3 | Meta dedup on event_name+event_id (~48 h), Google on transaction_id | State of the Art | Only affects future ADS-04 naming |
| A4 | Absent `utm_campaign` is not flagged | Pattern 1 | Slightly fewer flags |
| A5 | Namespace `events.sevalys.com` derivation acceptable | Pattern 6 | None; any fixed UUID works, but must be frozen once used |
| A6 | Emitting missing lower ranks on jumps with historical timestamps | Pattern 4 | Journal semantics; confirm with user |

## Open Questions (RESOLVED)

1. **(RESOLVED: dedicated sv_conversion_events fed by trigger, D-07 discretion) Journal in `sv_lead_events` vs dedicated table.** Recommendation: dedicated `sv_conversion_events` (above).
2. **(RESOLVED: accept NULL value, show "valeur manquante"; no blocking, out of scope) `signed` before a quote exists.** Value stays NULL and append-only prevents patching. Recommendation: accept and display "valeur manquante"; optionally the admin status UI warns when no active quote exists. User may prefer to block `signed` without a quote (out of scope).
3. **(RESOLVED: yes, manual rdv status is the only path; planner re-greps to confirm) Is `rdv_booked` driven only by the manual `rdv` status?** Yes in current code (no calendar integration found); confirm no other booking path exists.
4. **(RESOLVED: noted for ADS-04, no action now) Dev-vs-prod event_id for the permanent test client**: tests create leads on the branch only; the prod fixture "Test E2E Sèvalys" must not be fed into any future send (ADS-04 concern).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/tests | yes | 26.4.0 | - |
| npm registry | optional `uuid` | yes | uuid 14.0.2 | node crypto |
| Supabase branch (RLS suite) | tests/rls | needs `.env.test.local` (SV_TEST_*) - not probed | - | static migration tests only |
| uuid-ossp/pgcrypto in `extensions` | event_id SQL | unknown | - | create extension / custom sha1 function |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 |
| Config file | `vitest.config.*` (unit), `vitest.rls.config.ts` (branch RLS, `tests/rls/**/*.rls.test.ts`) |
| Quick run command | `rtk vitest run src/lib/attribution src/lib/ads src/lib/leads src/lib/adsMigration.test.ts` |
| Full suite command | `npm test` (unit) ; `npm run test:rls` (branch only, never prod) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADS-01 | alias->canonical, idempotent, conformity reasons, generator output always conformant | unit | `vitest run src/lib/attribution/utm.test.ts` | Wave 0 |
| ADS-01 | parseAttrParams/decodeTouch/cookie round-trip with raw field + size guard | unit | `vitest run src/lib/attribution` | extend params/cookie/touch tests |
| ADS-01 | proxy sets canonical cookies; visit uses canonical source | unit | `vitest run src/proxy.test.ts` | extend |
| ADS-01 | p_source carries nonconformity/raw; lead stored, never dropped | unit + RLS | `vitest run src/lib/leads` / `test:rls ads` | extend ingest/requestAttribution tests |
| ADS-01 | link generator page admin-only, noindex, French; AdminNav entry | unit | `vitest run src/app/admin src/components/admin` | Wave 0 |
| ADS-02 | TS event/rank list == SQL CHECK; no PII columns; DDL lint (RLS, revoke, search_path, append-only) | static | `vitest run src/lib/adsMigration.test.ts src/lib/migrationLint.test.ts` | Wave 0 |
| ADS-02 | golden vector TS == DB event_id; replay idempotent; jump emits all ranks; backward move emits nothing; lost does not cancel; value at signed from head quote; null w/o quote | RLS | `vitest run -c vitest.rls.config.ts tests/rls/ads.rls.test.ts` | Wave 0 |
| ADS-02 | RLS: anon/authenticated non-admin cannot read/write journal; update/delete/truncate denied | RLS | same | Wave 0 |

### Sampling Rate
- Per task commit: quick run command
- Per wave merge: `npm test` + `npx tsc --noEmit` + lint
- Phase gate: full unit suite green, RLS suite green on branch before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/attribution/utm.test.ts`, `src/lib/ads/events.test.ts`, `src/lib/adsMigration.test.ts`, `tests/rls/ads.rls.test.ts`
- [ ] Branch probe for `extensions.uuid_generate_v5`
- [ ] Update pinned tests (below)

### Pinned tests that need attention
- Migration ordering tests only assert "after previous migration" (`pilotageMigration.test.ts` line 57-62, `paymentsMigration.test.ts` 56-58); a new `20261011000000_*` file does not break them. Name the new file lexicographically after `20261010000000_sv_reviews.sql`. No test found that asserts a migration "sorts last" (grep for `sorts last` and `at(-1)` on file lists: none); `paymentsMailParity.test.ts` and `rules.test.ts` read `20261010000000_sv_reviews.sql` by name as the latest mail-list migration: unaffected unless this migration touches `sv_mail_outbox` lists (it does not; do not).
- `migrationLint.test.ts` runs over all migrations: new table needs `enable row level security` + `revoke all ... from anon, authenticated`; each `public.sv_*`/`sv_private.*` function needs `set search_path = ''` and the exact revoke line (`from public, anon[, authenticated]`).
- `src/lib/leads/ingest.test.ts` (p_source assertion), `requestAttribution.test.ts`, `src/lib/attribution/{params,cookie,touch}.test.ts`, `src/proxy.test.ts`, route tests `api/contact` / `api/simulateur` (mention utm), `tests/rls/leads.rls.test.ts`, `funnel.rls.test.ts`, `src/lib/admin/funnel*` and `FunnelTable` tests if the funnel row type changes, `AdminNav` tests (new item key), `src/proxy.test.ts` private-prefix check (new `/admin/liens` is under `/admin`, already private), `priceScope.test.ts` (keep `src/lib/ads` price-free).
- `tests/rls/helpers.ts` cleanup: lead cleanup must tolerate the new FK (`sv_conversion_events.lead_id on delete restrict`, same as events; leads are tombstoned never deleted, so cleanup behaviour should already match `sv_lead_events`).

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (reuse) | existing `requireAdmin()` |
| V3 Session Management | no | existing |
| V4 Access Control | yes | RLS admin-only read, no direct writes, SECURITY DEFINER trigger |
| V5 Input Validation | yes | `assessUtm` whitelist/regex, existing 200-char cap, URL generator restricted to own origin |
| V6 Cryptography | minimal | UUIDv5 is an identifier, not a security control; no hashing of PII in this phase |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Crafted UTM injection (HTML/SQL) in admin display | Tampering/XSS | React text rendering (already used in AttributionCard), parameterised RPC; never `dangerouslySetInnerHTML` |
| Open redirect via generator destination | Tampering | Restrict destination to site origin/path allowlist |
| PII leak into journal | Info disclosure | No email/phone columns; static test forbids those column names |
| Journal tampering | Tampering/Repudiation | Append-only triggers, no write grants |
| Click ids without consent | Info disclosure | Copy only from touch (cookie already consent-gated); journal test with non-consent lead |

## Sources

### Primary (HIGH confidence)
- Codebase read this session: `src/lib/attribution/{params,touch,cookie}.ts`, `src/lib/leads/{ingest,requestAttribution,visits}.ts`, `src/proxy.ts`, `supabase/migrations/20261003000000_sv_leads_core.sql`, `20261003010000_sv_consent_funnel.sql`, `20261004000000_sv_projects_engine.sql`, `20261005000000_sv_documents.sql`, `src/lib/server/pilotage/quotes.ts`, `src/lib/migrationLint.test.ts`, `src/lib/pilotageMigration.test.ts`, `src/components/admin/AdminNav.tsx`, `src/lib/priceScope.ts`, `tests/rls/*`, `vitest.rls.config.ts`
- Node crypto computation of UUIDv5 verified against the RFC example value
- npm registry: `uuid` 14.0.2; slopcheck OK

### Secondary / Tertiary
- Platform dedup naming (Meta event_name+event_id, Google transaction_id): training knowledge, LOW-MEDIUM, not re-fetched; mark for re-verification in ADS-04.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new runtime dependency required)
- Architecture: HIGH (derived from read code and migrations)
- Pitfalls: HIGH for code-derived; MEDIUM for Supabase extension availability

**Research date:** 2026-10-08
**Valid until:** 2026-11-07 (platform naming: re-verify at ADS-04)

## Project Constraints (from CLAUDE.md)
No project `./CLAUDE.md` exists. Global rule: prefix shell commands with `rtk`. Phase-level constraints are in CONTEXT D-13 (RLS in same migration, service_role only in server-only modules, admin in French and noindex, no price on public site, RLS tests on dedicated branch, reuse permanent test client).
