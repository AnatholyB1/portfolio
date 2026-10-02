# Phase 12: Conversion, projets & moteur d'étapes - Research

**Researched:** 2026-10-03
**Domain:** Supabase (Postgres RLS, Storage privé sur projet partagé), tables de faits en ajout seul, outbox de mails idempotente (Resend + cron Vercel), orchestration atomique lead -> client
**Confidence:** MEDIUM-HIGH (code existant et docs Vercel/Resend/Supabase vérifiés ; conception des tables et du moteur = recommandations de ma part, à valider par le planner)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Conversion lead -> client (PORTAL-01)**
- **D-01:** Le clic « Convertir en client » ouvre le **formulaire d'invitation existant** (SIRET + recherche entreprise + nom), pré-rempli avec le nom et l'e-mail du lead. Un clic, puis confirmation. `sv_clients.siret` reste obligatoire (les phases 13/15 le supposent rempli) ; aucune migration pour le rendre nullable.
- **D-02:** Le premier membre invité est le **contact le plus récent** du lead, modifiable avant envoi. Un e-mail déjà admin ou déjà membre client est refusé (rôles exclusifs, D-04 de la phase 10 ; la règle « plus-address » de PROJECT.md reste vraie).
- **D-03:** Après conversion, le lead **reste lié** (`converted_client_id` renseigné), garde sa source figée pour l'entonnoir et **ne change pas de statut**. « Signé » reste un geste admin tant que la signature n'existe pas (phase 14).
- **D-04:** Conversion autorisée **seulement à partir de « Qualifié »** (Qualifié, RDV, Devis envoyé, Signé). « Nouveau » et « Perdu » ne sont pas convertibles (un lead Perdu se rouvre d'abord via l'action existante).
- **D-05:** La conversion **crée un premier projet** (voir D-10) dans la même opération que le client et l'invitation.

**Frise d'étapes et déblocage (PORTAL-03, PORTAL-04)**
- **D-06:** **Une frise commune** à tous les projets ; l'offre est une métadonnée du projet (champ), sans effet sur les étapes. Des modèles par offre pourront suivre dans une phase ultérieure.
- **D-07:** **6 étapes** : 1 Onboarding -> 2 Cadrage & devis -> 3 Contrat & acompte -> 4 Production -> 5 Recette -> 6 Livraison & solde. Elles correspondent aux faits des phases 13-15 (devis, contrat signé, acompte, PV de recette, facture).
- **D-08:** Le déblocage repose sur une **table de faits typés** (ex. `onboarding_completed`, `quote_accepted`, `deposit_received`, `acceptance_signed`...) avec date, auteur et motif, en **ajout seul**. L'étape courante est **calculée** à partir des faits, jamais stockée ni saisie. En phase 12 l'admin pose certains faits à la main ; les phases 13-15 ajoutent des producteurs automatiques des mêmes faits (signature, paiement) sans changer le modèle. `onboarding_completed` est posé automatiquement par le système.
- **D-09:** Retour arrière par **fait correctif journalisé** (avec motif) : l'étape courante est recalculée, l'historique est conservé, rien n'est supprimé ni modifié.

**Projets (ADM-01, base de PORTAL-03)**
- **D-10:** **Modèle multi-projets** : table `sv_projects` rattachée au client (offre, titre, dates). La conversion crée le premier. Le portail affiche le projet actif ; un sélecteur n'apparaît que s'il y en a plusieurs.

**Onboarding (PORTAL-02)**
- **D-11:** Parcours « **confirmer + compléter** » : le client vérifie les données société pré-remplies depuis `sv_clients.company` (SIRET, raison sociale, adresse, forme juridique), puis ajoute : **signataire** (nom, fonction), **contact projet**, **adresse de facturation** si différente, **TVA** (numéro ou non assujetti), **site/réseaux existants**, **objectif du projet**. Sauvegarde au fil de l'eau.
- **D-12:** La **frise est visible dès la première connexion** ; l'étape 1 reste en cours tant que les données exigées pour les documents (signataire, TVA, adresse de facturation) ne sont pas complètes. L'onboarding n'est pas un mur : il ne masque pas le reste du portail.
- **D-13:** Les données d'onboarding sont stockées de façon structurée (réutilisées par les modèles de documents de la phase 13), non en texte libre.

**Fichiers et liens (PORTAL-05)**
- **D-14:** **Client et admin** déposent. Bucket Supabase **privé**, dépôt direct par URL signée, **25 Mo maximum**, liste blanche de types (PDF, images, Office, zip, logos vectoriels), téléchargement par **lien signé de quelques minutes**. Chaque fichier est rattaché au projet et indique qui l'a déposé. Le bucket vit sur le projet Supabase partagé avec Gecko : préfixer le nom (`sv-...`) et ne jamais toucher aux politiques `storage.objects` de Gecko.
- **D-15:** Les **liens utiles** sont saisis par l'**admin** (titre + URL, par projet) ; le client les consulte seulement.

**Accord de présentation du projet (PORTAL-06)**
- **D-16:** **Interrupteur dans le projet**, case explicite non précochée affichant le **texte exact** accepté. On conserve date, version du texte et utilisateur. Révocable à tout moment ; chaque changement est une **ligne en ajout seul**, l'état courant se déduit de la dernière ligne. Une seule portée (portfolio, réseaux, cas client) — pas de choix par usage. Le texte est à faire relire (blocker juridique existant).

**Moteur de mails (MAIL-01, MAIL-02)**
- **D-17:** **Règles en code** (table typée : événement -> modèle, délai, destinataire), versionnée et testée avec le dépôt. **Aucun éditeur de règles** dans l'admin. Une table `sv_mail_outbox` journalise chaque envoi avec une **clé d'unicité (événement + destinataire)** pour garantir l'absence de doublon.
- **D-18:** **Envoi immédiat** pour les événements de la phase 12 ; la colonne `send_after` existe dès maintenant et un **traitement quotidien (cron)** enverra les mails dus. Les relances elles-mêmes sont la phase 16. Plan Vercel Hobby/Pro toujours à confirmer (blocker STATE.md) : ne pas supposer une fréquence de cron plus fine que quotidienne.
- **D-19:** Événements couverts en phase 12 : **client invité -> le client** (l'invitation actuelle passe dans le moteur et son journal), **changement d'étape -> le client** (ce qui est attendu de lui), **onboarding terminé -> l'admin**. Les e-mails vers un prospect sur changement de statut du lead sont **hors phase 12** (e-mail marketing soumis au consentement et à la désinscription, phase 16).

**Vue admin des projets (ADM-01)**
- **D-20:** **Tableau triable + fiche projet**. Colonnes : client, offre, étape, qui attend, depuis combien de jours. Filtres par étape et par blocage. La fiche projet sert à poser les faits, voir fichiers et liens. Cohérent avec la liste des leads (phase 11).
- **D-21:** Un **blocage** est l'un de : **attend le client** (onboarding incomplet, fichier demandé non fourni...), **attend l'admin** (fait à poser, devis à émettre...), **projet dormant** (aucune activité — fait, fichier, connexion — depuis 14 jours, tous camps confondus). Le seuil de 14 jours est un défaut modifiable par constante.

**Hérité des phases précédentes**
- **D-22:** Portail et admin en **français uniquement**, `noindex`, hors sitemap/`llms.txt`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table ; `service_role` uniquement dans des modules `server-only` ; vues en `security_invoker` ; tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko) ; rôles en tables, jamais en métadonnées. Prix autorisés dans portail/admin/modèles, jamais sur le public. Client de test permanent « Test E2E Sèvalys » (PROJECT.md) à réutiliser pour les tests de bout en bout, sans le supprimer.

### Claude's Discretion
- Structure exacte des tables et colonnes, noms des faits et de leur enum, découpage des plans.
- Libellés et textes de la frise, des e-mails et de l'onboarding (en français, sans prix).
- Liste exacte des types de fichiers autorisés et durée du lien signé.
- Disposition de la fiche projet et du portail (tokens du design system, sobre back-office).
- Détection technique de l'« activité » pour le projet dormant.

### Deferred Ideas (OUT OF SCOPE)
- Modèles d'étapes propres à chaque offre (9 offres).
- E-mail vers le prospect sur changement de statut du lead — phase 16.
- Éditeur de règles de mail dans l'admin.
- Ajout d'un membre client par le client lui-même.
- Accord de présentation par usage (site, réseaux, cas d'étude) ; une seule portée.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORTAL-01 | Conversion lead -> client en un clic, envoi de l'invitation | RPC atomique `sv_convert_lead` + auth user créé avant avec compensation ; réutilise `inviteClient` scindé (section Pattern 1) |
| PORTAL-02 | Onboarding guidé, données alimentant les documents | Table structurée `sv_client_onboarding` + complétude zod + fait `onboarding_completed` (Pattern 4) |
| PORTAL-03 | Frise d'étapes, étape en cours, actions attendues | Fonction pure TS `deriveProjectState` (Pattern 2) |
| PORTAL-04 | Déblocage par faits enregistrés | `sv_project_facts` en ajout seul + `fact_revoked` (Pattern 2) |
| PORTAL-05 | Fichiers privés, liens utiles, URLs signées courtes | Bucket `sv-project-files`, URL d'upload signée, lien de téléchargement 120 s (Pattern 5) |
| PORTAL-06 | Accord de présentation avec date et texte conservés | `sv_project_consents` en ajout seul (Pattern 6) |
| MAIL-01 | Moteur de règles événement -> e-mail | Table de règles TS + `enqueueMail` (Pattern 3) |
| MAIL-02 | Envoi idempotent et journalisé | `sv_mail_outbox` avec `dedupe_key` unique + `Idempotency-Key` Resend (Pattern 3) |
| ADM-01 | Admin voit tous les projets, étape, blocages | Chargement admin + `deriveProjectState` + activité (Pattern 7) |
</phase_requirements>

## Summary

La phase s'insère dans une architecture déjà fixée par les phases 10-11 : tables `sv_*`, `revoke all` puis `grant select` à `authenticated`, écritures uniquement par RPC `security definer` réservées à `service_role` (exemples : `sv_set_lead_status`, `sv_ingest_lead`), journaux immuables via `sv_private.deny_mutation()`, vues en `security_invoker`, tests RLS sur branche (`tests/rls`, `vitest.rls.config.ts`, `fileParallelism: false`). Je recommande de reproduire exactement ce patron : aucune nouvelle dépendance npm n'est nécessaire (`resend`, `@supabase/supabase-js`, `zod` suffisent). [VERIFIED: codebase grep]

Quatre points sont non évidents et ont un fort impact sur le plan. (1) La conversion ne peut pas être une seule transaction SQL car l'utilisateur auth est créé via l'API admin : il faut créer l'utilisateur d'abord, puis exécuter **un RPC atomique** (client + membre + projet + lien lead + événement + ligne d'outbox), avec suppression de l'utilisateur auth si le RPC échoue (compensation déjà pratiquée par `inviteClient`). (2) Les tables en ajout seul **ne doivent pas avoir de clé étrangère `on delete set null/cascade`** vers `auth.users` ou `sv_clients` : le trigger `deny_mutation` bloquerait la suppression d'un utilisateur de test ou d'un client. (3) Sur Vercel Hobby un cron ne peut tourner qu'**une fois par jour**, avec une précision de ±59 min : cohérent avec D-18. (4) Le bucket de stockage se crée en SQL sans **aucune** politique sur `storage.objects` si tous les accès passent par des URLs signées émises côté serveur ; les politiques Gecko (filtrées par `bucket_id = 'gecko-menu-images'`) ne sont pas touchées.

**Primary recommendation:** Une migration unique `sv_projects_engine.sql` (projets, faits, onboarding, fichiers, liens, accords, outbox, bucket), RPC service_role pour toute écriture, étape courante calculée par une **fonction TS pure** testée unitairement (source de vérité unique), outbox claim/send avec clé `Idempotency-Key` Resend, cron quotidien `/api/cron/mail` protégé par `CRON_SECRET`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Conversion lead -> client | API / Backend (Server Action + RPC) | Database (atomicité RPC) | Crée un compte auth (API admin) + lignes ; service_role confiné |
| Calcul de l'étape courante | API / Backend (module pur TS) | — | Source unique testable ; la DB ne stocke que des faits |
| Stockage des faits en ajout seul | Database | API (RPC `sv_post_project_fact`) | Immutabilité via trigger, verrou de ligne projet pour l'idempotence |
| Onboarding (saisie) | Frontend Server (Server Component + action) | Database | Écriture scoped par `client_id` dérivé de la session, jamais du formulaire |
| Upload fichiers | Browser (PUT direct vers Storage) | API (émet l'URL signée, valide) | Contourne la limite de corps Vercel ; validation côté serveur avant émission |
| Téléchargement fichiers | API / Backend (URL signée courte) | Database (RLS sur `sv_project_files`) | Autorisation = lecture RLS de la ligne avec le client utilisateur |
| Journal et envoi des mails | API / Backend | Database (outbox) + Vercel Cron | Idempotence = contrainte unique + clé Resend |
| Vue admin des projets | Frontend Server (SSR) | Database (RLS admin) | Lecture avec le client RLS de l'admin |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.117.2 (déjà installé) | DB, Auth admin, Storage (`createSignedUploadUrl`, `uploadToSignedUrl`, `createSignedUrl`) | Déjà en place [VERIFIED: package.json] |
| `resend` | ^6.28.1 (déjà installé) | Envoi ; `resend.emails.send(params, { idempotencyKey })` | Idempotency-Key supporté sur `POST /emails`, clé <= 256 caractères, conservée 24 h [CITED: resend.com/docs/dashboard/emails/idempotency-keys] |
| `zod` | ^4.6.5 (déjà installé) | Schémas onboarding, upload, faits | Patron existant (`inviteSchema.ts`) |
| Vitest | ^4.1.11 | Tests unitaires + RLS | Existant |

### Supporting
Aucun nouveau paquet. Pas de bibliothèque de machine à états, de file de jobs (BullMQ, Inngest...) ni d'éditeur de modèles d'e-mail : voir « Don't Hand-Roll ».

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Étape calculée en TS | Vue SQL `security_invoker` | La vue permet tri/filtre SQL mais duplique la logique ; avec quelques dizaines de projets, le TS suffit et reste testable sans DB. Si un jour le volume l'exige, ajouter la vue + test de parité |
| Cron Vercel quotidien | `pg_cron` + `pg_net` (déjà utilisé : `sv-purge-leads`) | Permet un rythme horaire sans plan Pro ; `pg_net` à vérifier sur le projet partagé. À garder en repli, hors périmètre phase 12 (envoi immédiat) |

**Installation:** aucune.

## Package Legitimacy Audit

Aucun paquet externe nouveau n'est installé par cette phase. Tous les paquets utilisés (`resend`, `@supabase/supabase-js`, `zod`, `vitest`) sont déjà présents dans `package.json` et déjà utilisés par les phases 10-11. slopcheck non exécuté (rien à auditer).

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Admin: fiche lead (status >= qualified, non converti)
   |  clic "Convertir en client" -> formulaire invitation prérempli (nom, e-mail du contact le plus récent)
   v
Server Action convertLeadAction  --requireAdmin()-->  convertLead() [server-only]
   |  1 valider (zod, SIRET)  2 contrôles rôle/membre/compte existant (comme inviteClient)
   |  3 auth.admin.createUser
   |  4 RPC sv_convert_lead (UNE transaction, lead verrouillé FOR UPDATE):
   |        client (réutilisé si SIRET connu) + membre + projet + lead.converted_client_id
   |        + lead_event 'lead_converted' + sv_mail_outbox('client_invited')
   |     si échec -> auth.admin.deleteUser (compensation)
   |  5 sendOutboxRow(id)  -------------------------------+
   v                                                       |
Client se connecte (code OTP) -> /espace-client            v
   |  requireClient() -> projets (RLS)         sv_mail_outbox --claim--> Resend (Idempotency-Key = dedupe_key)
   |  frise = deriveProjectState(faits,                   ^   pending/sending/sent/failed
   |          onboardingComplet)                          |
   |  onboarding -> action -> écrit sv_client_onboarding  |  Vercel Cron quotidien -> /api/cron/mail
   |     complet ? RPC sv_post_project_fact(onboarding_completed, actor system)  (CRON_SECRET)
   |  fichiers : requestUpload -> URL signée -> PUT direct Storage -> confirmUpload
   |  accord : action -> INSERT sv_project_consents (ajout seul)
   v
Admin: /admin/projets (tableau) + /admin/projets/[id] (poser faits, liens, fichiers)
   |  RPC sv_post_project_fact (verrou projet, idempotent)  -> étape recalculée -> mail 'step_changed' (clé = id du fait)
```

### Recommended Project Structure
```
supabase/migrations/20261004000000_sv_projects_engine.sql   # tables + RLS + RPC + bucket
src/lib/projects/steps.ts            # PUR (client-safe) : STEPS, FACT_TYPES, deriveProjectState
src/lib/projects/onboardingSchema.ts # zod, complétude
src/lib/server/projects/             # server-only : convert.ts, facts.ts, files.ts, onboarding.ts, activity.ts
src/lib/server/mail/outbox.ts        # enqueueMail / sendOutboxRow / processDueMail
src/lib/server/mail/rules.ts         # table typée événement -> modèle, délai, destinataire
src/app/api/cron/mail/route.ts       # GET, Bearer CRON_SECRET
src/app/admin/projets/{page.tsx,[id]/page.tsx,actions.ts}
src/app/espace-client/{page.tsx (frise),onboarding,fichiers,actions.ts}
tests/rls/{projects,facts,files,mailoutbox,convert}.rls.test.ts
vercel.json                          # crons (n'existe pas encore)
```

### Pattern 1: Conversion atomique (PORTAL-01, D-01..D-05)
**What:** scinder `inviteClient` en briques réutilisables (contrôles de rôle, `sv_find_auth_user`, `createUser`) et déplacer l'écriture DB dans un RPC unique. `inviteClient` actuel fait des inserts séquentiels avec rollback manuel (`sv_clients.delete`), ce qui n'est pas atomique ; pour la conversion, ajouter `sv_convert_lead(p_lead_id, p_actor, p_user_id, p_email, p_name, p_siret, p_company, p_company_source, p_project_title, p_offer)` `security definer`, `set search_path = ''`, `revoke ... from public, anon, authenticated`, `grant execute ... to service_role`.
Dans le RPC : `select ... from sv_leads where id = p_lead_id for update` ; refuser si `erased_at` non nul, si `converted_client_id` non nul (`sv_lead_already_converted`), si statut hors `qualified|rdv|quote_sent|signed` (`sv_lead_not_convertible`, D-04) ; réutiliser le client existant par SIRET (comportement D-03 de la phase 10) ; insérer le membre (le trigger `sv_role_conflict` reste le filet) ; insérer `sv_projects` ; `update sv_leads set converted_client_id` (le trigger `protect_lead_source` ne protège pas cette colonne [VERIFIED: migration]) ; insérer un événement. **Le CHECK de `sv_lead_events.type` n'inclut pas de type « converti »** : la migration doit `drop constraint` / `add constraint` pour ajouter `'lead_converted'` (nom de la contrainte à relever sur la branche, `sv_lead_events_type_check` par défaut Postgres). [VERIFIED: migration]
Insérer aussi la ligne d'outbox `client_invited` dans la même transaction : l'invitation est ainsi journalisée même si Resend échoue, et le cron ou « Renvoyer » la rattrape.
**Attention :** lecture de « contact le plus récent » = ordre `created_at desc` sur `sv_lead_contacts` (la vue `sv_leads_admin_v` expose déjà `contact_nom`, `contact_email`) pour préremplir le formulaire.

### Pattern 2: Faits en ajout seul + étape calculée (PORTAL-03/04, D-06..D-09)
**Table** `sv_project_facts(id bigint identity pk, project_id uuid not null references sv_projects on delete restrict, type text check (type in (...)), target_fact_id bigint null, actor_kind text check (actor_kind in ('system','admin','client')), actor_id uuid null /* SANS FK */, occurred_at timestamptz not null default now(), created_at timestamptz not null default now())`. Triggers `deny_mutation` (update/delete/truncate), comme `sv_lead_events`.
**Types proposés** : `onboarding_completed`, `quote_accepted`, `contract_signed`, `deposit_received`, `production_completed`, `acceptance_signed`, `balance_received`, plus `fact_revoked` (porte `target_fact_id`). Les phases 13-15 ajoutent des producteurs de `quote_accepted`/`contract_signed`/`deposit_received`/`acceptance_signed`/`balance_received` sans changer le modèle.
**Portes (prefix-based)** : étape 1 se ferme avec `onboarding_completed` ; 2 avec `quote_accepted` ; 3 avec `contract_signed` ET `deposit_received` ; 4 avec `production_completed` ; 5 avec `acceptance_signed` ; 6 avec `balance_received` (projet terminé). L'étape courante = première étape dont la porte n'est pas satisfaite par les faits **effectifs** (non révoqués). Un fait « en avance » (ex. `deposit_received` posé avant `quote_accepted`) ne fait pas sauter d'étape : il reste en attente et devient effectif quand les portes précédentes se ferment. Retour arrière (D-09) = `fact_revoked` ciblant le fait ; l'étape recule car les portes sont préfixes.
**Idempotence/concurrence :** RPC `sv_post_project_fact(p_project_id, p_type, p_actor_kind, p_actor_id, p_target_fact_id, p_reason)` qui `select ... from sv_projects where id=... for update`, refuse un type déjà effectif (retourne `changed:false`), refuse une révocation d'un fait déjà révoqué ou de type `fact_revoked`, valide que `p_reason` fait 10-500 caractères pour `fact_revoked` et pour tout fait posé à la main par l'admin selon la règle choisie. Retourne l'étape avant/après pour que l'appelant mette en file `step_changed` avec `dedupe_key = 'step_changed:' || fact_id` (un mail par changement réel).
**Motif (D-08) :** le motif est du texte administratif interne ; une policy RLS ne masque pas des colonnes. Si les clients lisent `sv_project_facts` via RLS, ils verraient le motif. Recommandation : stocker `reason` dans `sv_project_fact_notes(fact_id, body)` lisible par l'admin seulement (même patron que `sv_lead_notes`), et laisser `sv_project_facts` lisible par l'admin et par le client propriétaire.
**Fonction pure** `deriveProjectState(facts, onboarding, now): { currentStep, steps[{state: done|current|upcoming}], waitingOn: 'client'|'admin'|'none', waitingReason, sinceAt }` dans `src/lib/projects/steps.ts` (module sans import serveur, utilisable côté client et par l'admin). Qui attend (proposition, discrétion du planner) : 1 client, 2 admin, 3 client (admin tant que 13-15 n'existent pas), 4 admin, 5 client, 6 client. `sinceAt` = `created_at` du fait qui a ouvert l'étape courante (ou création du projet).

### Pattern 3: Outbox idempotente (MAIL-01/02, D-17..D-19)
**Table** `sv_mail_outbox(id uuid pk, event_type text, template text, recipient_email text, recipient_kind text check (in ('client','admin')), dedupe_key text not null unique, payload jsonb, send_after timestamptz not null default now(), status text check (in ('pending','sending','sent','failed','skipped')) default 'pending', attempts int default 0, last_error text, provider_id text, created_at, sent_at)`. RLS activée, aucun accès `authenticated` hors lecture admin ; écritures par RPC/service_role. Pas de PII dans `last_error`.
**Clé d'unicité :** D-17 dit « événement + destinataire » ; pour des événements répétables, l'identité de l'événement doit inclure son objet : `client_invited:{clientId}:{email}`, `step_changed:{factId}:{email}`, `onboarding_completed:{projectId}:{adminEmail}`. Un « Renvoyer l'invitation » volontaire ajoute un suffixe `:resend:{n}` (n = nombre de lignes existantes pour ce préfixe) pour ne pas être avalé par la contrainte.
**Flux :** `enqueueMail(event, ctx)` -> `insert ... on conflict (dedupe_key) do nothing returning id` ; si inséré et `send_after <= now()` -> `sendOutboxRow(id)` : `update ... set status='sending', attempts=attempts+1 where id=$1 and status in ('pending','failed') returning *` (revendication atomique), puis `resend.emails.send(params, { idempotencyKey: dedupe_key })` (filet de 24 h contre le double envoi si le processus plante entre l'envoi et la mise à jour), puis `sent` ou `failed`. L'envoi ne doit **jamais** faire échouer l'opération métier (même principe que `mailSent` dans `inviteClient`).
**Cron :** `/api/cron/mail` (GET) appelle un RPC `sv_claim_due_mail(p_limit)` (`for update skip locked`, reprend `pending` dus, `failed` avec `attempts < 3`, `sending` bloqués > 15 min) puis envoie. Vérifier `request.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET` (Vercel envoie ce header si la variable `CRON_SECRET` est définie) [ASSUMED: comportement `CRON_SECRET` connu de la doc Vercel, non re-vérifié dans cette session]. `vercel.json` : `{ "crons": [{ "path": "/api/cron/mail", "schedule": "0 6 * * *" }] }`.
**Contrainte plan :** Hobby = une exécution par jour maximum, précision ±59 min, toute expression plus fréquente fait **échouer le déploiement** ; Pro = à la minute ; 100 crons/projet sur tous les plans [CITED: vercel.com/docs/cron-jobs/usage-and-pricing, mis à jour 2026-07-15]. Planifier donc `0 6 * * *`, et ne rien promettre de plus fin. Vérifier que `src/proxy.ts` (modifié dans l'arbre de travail) ne redirige pas `/api/cron/*` et que ce chemin n'est pas dans `PROTECTED_PREFIXES`.
**Rules en code :** `rules.ts` exporte un objet typé `{ client_invited: { template, delayMs: 0, to: 'client' }, step_changed: {...}, onboarding_completed: { to: 'admin' } }` ; test unitaire qui vérifie qu'un événement sans règle échoue à la compilation (type `Record<MailEvent, Rule>`) et qu'aucun gabarit ne contient de prix (garde existante `priceScope` à étendre aux nouveaux gabarits portail/mail : prix autorisés en portail mais **pas** utile ici).
**Migration de l'invitation :** `sendInvitationEmail` de `invite.ts` et `resendInvitation` passent par `enqueueMail`; les tests existants (`invite.test.ts`) qui mockent Resend directement devront être adaptés. Les gabarits `inviteEmail.ts` restent la source du contenu.

### Pattern 4: Onboarding structuré (PORTAL-02, D-11..D-13)
Table `sv_client_onboarding(client_id uuid pk references sv_clients on delete restrict, signatory_name, signatory_role, project_contact_name/email/phone, billing_same_as_company bool, billing_address jsonb, vat_status text check in ('number','not_subject'), vat_number, existing_site_url, social_links jsonb, project_goal text, company_confirmed_at timestamptz, updated_at)`. Sauvegarde au fil de l'eau = upsert partiel par action serveur. Le `client_id` vient de `requireClient()` (jamais du formulaire). Complétude = fonction zod pure `isOnboardingComplete(row, company)` : signataire (nom + fonction), TVA (numéro valide ou non assujetti), adresse de facturation (identique à la société ou saisie), `company_confirmed_at` non nul. Quand l'action sauvegarde et que la complétude devient vraie : RPC `sv_post_project_fact('onboarding_completed', actor_kind 'system')` + `enqueueMail('onboarding_completed')` vers l'admin. Idempotent grâce au verrou et à la clé d'outbox. Une donnée client-niveau (pas projet) est réutilisable par la phase 13 ; `project_goal` et site/réseaux peuvent vivre sur `sv_projects` si on préfère les rattacher au projet (décision du planner ; défaut : colonnes dans `sv_client_onboarding` car un seul onboarding par client).
Les prix n'apparaissent pas dans l'onboarding.

### Pattern 5: Stockage privé sur projet partagé (PORTAL-05, D-14)
**Bucket en SQL dans la migration :** `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sv-project-files','sv-project-files', false, 26214400, array[...]) on conflict (id) do nothing;` — mêmes colonnes que la migration Gecko (`insert into storage.buckets (id, name, public)`) étendue de `file_size_limit` et `allowed_mime_types` [CITED: supabase.com/docs/guides/storage/buckets/creating-buckets : limites de taille et de types appliquées par le bucket, un envoi hors limites est rejeté].
**Aucune politique `storage.objects`.** `storage.objects` a la RLS activée ; sans politique, `anon` et `authenticated` n'ont aucun accès direct. Tous les accès passent par des URLs signées créées avec le client `service_role` après autorisation applicative. Les politiques Gecko (`bucket_id = 'gecko-menu-images'`) sont filtrées par bucket [VERIFIED: migration 20260921000000] et ne s'appliquent pas à `sv-project-files`. **À vérifier sur la branche :** `select policyname, qual from pg_policies where schemaname='storage'` pour confirmer qu'aucune politique d'un autre produit n'est ouverte à tous les buckets ; un test RLS doit prouver que l'utilisateur Gecko, un client B et anon ne peuvent ni lister ni lire un objet du bucket.
**Flux d'upload :** (1) action `requestUploadAction({projectId, filename, size, mime})` : `requireClient()`/`requireAdmin()`, vérifier l'appartenance du projet par lecture RLS avec le client utilisateur, valider taille <= 25 Mo, extension et MIME contre la liste blanche (côté serveur ; le bucket est le second rempart), construire le chemin `{clientId}/{projectId}/{uuid}-{nomNettoyé}` (jamais d'élément contrôlé par l'utilisateur sans nettoyage, pas de `..`), insérer `sv_project_files(status='pending', uploaded_by_kind, uploaded_by)` ; (2) `createSignedUploadUrl(path)` — valide 2 heures [CITED: supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl] ; (3) le navigateur envoie par `uploadToSignedUrl` directement (la limite de 4,5 Mo des fonctions Vercel est ainsi contournée) ; (4) `confirmUploadAction(fileId)` vérifie l'existence de l'objet côté Storage et passe la ligne à `ready`. Les lignes `pending` anciennes (> 24 h) sont ignorées par l'affichage.
**Téléchargement :** action/route qui lit la ligne `sv_project_files` avec le client utilisateur (RLS = autorisation), puis `createSignedUrl(path, 120, { download: filename })`. Durée proposée : 120 s. Jamais d'affichage inline (SVG = XSS potentiel) : `download` force `Content-Disposition: attachment`.
**Liste blanche proposée :** `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `image/gif`, `application/zip`, `.docx/.xlsx/.pptx` (types OOXML), `.doc/.xls/.ppt`, `text/plain`, `text/csv`, `application/postscript` (logos .ai/.eps) ; discrétion du planner.

### Pattern 6: Accord de présentation (PORTAL-06, D-16)
`sv_project_consents(id bigint identity, project_id, granted bool, text_version text, text_snapshot text, actor_id uuid /* sans FK */, created_at)`, deny_mutation. Constante `PRESENTATION_CONSENT = { version: '2026-10-v1', text: '...' }` dans un module pur ; l'action refuse si `version` soumise différente de la constante (le client a vu un texte périmé). Stocker le texte intégral (`text_snapshot`) en plus de la version : la preuve ne dépend pas du dépôt. État courant = ligne de plus grand `id` du projet. Case non précochée, jamais d'ordre inverse. Le texte reste un blocker de relecture juridique : le plan doit prévoir un texte provisoire marqué comme tel et une tâche humaine de validation.

### Pattern 7: Vue admin et blocages (ADM-01, D-20/21)
Charger avec le client RLS de l'admin : projets + faits + onboarding + clients (pas de service_role pour la lecture). Calculer `deriveProjectState` par projet ; tri et filtres (étape, blocage) en mémoire côté serveur (volume faible). Activité (projet dormant, seuil constante `DORMANT_AFTER_DAYS = 14`) = max de : dernier fait, dernier fichier, dernier lien, `sv_client_onboarding.updated_at`, dernier accord, et dernière connexion des membres (`auth.users.last_sign_in_at`, accessible via un RPC service_role type `sv_find_auth_user` ; l'agréger dans un module `server-only` appelé après `requireAdmin()`). Dormant est un indicateur additionnel (tous camps), non exclusif de « attend le client / l'admin ». « Fichier demandé non fourni » n'a pas de modèle en phase 12 (aucune demande de fichier n'est décrite) : le laisser hors périmètre ou le réduire à « onboarding incomplet ».

### Anti-Patterns to Avoid
- **Stocker `current_step`** ou offrir un bouton « avancer » : interdit par D-08.
- **Appeler le RPC de faits sans verrou projet** : deux onglets admin posent le même fait deux fois.
- **FK `on delete set null/cascade` depuis une table append-only** vers `auth.users`/`sv_clients` : la suppression d'un utilisateur ou d'un client déclenche UPDATE/DELETE bloqués par `deny_mutation` (échec de `auth.admin.deleteUser`, de `invite rollback`, de `cleanup()` des tests).
- **Vue sans `security_invoker`** pour exposer les projets aux clients : contourne la RLS (règle D-22).
- **Écrire dans `storage.objects` ou créer des politiques** : inutile ici et risqué sur la base partagée.
- **Faire dépendre une opération métier de l'envoi du mail.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotence d'envoi | Cache applicatif maison | `unique(dedupe_key)` + `Idempotency-Key` Resend (24 h) | Les deux couvrent des fenêtres différentes (à vie / 24 h) |
| Upload de gros fichiers | Route Next qui reçoit le binaire | `createSignedUploadUrl` + `uploadToSignedUrl` | Limite de corps des fonctions ; Storage applique taille et MIME |
| Téléchargement protégé | Proxy streaming | `createSignedUrl(path, 120)` | URL temporaire native |
| Immutabilité | Convention applicative | `sv_private.deny_mutation()` (déjà dans la base) | Garanti même pour service_role |
| File de jobs / retry | Worker maison, Inngest | Colonnes `status/attempts` + cron quotidien | Volume de quelques e-mails par jour |
| Éditeur de modèles/règles | UI admin | Table typée en code (D-17) | Décision verrouillée |
| Machine à états | Librairie XState | Fonction pure + table de portes | 6 étapes linéaires |

**Key insight:** le volume est minuscule (une agence, quelques projets) ; la valeur est dans les invariants (ajout seul, unicité, RLS), pas dans l'infrastructure.

## Common Pitfalls

### Pitfall 1: Suppression bloquée par les triggers d'ajout seul
**What goes wrong:** `auth.admin.deleteUser` (rollback, `cleanup()` des tests) échoue car une FK `on delete set null` tente un UPDATE sur une table append-only ; `cleanup()` des tests (`sv_clients.delete`) échoue dès qu'un projet/fait existe.
**How to avoid:** colonnes d'acteur sans FK (uuid simple) ; FK `project -> client` en `on delete restrict` ; adapter `tests/rls/helpers.ts` `cleanup()` pour ignorer les erreurs de suppression de clients ayant des projets (comme `cleanup` ne supprime déjà pas les leads) et utiliser des e-mails/SIRET uniques par exécution. Ne jamais supprimer le client permanent « Test E2E Sèvalys ».
**Warning signs:** `sv_immutable_table` dans les logs de `afterAll`.

### Pitfall 2: Conversion non atomique / course
**What goes wrong:** double clic -> deux clients ou deux projets ; échec milieu de parcours -> utilisateur auth orphelin ou client sans projet.
**How to avoid:** RPC unique avec `for update` sur le lead et contrôle `converted_client_id`; compensation `deleteUser` si le RPC échoue ; désactiver le bouton pendant l'action (`useActionState`). Tester la double conversion en RLS test (la seconde échoue avec `sv_lead_already_converted`).

### Pitfall 3: `sv_client_members.unique(user_id)` et réutilisation de client
**What goes wrong:** si le SIRET existe déjà (client réutilisé), la conversion ajoute un second membre : c'est permis (`primary key (client_id, user_id)`), mais le premier projet est créé sur un client existant : confirmer à l'admin dans l'interface (« client existant réutilisé »).

### Pitfall 4: Le client voit des informations internes
**What goes wrong:** motifs de faits correctifs, identifiants admin, liens ou notes internes lisibles via RLS.
**How to avoid:** motifs dans une table admin-only ; `actor_id` non exposé au client (ou `actor_kind` seul) ; les `select` côté client sélectionnent des colonnes explicites. Test RLS : client A lit ses faits, pas les notes, pas ceux du client B.

### Pitfall 5: Cron Hobby
**What goes wrong:** expression plus fréquente que quotidienne => déploiement refusé ; exécution décalée jusqu'à 59 min ; endpoint de cron public non protégé.
**How to avoid:** `0 6 * * *`, `CRON_SECRET`, test unitaire du refus sans/avec mauvais secret ; l'envoi immédiat reste le chemin nominal.

### Pitfall 6: Doublon de mail sur retry
**What goes wrong:** processus qui plante après l'envoi Resend et avant `status='sent'` => renvoi par le cron.
**How to avoid:** `Idempotency-Key = dedupe_key` (valide 24 h : le cron quotidien peut dépasser la fenêtre pour un `sending` resté bloqué plus de 24 h ; limiter la reprise des `sending` à 15 min-23 h et marquer au-delà `failed` pour revue humaine).

### Pitfall 7: Upload — validation uniquement côté client
**What goes wrong:** taille/type déclarés mentent. **How to avoid:** validation serveur avant URL signée + `file_size_limit`/`allowed_mime_types` sur le bucket + téléchargement forcé en pièce jointe.

### Pitfall 8: Tests RLS et fixtures
Réutiliser `makeUser/makeClient/addMember/makeAdmin/makeGeckoAdmin/svc` ; ajouter des helpers `makeProject`, `postFact`. Les tests utilisent des e-mails uniques ; la branche est jetable.

## Code Examples

### Upload signé (côté serveur puis navigateur)
```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
const { data, error } = await admin.storage
  .from('sv-project-files')
  .createSignedUploadUrl(path); // valide 2 h ; data.token / data.signedUrl
// navigateur : supabase.storage.from('sv-project-files').uploadToSignedUrl(path, token, file)
```

### Téléchargement court
```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
const { data } = await admin.storage
  .from('sv-project-files')
  .createSignedUrl(path, 120, { download: filename });
```

### Envoi idempotent
```typescript
// Source: https://resend.com/docs/dashboard/emails/idempotency-keys
await resend.emails.send(params, { idempotencyKey: row.dedupe_key });
```

### Fonction d'étape (esquisse)
```typescript
const GATES: ReadonlyArray<readonly FactType[]> = [
  ['onboarding_completed'], ['quote_accepted'], ['contract_signed', 'deposit_received'],
  ['production_completed'], ['acceptance_signed'], ['balance_received'],
];
export function effectiveTypes(facts: Fact[]): Set<FactType> {
  const revoked = new Set(facts.filter(f => f.type === 'fact_revoked').map(f => f.targetFactId));
  return new Set(facts.filter(f => f.type !== 'fact_revoked' && !revoked.has(f.id)).map(f => f.type));
}
export function currentStep(facts: Fact[]): number {
  const have = effectiveTypes(facts);
  const i = GATES.findIndex(g => !g.every(t => have.has(t)));
  return i === -1 ? 7 /* terminé */ : i + 1;
}
```

### RLS d'un projet (patron)
```sql
create table public.sv_projects (id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sv_clients(id) on delete restrict, ...);
alter table public.sv_projects enable row level security;
revoke all on public.sv_projects from anon, authenticated;
grant select on public.sv_projects to authenticated;
grant select, insert, update on public.sv_projects to service_role;
create policy sv_projects_read on public.sv_projects for select to authenticated
  using ((select sv_private.is_admin()) or client_id in (select sv_private.client_ids()));
```
Pour les tables filles (faits, fichiers, liens, accords) : helper `sv_private.project_ids()` (`security definer`, `set search_path = ''`, grants comme `client_ids()`) pour éviter la sous-requête récursive sous RLS.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Cron Vercel Hobby « 2 jobs max » | 100 crons par projet sur tous les plans, mais Hobby limité à une exécution/jour | Un cron quotidien suffit à D-18 [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] |
| Envoi sans clé d'idempotence | `Idempotency-Key` natif Resend, 24 h | Filet supplémentaire, pas de substitut à la contrainte unique |

## Runtime State Inventory

Non applicable (phase d'ajout, pas de renommage). Seule exception : `sv_lead_events.type` CHECK à étendre (migration), et `invite.ts`/`resendInvitation` migrent vers l'outbox (code, pas de donnée existante à migrer ; les invitations déjà envoyées n'ont pas de ligne d'outbox, ce qui est acceptable).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel envoie `Authorization: Bearer $CRON_SECRET` aux crons quand la variable est définie | Pattern 3 | Endpoint cron inutilisable ou non protégé ; vérifier dans la doc Vercel / un déploiement preview |
| A2 | Aucune politique `storage.objects` d'un autre produit (Gecko) n'est ouverte à tous les buckets | Pattern 5 | Fuite de fichiers clients ; à vérifier via `pg_policies` sur la branche (seules 3 politiques Gecko filtrées par bucket sont dans le dépôt) |
| A3 | Le CHECK de `sv_lead_events.type` s'appelle `sv_lead_events_type_check` | Pattern 1 | Migration en échec ; relever le nom réel avant d'écrire le `drop constraint` |
| A4 | Portes d'étape et noms de faits proposés (`production_completed`, `balance_received`...) | Pattern 2 | Ajustements cosmétiques ; relève de la discrétion de D-08 |
| A5 | Liste blanche de MIME et durée de lien 120 s | Pattern 5 | Discrétion déclarée ; faible risque |
| A6 | `info`/`list` de Storage permet de confirmer l'existence d'un objet après upload | Pattern 5 | Sinon faire confiance au client et rendre la ligne `ready` à la première génération de lien |
| A7 | Qui attend à chaque étape (1 client, 2 admin, 3 client...) | Pattern 2 | Libellés des mails/frise ; à valider par l'utilisateur |

## Open Questions

1. **Plan Vercel (Hobby/Pro)** — blocker STATE.md. Ce plan reste valide sur Hobby (cron quotidien). Si Hobby, la vérification des droits commerciaux de Hobby est un sujet séparé hors phase.
2. **Texte de l'accord de présentation** — relecture juridique à prévoir ; livrer un texte provisoire marqué.
3. **« Fichier demandé non fourni »** (D-21) — aucune demande de fichier n'est modélisée ; recommandation : ne pas l'implémenter en phase 12.
4. **Statut du client permanent de test** — la conversion e2e doit s'exécuter sur un nouveau lead ; le client « Test E2E Sèvalys » est réutilisé pour les parcours portail (créer son projet via RPC admin/seed, sans le supprimer).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/tests | oui | v26.4.0 | — |
| Branche Supabase de test | tests RLS | oui (phases 10-11, `.env.test.local` `SV_TEST_*`) | — | — |
| Resend (clé, domaine vérifié) | mails | oui (déjà utilisé par l'invitation) | resend ^6.28.1 | — |
| Vercel Cron | cron quotidien | oui sur tous les plans (quotidien Hobby) | — | `pg_cron` + `pg_net` (à vérifier) |
| `CRON_SECRET` en variable Vercel | `/api/cron/mail` | à créer | — | — |
| `vercel.json` | crons | absent, à créer | — | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 (env node) |
| Config file | `vitest.config.ts` (unitaires `src/**/*.test.ts`), `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, branche Supabase, `fileParallelism: false`) |
| Quick run command | `npx vitest run src/lib/projects src/lib/server/mail src/lib/server/projects src/app/admin src/app/api/cron` |
| Full suite command | `npm test` puis `npm run test:rls` |

Pas de bibliothèque de test DOM : les contrats d'interface se testent par gardes de source (patron `layout.test.ts`).

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORTAL-01 | Conversion atomique, double conversion refusée, statut `new`/`lost` refusé, e-mail admin/membre refusé | RLS + unit (actions) | `npx vitest run -c vitest.rls.config.ts tests/rls/convert.rls.test.ts` ; `npx vitest run src/lib/server/projects/convert.test.ts` | Wave 0 |
| PORTAL-02 | Complétude onboarding, écriture limitée au client de la session, RLS A vs B | unit + RLS | `npx vitest run src/lib/projects/onboardingSchema.test.ts` ; `tests/rls/projects.rls.test.ts` | Wave 0 |
| PORTAL-03 | Étape et « qui attend » calculés | unit | `npx vitest run src/lib/projects/steps.test.ts` | Wave 0 |
| PORTAL-04 | Faits ajout seul (UPDATE/DELETE/TRUNCATE refusés), fait en avance sans saut, révocation, idempotence du fait | RLS | `tests/rls/facts.rls.test.ts` | Wave 0 |
| PORTAL-05 | Bucket privé : anon/B/Gecko refusés, validation taille/type, URL de téléchargement courte | RLS + unit | `tests/rls/files.rls.test.ts` ; `src/lib/server/projects/files.test.ts` | Wave 0 |
| PORTAL-06 | Accord en ajout seul, dernier état, version périmée refusée | RLS + unit | `tests/rls/consents.rls.test.ts` | Wave 0 |
| MAIL-01 | Chaque événement a une règle, gabarits sans prix | unit | `npx vitest run src/lib/server/mail/rules.test.ts` | Wave 0 |
| MAIL-02 | Double enqueue = une ligne ; reprise cron ; secret cron | unit + RLS | `src/lib/server/mail/outbox.test.ts` ; `src/app/api/cron/mail/route.test.ts` ; `tests/rls/mailoutbox.rls.test.ts` | Wave 0 |
| ADM-01 | Tri/filtre étape/blocage, dormant à 14 jours, lecture admin seulement | unit + RLS | `src/lib/projects/blocking.test.ts` ; `tests/rls/projects.rls.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** commande rapide ci-dessus (~30 s).
- **Per wave merge:** `npm test` + `npm run test:rls` (migration appliquée sur la branche).
- **Phase gate:** suites complètes vertes avant `/gsd:verify-work`; passage manuel : conversion réelle d'un lead de test, upload d'un fichier, réception du mail, lecture du cron en preview.

### Wave 0 Gaps
- [ ] Migration `20261004000000_sv_projects_engine.sql` appliquée sur la branche avant les tests RLS
- [ ] Fichiers de test listés ci-dessus, helpers `makeProject`/`postFact` dans `tests/rls/helpers.ts`, `cleanup()` tolérant (Pitfall 1)
- [ ] `vercel.json` + variable `CRON_SECRET` (preview et production)
- [ ] Extension de la garde « aucun prix » / `server-only` aux nouveaux modules

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | oui (indirect) | Login par code existant ; `getUser()` jamais `getSession()` ; création de compte uniquement par l'admin |
| V3 Session Management | oui | `getVerifiedSession` existant (30 jours) |
| V4 Access Control | **oui, central** | RLS par table, `sv_private.is_admin/client_ids/project_ids`, `requireAdmin()` avant tout service_role, `client_id` dérivé de la session |
| V5 Input Validation | oui | zod ; noms de fichiers nettoyés ; liste blanche MIME/extension ; URL de liens limitée à `https:` |
| V6 Cryptography | non | Aucun secret maison ; `CRON_SECRET` comparé en temps constant |
| V12 Files | oui | Taille, type, stockage hors webroot, téléchargement en pièce jointe, URLs signées courtes |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR (projet/fichier d'un autre client) | Information disclosure | RLS + lecture de la ligne avec le client utilisateur avant toute URL signée |
| Chemin de stockage forgé (`../`) | Tampering | Chemin construit côté serveur, nom nettoyé, UUID préfixé |
| SVG/HTML actif servi inline | XSS | `download` + `attachment`, jamais d'aperçu inline |
| Cron public | Spoofing/DoS | `Bearer CRON_SECRET`, comparaison constante |
| Fuite via vue | Info disclosure | `security_invoker`, pas de `security definer` view |
| Rôle depuis metadata | Elevation | Rôles en tables uniquement (existant) |
| URL de lien utile `javascript:` | XSS | Valider `https://` (zod `url` + protocole), `rel="noopener noreferrer"` |
| Injection HTML dans mails | Tampering | `escapeHtml` existant dans les gabarits |
| Altération du journal | Repudiation | Triggers `deny_mutation` sur faits, accords, événements |

## Sources

### Primary (HIGH confidence)
- Codebase : `supabase/migrations/20261002000000_sv_foundation.sql`, `20261003000000_sv_leads_core.sql`, `20261003020000_sv_leads_backfill_purge.sql`, `20260921000000_gecko_cabane_integration.sql` ; `src/lib/server/clients/invite.ts`, `src/lib/server/mail/inviteEmail.ts`, `src/lib/server/auth/dal.ts`, `src/lib/admin/inviteSchema.ts`, `src/lib/privateRoutes.ts` ; `tests/rls/helpers.ts`, `vitest.rls.config.ts`, `package.json`
- https://vercel.com/docs/cron-jobs/usage-and-pricing (mis à jour 2026-07-15) — limites Hobby/Pro
- https://resend.com/docs/dashboard/emails/idempotency-keys — clé <= 256 car., 24 h, SDK Node `idempotencyKey`
- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl — validité 2 h
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl — `expiresIn`, option `download`
- https://supabase.com/docs/guides/storage/buckets/creating-buckets — limites de bucket

### Secondary (MEDIUM confidence)
- Aucun.

### Tertiary (LOW confidence)
- Comportement `CRON_SECRET` (A1), existence d'une API d'info objet Storage (A6) : non vérifiés cette session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — aucun nouveau paquet, versions lues dans `package.json`
- Architecture: MEDIUM-HIGH — alignée sur les patrons déjà livrés ; schéma exact à la discrétion du planner
- Pitfalls: HIGH pour triggers/FK/cron/Storage (vérifiés dans le code et les docs), MEDIUM pour A1-A3

**Research date:** 2026-10-03
**Valid until:** 2026-11-02 (30 jours)
