# Phase 18: Verified reviews - Research

**Researched:** 2026-10-08
**Domain:** Verified customer reviews (hashed single-use tokens, no-gating publication, legality-only moderation, Review JSON-LD) on Next 16.1.6 + Supabase + Resend
**Confidence:** MEDIUM-HIGH (codebase facts HIGH; French legal applicability and Google behavior MEDIUM)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Formulaire : note 1 à 5 obligatoire, texte obligatoire (minimum ~20 caractères), titre optionnel. Fournit `reviewRating`, `reviewBody` et `name` pour le JSON-LD `Review`.
- **D-02:** Le client choisit l'affichage de son nom au dépôt : prénom + société (défaut), prénom + initiale, ou société seule. Case de consentement de publication explicite ; sans consentement, l'avis n'est pas publié. Le nom de société vient de `sv_clients`.
- **D-03:** Affichage public : page `/avis` (liste complète + lien vers la Politique) et extrait de 2-3 avis récents sur l'accueil. Pas d'avis sur les pages services. La garde « aucun prix » et le comportement de l'accueil restent intacts.
- **D-04:** JSON-LD : un `Review` par avis publié, lié à l'entité Organization/ProfessionalService existante via `itemReviewed`, uniquement sur `/avis`. Aucun `AggregateRating`, aucune clé de prix, aucune promesse d'étoiles. Test automatisé (vitest) : pas de clé de prix, pas d'`AggregateRating`, seuls les avis publiés et non masqués sont balisés.
- **D-05:** Publication immédiate au dépôt, sans file de validation ni filtrage par note ou ton. Les soumissions techniquement invalides (injection, longueur, liens) sont rejetées à la validation, jamais selon le contenu d'opinion. L'admin est alerté par e-mail de chaque nouvel avis.
- **D-06:** Le masquage ne repose que sur une liste fermée de motifs légaux (diffamation ou injure, données personnelles d'un tiers, contenu illégal, avis non authentique/usurpation) plus un détail obligatoire. Aucun motif lié à la note ou à l'opinion. Journal en ajout seul (patron `deny_mutation`) : masquage et levée sont tracés avec auteur, date, motif, détail ; l'avis n'est jamais supprimé.
- **D-07:** Le client est notifié du masquage (e-mail transactionnel, motif générique, contestation par retour d'e-mail). L'admin peut lever un masquage avec motif ; tout est journalisé.
- **D-08:** Pas de réponse publique de l'agence (hors périmètre).
- **D-09:** Le jeton est créé au moment du mail J+7 (phase 16 D-05) ; le mail J+21 réutilise le même lien. Jeton haché en base (jamais en clair), à usage unique, expire à 60 jours après le PV signé. Un lien expiré, utilisé ou invalide affiche un message clair sans fuite d'information. L'admin peut réémettre un lien (l'ancien est invalidé, action journalisée). Le fait « avis déposé » arrête les relances (D-05 de la phase 16).
- **D-10:** Lien Google Business sur la page de remerciement après dépôt, bouton identique quelle que soit la note, texte neutre, sans contrepartie ni promesse. Test automatisé pour chaque note de 1 à 5. L'URL Google vient d'une variable d'environnement avec garde au démarrage (le profil Google Business reste à créer côté propriétaire).
- **D-11:** La phase 18 lève le drapeau `REVIEW_REQUESTS_ENABLED` et branche le vrai lien dans le modèle `review_request`. Le lien Google n'apparaît pas dans le mail de demande.
- **D-12:** Page `/politique-des-avis` en français seul. Contenu : méthode de vérification (lien unique après PV signé), publication sans filtrage, motifs de masquage limités à la légalité, aucune incitation ni contrepartie, durée de conservation.
- **D-13:** Lien vers la Politique à côté de chaque bloc d'avis (`/avis` et extrait accueil), sur le formulaire de dépôt et dans le pied de page ; page ajoutée au sitemap et à `llms.txt`.
- **D-14:** Règles d'e-mail en code, outbox idempotente, cron quotidien (phases 12, 16). La demande d'avis est classée `marketing`. Le mail de masquage est transactionnel.
- **D-15:** RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, tables d'audit en ajout seul. Le formulaire public `/avis/[token]` est exempté d'authentification mais en `noindex` ; `/avis` et `/politique-des-avis` sont indexables. Client de test permanent « Test E2E Sèvalys » réutilisé, jamais supprimé.

### Claude's Discretion
- Structure exacte des tables (avis, jetons hachés, journal de modération), noms des types, format et entropie du jeton, découpage des plans.
- Libellés français, gabarit de la page de remerciement, design de la carte d'avis et de l'extrait accueil (tokens du design system, accessibilité).
- Limitation de débit sur le formulaire public, durée de conservation exacte à écrire dans la Politique.
- Emplacement de la vue admin des avis et de l'action de réémission dans la fiche projet ou une page `/admin/avis`.

### Deferred Ideas (OUT OF SCOPE)
- Réponse publique de l'agence à un avis (champ + `comment` JSON-LD)
- Avis affichés sur les pages services
- Politique des avis en anglais et thaï
- Bouton « Laisser un avis » dans le portail client
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REV-01 | Lien d'avis unique, usage unique, expire sous 60 jours après PV signé | HMAC-derived token + sha256 hash in `sv_review_links`, atomic consume RPC, sweep creates link at J+7 (sections Token design, Sweep integration) |
| REV-02 | Lien Google Business affiché quelle que soit la note, sans filtrage | Single thank-you component with no rating prop; env URL guard; per-rating test (Pattern 5) |
| REV-03 | Modération légalité seulement, motif journalisé ; page « Politique des avis » | Append-only moderation log with closed reason enum; policy page content checklist; L111-7-2 disclosure items |
| REV-04 | JSON-LD `Review` sans prix ni promesse d'étoiles, test automatisé | Pure builder `buildReviewJsonLd` + vitest guard (Pattern 4); Google self-serving rule |
</phase_requirements>

## Summary

The phase is mostly wiring on top of phase 16 assets that already exist: `review_request` rule (marketing class), `dedupeKey.reviewRequest`, `reviewRequestsEnabled()` flag, `reviewRequestContent()`, and the sweep branch that already detects "PV signed, J+7/J+21". Today the sweep takes a synchronous `reviewLink(projectId) => string|null` that the cron leaves as `() => null`, and the outbox payload carries a clear `reviewUrl`. Phase 18 must (1) create the link rows and (2) build the URL at render time, and add the DB layer (reviews, hashed links, append-only moderation log), the public pages, the JSON-LD, and the guards.

Four traps the planner must handle that are not obvious from CONTEXT.md: (a) D-09 says the token is hashed in DB yet the J+21 mail must reuse the same link, so the raw token must be re-derivable, which is solved by an HMAC-derived token (secret + link id) whose sha256 is stored; (b) `/avis` cannot simply be added to `PRIVATE_PREFIXES` because that would make the indexable `/avis` list private, robots-disallowed and noindex, and the token path would otherwise be recorded by the public attribution branch (`recordVisit` stores the landing path, i.e. the token); (c) `priceScope.test.ts` pins exactly 14 allowed zones and forbids public code importing `src/lib/server`, so public pages need a non-`server`-zone data module and the submit route needs a new zone entry (precedent: `src/app/api/unsubscribe`); (d) the home page `src/app/page.tsx` is a `'use client'` component so a server-fetched excerpt must arrive through a small cached API route or a client fetch.

Google's own guidelines state that pages where the reviewed entity controls the reviews about itself and uses `LocalBusiness`/`Organization` markup are ineligible for star results. [CITED: developers.google.com/search/docs/appearance/structured-data/review-snippet] This confirms D-04: emit `Review` for content/AI-readability value only and never promise stars.

**Primary recommendation:** One migration `20261010000000_sv_reviews.sql` (links, reviews, moderation log, RPCs, outbox check extension, RLS) + HMAC-derived hashed tokens re-derived at render time from `linkId` in the outbox payload + a public data module outside `src/lib/server` + submit route `src/app/api/avis` added to the price-scope zones (mirroring `api/unsubscribe`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Link creation / expiry / single-use consume | Database (RPC, one transaction) | API (calls RPC) | Atomicity: `update ... where used_at is null returning` + review insert in the same function |
| Token derivation (HMAC) and URL building | API / Backend (server-only) | — | Secret never leaves server; derived at mail render time |
| Token form page `/avis/[token]` (GET read-only) | Frontend Server (SSR, dynamic) | Database | GET must not consume (mail scanners prefetch); renders state only |
| Submission (POST) + validation | API route `/api/avis` | Database RPC | Zod validation, throttle, RPC insert + admin outbox row |
| Public list `/avis`, excerpt, JSON-LD | Frontend Server (SSR, revalidate) | Database | Only published, non-hidden rows via RPC returning display columns only |
| Moderation (hide/unhide/reissue) | Admin server actions | Database RPC + append-only log | `requireAdmin()` then RPC with actor id (pattern `sv_set_reminder_hold`) |
| Reminder stop on review filed | Database (RPC skips pending outbox rows) + Sweep (stale) | — | Same two-layer pattern as holds |
| noindex for token route | Proxy/headers + layout metadata | robots | Header + `robots` meta + no-referrer |

## Standard Stack

No new packages. Everything needed is already installed. [VERIFIED: package.json grep]

| Library | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | App Router pages, route handlers, `params` is a Promise |
| react | 19.2.3 | UI |
| zod | ^4.6.5 | Form validation (admin actions already use it) |
| @supabase/supabase-js | ^2.117.2 | RPC via `callRpc` / admin client |
| resend | ^6.28.1 | Outbox delivery (existing) |
| vitest | ^4.1.11 | Unit tests (`vitest.config.ts`) and RLS suite (`vitest.rls.config.ts`) |
| node:crypto | built-in | `createHmac`, `createHash('sha256')`, `timingSafeEqual`, `randomUUID` |

### Package Legitimacy Audit
No external package is installed by this phase, so slopcheck is not applicable.
**Packages removed:** none. **Packages flagged [SUS]:** none. Do NOT add a rating-star, sanitizer or captcha package; none is needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HMAC-derived token | Random token stored in outbox payload | Puts the live secret in clear in `sv_mail_outbox.payload` (admin-readable), contradicting "never in clear" |
| HMAC-derived token | Encrypted token column | Extra key management for no benefit |
| Public read via RPC with service_role in `src/lib/reviews` | anon RLS select on view | Phase 16 rule: no new RPC executable by anon/authenticated; keep service_role + server-only |

## Architecture Patterns

### Data flow
```
cron /api/cron/mail
  -> sweepReminders: projects with effective acceptance_signed, elapsed 7..60 days, no review, not on hold
       -> RPC sv_ensure_review_link(project, signed_at)  (idempotent get-or-create, expires_at = signed_at + 60d)
       -> enqueue review_request {projectTitle, linkId, stage}  (dedupe key unchanged)
  -> processDueMail -> buildMail: token = deriveReviewToken(linkId, secret); url = SITE/avis/<token>
       -> buildMarketingEmail (unsubscribe + suppression still apply)
client opens /avis/<token>  (GET, dynamic, noindex, no-referrer, read-only)
  -> sha256(token) -> RPC sv_review_link_state -> {valid | used | expired | invalid} + project title + company name
client POST /api/avis  (throttle by IP hash, zod)
  -> RPC sv_submit_review(token_hash, rating, title, body, display_mode, names, consent)
       one transaction: lock link row, check unused/not invalidated/not expired, insert review (unique link_id, unique project_id),
       mark link used, skip pending review_request outbox rows of the project, insert admin outbox row
  -> route sends the admin outbox row (sendOutboxRow) like api/unsubscribe, redirects to thank-you (Google button)
/avis (revalidate ~300s) + home excerpt + JSON-LD  <- RPC sv_public_reviews (not hidden) via src/lib/reviews
admin: hide / unhide / reissue -> RPC with actor -> append-only log; hide queues transactional client mail
```

### Recommended structure
```
supabase/migrations/20261010000000_sv_reviews.sql
src/lib/reviews/                 # NOT under src/lib/server (public pages import it); each file `import 'server-only'` where it touches Supabase
  token.ts                       # deriveReviewToken / hashReviewToken / reviewSecret() (>=32 chars guard, pattern unsubscribeToken.ts)
  publicReviews.ts               # getPublishedReviews(limit) via admin RPC (precedent: src/lib/throttle.ts outside server)
  reviewJsonLd.ts                # pure, no next/react/supabase imports (pattern serviceJsonLd.ts)
  schema.ts                      # zod schema + display name composer (pure)
  googleUrl.ts                   # pure: validate REVIEW_GOOGLE_URL (https only)
src/lib/server/reviews/          # admin + sweep side (allowed zone): ensureLink, moderation wrappers
src/lib/server/mail/             # extend: rules (new events), reminderEmails (content), outbox (render), urls
src/app/avis/page.tsx            # indexable list + JSON-LD + policy link
src/app/avis/[token]/{layout,page}.tsx   # noindex, referrer no-referrer, thank-you state
src/app/api/avis/route.ts        # POST submit (new price-scope zone)
src/app/api/avis/recent/route.ts # GET excerpt for client home (cached)
src/app/politique-des-avis/page.tsx
src/app/admin/avis/              # list, hide/unhide, reissue (requireAdmin)
```

### Token design (REV-01, D-09)
- `linkId` = uuid (random, DB `gen_random_uuid()`). `token = base64url(HMAC-SHA256(REVIEW_TOKEN_SECRET, "review:v1:" + linkId))` = 43 chars, 256 bits, indistinguishable from random without the secret. [ASSUMED: design recommendation]
- DB stores only `token_hash = sha256(token)` (hex, unique). Verification = hash the presented token and look up the row (no secret needed on read path, no timing issue because lookup is by hash of an unguessable value). Max token length check (e.g. 64) before hashing; reject otherwise with the same generic "invalid" state.
- The mail renders the URL from `linkId` in the payload at send time (same idea as the unsubscribe token being computed in `buildMail`), so J+7 and J+21 use the identical link and the clear token never lands in the outbox payload.
- Secret: new env `REVIEW_TOKEN_SECRET`, min 32 chars, fail closed (`unsubscribeSecret()` pattern, throw `review_token_unavailable` -> outbox `render_error`). Rotating it kills outstanding links (document; reissue fixes).
- `expires_at = signed_at + interval '60 days'` (D-09: 60 days after the PV, not after link creation). `REMINDER_MAX_AGE_DAYS` is already 60 so reminders and expiry align. Reissue: new row with new `expires_at` (recommend `now() + 60 days`, see Open Questions), old row `invalidated_at` set with `invalidated_by`.
- State derivation: `used_at`, `invalidated_at`, `expires_at`. Public message for used/expired/invalid/invalidated is one generic neutral text ("Ce lien n'est plus valide") plus contact mailto; do not reveal which (no leak). Distinguishing "already used" could reveal that a review exists; keep it generic.
- GET never consumes (link scanners/prefetch). Consumption only in the POST RPC.

### Sweep integration (changes to existing code)
- `ReviewLink` type stays `(projectId) => string | null` but now returns a **link id**; payload becomes `{ projectTitle, linkId, stage }` (drop `reviewUrl`). `sweepReminders` gets an async pre-step that calls `sv_ensure_review_link` for eligible projects (elapsed 7..60, no review, not held) and builds the map; `planReminders` stays pure. Update `sweep.test.ts` and `outbox.test.ts` / `reminderEmails.test.ts` (they pass `reviewUrl`).
- `buildMail` marketing branch: replace `reviewUrl: str(p.reviewUrl)` with `buildReviewUrl(deriveReviewToken(str(p.linkId), secret))`. `reviewRequestContent` already enforces https URL.
- Stop on filed review: sweep reads `sv_reviews.project_id` for eligible projects and excludes them (existing `staleIds` mechanism then skips pending/failed rows), and `sv_submit_review` also skips pending rows immediately (pattern of `sv_set_reminder_hold`).
- Cron route passes nothing (default `reviewLink` replaced by the real one). `REVIEW_REQUESTS_ENABLED` code stays as a kill switch; "lever le drapeau" = set it to `true` in Vercel after the policy page, Google URL and secret are live (PITFALLS #6: policy before first link).
- `MAIL_EVENTS`/templates: add `review_published_admin` (admin, transactional) and `review_hidden` (client, transactional). The check constraints on `sv_mail_outbox` are rebuilt with the pg_constraint content loop (match on a string from the latest list, e.g. `%mail_suppression_admin%`), never a hard-coded name (phase 16 D-14 pattern, see migration 20261008000000). Also extend `MailTemplate`, `dedupeKey` (e.g. `reviewPublishedAdmin(reviewId)`, `reviewHidden(moderationId, email)`), `buildMail` switch, `rules.test.ts`.
- Recipients for the hidden-notice: reviewer address is not stored on the review; use project client members' `invited_email` (as `recipientsOf` in sweep) or store the submitting link's recipient. Recommend the former (no new PII on the review row).

### Routing / privacy integration (critical)
- Do NOT add `/avis` to `PRIVATE_PREFIXES` (would noindex `/avis`, add robots Disallow `/avis`, and the sitemap test asserts no sitemap URL matches a private prefix). Instead extend `isPrivatePath` with an additional rule matching `'/avis/'` subpaths only (so `/avis` stays public and `/avis/<token>` goes to the proxy private branch, skipping `attributionBranch`/`recordVisit` which stores the pathname). Update `privateRoutes.test.ts` (it pins the exact `PRIVATE_PREFIXES` array and the table of paths), `robots.ts` (add `Disallow: /avis/`), `next.config.ts` headers (add `/avis/:path+` with `X-Robots-Tag: noindex, nofollow`; `sitemap.test.ts` cross-checks next.config sources against private prefixes, adapt it), and `ClientProviders`/`PostHogProvider`/`ConsentDialog` users of `isPrivatePath` (verify the token route should not run analytics: yes, keep it private).
- Token route layout: copy `src/app/desinscription/layout.tsx` (`robots: {index:false, follow:false, nocache:true}`, `referrer: 'no-referrer'`, `pt-root` wrapper with `portal.css`) and `AuthCard` UI. Add `export const dynamic = 'force-dynamic'`.
- The Google outbound link on the thank-you page uses `rel="noopener noreferrer"` so the token path is never sent as Referer.
- `PRICE_ALLOWED_ZONES`: add `src/app/api/avis` (it imports `src/lib/server/mail/outbox` for `sendOutboxRow`, like `api/unsubscribe`) with a reason, and update the pinned list/count (14 -> 15) in `priceScope.test.ts`. Keep `src/app/avis`, `src/app/politique-des-avis`, `src/app/avis/[token]` OUT of the allowed zones; they import only `src/lib/reviews/*` (guard (b) in priceScope.test.ts: no code outside zones may import a zone). The home excerpt component must not import `src/lib/server`. Consider adding the new public pages to `GUARDED_PUBLIC_FILES` only if the pinned `toBe(8)` test is deliberately updated; otherwise add a separate no-price test file.
- Home excerpt: `src/app/page.tsx` is `'use client'`, so create `components/sections/AvisExcerpt.tsx` (client) that fetches `GET /api/avis/recent` (route with `revalidate`/s-maxage, returns only display fields, max 3) and renders nothing when empty. Insert `<AvisExcerpt />` between `<Partners` and `<ContactSection` in `page.tsx`; `page.test.ts` only checks relative order of listed markers so this is safe. No stars imagery promise; no JSON-LD on home (D-04). The `/api/avis/recent` route imports `src/lib/reviews/publicReviews` (non-zone) so the zone list is unaffected.
- Footer: `Footer.tsx` has a `foot-links` block; add `<Link href="/politique-des-avis">` (FR label; footer uses `t.landing.footer` i18n for `legal`, add a key in all three languages or hardcode FR label consistent with the FR-only policy; `translations.test.ts` guards parity, check before adding keys). Also add `/avis` link there (optional) and sitemap + `public/llms.txt` entries. `llms.test.ts` asserts no "tarif" and no private routes: do not link `/avis/` token paths in llms.txt. `sitemap.test.ts` has `u.length toBe(5 + services.length + 1)`: update to `+2` (or `+3`) for `/avis` and `/politique-des-avis`.
- `/avis` and `/politique-des-avis` use `Navbar`/`Footer` like `mentions-legales/page.tsx` (`robots: {index:true, follow:true}`).

### Pattern 4: Review JSON-LD (REV-04, D-04)
```ts
// src/lib/reviews/reviewJsonLd.ts  (pure; no next/react/supabase imports; same rule as serviceJsonLd.ts)
export function buildReviewJsonLd(r: PublicReview, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `${siteUrl}/avis#review-${r.id}`,
    itemReviewed: { '@type': 'ProfessionalService', '@id': `${siteUrl}/#service`, name: 'Sèvalys' },
    author: r.authorKind === 'company'
      ? { '@type': 'Organization', name: r.displayName }
      : { '@type': 'Person', name: r.authorName },
    datePublished: r.publishedAt.slice(0, 10),
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    ...(r.title ? { name: r.title } : {}),
    reviewBody: r.body,
  };
}
```
Serialize ONLY with `buildJsonLdScript` (escapes `<`). The root layout already emits Organization + ProfessionalService in a `@graph` with `@id`s `/#organization` and `/#service`; repeating `@id` + `name` in `itemReviewed` keeps the reference resolvable. Author `name` must be under 100 chars [CITED: Google review snippet doc]; the Zod schema caps first name/company display well below that.
Emit one `<script type="application/ld+json">` per review (or an array) in `/avis` only. Review content must be visible on the page (Google rule: marked-up content readily available to users): render rating, title, body in the card.

### Pattern 5: Google link at every rating (REV-02, D-10)
Single `ThankYou` component/function with signature that takes NO rating (`<ThankYou googleUrl={...} />`). Test: render the thank-you output for ratings 1..5 via the same code path (page logic takes the submitted rating only for storage) and assert the Google anchor `href` and label are byte-identical; assert no wording like "récompense", "offre", "en échange", "5 étoiles". Neutral text: "Vous pouvez aussi partager votre avis sur Google (facultatif)". Google URL from `REVIEW_GOOGLE_URL` (https only, validated by pure `googleUrl.ts`). Guard: when `REVIEW_REQUESTS_ENABLED=true` but URL invalid, sweep logs `review_config_invalid` and enqueues nothing (fail closed), and the sweep/cron test covers it; the Google profile still has to be created by the owner (PROJECT.md blocker) so ship with the flag off until the URL exists. Do not include the Google link in the request email (D-11).

### Database design (migration `20261010000000_sv_reviews.sql`)
Follow `20261008000000_sv_mail_automation.sql` conventions: `revoke all ... from anon, authenticated, service_role` then explicit `grant select ... to service_role` (writes only through `security definer` RPCs with `set search_path = ''`, `revoke ... from public, anon, authenticated; grant execute ... to service_role`), RLS enabled in the same migration, admin-read policy `using ((select sv_private.is_admin()))`, FKs `on delete restrict`, `deny_mutation` triggers for append-only tables (update/delete AND truncate).
- `sv_review_links`: `id uuid pk default gen_random_uuid()`, `project_id` fk, `token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$')`, `expires_at`, `created_at`, `created_by uuid null` (null = system), `used_at null`, `invalidated_at null`, `invalidated_by null`, `generation int`. Partial unique index: one active link per project (`where used_at is null and invalidated_at is null`). Updates only through RPC (no direct grant); trigger denying delete; trigger restricting updates to the three state columns, set-once.
- `sv_reviews`: `id`, `project_id` fk **unique**, `link_id` fk **unique**, `rating smallint check 1..5`, `title text null (<=100)`, `body text check (char_length(btrim(body)) between 20 and 2000)`, `display_mode` check in (`first_company`,`first_initial`,`company_only`), `display_name text` (snapshot composed server-side), `author_kind` (`person`,`company`), `company_name_snapshot`, `publication_consent boolean not null check (publication_consent)`, `experience_date date` (PV signed date), `published_at timestamptz default now()`. Content immutable (deny update/delete/truncate). Never store the reviewer e-mail or IP.
- `sv_review_moderation_log` (append-only): `id bigint identity`, `review_id`, `action in ('hide','unhide')`, `reason in ('defamation_or_insult','third_party_personal_data','illegal_content','inauthentic')` null for unhide? Recommend unhide uses a separate free `detail` and `reason null` while hide requires one of the four reasons; `detail check (char_length(btrim(detail)) between 3 and 500)`, `actor_id uuid not null` (must exist in `sv_admins`, checked in RPC like `sv_set_reminder_hold`), `created_at`. Current state = action of highest id for the review (same as `sv_reminder_holds`). RPC takes an advisory lock per review and returns `unchanged` when already in the target state.
- `sv_review_link_events` (optional) or reuse moderation-style log for reissue: journal reissues with actor, date and detail (D-09 "action journalisée"). Simplest: `invalidated_by` + `invalidated_at` on the old row plus `created_by` on the new row, and a `sv_review_link_events` append-only table if the planner wants a full audit trail (recommended, cheap).
- RPCs: `sv_ensure_review_link(p_project_id, p_signed_at)` (service_role; verifies effective `acceptance_signed` fact via `sv_private.has_effective_fact`, no existing review, returns link id; the HMAC token is derived app-side, so the RPC cannot compute `token_hash` itself: have the app compute `hash(derive(newId))`. Resolve by generating the uuid app-side with `randomUUID()` and passing `p_link_id` + `p_token_hash`; RPC inserts `on conflict` (partial unique index) and returns the existing active link id when one exists). `sv_review_link_state(p_token_hash)`, `sv_submit_review(...)`, `sv_public_reviews(p_limit int)` (published and latest moderation action not `hide`), `sv_moderate_review(p_review_id, p_action, p_reason, p_detail, p_actor_id)` (returns queued outbox id for the client notice on hide), `sv_reissue_review_link(p_project_id, p_link_id, p_token_hash, p_actor_id, p_detail)`.
- Check-constraint extension for new `event_type`/`template` values via the content-loop pattern.
- Single-use atomicity: `select ... from sv_review_links where token_hash = $1 for update`, then checks, then insert review + `update used_at`. Two concurrent POSTs: second blocks on the row lock and sees `used_at` set, or hits the unique `link_id`; return `sv_link_used`. The RLS suite must test this with `Promise.all`.

### Anti-Patterns to Avoid
- Consuming the token on GET (scanners will burn it).
- Branching copy or button on rating anywhere (grep guard in test for `rating` near the Google link).
- Filtering by content: server-side rejections only for technical rules: length bounds, control chars, `<`/`>` markup, `http(s)://`/`www.` links, over-length; message states the technical rule (L111-7-2 expects reasons for non-publication to be given to the reviewer). Never regex on sentiment or profanity.
- Deleting or editing a review row (even admin). Moderation = log row only.
- `AggregateRating`, `aggregateRating`, `ratingCount`, `reviewCount`, "4,8/5" or average anywhere on public pages.
- Logging token, e-mail or review body (existing convention: fixed strings only, no addresses).
- Putting the clear token or URL in `sv_mail_outbox.payload`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent mail + retries | Own sender | `enqueueMail` / `sendOutboxRow` / `processDueMail` | Dedupe, claim, suppression, marketing headers already solved |
| Unsubscribe / suppression | Anything | existing `buildMarketingEmail` + `decideSend` | Review request is already `marketing` |
| Append-only audit | App-level checks | `sv_private.deny_mutation()` triggers | Blocks service_role too |
| Admin check in RPC | JWT parsing | `exists (select 1 from public.sv_admins ...)` as in `sv_set_reminder_hold` | Same pattern |
| Rate limiting | New table | `hitThrottle`/`hashKey` (`sv_throttle_hit`), add kind `'review-ip'` | Fail-closed, hashed keys already |
| JSON-LD serialization | `JSON.stringify` | `buildJsonLdScript` | Escapes `<` (XSS) |
| Token comparison | `===` | hash lookup (+ `timingSafeEqual` where comparing MACs) | Timing |
| Date handling Paris | Own math | `parisElapsedDays`, `parisDateOf` | DST/day-boundary already tested |
| Public-page admin CRUD forms | New UI kit | `AuthCard`, `pt-btn-primary`, `pt-helper`, portal.css | Matches `/desinscription` |

## Common Pitfalls

### Pitfall 1: Token path leaks into analytics
`attributionBranch` stores `request.nextUrl.pathname` as `landing` in visits. If `/avis/<token>` is not classified private, the live token is persisted. **Avoid** via the `isPrivatePath` subpath rule; add a proxy test (`proxy.test.ts` exists) asserting `/avis/abc` takes the private branch and `/avis` does not.

### Pitfall 2: J+21 "same link" vs hashed storage
See Token design. Do not store the clear token anywhere. If the planner prefers a random token, the J+21 mail cannot be built (no way to recompute) — this is the reason for HMAC derivation.

### Pitfall 3: Reissue vs dedupe keys
`dedupeKey.reviewRequest(projectId, stage, email)` is already consumed after J+7/J+21, so reissuing creates no new mail automatically. Also pending rows hold the old `linkId` (now dead). The reissue RPC must skip pending/failed `review_request` rows (like the hold) and the admin action should both display the new URL once (copy) and optionally enqueue a mail with a dedupe key suffixed by generation (`...:r<generation>`, pattern of `clientInvited(..., resendN)`).

### Pitfall 4: Home page is a client component
Cannot `await` data in `page.tsx`. Use client fetch of a cached route; handle empty/failed fetch by rendering nothing (home behaviour and cinema intro intact, price guard test unchanged).

### Pitfall 5: Pinned test counts
`priceScope.test.ts` (14 zones, 8 guarded files), `sitemap.test.ts` (url count), `privateRoutes.test.ts` (exact array), `llms.test.ts`, `rules.test.ts` (event lists), `sweep.test.ts` (reviewUrl payload) all need deliberate updates; list them in the plan so they are changed in the same task as the code.

### Pitfall 6: Gating by the back door
Sending the request only to certain clients, or differentiating the page by rating, is the compliance failure. The sweep already targets every signed-PV project; keep it that way (held projects are an admin operational pause and are logged; mention in the policy that requests go to every delivered client).

### Pitfall 7: Hidden reviews still in JSON-LD or counts
JSON-LD and the excerpt must come from the same `sv_public_reviews` RPC so hidden reviews can never be marked up. Test with a fixture where one of three reviews is hidden.

### Pitfall 8: Consent withdrawal / erasure
RGPD consent withdrawal and erasure requests are not in D-06's closed reason list. Treat as `third_party_personal_data`? It is not third-party. See Open Questions.

## Code Examples

### Token derivation (server-only)
```ts
// Source: pattern of src/lib/server/mail/unsubscribeToken.ts (existing) [VERIFIED: codebase]
import { createHash, createHmac } from 'node:crypto';
export const reviewSecret = (env = process.env) =>
  typeof env.REVIEW_TOKEN_SECRET === 'string' && env.REVIEW_TOKEN_SECRET.length >= 32 ? env.REVIEW_TOKEN_SECRET : null;
export const deriveReviewToken = (linkId: string, secret: string) =>
  createHmac('sha256', secret).update(`review:v1:${linkId}`).digest('base64url');
export const hashReviewToken = (token: string) => createHash('sha256').update(token).digest('hex');
```

### Admin action shape
Mirror `src/app/admin/projets/reminderHold.actions.ts`: `'use server'`, `requireAdmin()`, Zod `safeParse`, `callRpc('admin/avis', 'sv_moderate_review', {...p_actor_id: user.id})`, map known outcomes, generic French error on failure, `revalidatePath`.

### Next 16 dynamic params
```ts
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
```
[ASSUMED: standard Next 15+ API; consistent with `searchParams: Promise<...>` already used in `desinscription/page.tsx`]

## Policy page content ("Politique des avis") and legal basis
Disclose: who can review (clients with a signed PV de recette, one unique link per project, sent to every delivered client), how verification works, publication immediately without filtering by rating or tone, rejected-submission rule (technical only, reason shown to reviewer), moderation limited to four legal reasons with a journal, notified reviewer, no incentive or compensation, display of publication date and experience date, name display choices and consent, how to report a doubt about authenticity (contact e-mail), Google link offered to everyone, retention period. Article L111-7-2 Code de la consommation requires fair, clear information on publication and treatment of reviews, display of date, reasons for non-publication and a free way to flag doubts. [CITED: legifrance.gouv.fr L111-7-2 / D111-17 via search results] Whether it strictly binds B2B reviews is unresolved (PITFALLS.md "[VERIFY]"); treat as binding, as the project already decided. Exact retention duration is discretionary: recommend a stated duration (suggest "publiés tant que l'activité de Sèvalys est maintenue, conservés 3 ans après la dernière modération") [ASSUMED] and have the owner confirm.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Star rich results from self-hosted reviews | Ineligible for Organization/LocalBusiness self-served reviews | Emit `Review` only for machine readability; no stars promised [CITED: Google review-snippet doc] |
| Moderation by sentiment | Legality-only with logged reason | Compliance (Omnibus / L111-7-2) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | HMAC-derived token (secret + linkId) with sha256 stored is acceptable as "jeton haché en base" | Token design | Owner may want a random token; then J+21 same-link needs another mechanism (store encrypted) |
| A2 | Submission without publication consent is rejected at validation (token not consumed) rather than stored unpublished | Forms | If owner wants unpublished storage, add `published` semantics and an admin view |
| A3 | Reissued link gets a fresh 60 days from reissue, not from the PV | Token design | Policy text and RPC change |
| A4 | Policy retention wording ("3 ans après dernière modération") | Policy | Legal wording; needs owner/lawyer confirmation |
| A5 | B2B reviews treated as covered by L111-7-2 | Policy | Overcompliance only; low risk |
| A6 | Reviewer e-mail is not stored; hidden-notice goes to project client members | Moderation | If a single reviewer address is required, add a column and a RGPD retention rule |
| A7 | `/api/avis` added as a price-scope zone (precedent `api/unsubscribe`) | Routing | Alternative: move enqueue into the RPC and avoid importing server mail code; still needs the sendOutboxRow call |

## Open Questions

1. **Consent withdrawal / RGPD erasure vs closed reason list (D-06).**
   - Known: closed list is four legal reasons; reviews are never deleted.
   - Unclear: how to honor a reviewer's withdrawal of consent.
   - Recommendation: hide with reason `third_party_personal_data` is inaccurate; ask the owner to add a fifth legal reason `consent_withdrawn` (legal basis, not opinion) or document it under the policy. Flag in discuss.
2. **Reissue delivery.** Display-once + optional mail (Pitfall 3). Owner confirmation on whether reissue should auto-send.
3. **First name + "initiale":** assume reviewer types first name and last-name initial in the form (fields `first_name`, `last_initial`); company name is read from `sv_clients.name` and snapshotted.
4. **Google Business URL** does not exist yet (PROJECT.md): ship with flag off; final task is a human checkpoint to set `REVIEW_GOOGLE_URL`, `REVIEW_TOKEN_SECRET`, then `REVIEW_REQUESTS_ENABLED=true`.

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Dedicated Supabase RLS branch | RLS suite | owner-approved per-phase pattern (create/delete per phase, STATE.md) | none; needs approval |
| Resend + domain | Outbox | existing | — |
| `REVIEW_TOKEN_SECRET`, `REVIEW_GOOGLE_URL` env | tokens / Google link | NOT yet defined; add to `.env.example`, Vercel, `.env.test.local` | fail closed |
| Google Business profile | REV-02 live | owner action pending | flag stays off |
| Permanent fixture "Test E2E Sèvalys" | prod e2e | exists (memory) | never delete |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 |
| Config | `vitest.config.ts` (unit, `src/**/*.test.ts`), `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, real branch, `SV_TEST_` env, `fileParallelism: false`) |
| Quick run | `npx vitest run src/lib/reviews src/lib/server/reminders src/lib/server/mail src/app/avis` |
| Full suite | `npx vitest run` ; RLS: `npx vitest run -c vitest.rls.config.ts` |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | Exists |
|-----|----------|------|---------|--------|
| REV-01 | token derive/hash round trip, length bound, generic invalid | unit | `vitest run src/lib/reviews/token.test.ts` | Wave 0 |
| REV-01 | sweep creates link at J+7, J+21 same linkId, none >60d, none if review/hold/flag off, config guard | unit | `vitest run src/lib/server/reminders/sweep.test.ts` | extend |
| REV-01 | outbox renders URL from linkId, never reviewUrl in payload | unit | `vitest run src/lib/server/mail/outbox.test.ts` | extend |
| REV-01 | single-use under concurrency, expiry boundary, invalidated link, RLS deny anon/auth | RLS | `tests/rls/reviews.rls.test.ts` | Wave 0 |
| REV-02 | Google link identical for ratings 1..5, no incentive wording, URL guard (https only) | unit | `vitest run src/app/avis` | Wave 0 |
| REV-03 | moderation log append-only (update/delete/truncate denied), closed reason enum, detail required, admin-only, unhide logged, review row immutable | RLS | `tests/rls/reviews.rls.test.ts` | Wave 0 |
| REV-03 | policy page has required sections and is linked from /avis, excerpt, form, footer; in sitemap and llms.txt | unit | `vitest run src/app/politique-des-avis src/app/sitemap.test.ts src/app/llms.test.ts` | Wave 0 / extend |
| REV-04 | JSON-LD: no price keys (price, priceRange, priceCurrency, offers, lowPrice, highPrice), no AggregateRating/aggregateRating/ratingCount/reviewCount, only published non-hidden, itemReviewed @id, `<` escaped | unit | `vitest run src/lib/reviews/reviewJsonLd.test.ts` | Wave 0 |
| Routing | `/avis` public, `/avis/x` private branch; robots/next.config noindex for token path | unit | `vitest run src/lib/privateRoutes.test.ts src/proxy.test.ts src/app/sitemap.test.ts` | extend |
| Scope | priceScope zones updated; public pages import no zone code | unit | `vitest run src/lib/priceScope.test.ts` | extend |

### Sampling Rate
- Per task commit: quick run above. Per wave merge: full unit suite. Phase gate: unit green + RLS suite green on branch + `tsc`/lint before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/reviews/{token,reviewJsonLd,schema,googleUrl}.test.ts`
- [ ] `tests/rls/reviews.rls.test.ts` + helper additions (`makeDeliveredProject` using `reachContractSigned`-style helpers to reach `acceptance_signed`)
- [ ] Update pinned tests listed in Pitfall 5

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V2/V3 | No (token form is anonymous by design) | Possession of unguessable token; admin pages use `requireAdmin()` |
| V4 Access Control | Yes | RLS admin-read, service_role only server-only; moderation RPC checks `sv_admins` |
| V5 Input Validation | Yes | Zod bounds, reject `<>`/links/control chars, React escaping, `buildJsonLdScript` |
| V6 Cryptography | Yes | `node:crypto` HMAC-SHA256 + SHA-256, no custom crypto, 256-bit |
| V7/V8 Logging, data | Yes | No token/e-mail/body in logs; no reviewer e-mail or IP stored |

| Threat | STRIDE | Mitigation |
|--------|--------|-----------|
| Token guessing/brute force | Spoofing | 256-bit, hash lookup, IP throttle on POST and invalid GET |
| Link scanner burns token | DoS | GET read-only, consume on POST |
| Token leak via Referer/analytics | Info disclosure | `no-referrer`, `noreferrer` on outbound, private proxy branch, noindex header |
| Double submit race | Tampering | Row lock + unique `link_id`/`project_id` |
| Stored XSS via review | Tampering | Reject markup, React text rendering, JSON-LD `<` escape |
| Admin hiding for opinion | Repudiation | Closed enum + mandatory detail + append-only log incl. service_role |
| Spam to admin inbox | DoS | Token-gated (one review per project), so bounded |

## Sources

### Primary (HIGH)
- Codebase files read: `src/lib/server/mail/{rules,flags,outbox,reminderEmails,unsubscribeToken,urls,suppression}.ts`, `src/lib/server/reminders/{sweep,cadence}.ts`, `src/app/api/cron/mail/route.ts`, `src/app/api/unsubscribe/route.ts`, `src/app/desinscription/*`, `src/lib/privateRoutes.ts`, `src/proxy.ts`, `src/app/{robots,sitemap,page}.ts*`, `next.config.ts`, `src/lib/{priceScope,serviceJsonLd,throttle}.ts`, `priceScope.test.ts`, `llms.test.ts`, `src/app/layout.tsx`, migration `20261008000000_sv_mail_automation.sql`, `src/app/admin/projets/reminderHold.actions.ts`
- Google Search Central review snippet guidelines: https://developers.google.com/search/docs/appearance/structured-data/review-snippet (self-serving rule, required properties)

### Secondary (MEDIUM)
- Legifrance L111-7-2 / D111-17 (via search): https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049571119 ; https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035724934/2023-03-28 (DGCCRF page returned 403; retention-period figure not confirmed)
- `.planning/research/PITFALLS.md` #6-7, `SUMMARY.md`

### Tertiary (LOW)
- B2B applicability of L111-7-2, exact retention duration: unverified

## Metadata
**Confidence:** stack HIGH (no new deps); architecture HIGH (patterns copied from phases 12/16); pitfalls HIGH for code-coupled ones, MEDIUM for legal.
**Research date:** 2026-10-08. **Valid until:** 30 days.

## Project Constraints (from CLAUDE.md)
No project `./CLAUDE.md` was read in this session beyond the global user instructions: prefix shell commands with `rtk` (token-optimized CLI). Project conventions honored here are those from CONTEXT.md D-14/D-15 (service_role server-only, RLS in same migration, append-only audit, no e-mail in logs, permanent test fixture never deleted).
