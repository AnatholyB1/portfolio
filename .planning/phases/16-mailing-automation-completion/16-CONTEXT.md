# Phase 16: Mailing automation completion - Context

**Gathered:** 2026-10-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Les relances partent seules, et la délivrabilité et les obligations de désinscription sont maîtrisées. Livre : relance automatique des documents non signés, règle et modèle de demande d'avis (envoi réel activé en phase 18), webhook Resend (rebonds, plaintes) alimentant une liste de suppression administrable, séparation des flux transactionnel et marketing avec désinscription en un clic. Requirements : MAIL-03, MAIL-04.

Hors périmètre : lien d'avis unique, page de dépôt et modération des avis (phase 18), campagnes ou suivi marketing réels vers les prospects, dashboard (phase 17). Les relances d'acompte impayé (J+3, J+7, alerte admin J+14) existent déjà (phase 15 D-17) : ne pas les dupliquer, les réutiliser comme patron.

</domain>

<decisions>
## Implementation Decisions

### Relance de document non signé (MAIL-03)
- **D-01:** **Cadence J+3, J+7, alerte admin J+14**, identique à l'acompte impayé (phase 15 D-17) : un seul patron, code et tests partagés. Comptée depuis l'émission de la révision courante du document.
- **D-02:** **Destinataires : les membres du client** (les mêmes que `document_issued`). **Arrêt** dès que le document est signé, refusé ou remplacé par une nouvelle révision ; les relances de la révision remplacée ne repartent pas. **L'admin peut suspendre** les relances d'un projet (action journalisée) et les reprendre.
- **D-03:** **Détection par extension du balayage quotidien existant** (`sweepInvoices` / cron `/api/cron/mail` à 06:00), pas de planification à l'émission. Clé d'unicité par document + palier + destinataire (patron `dedupeKey.paymentReminder`) : une seule fois par palier. Statut « non signé » déduit des faits (phase 13 D-14), jamais d'un champ recopié. Aucune fréquence de cron plus fine que quotidienne (blocker plan Vercel).

### Demande d'avis (MAIL-03, critère 1)
- **D-04:** **Règle, délai, détection et modèle livrés en phase 16 ; envoi réel désactivé par un drapeau** jusqu'à ce que le lien d'avis unique existe (phase 18). Le modèle comporte un emplacement de lien ; le critère est testé avec un lien factice. Aucun envoi réel vers le lien Google Business avant la phase 18 (l'avis ne serait ni rattaché au projet ni vérifié). La phase 18 active le drapeau et branche le vrai lien.
- **D-05:** **Calendrier : J+7 après le PV signé (`acceptance_signed`), relance J+21, puis arrêt.** Deux mails au plus ; s'arrête dès qu'un avis est déposé. Marge avant l'expiration à 60 jours du lien (REV-01). Détection : projet livré, PV signé, aucun avis.
- **D-06:** **La demande d'avis est classée flux marketing** (D-13) : lien de désinscription obligatoire, bloquée par la liste de suppression et par la désinscription.

### Rebonds, plaintes et liste de suppression (MAIL-04)
- **D-07:** **Portée de la suppression.** Plainte (spam) → bloque **tout le marketing** pour l'adresse, mais **pas** le transactionnel (factures, codes de connexion, signatures). Rebond **définitif** (adresse inexistante) → bloque **tout** envoi vers l'adresse et alerte l'admin. Rebond **temporaire** → ignoré (réessai), aucune suppression.
- **D-08:** **Vue admin minimale** de la liste (adresse, cause, date, flux bloqués), **alerte admin** à chaque ajout d'une adresse appartenant à un client ou à un lead, **réactivation manuelle avec motif obligatoire** (ex. adresse corrigée). Journal en ajout seul (patron triggers `deny_mutation`) : aucune ligne de suppression ni de levée n'est effacée.
- **D-09:** **Réception par webhook Resend signé** (Svix), route publique exemptée de l'authentification dans `src/proxy.ts` et `privateRoutes`, signature vérifiée sur le corps brut, table d'événements Resend à clé d'unicité sur l'identifiant d'événement (patron du webhook Stripe de la phase 15), traitement idempotent. À vérifier en preview avec le jeton de contournement Vercel. Secret de webhook en variable d'environnement avec garde au démarrage. Aucune adresse e-mail dans les logs (patron de l'outbox).

### Flux marketing et désinscription (MAIL-04)
- **D-10:** **Phase 16 livre l'infrastructure, pas de campagne.** Aucun envoi marketing réel vers un prospect ou un lead (le suivi sur changement de statut du lead, reporté par la phase 12 D-19, reste une idée différée). Le flux est testé avec un modèle d'exemple ; la seule règle marketing de la phase est la demande d'avis (D-06), non activée.
- **D-11:** **Désinscription en un clic.** Jeton signé par adresse, page publique de confirmation sans connexion, en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` (exigés par Gmail/Yahoo), effet immédiat, événement journalisé (date, adresse, source). Ne coupe jamais le transactionnel. Pas de réinscription en libre-service (la réactivation passe par l'admin, D-08).
- **D-12:** **Pied de page marketing obligatoire** (identité de l'expéditeur, lien de désinscription) imposé par le constructeur d'e-mail marketing : un modèle marketing sans lien ne se construit pas, un test automatisé le garantit.
- **D-13:** **Séparation des flux par une classe de message portée par chaque règle** (`transactional` / `marketing`) dans `MAIL_RULES`, appliquée par l'outbox : la garde de suppression et de désinscription s'applique selon le flux au moment de l'envoi (statut `skipped` journalisé, jamais d'envoi silencieux). **Expéditeur distinct pour le marketing, sur le même domaine** (`sevalys.com`, SPF/DKIM/DMARC déjà vérifiés en phase 10). **Pas de sous-domaine d'envoi dédié** en phase 16 (isolation de réputation différée, voir ci-dessous).

### Hérité des phases précédentes (rappel)
- **D-14:** Règles d'e-mail en code (phase 12 D-17), outbox idempotente `sv_mail_outbox` (clé d'unicité, `send_after`, statuts dont `skipped`), cron quotidien. Les nouveaux événements et modèles étendent la liste fermée dans une migration (contraintes `check`, jamais de nom de contrainte codé en dur) et dans `rules.ts` (`MAIL_EVENTS`, `MailTemplate`, `dedupeKey`).
- **D-15:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public. Client de test permanent « Test E2E Sèvalys » réutilisé, sans le supprimer. Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables (liste de suppression, événements Resend, désinscriptions, suspension des relances), noms des types et des événements, découpage des plans.
- Format du jeton de désinscription (signature HMAC, portée, durée), contenu et libellés français des pages et e-mails.
- Libellé de l'expéditeur marketing distinct, détails du drapeau d'activation de la demande d'avis.
- Gestion des autres événements Resend (livré, ouvert, différé) : ignorés sauf besoin du plan.
- Emplacement de la vue admin et de l'action de suspension dans la fiche projet.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 16 — objectif et 3 critères de succès
- `.planning/REQUIREMENTS.md` — MAIL-03, MAIL-04 ; MAIL-01/02 (consommés) ; REV-01 (expiration 60 jours, consommé par la phase 18)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures »
- `.planning/STATE.md` — blocker plan Vercel (cron quotidien)

### Phases précédentes
- `.planning/phases/15-stripe-payments-invoicing/15-CONTEXT.md` — D-16/D-17 (reçu, relances d'acompte J+3/J+7/J+14, à généraliser sans dupliquer), patron du webhook Stripe idempotent
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — D-17 à D-19 (règles en code, outbox, cron quotidien, e-mails prospect reportés ici)
- `.planning/phases/14-electronic-signature/14-CONTEXT.md` — signature, faits `contract_signed` / `acceptance_signed`, révisions
- `.planning/phases/13-document-generation/13-CONTEXT.md` — statuts de document déduits des faits (D-14), révisions
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — consentement, journal immuable
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — SPF/DKIM/DMARC, rôles en tables, `service_role` server-only

### Code existant (à vérifier avant planification)
- `src/lib/server/mail/rules.ts` — `MAIL_EVENTS`, `MAIL_RULES`, `dedupeKey` (patron `paymentReminder`)
- `src/lib/server/mail/outbox.ts` — `buildMail`, `processDueMail`, claim atomique, idempotencyKey Resend
- `src/lib/server/mail/paymentEmails.ts`, `fromHeader.ts`, `urls.ts` — modèles de relance et construction d'URL
- `src/app/api/cron/mail/route.ts` — cron protégé par `CRON_SECRET`, appelle `processDueMail` et `sweepInvoices`
- `src/lib/server/invoices/autoIssue.ts` — `sweepInvoices`, patron du balayage à étendre
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_mail_outbox` (contraintes `check` sur événements et modèles)
- `supabase/migrations/20261007010000_sv_payments.sql` — webhook et événements Stripe (patron d'idempotence), événements de mail de paiement
- `src/lib/privateRoutes.ts`, `src/proxy.ts` — routes publiques exemptées de l'authentification
- `vercel.json` — cron `/api/cron/mail` à `0 6 * * *`

### Recherche v2.0
- `.planning/research/STACK.md`, `PITFALLS.md`, `SUMMARY.md` — outbox idempotente, délivrabilité, obligations de désinscription

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Moteur de règles en code et outbox idempotente (`dedupe_key` unique, `send_after`, statut `skipped`) : les nouveaux événements s'y ajoutent.
- Relances d'acompte déjà en place (`payment_reminder` d3/d7, `payment_reminder_admin` d14) : patron de cadence, de clé d'unicité et de balayage pour les documents non signés.
- Cron quotidien `/api/cron/mail` déjà authentifié par `CRON_SECRET` : point d'accroche du nouveau balayage.
- Webhook Stripe (phase 15) : patron de route publique, signature sur corps brut et table d'événements à clé d'unicité.
- Patron d'ajout seul (triggers `deny_mutation`) pour la liste de suppression et les journaux.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans le même fichier, tables `sv_*`, tests Vitest colocalisés (`*.test.ts`), suite RLS sur branche dédiée.
- Contraintes `check` d'événement et de modèle étendues en migration sans nom de contrainte codé en dur (voir la migration de la phase 12).
- `service_role` confiné aux modules `server-only` ; aucune adresse e-mail dans les logs ni dans `last_error`.

### Integration Points
- Garde de suppression/désinscription dans `processDueMail` avant l'appel Resend, selon la classe du flux.
- Route webhook Resend publique à exempter dans `src/proxy.ts` et `privateRoutes`.
- Page publique de désinscription (hors portail), en-têtes `List-Unsubscribe` ajoutés par l'envoi marketing.
- Vue admin de la liste de suppression et action de suspension des relances dans la fiche projet.
- Variable d'environnement du secret de webhook Resend ; drapeau d'activation de la demande d'avis.

</code_context>

<specifics>
## Specific Ideas

- La demande d'avis est livrée prête mais éteinte : la phase 18 n'a plus qu'à brancher le lien unique et lever le drapeau.
- Un client qui clique « spam » doit continuer à recevoir ses factures et ses codes de connexion.

</specifics>

<deferred>
## Deferred Ideas

- Suivi automatique du prospect sur changement de statut du lead — nécessite base légale (consentement ou intérêt légitime B2B) et contenu rédigé ; reporté (phase 12 D-19)
- Sous-domaine d'envoi marketing dédié pour isoler la réputation — à reconsidérer si un volume marketing réel apparaît
- Envoi de la demande d'avis vers Google Business avant le lien unique — écarté (avis non vérifié ni rattaché)
- Réinscription en libre-service après désinscription — écartée (réactivation par l'admin)
- Éditeur de règles de mail dans l'admin — non retenu (règles en code)

</deferred>

---

*Phase: 16-Mailing automation completion*
*Context gathered: 2026-10-06*
