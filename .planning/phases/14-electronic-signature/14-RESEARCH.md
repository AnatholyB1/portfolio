# Phase 14: Electronic signature - Research

**Researched:** 2026-10-04
**Domain:** Signature électronique simple (OTP e-mail) + piste d'audit chaînée par hachage (Postgres) + scellement PDF (pdf-lib) sur Next 16 / Supabase partagé
**Confidence:** MEDIUM-HIGH (code existant lu directement ; comportements pdf-lib / Supabase Storage en iframe à confirmer par spike Wave 0)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Documents signables : devis, contrat, PV de recette. Faits produits : `quote_accepted`, `contract_signed`, `acceptance_signed`. Le cahier des charges est lu mais non signé (ses critères sont repris par le PV).
- **D-02:** Page de signature dédiée avec PDF intégré (`/espace-client/…/signer`) : le PDF émis est affiché dans la page (iframe sur lien signé court, mêmes octets que ceux dont l'empreinte est signée), puis cases de consentement, puis envoi du code. Pas de lecture obligatoire jusqu'en bas.
- **D-03:** Consentement explicite avant tout code : signature électronique et clause de convention de preuve, cases non précochées affichant le texte exact ; le texte et sa version sont enregistrés dans la piste d'audit. La clause de convention de preuve est ajoutée aux modèles de contrat (et reprise dans la page de consentement) ; texte à faire relire (blocker juridique existant).
- **D-04:** Le code à usage unique part vers l'e-mail de connexion du client (adresse de la session authentifiée). Le signataire déclaré à l'onboarding doit correspondre à l'utilisateur connecté, sinon blocage avec message clair. Code haché en base, expire à 10 minutes, 5 essais maximum.
- **D-05:** Après 5 essais ratés ou expiration : le code est invalidé, le client peut en redemander un (délai de 60 s, 5 envois par heure et par document maximum). Chaque envoi, échec et expiration est journalisé dans la piste d'audit.
- **D-06:** Sèvalys ne contre-signe pas. L'émission par l'admin vaut engagement du vendeur ; seule la signature client est tracée. Le contrat le précise.
- **D-07:** Nouveau fichier scellé = pages de l'original + page certificat. L'original reste intact en écriture unique (empreinte phase 13). L'objet scellé est stocké à part, avec son propre SHA-256. La piste d'audit enregistre les deux empreintes. Aucun re-rendu depuis l'instantané (ne jamais régénérer un document signé).
- **D-08:** Page certificat « preuve complète lisible » : document, version du modèle, SHA-256 de l'original, signataire (nom, fonction, e-mail), date/heure Europe/Paris et UTC, IP, empreinte du dernier maillon de la piste, mention de signature simple et de convention de preuve. Pas d'user-agent détaillé ni de géolocalisation.
- **D-09:** Stockage dans le bucket privé existant `sv-…`, écriture unique, chemin non devinable, jamais écrasé. Le client télécharge le scellé par lien signé de quelques minutes avec vérification d'empreinte comme en phase 13 ; l'original reste accessible côté admin. Pas de pièce jointe e-mail.
- **D-10:** Une chaîne de hachage par document. Chaque maillon hache le précédent ; export et vérification indépendants par document, pas de contention globale.
- **D-11:** Parcours complet journalisé : ouverture/lecture du document, consentements (texte, version), code envoyé, échec, expiration, signature, scellement, téléchargement du scellé, et pour le PV les coches/réserves. Chaque maillon : horodatage serveur, IP, empreinte du document, version du modèle, acteur.
- **D-12:** Ajout seul garanti en base : triggers refusant UPDATE/DELETE/TRUNCATE y compris pour `service_role`, insertion par fonction SQL (RPC) qui calcule le hachage et verrouille la fin de chaîne par document (anti-fork), RLS client en lecture de ses propres maillons. Test RLS et test de falsification sur la branche Supabase dédiée.
- **D-13:** Export admin en JSON vérifiable, bouton dans la fiche document, plus un contrôle d'intégrité en base qui recalcule la chaîne et affiche OK/rompue. Un utilitaire (testé) vérifie l'export hors ligne. Pas de CSV ni PDF de la piste.
- **D-14:** Le client coche chaque critère d'acceptation (repris du cahier des charges émis) comme livré, ou signale une réserve, puis signe le PV complet (un PV par projet, D-09 phase 13). Coches et réserves sont conservées dans la piste et reproduites dans le PV scellé.
- **D-15:** Réserve = signature possible avec réserves inscrites au PV scellé ; refus d'un critère = envoi du code bloqué, l'admin est notifié et réémet un PV corrigé qui remplace l'ancien (D-03 phase 13).
- **D-16:** Producteur automatique de faits : la signature pose `quote_accepted` / `contract_signed` / `acceptance_signed` (auteur = signataire, motif = référence du document) en lien direct avec le scellement. Les gestes admin manuels existants restent possibles en correction journalisée (phase 12 D-09), l'UI signale qu'une signature existe. Un échec de scellement ne doit jamais laisser un fait posé sans scellé : le planificateur définit l'atomicité (DB + stockage).
- **D-17:** Signé = gelé. Un document signé ne peut plus être remplacé (action « Remplacer » désactivée) ; les avenants sont hors phase, les correctifs passent par un fait correctif admin journalisé.
- **D-18:** E-mails après signature via le moteur de mails existant (règles en code, clé d'unicité par document) : confirmation au client (lien portail, sans pièce jointe) et alerte à l'admin.
- **D-19:** Hérité : portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public. Bucket privé préfixé `sv-` sans toucher aux politiques `storage.objects` de Gecko. Client de test permanent « Test E2E Sèvalys » à réutiliser, sans le supprimer. Statuts de document déduits des faits. Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables (signatures, maillons, codes), noms des types d'événements, format JSON de l'export, découpage des plans.
- Bibliothèque de manipulation PDF pour la page certificat (`pdf-lib` prévu par la recherche STACK) et mise en page de la page certificat.
- Longueur du code de signature et mécanisme d'envoi (moteur de mails existant ou envoi direct).
- Libellés français de la page de signature, du consentement (hors texte juridique à relire), des e-mails.
- Atomicité entre écriture en base, upload du scellé et pose du fait (D-16).
- Durée du lien signé court de l'iframe et détail du téléchargement.

### Deferred Ideas (OUT OF SCOPE)
- Horodatage qualifié RFC 3161 et signature avancée via un tiers (SIGN-06)
- Avenants sur documents signés
- Export CSV / PDF de la piste d'audit
- Contre-signature électronique du vendeur
- Texte de la convention de preuve, conservation et RGPD de la piste : à traiter à la relecture juridique
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIGN-01 | Code à usage unique par e-mail (haché, 10 min, 5 essais) | Tables `sv_signature_codes` + RPC request/verify ; HMAC-SHA256 avec secret serveur ; compteur d'essais atomique qui ne lève PAS d'exception sur échec (sinon rollback du compteur) |
| SIGN-02 | Consentement explicite signature + convention de preuve | Maillon `consent_given` avec texte exact + version ; le RPC d'envoi du code exige un consentement du même document/version |
| SIGN-03 | Piste d'audit ajout seul, chaînée par hachage | `sv_signature_events` + `sv_private.append_signature_event` (verrou advisory par document, `sha256()` natif, triggers `deny_mutation`) ; parité SQL/TS testée |
| SIGN-04 | PDF scellé + page certificat ; piste exportable | pdf-lib `PDFDocument.load` + `addPage` ; table `sv_document_seals` ; export JSON + vérificateur TS hors ligne |
| SIGN-05 | PV : validation de chaque critère livré, signature débloque l'étape | `sv_acceptance_responses` + maillons ; fait `acceptance_signed` posé dans la même transaction que le scellé |
</phase_requirements>

## Summary

La phase 13 a déjà posé presque toutes les briques : documents figés avec `sha256` + `storage_path` (`sv_project_documents`, append-only), bucket privé `sv-documents`, téléchargement signé de 120 s avec contrôle d'empreinte (`src/lib/server/documents/download.ts`), outbox e-mail à `dedupe_key`, faits projet en ajout seul avec RPC `sv_post_project_fact` (idempotent, `changed:false` si déjà posé), patron `sv_private.deny_mutation()` (triggers UPDATE/DELETE/TRUNCATE). La phase 14 ajoute : (1) trois tables append-only (événements chaînés, signatures, scellés) + une table mutable de codes + une table de réponses PV ; (2) des RPC `security definer` service_role-only ; (3) un module `src/lib/signature/*` (pur, testable : canonicalisation, vérificateur de chaîne, texte de consentement, HMAC) ; (4) un scelleur pdf-lib ; (5) pages/actions portail et admin.

Le point d'architecture central est l'atomicité DB + stockage + fait. Le stockage n'est pas transactionnel : la solution recommandée est un protocole en deux transactions séparées par un upload à écriture unique : **(A)** RPC `sv_verify_signature_code` (consomme le code + écrit la signature et le maillon `signed`, sans poser de fait) ; **(B)** pdf-lib construit le scellé à partir des octets originaux + de la ligne de signature, upload `upsert:false` sous un chemin aléatoire ; **(C)** RPC `sv_seal_document` insère la ligne de scellé, le maillon `sealed`, le fait projet (`sv_post_project_fact` appelé en interne) et les lignes d'outbox, dans UNE transaction. Le fait n'existe donc jamais sans scellé ; une signature sans scellé est un état récupérable (finalisation idempotente, déterministe car le certificat ne dépend que de la ligne de signature).

**Primary recommendation:** Utiliser `pdf-lib@1.17.1` + `@pdf-lib/fontkit@1.1.1` (police Manrope déjà dans `fontData.ts`), chaîne de hachage calculée en SQL avec `sha256()` natif de Postgres (aucune extension) sur une chaîne canonique de champs scalaires + un `payload` stocké en TEXTE canonique (jamais re-sérialisé par jsonb), verrou `pg_advisory_xact_lock` par document, et les trois RPC A/B/C ci-dessus ; valider la parité SQL/TS du hachage par un test sur la branche.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Affichage PDF + cases de consentement | Browser / Client | Frontend Server (SSR) | Page `signer` serveur ; seules les cases/saisie du code sont interactives |
| Génération/HMAC du code, envoi e-mail | API / Backend (server action, `server-only`) | — | Le code en clair ne touche jamais la base ni l'outbox |
| Compteur d'essais, expiration, rate limit 60 s / 5 par heure | Database / Storage (RPC) | — | Atomicité : un seul verrou, pas de course entre requêtes parallèles |
| Chaîne de hachage, append-only | Database / Storage (RPC + triggers) | — | Seule la base peut garantir l'ajout seul y compris pour `service_role` |
| Scellement PDF (pdf-lib) | API / Backend (Node runtime) | Database (ligne de scellé) | Calcul d'octets ; la DB ne stocke que chemin + empreinte |
| Pose du fait + e-mails post-signature | Database / Storage (même transaction que le scellé) | API (envoi Resend au mieux) | Garantit « pas de fait sans scellé » |
| Vérification d'export hors ligne | API / Backend (utilitaire TS pur) | — | Pure fonction partagée par test et éventuellement CLI |
| Capture IP | Frontend Server (headers de la requête) | — | `x-forwarded-for` lu dans l'action, jamais côté client |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 (dernière publication 2022-05) | Charger le PDF original, ajouter la page certificat | Prévu par STACK.md / CONTEXT ; JS pur, aucun natif, fonctionne en runtime Node de Next [VERIFIED: npm registry — pas d'installation faite, `npm view`] |
| @pdf-lib/fontkit | 1.1.1 | Embarquer Manrope (accents, guillemets, espaces insécables fines) | Requis par pdf-lib pour polices personnalisées [CITED: github.com/Hopding/pdf-lib README] |
| node:crypto | Node 26 (local) | `createHmac`, `randomInt`, `timingSafeEqual`, `createHash('sha256')` | Intégré, aucune dépendance |
| @supabase/supabase-js | ^2.117.2 (déjà installé) | RPC service_role, Storage | Existant |
| resend | ^6.28.1 (déjà installé) | Envoi direct du code | Existant, même client que l'outbox |
| zod | ^4.6.5 (déjà installé) | Validation des entrées d'actions | Existant |
| vitest | ^4.1.11 (déjà installé) | Tests unitaires + `test:rls` | Existant |

### Supporting
Aucune nouvelle dépendance au-delà de `pdf-lib` et `@pdf-lib/fontkit`. Pas de lib OTP (le code est un entier à 6 chiffres `crypto.randomInt(0, 1_000_000)`), pas de lib de hash-chain (30 lignes de SQL + 30 lignes de TS).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-lib 1.17.1 | `@cantoo/pdf-lib` 2.11.1 (fork maintenu, modifié 2026-09-15) | Fork actif, mais dépendances supplémentaires (`culori`, `node-html-better-parser`) et nom moins établi. Garder pdf-lib (décision STACK) ; ne basculer sur le fork que si le spike Wave 0 révèle un bug de chargement sur les PDF @react-pdf |
| Texte via StandardFonts | Manrope via fontkit | StandardFonts (WinAnsi) lève une exception sur les caractères hors WinAnsi, p. ex. U+202F (espace fine insécable produite par `Intl` fr-FR) et `→`. Recommandé : Manrope embarqué + normalisation du texte |
| Envoi du code via outbox | Envoi direct Resend | L'outbox persiste `payload` en clair : interdit pour le code. Envoi direct (voir Pattern 3) |

**Installation:**
```bash
npm install pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1
```
**Version verification:** `npm view pdf-lib version` = 1.17.1 ; `npm view @pdf-lib/fontkit version` = 1.1.1 (exécuté 2026-10-04). Aucun `postinstall` déclaré sur pdf-lib. `slopcheck` a rendu [OK] pour les trois paquets ; son sous-commande `install` a tenté un `npm install` (nul effet constaté : `package.json` inchangé, `git status` propre) : ne pas relancer `slopcheck install` dans le dépôt.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| pdf-lib | npm | ~6 ans (1.17.1 : 2022-05) | très élevé (non mesuré ici) | github.com/Hopding/pdf-lib | [OK] (avertissement de nom « -lib » sans objet) | Approved — mais non maintenu depuis 2022 (voir Pitfall 9) |
| @pdf-lib/fontkit | npm | 2022-04 | n/m | github.com/Hopding/fontkit | [OK] | Approved |
| @cantoo/pdf-lib | npm | actif (2026-09) | n/m | github.com/cantoo-scribe/pdf-lib | [OK] | Alternative non retenue |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
Tag de provenance : les noms `pdf-lib` / `@pdf-lib/fontkit` viennent de CONTEXT.md et de `.planning/research/STACK.md` (documents de projet, pas d'un moteur de recherche) et sont confirmés par `npm view` + slopcheck. Le downloads exact n'a pas été mesuré [ASSUMED: popularité].

## Architecture Patterns

### System Architecture Diagram

```
Client (session) ──► /espace-client/documents/[id]/signer  (RSC: charge doc via client RLS, statut déduit des faits)
   │ 1. ouvrir        └► aperçu PDF (iframe) ──► [route handler aperçu | lien signé court] ──► log 'document_opened'
   │ 2. (PV) coches/réserves ─► action ─► RPC sv_submit_acceptance ─► sv_acceptance_responses + maillons
   │ 3. consentements ─► action ─► RPC sv_record_signature_consent ─► maillon 'consent_given' (texte exact + version)
   │ 4. "Envoyer le code" ─► action: HMAC(code) ─► RPC sv_request_signature_code
   │        │   (verrou projet→doc, contrôles 60 s / 5 par h / refus PV / head / non signé / signataire)
   │        │   └► sv_signature_codes (hmac, exp 10 min) + maillon 'code_sent'
   │        └► Resend direct (code en clair uniquement en mémoire) ; échec ⇒ RPC 'code_send_failed'
   │ 5. saisie code ─► action: HMAC ─► RPC sv_verify_signature_code (A)
   │        ├ faux  : attempts+1, maillon 'code_failed' (RETOURNE ok:false, ne lève pas)  ┐ 5e ⇒ 'code_locked'
   │        ├ expiré: maillon 'code_expired', invalide                                       ┘
   │        └ bon   : consomme code + sv_document_signatures + maillon 'signed' (dernier maillon = empreinte du certificat)
   │ 6. scellement (B) ─► pdf-lib: load(original, updateMetadata:false) + page(s) certificat ─► sha256 ─► upload upsert:false (chemin aléatoire)
   │ 7. (C) RPC sv_seal_document ── UNE transaction : sv_document_seals + maillon 'sealed'
   │                                 + sv_post_project_fact(actor client) + outbox (client, admin)
   │        └ échec ⇒ supprimer l'objet orphelin ; signature reste "à finaliser" ⇒ nouvel essai idempotent
   ▼
 Portail: statut "Signé" + téléchargement du scellé (RPC 'seal_downloaded' puis lien signé 120 s + contrôle d'empreinte)
 Admin  : export JSON piste · contrôle d'intégrité (sv_verify_signature_chain) · "Remplacer" désactivé si signé
 Cron mail (quotidien 06:00 UTC, vercel.json) : filet de sécurité pour envois d'outbox, PAS pour la finalisation (trop lent)
```

### Recommended Project Structure
```
supabase/migrations/20261006000000_sv_signature.sql      # tables + RLS + triggers + RPC + extension outbox + garde sv_issue_document
src/lib/signature/                                        # PUR (importable par tests, sans server-only)
├── canonical.ts          # JSON canonique (clés triées), chaîne de hachage d'un maillon
├── verifyChain.ts        # vérificateur hors ligne de l'export (+ .test.ts avec vecteur d'or)
├── consentText.ts        # textes + version ('v1') — texte juridique à relire
├── events.ts             # liste fermée des types d'événements
└── certificate.ts        # modèle de données de la page certificat (mise en page séparée)
src/lib/server/signature/                                 # server-only
├── codes.ts              # génération, HMAC, envoi Resend
├── chain.ts              # wrappers RPC (log événement, export, vérification)
├── seal.ts               # pdf-lib + upload + RPC sv_seal_document (+ retry idempotent)
├── sealDownload.ts       # patron de download.ts pour le scellé
└── clientIp.ts           # getClientIp + net.isIP
src/lib/server/mail/signatureCodeEmail.ts, documentSignedEmail.ts (+ events dans rules.ts/outbox.ts)
src/app/espace-client/documents/[id]/signer/{page.tsx,actions.ts}
src/app/admin/…/documents/[id]/ (export, intégrité)
tests/rls/signature.rls.test.ts
```

### Pattern 1: Chaîne de hachage en SQL (anti-fork, parité TS)
**What:** Une fonction interne (non exposée) calcule et insère le maillon ; les RPC publics l'appellent.
**When to use:** Tout événement de la piste.
**Example:**
```sql
-- Source: patron du dépôt (20261003000000_sv_leads_core.sql deny_mutation) + doc Postgres sha256() (PG >= 11, sans pgcrypto)
create table if not exists public.sv_signature_events (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.sv_project_documents (id) on delete restrict,
  seq integer not null check (seq >= 1),
  event_type text not null check (event_type in ('document_opened','acceptance_response','consent_given',
    'code_sent','code_send_failed','code_failed','code_locked','code_expired','signed','sealed','seal_downloaded','acceptance_refused')),
  actor_kind text not null check (actor_kind in ('client','admin','system')),
  actor_id uuid null,                       -- PAS de FK vers auth.users (patron des journaux)
  ip text null check (ip is null or char_length(ip) <= 45),
  doc_sha256 text not null check (doc_sha256 ~ '^[0-9a-f]{64}$'),
  template_version text not null,
  payload text not null,                    -- JSON canonique produit par l'app, JAMAIS re-sérialisé
  occurred_at timestamptz not null,
  prev_hash text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  link_hash text not null check (link_hash ~ '^[0-9a-f]{64}$'),
  unique (document_id, seq),
  unique (document_id, prev_hash)           -- second filet anti-fork
);

create or replace function sv_private.append_signature_event(
  p_document_id uuid, p_event text, p_actor_kind text, p_actor_id uuid,
  p_ip text, p_payload text)
returns public.sv_signature_events
language plpgsql security definer set search_path = '' as $$
declare
  v_doc public.sv_project_documents%rowtype;
  v_prev public.sv_signature_events%rowtype;
  v_seq integer; v_prev_hash text; v_at timestamptz := clock_timestamp(); v_hash text;
  v_row public.sv_signature_events;
begin
  -- clé à deux entiers : pas de collision avec d'éventuels verrous Gecko
  perform pg_advisory_xact_lock(hashtext('sv_sig_chain'), hashtext(p_document_id::text));
  select * into v_doc from public.sv_project_documents where id = p_document_id;
  if not found then raise exception 'sv_document_not_found' using errcode='P0001'; end if;
  select * into v_prev from public.sv_signature_events where document_id = p_document_id order by seq desc limit 1;
  v_seq := coalesce(v_prev.seq, 0) + 1;
  v_prev_hash := coalesce(v_prev.link_hash, encode(sha256(convert_to('sv-genesis:' || p_document_id::text,'UTF8')),'hex'));
  -- champs séparés par chr(31) ; l'IP est validée, le payload est du JSON dont les contrôles sont échappés (\u001f)
  v_hash := encode(sha256(convert_to(concat_ws(chr(31), 'v1', p_document_id::text, v_seq::text, p_event, p_actor_kind,
      coalesce(p_actor_id::text,''), coalesce(p_ip,''), v_doc.sha256, v_doc.template_version,
      to_char(v_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), p_payload, v_prev_hash), 'UTF8')), 'hex');
  insert into public.sv_signature_events (document_id, seq, event_type, actor_kind, actor_id, ip, doc_sha256,
    template_version, payload, occurred_at, prev_hash, link_hash)
  values (p_document_id, v_seq, p_event, p_actor_kind, p_actor_id, p_ip, v_doc.sha256, v_doc.template_version,
    p_payload, v_at, v_prev_hash, v_hash) returning * into v_row;
  return v_row;
end; $$;
revoke all on function sv_private.append_signature_event(uuid,text,text,uuid,text,text) from public, anon, authenticated;
```
Ensuite : RLS activée, `revoke all … from anon, authenticated, service_role`, `grant select` à `authenticated` (policy : admin OU document appartenant à un projet de `sv_private.project_ids()`), **`grant select` seulement à `service_role`** (pas d'insert direct : l'insertion passe par la fonction `security definer`, donc même `service_role` ne peut pas forker), triggers `deny_mutation` row + truncate comme sur `sv_project_documents`.

### Pattern 2: Ordre de verrous et atomicité du scellement
**What:** Toujours verrouiller **projet (`for update`) puis document (advisory)**. `sv_issue_document` et `sv_post_project_fact` verrouillent déjà la ligne `sv_projects` ; les RPC de signature font pareil avant le verrou advisory, sinon risque d'interblocage et de course « remplacement pendant signature ».
**Phase A (`sv_verify_signature_code`)** : verrou projet → vérifier que le document est la tête de chaîne (aucun `replaces_document_id = id`) et non déjà signé → verrou code → comparer → écrire. **Phase C (`sv_seal_document`)** : `unique(document_id)` sur `sv_document_seals`, puis `perform public.sv_post_project_fact(project, fact_type, 'client', signer_id, null, reference)` dans la même transaction (idempotent : si l'admin a déjà posé le fait, `changed:false`, le scellé reste valide), puis les `insert into sv_mail_outbox … on conflict (dedupe_key) do nothing returning id`.
**Example (côté app):**
```typescript
// Source: patron src/lib/server/documents/issue.ts (upload upsert:false -> RPC -> removeOrphan)
const sealed = await buildSealedPdf(originalBytes, certificateData);          // pdf-lib, déterministe
const path = `${projectId}/sealed/${crypto.randomUUID()}.pdf`;                  // non devinable
const up = await admin.storage.from(SV_DOCUMENTS_BUCKET).upload(path, sealed.bytes, { contentType: 'application/pdf', upsert: false });
if (up.error) return { ok: false, code: 'upload_failed' };                      // signature reste à finaliser
const rpc = await callRpc('signature/seal', 'sv_seal_document', { p_document_id, p_storage_path: path, p_sha256: sealed.sha256, p_size: sealed.size });
if (!rpc.ok) { await removeOrphan(admin, path); /* sv_already_sealed ⇒ succès idempotent */ }
```

### Pattern 3: Code à usage unique
**What:** `crypto.randomInt(0, 1_000_000)` → 6 chiffres (zéro-padding). Stocké : `HMAC-SHA256(SV_SIGNATURE_CODE_SECRET, documentId + ':' + userId + ':' + code)` en hex. Un code à 6 chiffres n'a que 20 bits : un simple SHA-256 en base serait retrouvé en millisecondes si la base fuit, d'où le HMAC à secret serveur (même idée que `SV_IP_HASH_SECRET`). Le RPC reçoit le HMAC (jamais le code) et compare en SQL.
**Règle critique :** un RPC qui `raise exception` annule aussi l'incrément `attempts`. Le RPC de vérification doit **retourner** `{ok:false, reason, remaining}` après avoir commit l'incrément et le maillon `code_failed`, et ne lever que pour les erreurs de programmation/état (`sv_document_superseded`, …). Les 5 essais sont comptés sur la ligne de code verrouillée `for update`, donc 20 requêtes parallèles ne donnent pas plus de 5 essais.
**Envoi :** direct par Resend (même `RESEND_API_KEY`, `idempotencyKey = codeId`), jamais par `sv_mail_outbox` (le `payload` y est stocké en clair). Si l'envoi échoue, appeler `sv_log_code_send_failed` (maillon + invalidation) afin de ne pas consommer le quota de 5 envois par heure sans faute du client (à trancher : l'envoi échoué compte-t-il ? recommandation : oui pour le quota, c'est plus simple et plus sûr).
**Limites D-05 :** appliquées dans le RPC par `count(*)` sur `sv_signature_codes` (par document, 1 heure glissante) et `max(created_at)` (60 s), pas via `hitThrottle` (qui est par e-mail/IP hachés et ne porte pas la notion de document). Ajouter en plus `hitThrottle(hashKey('contact-ip'…))`-like par IP serait superflu ; ne pas élargir `ThrottleKind` sans besoin.

### Pattern 4: Certificat pdf-lib déterministe
```typescript
// Source: pdf-lib docs (PDFDocument.load, addPage, embedFont + fontkit) [CITED: pdf-lib.js.org]
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
const pdf = await PDFDocument.load(originalBytes, { updateMetadata: false });
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(manropeTtfBytes, { subset: true });   // décoder MANROPE_* de fontData.ts (data:… base64, WOFF)
pdf.setCreationDate(signedAt); pdf.setModificationDate(signedAt);       // octets identiques à chaque nouvel essai
const page = pdf.addPage([595.28, 841.89]);                             // A4 ; pagination manuelle si critères/réserves nombreux
// … drawText avec retour à la ligne manuel (pas de wrap natif) …
const bytes = await pdf.save({ useObjectStreams: false });
```
Notes : `fontData.ts` expose des **data-URI WOFF** (pour react-pdf) ; fontkit sait lire WOFF, mais le spike Wave 0 doit confirmer l'embarquement du sous-ensemble (sinon générer un TTF Manrope dédié via `scripts/gen-pdf-fonts.mjs`). Le certificat pour un PV doit reproduire coches et réserves (D-14) : prévoir une pagination (N pages certificat/annexe). Le « SHA-256 de l'original » imprimé dans le certificat = `sv_project_documents.sha256`, déjà connu : aucun re-hash nécessaire, mais **recalculer le hash des octets téléchargés et refuser de sceller si différent** (défense contre un objet corrompu).

### Pattern 5: Export JSON vérifiable
Format recommandé : `{ formatVersion:1, document:{id, reference, docType, templateVersion, originalSha256, sealSha256|null}, genesisHash, events:[{seq,eventType,actorKind,actorId,ip,occurredAtUtc (chaîne microsecondes telle que hachée),payload (texte canonique),prevHash,linkHash}], headHash, exportedAt }`. L'export doit sérialiser `occurredAtUtc` avec **la même chaîne que celle hachée** (produite par SQL via `to_char`, renvoyée par un RPC `sv_export_signature_chain`) : un `timestamptz` repassé par `Date` JS perd les microsecondes et casse le hash. `verifyChain.ts` : recalcule chaque `link_hash`, vérifie `prevHash`/`seq` contigus, retourne `{ok, brokenAtSeq}`. Vecteur d'or généré par la base de la branche et figé dans le test.

### Anti-Patterns to Avoid
- **Hacher `jsonb::text` ou re-sérialiser le payload en JS** : l'ordre des clés et les espaces diffèrent entre Postgres et JS. Stocker le texte canonique tel quel.
- **Régénérer le PDF depuis l'instantané** : le rendu @react-pdf n'est pas reproductible (cf. `render.ts`) ; ne sceller que depuis les octets du bucket.
- **Poser le fait avant le scellé** ou dans une action séparée après la RPC : viole D-16.
- **Journaliser `document_opened` pendant le rendu RSC** : préchargements/double rendu gonflent la piste ; journaliser à la création du lien d'aperçu / à l'appel du handler, avec dédoublonnage (un maillon par fenêtre de quelques minutes et par utilisateur).
- **Donner `insert` à `service_role` sur la table des maillons** : permettrait de forker en contournant le verrou.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Assemblage PDF | Concaténation d'octets / second moteur de rendu | `pdf-lib` load + addPage | Table xref, flux d'objets, polices |
| SHA-256 SQL | pgcrypto `digest` (schéma `extensions`, chemin de recherche vide) | `sha256(bytea)` natif PG 11+ | Pas de dépendance d'extension sur un projet partagé |
| Comparaison de secrets | `===` sur le HMAC en JS | `crypto.timingSafeEqual` si la comparaison est faite côté app ; en SQL, comparer des HMAC (non devinables) | Fuite temporelle |
| Codes aléatoires | `Math.random()` | `crypto.randomInt` | CSPRNG |
| Ajout seul | Convention applicative | Triggers `sv_private.deny_mutation()` row + statement | Déjà standard dans le dépôt, vaut pour `service_role` |
| Idempotence e-mail | Table maison | `sv_mail_outbox.dedupe_key` | Moteur existant |
| Pose de fait | Insert direct dans `sv_project_facts` | `sv_post_project_fact` | Idempotence, verrou projet, notes |
| Lien de téléchargement | URL publique | Patron `createDocumentDownloadUrl` (RLS puis chemin en service_role, 120 s) | D-09 |

**Key insight:** la preuve tient à trois invariants que seule la base peut garantir (ajout seul, ordre/hachage sous verrou, un seul scellé par document). Tout le reste (PDF, e-mail) est rejouable.

## Runtime State Inventory
Phase additive (pas de renommage/migration de données). Seul point : la **nouvelle version de modèle du contrat** (clause de convention de preuve, D-03). Les contrats déjà émis restent en `v1` et ne sont jamais réécrits ; seuls les nouveaux contrats sortent en `v2`. Aucune donnée stockée, config de service, état OS, secret ou artefact de build existant ne porte un nom à renommer — vérifié par lecture de la migration 13 et des modules documents. Nouveaux secrets/env à provisionner : `SV_SIGNATURE_CODE_SECRET` (Vercel prod/preview + `.env.test.local`), documenter dans `.env.example`.

## Common Pitfalls

### Pitfall 1: Compteur d'essais annulé par une exception
**What goes wrong:** le RPC lève `sv_code_invalid` ⇒ rollback ⇒ `attempts` n'augmente jamais ⇒ essais illimités. **How to avoid:** retourner un JSON d'échec, tester explicitement en RLS (6e essai refusé même avec le bon code). **Warning signs:** `attempts` reste à 0 en base après un faux code.

### Pitfall 2: Fait posé sans scellé (ou l'inverse)
**How to avoid:** protocole A/B/C ; test qui force l'échec de l'upload et vérifie qu'aucun `sv_project_facts` ni `sv_document_seals` n'existe ; test qui force l'échec du RPC C et vérifie la suppression de l'objet orphelin.

### Pitfall 3: Fork de chaîne sous concurrence
**How to avoid:** verrou advisory + `unique(document_id, seq)` + `unique(document_id, prev_hash)` ; test à 20 `Promise.all` d'ajouts, puis `sv_verify_signature_chain` = OK et `seq` contigus.

### Pitfall 4: Désaccord de hachage SQL/TS
Causes : microsecondes tronquées, fuseau, `payload` re-sérialisé, `null` vs chaîne vide, normalisation Unicode. **How to avoid:** chaînes uniquement, UTC en `to_char`, vecteur d'or issu de la base, test de parité.

### Pitfall 5: Remplacement d'un document signé / course remplacement-signature
`sv_issue_document` ne connaît pas les signatures : le recréer (`create or replace`, même signature de fonction) avec `if exists (select 1 from public.sv_document_signatures where document_id = p_replaces) then raise exception 'sv_document_signed'`. Le RPC de signature (A) revérifie que le document est encore la tête après le verrou projet. L'UI désactive « Remplacer » mais la base fait foi (D-17).

### Pitfall 6: Iframe PDF bloqué ou inutilisable
Le comportement des en-têtes de réponse de Supabase Storage (par ex. une CSP restrictive) vis-à-vis d'un `<iframe>` n'est pas vérifié dans cette session [ASSUMED]. Safari iOS n'affiche en général que la première page d'un PDF en iframe [ASSUMED]. **How to avoid:** spike Wave 0 sur le lien signé réel (Chrome + Safari mobile). Repli conforme à l'esprit de D-02 : un route handler authentifié (`GET /espace-client/documents/[id]/apercu`) qui lit les octets en service_role, **vérifie `sha256` = ligne**, journalise `document_opened`, renvoie `application/pdf` avec `Content-Disposition: inline`, `Cache-Control: private, no-store`, `X-Frame-Options: SAMEORIGIN`. Les fonctions Vercel limitent le corps de réponse non streamé (4,5 Mo) [ASSUMED] : streamer ou rester sur le lien signé. Toujours prévoir un lien « Ouvrir le PDF dans un nouvel onglet » comme secours. `next.config.ts` ne pose aujourd'hui aucune CSP/`X-Frame-Options` ; ne pas en ajouter qui bloque `frame-src`.

### Pitfall 7: Signataire ≠ utilisateur connecté (D-04)
L'onboarding ne stocke que `signatory_name` / `signatory_role` (pas d'e-mail, vérifié dans la migration 12). La correspondance « signataire déclaré = utilisateur connecté » ne peut donc porter que sur : l'utilisateur est membre du client (`sv_client_members.invited_email` = e-mail de session) ET la section « signataire » de l'onboarding est complète. Le certificat imprime nom/fonction déclarés + e-mail de session. **À confirmer avec l'utilisateur** (Open Question 1).

### Pitfall 8: Contraintes `sv_mail_outbox` à étendre
Reprendre telle quelle la boucle `do $$ … pg_get_constraintdef … ilike` de la migration 13 (ne jamais se fier aux noms), avec les nouveaux événements/modèles : `document_signed` (client), `document_signed_admin` (admin, `ADMIN_NOTIFY_EMAIL`), `acceptance_refused` (admin). Mettre à jour `MAIL_EVENTS`, `MAIL_RULES`, `dedupeKey`, le `switch` de `buildMail` dans `outbox.ts` et `urls.ts`. Les tests existants `rules.test.ts` / `outbox.test.ts` listent les événements fermés.

### Pitfall 9: pdf-lib non maintenu
Dernière version 2022. Risques : PDF produits par @react-pdf avec flux d'objets/polices atypiques. **Mitigation :** test unitaire qui scelle un PDF réellement rendu par `renderDocument` pour chacun des trois types, recharge la sortie, compte les pages (n+1), et conserve les octets de contenu des pages originales ; repli `@cantoo/pdf-lib`.

### Pitfall 10: Finalisation tardive
Le cron mail est quotidien (`vercel.json`, 06:00). Ne pas s'appuyer dessus pour finaliser les signatures sans scellé : finaliser en ligne (même action, un nouvel essai automatique) + bouton « Reprendre la finalisation » (signataire ou admin) + sélecteur des signatures sans scellé au chargement de la fiche.

### Pitfall 11: Espace fine U+202F et autres caractères hors police
Normaliser les chaînes (`Intl` fr-FR) avant `drawText`, ou s'assurer que Manrope les couvre ; tester le certificat avec un nom accentué et une apostrophe typographique.

### Pitfall 12: IP
`x-forwarded-for` (premier élément), validée avec `net.isIP`, comme `getClientIp` du dépôt ; sur Vercel l'en-tête est réécrit par la plateforme [ASSUMED]. D-08 exige l'IP lisible dans le certificat : la piste stocke donc l'IP **en clair** (pas le `hashIp` HMAC de la phase 11) — point RGPD/conservation à inscrire dans la relecture juridique (déjà listé en Deferred).

## Code Examples

### Génération et hachage du code
```typescript
// Source: Node crypto docs [CITED: nodejs.org/api/crypto.html]
import { createHmac, randomInt } from 'node:crypto';
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const codeHmac = (secret: string, documentId: string, userId: string, code: string) =>
  createHmac('sha256', secret).update(`${documentId}:${userId}:${code}`).digest('hex');
```

### Vérificateur hors ligne
```typescript
// pure : aucun import server-only ; mêmes champs et séparateur que le SQL
import { createHash } from 'node:crypto';
export function linkHash(e: LinkFields): string {
  const s = ['v1', e.documentId, String(e.seq), e.eventType, e.actorKind, e.actorId ?? '', e.ip ?? '',
    e.docSha256, e.templateVersion, e.occurredAtUtc, e.payload, e.prevHash].join('\u001f');
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
```

### Contrôle d'intégrité en base
`sv_verify_signature_chain(p_document_id)` : boucle `order by seq`, recalcule avec la même expression que `append_signature_event` (factoriser dans `sv_private.signature_link_hash(...)` immuable utilisée par les deux), retourne `{ok:boolean, broken_at:int|null, head_hash:text}`. service_role seul ; l'action admin appelle `requireAdmin()` avant.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| pgcrypto `digest()` | `sha256()` natif Postgres (11+) | pas d'extension/chemin `extensions` à gérer dans un projet partagé |
| Trigger seul pour l'immuabilité | Trigger + insertion uniquement par fonction `security definer` sans grant d'insert | empêche aussi le fork de chaîne par `service_role` |
| Hacher jsonb | Hacher un texte canonique stocké | reproductibilité hors base |

**Deprecated/outdated:** `pdf-lib` n'est plus publié depuis 2022 (stable, mais sans correctifs) ; fork `@cantoo/pdf-lib` actif.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Storage peut servir le PDF en iframe via lien signé (CSP/headers non vérifiés) ; Safari iOS limité | Pitfall 6 | D-02 doit passer par le route handler d'aperçu (déjà prévu comme repli) |
| A2 | Vercel réécrit `x-forwarded-for` avec l'IP réelle ; limite de 4,5 Mo de réponse non streamée | Pitfall 6, 12 | IP falsifiable dans la piste / aperçu tronqué |
| A3 | `fontkit` accepte les WOFF de `fontData.ts` pour l'embarquement | Pattern 4 | Générer un TTF Manrope dédié |
| A4 | Un envoi d'e-mail de code échoué compte dans le quota de 5/heure | Pattern 3 | Quota potentiellement consommé par une panne Resend |
| A5 | pdf-lib 1.17.1 charge sans erreur les PDF produits par @react-pdf 4.9 | Pitfall 9 | Basculer sur le fork ; à lever par spike Wave 0 |
| A6 | Le signataire se limite à nom/fonction (+ membre du client) faute d'e-mail à l'onboarding | Pitfall 7 | Exigence D-04 plus stricte ⇒ ajout d'un champ onboarding |
| A7 | Conserver l'IP en clair dans la piste est acceptable (D-08) | Pitfall 12 | Relecture RGPD peut exiger durée/finalité |

## Open Questions

1. **Correspondance signataire / utilisateur (D-04)** — l'onboarding n'a pas d'e-mail du signataire. Recommandation : membre du client + section signataire complète ; confirmer avec l'utilisateur lors de la planification (ou discuss-phase rapide).
2. **Clause de convention de preuve** — texte à produire (placeholder `v1` clairement marqué) et à relire ; le contrat passe en `v2` (nouveau `template_version`, vérifier `docTypesSql.test.ts` / registry qui fixent la regex `^v[0-9]+$`).
3. **Étapes de garde** — `STEPS` gate : étape 2 attend `quote_accepted`, etc. Vérifier au plan quels documents sont signables à quel moment (le contrat avant `quote_accepted` ?) et appliquer la même garde dans `sv_request_signature_code`.
4. **Taille/Pagination du certificat du PV** — nombre maximal de critères/réserves (limites de longueur à définir côté UI et en CHECK).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests | ✓ | v26.4.0 | — |
| npm registry | pdf-lib install | ✓ | pdf-lib 1.17.1 | — |
| Branche Supabase de test (`SV_TEST_*`, `SV_TEST_DB_URL`) | tests RLS, falsification | variables présentes dans `.env.example` ; branche non sondée ici | — | Pas de repli : tests RLS interdits sur prod |
| Resend (`RESEND_API_KEY`) | envoi du code | clé à configurer (déjà utilisée par l'outbox) | resend ^6.28.1 | — |
| `SV_SIGNATURE_CODE_SECRET` | HMAC du code | ✗ à créer | — | — (bloquant, à ajouter aux envs Vercel + test) |
| Client « Test E2E Sèvalys » (prod) | E2E manuel | ✓ (mémoire projet) | — | — |

**Missing dependencies with no fallback:** `SV_SIGNATURE_CODE_SECRET` (à générer, 32+ octets aléatoires).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.11 (config unitaire `vitest.config.ts`, RLS `vitest.rls.config.ts`, `fileParallelism:false`) |
| Config file | `vitest.config.ts`, `vitest.rls.config.ts` (existants) |
| Quick run command | `npx vitest run src/lib/signature src/lib/server/signature` |
| Full suite command | `npm test` puis `npm run test:rls` (branche) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIGN-01 | HMAC déterministe, code 6 chiffres, jamais en clair en base | unit | `npx vitest run src/lib/server/signature/codes.test.ts` | ❌ Wave 0 |
| SIGN-01 | 5 essais max (6e refusé même avec bon code), expiration 10 min (backdate `expires_at`), 60 s entre envois, 5 envois/h, invalidation | RLS/RPC | `npm run test:rls -- tests/rls/signature.rls.test.ts -t otp` | ❌ Wave 0 |
| SIGN-01 | 20 vérifications parallèles ⇒ ≤ 5 essais comptés | RLS/RPC | idem `-t concurrency` | ❌ Wave 0 |
| SIGN-02 | Envoi du code refusé sans `consent_given` de la version courante ; texte exact en payload | RLS/RPC + unit | idem `-t consent` | ❌ Wave 0 |
| SIGN-03 | UPDATE/DELETE/TRUNCATE refusés (service_role, authenticated, anon) ; pas d'INSERT direct | RLS | idem `-t append-only` | ❌ Wave 0 |
| SIGN-03 | Falsification (connexion `SV_TEST_DB_URL` : désactiver trigger, modifier une ligne) ⇒ `sv_verify_signature_chain` = rompue ; vérificateur TS idem | RLS + unit | idem `-t tamper` ; `npx vitest run src/lib/signature/verifyChain.test.ts` | ❌ Wave 0 |
| SIGN-03 | Parité hash SQL ↔ TS (vecteur d'or) ; 20 ajouts concurrents sans fork | RLS + unit | idem `-t chain` | ❌ Wave 0 |
| SIGN-03 | Isolation : client A ≠ B, anonyme, utilisateur Gecko, ne lisent pas les maillons d'autrui | RLS | idem `-t isolation` | ❌ Wave 0 |
| SIGN-04 | Scellé = pages originales + certificat ; relu avec pdf-lib ; hash stocké = hash de l'objet téléchargé ; déterminisme sur retry | unit + intégration | `npx vitest run src/lib/server/signature/seal.test.ts` | ❌ Wave 0 |
| SIGN-04 | Échec upload / échec RPC C ⇒ ni fait ni scellé, objet orphelin supprimé ; `sv_already_sealed` ⇒ idempotent | unit (mocks) + RLS | `seal.test.ts` ; `-t seal-atomic` | ❌ Wave 0 |
| SIGN-04 | Export JSON vérifié hors ligne ; `sv_issue_document` refuse `p_replaces` signé | unit + RLS | `verifyChain.test.ts` ; `-t frozen` | ❌ Wave 0 |
| SIGN-05 | Critère refusé ⇒ envoi du code bloqué + e-mail admin ; réserve ⇒ signature possible, réserves dans le certificat ; fait `acceptance_signed` posé à la signature | RLS + unit | `-t acceptance` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/signature src/lib/server/signature`
- **Per wave merge:** `npm test` + `npm run test:rls` sur la branche
- **Phase gate:** suites complètes vertes + E2E manuel sur le client « Test E2E Sèvalys » (signature réelle, téléchargement, hash du scellé)

### Wave 0 Gaps
- [ ] `tests/rls/signature.rls.test.ts` — SIGN-01/02/03/05
- [ ] `src/lib/signature/verifyChain.test.ts` + vecteur d'or issu de la branche
- [ ] `src/lib/server/signature/{codes,seal}.test.ts`
- [ ] Spike : lien signé en iframe (Chrome + Safari mobile) et chargement pdf-lib d'un PDF rendu par `renderDocument` (trois types)
- [ ] Migration appliquée d'abord à la branche (jamais à la prod avant) ; `npm install pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1`

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Session Supabase existante + OTP de signature (HMAC, 10 min, 5 essais, rate limit) |
| V3 Session Management | yes | Session portail ; l'e-mail du code = e-mail de session, jamais un champ de formulaire |
| V4 Access Control | yes | RLS (lecture client = ses projets), RPC service_role-only, `requireClient()` / `requireAdmin()` avant tout module `server-only`, vérif d'appartenance du document par client RLS |
| V5 Input Validation | yes | zod sur actions ; CHECK SQL (longueurs, regex hash/IP) |
| V6 Cryptography | yes | HMAC-SHA256 + `randomInt` + SHA-256 natifs ; jamais de crypto maison |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Force brute du code à 6 chiffres | Spoofing | 5 essais sous verrou de ligne, invalidation, quota 5/h, 60 s, journalisation |
| Fuite de la table des codes | Info disclosure | HMAC à secret serveur (pas de SHA-256 nu) |
| Falsification de la piste par service_role | Tampering | Triggers deny_mutation + pas d'INSERT direct + chaîne vérifiable ; limite connue : le propriétaire de la table peut désactiver un trigger (la rupture de chaîne le révèle) |
| Fork de chaîne par concurrence | Tampering | Verrou advisory + uniques `(document_id, seq)` / `(document_id, prev_hash)` |
| Remplacement d'un document pendant la signature | Tampering | Verrou projet + vérification de tête dans le RPC A ; `sv_issue_document` refuse un document signé |
| Signature par un autre utilisateur | Spoofing / Repudiation | Code envoyé à l'e-mail de session ; `actor_id` = `auth.uid()`, jamais fourni par le client ; membre du client vérifié |
| IDOR sur aperçu/téléchargement | Info disclosure | Lecture RLS de la ligne d'abord, chemin résolu ensuite en service_role (patron `download.ts`) ; chemin du scellé non devinable |
| Injection dans le certificat / payload | Tampering | Texte JSON échappé ; `drawText` sans interprétation ; longueurs bornées |
| Fuite de PII dans les logs | Info disclosure | Logs à codes courts uniquement (patron `callRpc`) ; jamais code, e-mail ni IP |
| Répudiation « je n'ai pas signé » | Repudiation | Piste complète (consentement texte+version, IP, code envoyé), certificat avec hash de maillon, convention de preuve (à relire) |

## Supabase shared-project constraints (récap pour le plan)
- Un seul fichier de migration `20261006000000_sv_signature.sql` (> `20261005000000`), tout préfixé `sv_`, RLS/revoke/grant/triggers/RPC dans le même fichier (D-19), schéma privé `sv_private` pour les fonctions internes.
- `set search_path = ''` et noms qualifiés partout (la migration `gecko_fix_function_search_path` montre que le linter du projet l'exige).
- Chaque RPC : `revoke all … from public, anon, authenticated; grant execute … to service_role;` (Supabase accorde `execute` par défaut aux rôles API).
- Aucune policy sur `storage.objects` ; bucket existant `sv-documents` réutilisé (`allowed_mime_types` = PDF, `file_size_limit` 10 Mo : le scellé = original + page(s) doit rester < 10 Mo ; vérifier avant upload).
- Clés de verrou advisory à deux entiers préfixées `sv_sig_chain` pour éviter toute collision avec Gecko.
- FK des tables append-only : `on delete restrict`, pas de FK vers `auth.users` (suppression d'un utilisateur de test jamais bloquée, patron phase 13).
- Appliquer sur la branche dédiée, jouer `test:rls`, ne promouvoir en prod qu'ensuite (même séquence que 13-07 → 13-16).

## Sources

### Primary (HIGH confidence)
- Code du dépôt : `supabase/migrations/20261005000000_sv_documents.sql`, `20261004000000_sv_projects_engine.sql`, `20261003000000_sv_leads_core.sql` (deny_mutation), `src/lib/server/documents/{issue,download,render}.ts`, `src/lib/server/projects/facts.ts`, `src/lib/server/mail/{rules,outbox}.ts`, `src/lib/throttle.ts`, `src/lib/leads/ipHash.ts`, `src/lib/documents/types.ts`, `src/lib/projects/steps.ts`, `vercel.json`, `next.config.ts`, `vitest.rls.config.ts`
- `npm view` (pdf-lib, @pdf-lib/fontkit, @cantoo/pdf-lib) — 2026-10-04 ; slopcheck [OK]
- `14-CONTEXT.md`, `REQUIREMENTS.md`

### Secondary (MEDIUM confidence)
- Documentation pdf-lib (API `load`/`addPage`/`embedFont`/`registerFontkit`) et Node crypto — connaissance d'entraînement non re-vérifiée par Context7 dans cette session [CITED: pdf-lib.js.org, nodejs.org/api/crypto.html]

### Tertiary (LOW confidence)
- Comportements plateforme (headers Supabase Storage, `x-forwarded-for` Vercel, limite 4,5 Mo, Safari iOS) — voir Assumptions A1-A2

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH — versions vérifiées au registre ; compatibilité pdf-lib/@react-pdf à prouver par spike
- Architecture: HIGH — directement alignée sur les patrons du dépôt (issue.ts, deny_mutation, sv_post_project_fact)
- Pitfalls: MEDIUM-HIGH — atomicité/OTP/hachage raisonnés depuis le code ; iframe/plateforme en LOW

**Research date:** 2026-10-04
**Valid until:** 2026-11-03 (30 jours ; pile stable)
