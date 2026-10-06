# Phase 16: Mailing automation completion - Research

**Researched:** 2026-10-06
**Domain:** relances automatiques (balayage cron), webhook Resend (Svix/standardwebhooks), liste de suppression, séparation transactionnel/marketing, désinscription RFC 8058
**Confidence:** HIGH (code existant lu directement ; API Resend vérifiée dans le SDK installé 6.28.1 et la doc officielle)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Cadence J+3, J+7, alerte admin J+14 pour le document non signé, identique à l'acompte impayé (phase 15 D-17) : un seul patron, code et tests partagés. Comptée depuis l'émission de la révision courante du document.
- **D-02:** Destinataires : les membres du client (les mêmes que `document_issued`). Arrêt dès que le document est signé, refusé ou remplacé par une nouvelle révision ; les relances de la révision remplacée ne repartent pas. L'admin peut suspendre les relances d'un projet (action journalisée) et les reprendre.
- **D-03:** Détection par extension du balayage quotidien existant (`sweepInvoices` / cron `/api/cron/mail` à 06:00), pas de planification à l'émission. Clé d'unicité par document + palier + destinataire (patron `dedupeKey.paymentReminder`) : une seule fois par palier. Statut « non signé » déduit des faits (phase 13 D-14), jamais d'un champ recopié. Aucune fréquence de cron plus fine que quotidienne (blocker plan Vercel).
- **D-04:** Règle, délai, détection et modèle de demande d'avis livrés en phase 16 ; envoi réel désactivé par un drapeau jusqu'au lien d'avis unique (phase 18). Le modèle comporte un emplacement de lien ; critère testé avec un lien factice. Aucun envoi réel vers le lien Google Business avant la phase 18.
- **D-05:** Calendrier : J+7 après le PV signé (`acceptance_signed`), relance J+21, puis arrêt. Deux mails au plus ; s'arrête dès qu'un avis est déposé. Détection : projet livré, PV signé, aucun avis.
- **D-06:** La demande d'avis est classée flux marketing (D-13) : lien de désinscription obligatoire, bloquée par la liste de suppression et par la désinscription.
- **D-07:** Plainte (spam) -> bloque tout le marketing pour l'adresse, pas le transactionnel. Rebond définitif -> bloque tout envoi vers l'adresse et alerte l'admin. Rebond temporaire -> ignoré, aucune suppression.
- **D-08:** Vue admin minimale de la liste (adresse, cause, date, flux bloqués), alerte admin à chaque ajout d'une adresse appartenant à un client ou à un lead, réactivation manuelle avec motif obligatoire. Journal en ajout seul (triggers `deny_mutation`) : aucune ligne de suppression ni de levée n'est effacée.
- **D-09:** Webhook Resend signé (Svix), route publique exemptée de l'authentification dans `src/proxy.ts` et `privateRoutes`, signature vérifiée sur le corps brut, table d'événements Resend à clé d'unicité sur l'identifiant d'événement (patron webhook Stripe phase 15), traitement idempotent. À vérifier en preview avec le jeton de contournement Vercel. Secret de webhook en variable d'environnement avec garde au démarrage. Aucune adresse e-mail dans les logs.
- **D-10:** Phase 16 livre l'infrastructure, pas de campagne. Aucun envoi marketing réel vers un prospect ou un lead. Flux testé avec un modèle d'exemple.
- **D-11:** Désinscription en un clic. Jeton signé par adresse, page publique de confirmation sans connexion, en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post`, effet immédiat, événement journalisé (date, adresse, source). Ne coupe jamais le transactionnel. Pas de réinscription en libre-service (réactivation par l'admin, D-08).
- **D-12:** Pied de page marketing obligatoire (identité de l'expéditeur, lien de désinscription) imposé par le constructeur d'e-mail marketing : un modèle marketing sans lien ne se construit pas, test automatisé.
- **D-13:** Classe de message portée par chaque règle (`transactional` / `marketing`) dans `MAIL_RULES`, appliquée par l'outbox : garde de suppression et de désinscription selon le flux au moment de l'envoi (statut `skipped` journalisé, jamais d'envoi silencieux). Expéditeur distinct pour le marketing, sur le même domaine (`sevalys.com`). Pas de sous-domaine d'envoi dédié.
- **D-14:** Règles en code, outbox idempotente `sv_mail_outbox`, cron quotidien. Nouveaux événements/modèles étendent la liste fermée dans une migration (contraintes `check`, jamais de nom de contrainte codé en dur) et dans `rules.ts`.
- **D-15:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, rôles en tables. Prix autorisés dans portail/admin/modèles, jamais sur le public. Client de test permanent « Test E2E Sèvalys » réutilisé. Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables (liste de suppression, événements Resend, désinscriptions, suspension des relances), noms des types et événements, découpage des plans.
- Format du jeton de désinscription (HMAC, portée, durée), contenu et libellés français.
- Libellé de l'expéditeur marketing distinct, détails du drapeau d'activation de la demande d'avis.
- Autres événements Resend (livré, ouvert, différé) : ignorés sauf besoin.
- Emplacement de la vue admin et de l'action de suspension dans la fiche projet.

### Deferred Ideas (OUT OF SCOPE)
- Suivi automatique du prospect sur changement de statut du lead
- Sous-domaine d'envoi marketing dédié
- Envoi de la demande d'avis vers Google Business avant le lien unique
- Réinscription en libre-service après désinscription
- Éditeur de règles de mail dans l'admin
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAIL-03 | Relances automatiques : document non signé, acompte impayé, demande d'avis | Balayage cron à étendre (sections Architecture, Pitfall 1). **Découverte : le balayage d'acompte impayé n'existe PAS encore** (seuls modèle, règle et clé de dédoublonnage existent) : à construire ici avec le même moteur que le document non signé. |
| MAIL-04 | Rebonds/plaintes -> liste de suppression ; lien de désinscription sur chaque e-mail marketing ; flux séparés | Webhook Resend (`resend.webhooks.verify`), tables append-only, garde dans `deliver()`, jeton HMAC, en-têtes RFC 8058. |
</phase_requirements>

## Summary

Le moteur existant est sain et directement extensible : `MAIL_RULES` (rules.ts), `enqueueMail` (upsert `ON CONFLICT DO NOTHING` sur `dedupe_key`), `deliver()` (point unique d'envoi, appelé par `processDueMail` et `sendOutboxRow`), contraintes `check` d'événement/template rebâties par boucle `pg_constraint` (jamais de nom codé en dur). La garde de suppression se place dans `deliver()` avant l'appel Resend ; les deux chemins d'envoi la traversent donc.

**Écart critique par rapport à CONTEXT.md** : CONTEXT affirme que les relances d'acompte (J+3, J+7, admin J+14) « existent déjà ». Grep du code : seuls `paymentReminderEmail`, `paymentReminderAdminEmail`, la règle `payment_reminder*` et `dedupeKey.paymentReminder*` existent. **Rien n'enfile ces e-mails** : `sweepInvoices` ne fait que l'émission de factures et le rattrapage des PDF. Le critère de succès 1 (« un acompte impayé déclenche la relance ») exige donc de construire le balayage d'acompte impayé en phase 16, avec le même moteur générique que le document non signé (D-01 : un seul patron). Le planificateur doit l'inscrire dans le périmètre (MAIL-03) et le signaler à l'utilisateur.

Le webhook Resend se vérifie avec `resend.webhooks.verify({ payload, headers: {id, timestamp, signature}, webhookSecret })` (en-têtes `svix-id`, `svix-timestamp`, `svix-signature`) ; le SDK installé 6.28.1 s'appuie sur `standardwebhooks` (déjà en dépendance transitive de `resend`) : **aucun nouveau package à installer**. La route `/api/...` est déjà hors du matcher du proxy (`(?!api|...)`), donc déjà exempte d'authentification ; il faut seulement la tester.

**Primary recommendation:** Un seul plan de données (migration unique : contraintes outbox étendues, `sv_resend_events`, `sv_mail_suppressions` + `sv_mail_suppression_lifts` en ajout seul, `sv_reminder_holds`, RPC `sv_apply_resend_event`), puis garde dans `deliver()`, puis balayage générique `sweepReminders` appelé par le cron, puis webhook, puis désinscription (jeton HMAC + route POST/GET + page), puis vue admin.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Détection des relances (non signé, impayé, avis) | API / Backend (cron route + module server-only) | Database (lectures faits/signatures/événements de paiement) | Statut déduit des faits, service_role confiné au serveur |
| Dédoublonnage « une fois par palier » | Database (`dedupe_key` unique) | API | Seule garantie atomique sous concurrence |
| Réception webhook Resend | API / Backend (route `/api/resend/webhook`) | Database (RPC idempotente) | Corps brut + signature côté serveur |
| Liste de suppression + garde d'envoi | Database (tables append-only) | API (`deliver()`) | Journal immuable, décision au moment de l'envoi |
| Jeton de désinscription | API / Backend | — | HMAC avec secret serveur |
| Page de désinscription | Frontend Server (SSR, noindex) | API (route POST one-click) | Sans session |
| Vue admin suppression + suspension | Frontend Server (admin) | Database (RLS admin) | Lecture via client RLS admin, écriture via RPC service_role |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.28.1 (installé ; npm latest 6.32.1) [VERIFIED: npm view + node_modules] | Envoi + `webhooks.verify` | Déjà utilisé ; `verify` présent dans les types 6.28.1 |
| node:crypto (`createHmac`, `timingSafeEqual`) | Node >= 22.12 | Jeton de désinscription | Déjà le patron de `cron/mail/route.ts` et `signature/codes.ts`, pas de dépendance |
| vitest | ^4.1.11 | Tests | Existant |

### Supporting
Aucun nouveau package. `standardwebhooks` 1.1.1 est une dépendance de `resend` (pas à importer directement). `svix` n'est PAS installé et ne doit pas l'être. [VERIFIED: node_modules/resend/package.json]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resend.webhooks.verify` | package `svix` | Dépendance en plus, mêmes en-têtes ; inutile |
| Liste de suppression Resend seule (Audiences/Suppressions) | Table locale | Resend supprime déjà les rebonds durs et plaintes de son côté, mais la portée D-07 (plainte = marketing seulement, transactionnel continue) et la réactivation motivée exigent une liste locale |

**Installation:** aucune.

## Package Legitimacy Audit

Aucun package externe n'est ajouté par cette phase (resend déjà installé ; `standardwebhooks` est une dépendance transitive existante). slopcheck non exécuté, sans objet.

**Packages removed:** none. **Packages flagged:** none.

## Architecture Patterns

### System Architecture Diagram

```
Vercel Cron 06:00 --Bearer CRON_SECRET--> GET /api/cron/mail
   |-> processDueMail(25) --claim RPC--> deliver(row)
   |        deliver: classe = MAIL_RULES[event].class
   |           |- transactional: garde "bounce_permanent" seulement
   |           |- marketing: garde (complaint | unsubscribe | bounce_permanent) + drapeau review_request
   |           |   -> blocked: status='skipped', last_error='suppressed'|'flag_off' (jamais d'envoi)
   |           |   -> ok: buildMail (+ footer + List-Unsubscribe*) --> Resend send (idempotencyKey)
   |-> sweepInvoices (existant)
   |-> sweepReminders (NOUVEAU): lit faits/signatures/paiements/holds
            -> enqueueMail(dedupeKey par palier + destinataire)  (ON CONFLICT DO NOTHING)

Resend --POST svix-*--> /api/resend/webhook (corps brut)
   -> resend.webhooks.verify (throw => 400)
   -> type: email.bounced(Permanent) | email.complained | autre(=200 ignoré)
   -> RPC sv_apply_resend_event(svix-id, type, to[], bounce) [idempotent]
        insert sv_resend_events ON CONFLICT -> duplicate => stop
        insert sv_mail_suppressions (1 ligne par adresse)
        enqueue alerte admin si adresse = membre client / contact lead
   -> 200 'ok' ; erreur DB => 500 (Svix réessaie)

Destinataire --clic--> /desinscription?t=<token> (GET page SSR noindex)  -> POST confirme
Client mail (RFC 8058) --POST--> /api/unsubscribe?t=<token> (corps List-Unsubscribe=One-Click)
   -> vérif HMAC -> RPC sv_record_unsubscribe -> sv_mail_suppressions(cause='unsubscribe', scope marketing)
```

### Recommended Project Structure
```
src/lib/server/mail/
├── rules.ts              # + class, + événements/templates/dedupeKey
├── outbox.ts             # + garde dans deliver(), + en-têtes marketing, + switch templates
├── suppression.ts        # server-only : isBlocked(email, class), lectures admin
├── unsubscribeToken.ts   # sign/verify HMAC (pur, testable)
├── marketingEmail.ts     # constructeur marketing : pied + lien imposés (D-12)
├── reviewRequestEmail.ts # modèle (lien factice testé)
├── documentReminderEmail.ts
src/lib/server/reminders/
├── cadence.ts            # pur : stage(daysSince) -> 'd3'|'d7'|'d14'|null
├── sweep.ts              # sweepReminders (unsigned, deposit, review)
src/lib/server/resend/webhook.ts  # verifyResendEvent + toApplyArgs (pur)
src/app/api/resend/webhook/route.ts
src/app/api/unsubscribe/route.ts
src/app/desinscription/page.tsx   # noindex, hors portail
supabase/migrations/2026100800000x_sv_mail_automation.sql
```

### Pattern 1: Classe de flux dans la règle (D-13)
`Rule = { template; delayMs; to; class: 'transactional' | 'marketing' }`. Tous les événements existants `transactional`, `review_request` `marketing`. Test de parité : toute règle déclare une classe ; tout template `marketing` passe par `buildMarketingEmail`.

### Pattern 2: Garde dans `deliver()` (avant `resend.emails.send`)
```ts
// deliver(): après le contrôle de la clé API, avant buildMail
const verdict = await sendVerdict(row);   // 'ok' | 'suppressed' | 'flag_off'
if (verdict !== 'ok') {
  await markRow(row.id, { status: 'skipped', last_error: verdict });
  console.error(`[mail/outbox] ${row.template} ${verdict}`); // aucune adresse
  return 'skipped';
}
```
Le type de retour de `deliver` doit passer à `'sent'|'failed'|'skipped'` ; `processDueMail`, `sendOutboxRow` et `enqueueAndSend` doivent le compter (ajouter `skipped` au résultat). `skipped` est terminal : `sv_claim_due_mail` ne reprend que `pending`/`failed`/`sending` périmé, donc une ligne `skipped` n'est jamais renvoyée. Une adresse réactivée ne rouvre pas les lignes déjà `skipped` (comportement voulu : le prochain palier repart d'une nouvelle clé).

### Pattern 3: Balayage générique de relance (un patron, trois usages)
Fonction pure `reminderStage(elapsedDays, cadence)` + lecture batch (une requête par table, comme `sweepInvoices`), puis `enqueueMail` avec clé par palier. Cadence :
- `unsigned_doc` / `deposit` : d3, d7 (clients), d14 (admin).
- `review_request` : d7 après `acceptance_signed`, d21, arrêt.
Chaque palier ne se déclenche que si `elapsed >= palier` ; **ne rattraper que le palier le plus avancé non encore émis ?** Non : pour éviter une rafale après une panne cron, n'enfiler que le palier le plus élevé atteint (le cron quotidien manquerait sinon d3 puis enverrait d3+d7 le même jour). Recommandation : `stage = plus grand palier <= elapsed`, un seul enqueue par exécution et par destinataire.

Sources de vérité (lecture directe, pas de champ recopié, D-03) :
- **Non signé** : document actif = tête de chaîne (`replaces_document_id` : un document est remplacé s'il est ciblé par un autre ; helper existant `replacedByMap`/`chainHeads` dans `src/lib/documents/steps.ts`), types `quote`/`contract`/`acceptance` ; signé si fait effectif `SIGNING_FACT[docType]` (voir `documentStatus` dans `src/lib/documents/status.ts`, statut `to_sign`) ; départ = `sv_project_documents.issued_at`. `acceptance_refused` : arrêter (exclure les documents `acceptance` ayant une soumission refusée, via `sv_acceptance_submissions`/événement `acceptance_refused`). Destinataires = membres (`sv_client_members.invited_email`, comme `document_issued`).
- **Acompte impayé** : `sv_invoices` (`kind='deposit'`, `due_date`/`issued_on`) sans fait effectif `deposit_received`, sans événement `paid` dans `sv_invoice_payment_events`, et non crédité (`creditedCents`). Départ = `issued_on` (Europe/Paris).
- **Demande d'avis** : fait effectif `acceptance_signed`, `sv_projects` livré, et aucun avis. **Aucune table d'avis n'existe avant la phase 18** : « aucun avis » est vrai par construction ; isoler la détection derrière une fonction `hasReview(projectId)` retournant `false` avec un TODO explicite pour la phase 18, et le drapeau coupe l'envoi (voir plus bas).

### Pattern 4: Webhook Resend (copie du patron Stripe)
```ts
// src/app/api/resend/webhook/route.ts   (runtime nodejs, force-dynamic)
export async function POST(request: Request) {
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return text('missing signature', 400);
  const raw = await request.text();                 // corps brut, jamais request.json()
  const event = verifyResendEvent(raw, { id, timestamp, signature }); // null si invalide
  if (!event) return text('invalid signature', 400);
  const args = toApplyArgs(id, event);              // null => ignoré
  if (!args) return text('ignored', 200);
  const rpc = await callRpc('resend/webhook', 'sv_apply_resend_event', { ...args, p_admin_email: ADMIN_NOTIFY_EMAIL });
  if (!rpc.ok) return text('retry', 500);
  // envoyer les ids d'alerte admin renvoyés (sendOutboxRow), comme le webhook Stripe
  return text('ok', 200);
}
// verifyResendEvent
new Resend(apiKey).webhooks.verify({ payload: raw, headers: { id, timestamp, signature }, webhookSecret });
// lève en cas d'échec -> try/catch -> null. Source: https://resend.com/docs/webhooks/verify-webhooks-requests
```
Garde au démarrage : `RESEND_WEBHOOK_SECRET` absent => la route répond 500 `not_configured` (fail-closed, comme `CRON_SECRET`), jamais 200. Ajouter à `.env.example`. Le secret commence par `whsec_`.

Mappage d'événement (types SDK `EmailBouncedEvent.data.bounce.{type,subType,message}`, `to: string[]`) :
| Événement | Condition | Effet |
|---|---|---|
| `email.bounced` | `bounce.type === 'Permanent'` | suppression `scope='all'`, cause `bounce_permanent`, alerte admin si client/lead |
| `email.bounced` | `Transient` ou `Undetermined` | ignoré (200). `Undetermined` : choix conservateur [ASSUMED], à confirmer |
| `email.complained` | toujours | suppression `scope='marketing'`, cause `complaint` |
| tous les autres (`delivered`, `opened`, `suppressed`, `delivery_delayed`...) | | 200 ignoré |
Une même requête a `to[]` : une ligne de suppression par adresse (minuscules, `trim`). Idempotence : clé = en-tête `svix-id` (identique entre les réessais d'un même message Svix) [CITED: Svix/standardwebhooks]. La charge utile Resend n'expose pas d'identifiant d'événement propre : utiliser `svix-id`.

### Pattern 5: Jeton de désinscription (HMAC, sans état)
`token = base64url(email_lower) + '.' + base64url(HMAC_SHA256(secret, 'unsub:v1:' + email_lower))`. Pas d'expiration (la désinscription doit rester valide à vie dans les anciens e-mails ; RFC 8058 + CAN-SPAM). Secret dédié `UNSUBSCRIBE_SECRET` (garde au démarrage, >= 32 octets), jamais réutilisé avec `CRON_SECRET`. Comparaison `timingSafeEqual` sur longueurs égales. L'adresse figure dans l'URL (nécessaire pour retrouver le destinataire) : donc pas de log d'URL, `Referrer-Policy: no-referrer` sur la page, `noindex`. Alternative sans adresse en clair : jeton opaque = id de ligne outbox signé ; plus propre pour la vie privée mais lie à la ligne ; recommandation : adresse + HMAC (retire la dépendance à l'outbox, effet par adresse comme exigé D-11).

Routes :
- `POST /api/unsubscribe?t=` : corps `List-Unsubscribe=One-Click` (form-urlencoded), répond `200` page vide, effet immédiat (RFC 8058). Hors proxy (préfixe `/api`).
- `GET /desinscription?t=` : page SSR de confirmation avec bouton qui POST ; **le GET ne doit pas désinscrire** (les scanners d'e-mails préchargent les liens). Ajouter `/desinscription` à `PRIVATE_PREFIXES` (noindex, pas d'analytics, aligné sur `src/proxy.test.ts` et le matcher littéral du proxy), sans l'ajouter à `PROTECTED_PREFIXES`.

En-têtes d'envoi marketing via Resend (`headers` de `emails.send`) [CITED: resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails] :
```ts
headers: {
  'List-Unsubscribe': `<${unsubscribePostUrl}>`,        // URL https
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```
Gmail/Yahoo exigent aussi SPF/DKIM/DMARC alignés (déjà vérifiés phase 10) ; le seuil de 5000 mails/jour ne nous concerne pas, mais D-11 impose les en-têtes quand même. Ne jamais mettre ces en-têtes sur le transactionnel.

### Pattern 6: Constructeur marketing (D-12)
`buildMarketingEmail({ subject, bodyHtml, bodyText, unsubscribeUrl, sender })` lance une erreur si `unsubscribeUrl` est vide ou n'est pas https ; ajoute pied (nom de l'expéditeur, adresse du siège légale si requis, lien en HTML et en texte). Test : un modèle marketing sans lien ne se construit pas ; un test de parité énumère tous les templates de classe `marketing` et vérifie le lien dans `html` et `text`.

Expéditeur marketing distinct : constante `MARKETING_EMAIL_FROM = buildFromHeader('Sèvalys', 'bonjour@sevalys.com')` [ASSUMED : libellé et adresse à valider ; doit être une adresse du domaine `sevalys.com` vérifié], `reply-to` identique `contact@sevalys.com`. `BuiltMail.from` est déjà un champ : ajouter `headers?: Record<string,string>` à `BuiltMail` et à l'appel `emails.send`.

### Drapeau demande d'avis (D-04)
Variable d'environnement `REVIEW_REQUESTS_ENABLED` (`'true'` pour activer ; absent = éteint), lue au moment de l'envoi dans la garde (`flag_off` => `skipped`). Le balayage peut enfiler (testable) ; l'envoi est bloqué. Attention : si le balayage enfile avec drapeau éteint, les lignes deviennent `skipped` définitivement et la phase 18 ne les renverra pas. Recommandation : **le balayage ne doit pas enfiler quand le drapeau est éteint** (même lecture du drapeau dans `sweepReminders`), et la garde dans `deliver()` reste en défense en profondeur. Les tests injectent le drapeau.

### Anti-Patterns to Avoid
- **Enfiler à l'émission du document** : contredit D-03 (balayage quotidien).
- **Désinscrire sur GET** : les préchargeurs de liens désinscrivent des gens.
- **Mettre l'adresse ou l'URL de désinscription dans un log ou `last_error`** : l'outbox garde des codes courts.
- **Nom de contrainte codé en dur** dans la migration : réutiliser la boucle `pg_constraint` des migrations 12/13/14/15 (recherche par contenu).
- **Stocker la classe de flux dans l'outbox au moment de l'enfilage** comme source de vérité : lire `MAIL_RULES[event_type].class` à l'envoi pour que le code reste la source (D-14).
- **Un `UPDATE`/`DELETE` pour lever une suppression** : la levée est une ligne dans une table de levées ; l'état actif = suppression sans levée postérieure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature de webhook | HMAC maison Svix | `resend.webhooks.verify` | Tolérance d'horodatage, rotation de secrets multiples, comparaison à temps constant |
| Idempotence d'envoi | Verrou applicatif | `dedupe_key` unique + `idempotencyKey` Resend (déjà là) | Atomique |
| Immutabilité du journal | Convention applicative | triggers `sv_private.deny_mutation()` (déjà là) | Garanti au niveau base, aussi pour `service_role` |
| Statut « non signé » | Colonne recopiée | `documentStatus` / `effectiveFacts` / `chainHeads` | D-03 / phase 13 D-14 |
| Calcul de dates Paris | arithmétique en ms | `Intl`/helper de dates existant `Europe/Paris` (vérifier le helper des factures dans `invoices/build.ts`) | Passage heure d'été |
| Un seul patron de relance | trois balayages copiés | `reminderStage` + `sweepReminders` paramétrés | D-01 |

## Runtime State Inventory

Non applicable (phase d'ajout, pas de renommage ni migration de données existantes). Ligne à ligne : Stored data : aucune ; Live service config : **webhook Resend à créer dans le tableau de bord Resend (URL, événements `email.bounced`, `email.complained`) et secret `whsec_` à copier dans Vercel (Production + Preview)** ; OS-registered : aucun ; Secrets/env : nouveaux `RESEND_WEBHOOK_SECRET`, `UNSUBSCRIBE_SECRET`, `REVIEW_REQUESTS_ENABLED` ; Build artifacts : aucun.

## Common Pitfalls

### Pitfall 1: Le balayage d'acompte impayé n'existe pas
**What goes wrong:** On suppose (CONTEXT) que d3/d7/d14 tournent ; le critère 1 échoue en recette.
**Why:** Phase 15 n'a livré que modèle + règle + clé. Vérifié par grep : aucun `enqueueMail` avec `payment_reminder*`.
**How to avoid:** Tâche explicite « balayage acompte impayé » ; test d'intégration : facture d'acompte émise il y a 3/7/14 jours -> 1 ligne outbox par palier, ré-exécution = 0 ligne.
**Warning signs:** `payment_reminder` absent de `sv_mail_outbox` en préview.

### Pitfall 2: Corps déjà parsé = signature invalide
**What goes wrong:** `request.json()` puis `JSON.stringify` : `verify` lève toujours.
**How to avoid:** `await request.text()` en premier, jamais de middleware de corps. Test avec payload signé généré via `standardwebhooks`/HMAC dans le test (voir Validation).

### Pitfall 3: Réessai Svix après erreur 500 => double traitement
**How to avoid:** insertion dans `sv_resend_events` avec `ON CONFLICT (event_id) DO NOTHING` dans la même transaction que les suppressions ; un doublon retourne `duplicate` (200). Les suppressions sont aussi idempotentes par `(email, cause, resend_event_id)` unique.

### Pitfall 4: Rafale de relances après une panne du cron
**How to avoid:** n'enfiler que le palier le plus élevé atteint par destinataire (voir Pattern 3). Ajouter une borne de fraîcheur (ex. ne pas relancer un document émis il y a plus de 60 jours) [ASSUMED : seuil à valider].

### Pitfall 5: Relance d'une révision remplacée ou signée entre l'enfilage et l'envoi
**What goes wrong:** Mail `pending` (retry, `send_after`) envoyé alors que le document vient d'être signé.
**How to avoid:** Les relances sont enfilées avec `delayMs: 0` et envoyées dans la même exécution du cron (`processDueMail` tourne avant le balayage ; les lignes enfilées partent au cron suivant ou via `sendOutboxRow`). **Ordre recommandé dans le cron : balayage puis `processDueMail`** pour envoyer le jour même, et re-vérification légère dans `deliver()` du statut (document encore à signer, facture encore impayée) pour les templates de relance. Au minimum, la clé contient l'id du document (la révision remplacée a un autre id, donc aucune relance héritée).

### Pitfall 6: Plainte qui bloque aussi les factures
**How to avoid:** `scope` explicite par ligne (`marketing` | `all`) et garde par classe ; test : adresse avec plainte reçoit `payment_requested` (transactionnel) et ne reçoit pas `review_request`.

### Pitfall 7: Lignes de suppression pour l'adresse admin ou de test
Un rebond sur `contact@sevalys.com` couperait les alertes. L'alerte admin ne doit jamais être bloquée par la liste (`recipient_kind='admin'` exempté de la garde marketing, mais pas du rebond définitif : le signaler en alerte console courte). Le client de test permanent « Test E2E Sèvalys » ne doit pas être supprimé : toute levée de test passe par la fonction de réactivation, jamais par `DELETE` (impossible de toute façon).

### Pitfall 8: Webhook derrière la Deployment Protection de Vercel en preview
Les previews renvoient 401 à Resend. Tester avec `x-vercel-protection-bypass` (D-09) ; le webhook de production est configuré sur le domaine de production uniquement.

### Pitfall 9: Casse et alias d'adresse
Normaliser en `lower(btrim())` partout (comme `norm` dans rules.ts et `recipient_email.toLowerCase()`). Ne pas retirer les sous-adresses `+tag`. La comparaison côté garde doit utiliser la même normalisation.

## Code Examples

### Migration : contraintes outbox (patron existant, nouveaux événements)
Reprendre la boucle de `20261005000000_sv_documents.sql` (drop par `pg_get_constraintdef ilike`) en la recherchant sur un événement déjà présent (ex. `payment_anomaly_admin`) puis recréer la liste complète : anciens 13 événements + `document_reminder`, `document_reminder_admin`, `review_request`, `mail_suppression_admin` ; templates idem. Ajouter la colonne n'est pas nécessaire (classe en code).

### Tables (esquisse)
```sql
create table public.sv_mail_suppressions (
  id bigint generated always as identity primary key,
  email_norm text not null check (char_length(email_norm) <= 254),
  scope text not null check (scope in ('marketing', 'all')),
  cause text not null check (cause in ('complaint', 'bounce_permanent', 'unsubscribe')),
  source text not null check (source in ('resend_webhook', 'one_click', 'link')),
  resend_event_id text null,
  created_at timestamptz not null default now(),
  unique (email_norm, cause, resend_event_id)   -- NULLs distincts : unsubscribes répétés autorisés
);
create table public.sv_mail_suppression_lifts (
  id bigint generated always as identity primary key,
  suppression_id bigint not null references public.sv_mail_suppressions (id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 300),
  lifted_by uuid not null,   -- sans FK vers auth.users (convention phase 15)
  created_at timestamptz not null default now(),
  unique (suppression_id)
);
create table public.sv_resend_events (
  event_id text primary key check (char_length(event_id) <= 200),   -- svix-id
  type text not null, received_at timestamptz not null default now(), processed_at timestamptz null
);
create table public.sv_reminder_holds (   -- suspension par projet, append-only
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  action text not null check (action in ('suspend', 'resume')),
  actor_id uuid not null, created_at timestamptz not null default now()
);
-- état courant = dernière ligne par project_id
```
Pour chaque table : `enable row level security`, `revoke all ... from anon, authenticated, service_role`, `grant select` (admin via policy `is_admin()` pour les tables lues dans l'admin ; `service_role` select/insert), triggers `deny_mutation` (update/delete/truncate), comme `sv_invoice_payment_events`. Statut actif : `not exists (lift)`. La requête de garde : `exists (select 1 from sv_mail_suppressions s where s.email_norm = $1 and s.scope = any($scopes) and not exists (select 1 from sv_mail_suppression_lifts l where l.suppression_id = s.id))` avec `$scopes = ['all']` pour le transactionnel et `['all','marketing']` pour le marketing. Une désinscription ajoute `scope='marketing'`.

Les écritures (webhook, désinscription, levée, suspension) passent par des fonctions `security definer`, `set search_path = ''`, `revoke ... from public, anon, authenticated`, `grant execute to service_role`, comme `sv_apply_stripe_event`. La levée vérifie l'admin côté serveur (`requireAdmin()` dans l'action) et enregistre `lifted_by`.

### Alerte admin sur ajout (client ou lead)
Dans `sv_apply_resend_event`, après insertion : `exists (select 1 from sv_client_members where lower(invited_email) = v_email)` ou `exists (select 1 from sv_lead_contacts where email_norm = v_email)` (colonne `email_norm`, confirmée dans la migration leads) -> insérer une ligne outbox `mail_suppression_admin` vers `p_admin_email`, clé `mail_suppression_admin:<suppression_id>`, payload sans adresse brute si possible (nom du client + cause), et renvoyer les ids pour `sendOutboxRow`.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `svix` package pour vérifier | `resend.webhooks.verify` dans le SDK | pas de dépendance |
| Lien de désinscription seul | + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), exigé par Gmail/Yahoo | une requête POST doit désinscrire sans interaction |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Undetermined` traité comme rebond non définitif (ignoré) | Pattern 4 | Rebonds réels non supprimés ; faible risque, à confirmer |
| A2 | Adresse expéditeur marketing `bonjour@sevalys.com` | Pattern 6 | Libellé à valider par l'utilisateur (discrétion) |
| A3 | Borne de fraîcheur 60 jours pour les relances | Pitfall 4 | Relances trop tardives ou trop strictes |
| A4 | `svix-id` stable entre réessais d'un même message et suffisant comme clé d'idempotence | Pattern 4 | Doublons ; atténué par l'unicité `(email_norm, cause, resend_event_id)` |
| A5 | Pas d'expiration du jeton de désinscription | Pattern 5 | Politique de sécurité à confirmer |
| A6 | `REVIEW_REQUESTS_ENABLED` en variable d'environnement (et non table de configuration) | Drapeau | Phase 18 devra le lever en prod |

## Open Questions

1. **Balayage d'acompte impayé absent (écart avec CONTEXT).**
   - Connu : seuls modèle/règle/clé existent. Inconnu : si l'utilisateur le sait.
   - Recommandation : l'inclure dans le plan (MAIL-03, critère 1), à signaler au passage dans le résumé de planification.
2. **« Livré sans avis » : quelle donnée marque un projet livré ?**
   - `production_completed`/`acceptance_signed` sont des faits ; D-05 ancre sur `acceptance_signed`. Aucune table d'avis avant la phase 18.
   - Recommandation : `acceptance_signed` effectif ; `hasReview()` retourne `false` jusqu'à la phase 18.
3. **Destinataire des demandes d'avis** : membres du client (comme `document_issued`) ; confirmer pas de contact de projet distinct.
4. **Alertes admin sur rebond d'adresse inconnue** (ni client ni lead) : journalisée seulement, pas d'alerte (D-08).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tout | oui | >= 22.12 (engines resend) | — |
| resend SDK | webhook verify, envoi | oui | 6.28.1 | — |
| Supabase branche de test | tests RLS | supposé (`.env.test.local`, non vérifié ici) | — | tests SQL seulement en local |
| Webhook Resend + `RESEND_WEBHOOK_SECRET` | MAIL-04 | non (à créer dans le tableau de bord) | — | tests avec secret factice ; recette preview manuelle (checkpoint humain) |
| Domaine `sevalys.com` SPF/DKIM/DMARC | délivrabilité | oui (phase 10) | — | — |

**Missing, no fallback:** création du webhook dans le tableau de bord Resend et du secret Vercel = action humaine (checkpoint).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 |
| Config file | `vitest.config.*` existant ; RLS : `vitest.rls.config.ts` |
| Quick run command | `rtk vitest run src/lib/server/mail src/lib/server/reminders src/lib/server/resend` |
| Full suite command | `rtk vitest run` (RLS : `npm run test:rls`, branche dédiée uniquement) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAIL-03 | cadence pure d3/d7/d14, palier le plus élevé, arrêt | unit | `rtk vitest run src/lib/server/reminders/cadence.test.ts` | Wave 0 |
| MAIL-03 | document non signé -> 1 mail/palier/destinataire ; signé/remplacé/refusé/suspendu -> 0 ; relance = 0 doublon | unit (supabase mocké, patron `autoIssue.test.ts`) | `rtk vitest run src/lib/server/reminders/sweep.test.ts` | Wave 0 |
| MAIL-03 | acompte impayé d3/d7/admin d14 ; payé/crédité -> 0 | unit | idem | Wave 0 |
| MAIL-03 | demande d'avis J+7/J+21 avec lien factice ; drapeau éteint -> pas d'enfilage ni d'envoi | unit | `rtk vitest run src/lib/server/mail/reviewRequestEmail.test.ts` | Wave 0 |
| MAIL-04 | signature webhook valide/invalide/horodatage périmé/en-tête manquant ; mappage Permanent/Transient/complained | unit (payload signé avec `standardwebhooks` ou HMAC svix dans le test) | `rtk vitest run src/lib/server/resend/webhook.test.ts src/app/api/resend/webhook/route.test.ts` | Wave 0 |
| MAIL-04 | garde `deliver()` : marketing bloqué (plainte/désinscription), transactionnel passe sur plainte, tout bloqué sur rebond dur, statut `skipped`, pas d'appel Resend | unit (patron `outbox.test.ts`) | `rtk vitest run src/lib/server/mail/outbox.test.ts` | étendre |
| MAIL-04 | jeton HMAC : aller-retour, falsification, longueur | unit | `rtk vitest run src/lib/server/mail/unsubscribeToken.test.ts` | Wave 0 |
| MAIL-04 | tout template `marketing` contient lien + en-têtes ; constructeur refuse sans lien | unit parité | `rtk vitest run src/lib/server/mail/marketingEmail.test.ts` | Wave 0 |
| MAIL-04 | POST one-click désinscrit ; GET ne désinscrit pas | unit route | `rtk vitest run src/app/api/unsubscribe/route.test.ts` | Wave 0 |
| MAIL-04 | RLS : tables de suppression/événements/holds invisibles pour client A/B/anon/Gecko, lisibles admin ; UPDATE/DELETE refusés ; unicité d'événement | RLS (branche dédiée) | `npm run test:rls` | Wave 0 |
| MAIL-03/04 | parité SQL/TS des listes fermées (événements, templates) | unit (étendre `paymentsMailParity.test.ts`) | `rtk vitest run src/lib/server/mail/paymentsMailParity.test.ts` | étendre |
| MAIL-04 | `/api/resend/webhook` joignable sans session en preview (jeton de contournement Vercel) ; `/desinscription` noindex et hors portail | `proxy.test.ts` + manuel preview | `rtk vitest run src/proxy.test.ts` | étendre |

### Sampling Rate
- **Per task commit:** commande rapide ci-dessus
- **Per wave merge:** `rtk vitest run` + `rtk tsc`
- **Phase gate:** suite complète verte + tests RLS sur branche + recette preview du webhook avant `/gsd:verify-work`

### Wave 0 Gaps
- [ ] tests listés « Wave 0 » ci-dessus ; fabrique de payload Svix signé (helper de test) pour le webhook
- [ ] pas de nouveau framework à installer

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | non (routes publiques signées) | signature Svix, jeton HMAC |
| V3 Session Management | non | — |
| V4 Access Control | oui | RLS admin sur tables, `requireAdmin()` pour levée/suspension, service_role server-only |
| V5 Input Validation | oui | validation du payload webhook (types, `to[]` borné, longueurs), jeton validé avant toute écriture |
| V6 Cryptography | oui | `createHmac` + `timingSafeEqual`, secrets en variables d'environnement, jamais maison |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook forgé | Spoofing | `webhooks.verify` sur corps brut, 400 sinon, fail-closed sans secret |
| Rejeu de webhook | Tampering | tolérance d'horodatage du SDK + clé d'idempotence `svix-id` |
| Désinscription forcée d'un tiers (adresse devinée) | Tampering | jeton HMAC non devinable, pas d'API acceptant une adresse nue |
| Préchargeur de lien désinscrit à la place du destinataire | Tampering | GET sans effet, POST seulement |
| Énumération d'adresses via la page de désinscription | Info disclosure | réponse identique pour jeton valide inconnu ; pas d'affichage de l'adresse complète (masquer) |
| Fuite d'adresse dans logs / `last_error` | Info disclosure | codes courts uniquement (patron outbox) |
| Injection d'en-tête via l'expéditeur | Tampering | `buildFromHeader` existant |
| Levée de suppression abusive | Elevation | motif obligatoire, `requireAdmin`, journal immuable |

## Sources

### Primary (HIGH confidence)
- Code lu : `src/lib/server/mail/{rules,outbox,fromHeader,urls}.ts`, `src/lib/server/invoices/autoIssue.ts`, `src/app/api/cron/mail/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/lib/server/stripe/webhook.ts`, `src/lib/privateRoutes.ts`, `src/proxy.ts`, `src/lib/documents/status.ts`, migrations 20261004 à 20261007010000, `vercel.json`
- `node_modules/resend` 6.28.1 : types `Webhooks.verify`, `EmailBouncedEvent`, `EmailComplainedEvent` ; dépendance `standardwebhooks`
- https://resend.com/docs/webhooks/verify-webhooks-requests (verify, en-têtes svix-*)
- https://resend.com/docs/webhooks/event-types (bounce Permanent/Transient/Undetermined, complained)
- https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails (en-têtes RFC 8058)

### Secondary (MEDIUM)
- Politique de réessai Svix et stabilité de `svix-id` : connaissance générale, non revérifiée (A4)

### Tertiary (LOW)
- Aucune

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (aucun nouveau package, SDK inspecté)
- Architecture: HIGH (patrons existants lus dans le code)
- Pitfalls: MEDIUM-HIGH (réessais Svix et seuil de fraîcheur en hypothèse)

**Research date:** 2026-10-06
**Valid until:** 2026-11-05
