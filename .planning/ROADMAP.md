# Roadmap: BRICON ANATHOLY Portfolio

## Milestones

- ✅ **v1.0 — Visual Redesign (Selenium Phase 02)** — Phases 1-4 (shipped 2026-05-18)
- ✅ **v1.1 — Extension de l'offre & refonte commerciale** — Phases 5-9 (shipped 2026-10-01)
- 🚧 **v2.0 — Plateforme Sèvalys** — Phases 10-19 (in progress)

## Phases

<details>
<summary>✅ v1.0 — Visual Redesign (Selenium Phase 02) (Phases 1-4) — SHIPPED 2026-05-18</summary>

- [x] Phase 1: Design System Foundation (5/5 plans) — completed 2026-05-15
- [x] Phase 2: Landing Page Rebuild (6/6 plans) — completed 2026-05-17
- [x] Phase 3: Services Page Rebuild (6/6 plans) — completed 2026-05-18
- [x] Phase 4: Rethemes + QA (4/4 plans) — completed 2026-05-18

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 — Extension de l'offre & refonte commerciale (Phases 5-9) — SHIPPED 2026-10-01</summary>

- [x] Phase 5: Prospect Capture Backend (4/4 plans) — completed 2026-09-20
- [x] Phase 6: Service Pages (Template + Content) (7/7 plans) — completed 2026-09-20
- [x] Phase 7: Diagnostic Simulator (6/6 plans) — completed 2026-09-20
- [x] Phase 8: Landing Simplification & Pricing Policy (6/6 plans) — completed 2026-09-21
- [x] Phase 9: SEO & Discovery Wiring (4/4 plans) — completed 2026-10-01

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### 🚧 v2.0 — Plateforme Sèvalys (Phases 10-19)

- [x] **Phase 10: Foundation, auth & isolation** - Rôles en tables, connexion par code e-mail sur invitation, coquilles `/espace-client` et `/admin`, isolation prouvée par tests (completed 2026-10-02)
- [x] **Phase 11: Lead attribution, pipeline & consent** - Source tracée côté serveur, journal immuable, pipeline admin, entonnoir par source, bandeau de consentement
 (completed 2026-10-02)
- [x] **Phase 12: Conversion, projects & step engine** - Lead converti en client, onboarding, frise d'étapes, fichiers, moteur de mails minimal, vue projets admin
 (completed 2026-10-03)
- [x] **Phase 13: Document generation** - PDF figés depuis modèles versionnés, mentions légales testées, onglet documents du client (completed 2026-10-03)
- [x] **Phase 14: Electronic signature** - Signature simple par code, piste d'audit chaînée, PDF scellé, PV de recette (completed 2026-10-04)
- [ ] **Phase 15: Stripe payments & invoicing** - Acomptes par étape, webhook vérifié idempotent, factures sans trou et avoirs
- [ ] **Phase 16: Mailing automation completion** - Relances automatiques, rebonds/plaintes, désinscription, flux séparés
- [ ] **Phase 17: Admin forecast dashboard** - Coûts, CA pipeline/signé/facturé/encaissé, marge et trésorerie, CA par source
- [ ] **Phase 18: Verified reviews** - Lien d'avis unique, lien Google sans filtrage, modération légale, JSON-LD `Review`
- [ ] **Phase 19: Ads preparation** - Convention UTM documentée, taxonomie d'événements et échelle de conversions

## Phase Details

### Phase 10: Foundation, auth & isolation

**Goal**: Un client invité accède à un espace privé sécurisé, un admin à une zone distincte, et aucune donnée ne fuit entre clients ni vers les utilisateurs Gecko
**Depends on**: Nothing (first phase of v2.0; builds on shipped v1.1 site)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):

  1. Un client invité se connecte avec un code à 8 chiffres reçu par e-mail (lien en secours) et reste connecté ; une adresse non invitée ne peut pas créer de compte
  2. Un admin accède à `/admin` ; un client ou un utilisateur Gecko authentifié y est refusé et ne voit aucune donnée admin
  3. Les tests automatisés d'isolation (client A vs client B, anonyme, utilisateur Gecko) passent et échouent si une politique est affaiblie
  4. `/espace-client` et `/admin` s'affichent sans intro cinéma, curseur ni GSAP, en `noindex`, absents du sitemap et de `llms.txt`
  5. Les gardes « aucun prix » restent actifs sur le site public tout en autorisant les prix dans le portail, l'admin et les modèles ; les e-mails de connexion arrivent en boîte de réception (SPF, DKIM, DMARC vérifiés)

**Plans**: 13 plans
Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Deps (@supabase/ssr, server-only), env key-mode assertion, Supabase server/admin/proxy clients, private route constants
- [x] 10-02-PLAN.md — sv_* migration (roles en tables, RLS, helpers, triggers d'exclusivité, RPC service_role, seed admin) + lint de migrations + sync dérive prod
- [x] 10-03-PLAN.md — FOUND-07 : script de vérification DNS/Resend, édition SPF/DMARC, test Gmail (D-20)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-04-PLAN.md — Émission du code de connexion : schémas, e-mail FR, throttle, gate sv_login_allowed
- [x] 10-06-PLAN.md — Providers route-aware (cinéma/curseur/PostHog), robots/headers/sitemap/llms, zones de prix et gardes d'import
- [x] 10-07-PLAN.md — Suite RLS sur branche Supabase (A vs B, anon, Gecko, auto-inscription), canary, advisor, spike auth
- [x] 10-08-PLAN.md — Layouts privés noindex, portal.css, composants de coquille
- [x] 10-09-PLAN.md — Invitation : recherche SIRET, orchestration invite (anti-prise de compte), e-mail d'invitation, script de récupération admin (second admin)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-05-PLAN.md — proxy.ts, DAL requireAdmin/requireClient, plafond de session 30 jours, déconnexion

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 10-10-PLAN.md — Page /connexion (e-mail → code), actions verifyOtp, interstitiel /auth/confirm
- [x] 10-11-PLAN.md — Coquilles /espace-client et /admin, formulaire d'invitation, actions admin

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 10-12-PLAN.md — Prod DB : pré-vérification lecture seule, validation humaine avant DDL, application du schéma sv_*, advisor, test à blanc du script de récupération admin

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 10-13-PLAN.md — Env Vercel + drapeau de login, Preview auto-référencée (bypass protection), vérification de bout en bout, mise en prod sous validation humaine, graphify update

**UI hint**: yes

### Phase 11: Lead attribution, pipeline & consent

**Goal**: Chaque prospect arrive avec sa source tracée et figée, l'admin pilote le pipeline et l'entonnoir, et rien n'est mesuré avant consentement
**Depends on**: Phase 10
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, LEAD-06, LEAD-07, LEAD-08, LEAD-09
**Success Criteria** (what must be TRUE):

  1. Une arrivée avec UTM suivie d'une simulation ou d'un contact crée un lead avec source premier et dernier contact, page d'atterrissage et référent, sans changer l'ordre des protections anti-spam
  2. Un prospect revenu dans les 9 mois (même e-mail ou téléphone normalisés) s'ajoute comme contact au lead existant sans changer sa source ; un admin corrige une source seulement avec un motif journalisé
  3. Les `lead_events` ne peuvent être ni modifiés ni supprimés, mais un lead peut être anonymisé sur demande d'effacement ; les anciens `prospects` sont migrés et la purge de 12 mois épargne clients et données comptables
  4. L'admin voit la liste des leads, change un statut en un geste (motif de perte demandé), et consulte l'entonnoir par source et campagne avec un coût par RDV saisi à la main
  5. Le bandeau propose Accepter et Refuser à égalité, journalise chaque choix, et aucune balise publicitaire ni identifiant de clic n'est chargé avant accord

**Plans**: 18 plans
Plans:
**Wave 1**

- [x] 11-01-PLAN.md — Wave 0 : branche Supabase de test (accord propriétaire), .env.test.local, helpers RLS et squelettes de tests
- [x] 11-02-PLAN.md — Module d'attribution pur : liste blanche, référent, arrivée/canal, premier/dernier contact, cookies sv_attr_ft/lt
- [x] 11-03-PLAN.md — Module de consentement pur : constantes (ATTR_COOKIE_BEFORE_CONSENT), cookie sv_consent, config PostHog, textes FR/EN/TH
- [x] 11-04-PLAN.md — Migration cœur : sv_leads, contacts, sv_lead_events immuable, notes, RPC ingest/statut/correction/effacement, vue admin + règle de lint

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-05-PLAN.md — Migrations consentement/visites/coûts/entonnoir + reprise des prospects, purge réécrite, table de rétention
- [x] 11-06-PLAN.md — Bibliothèque serveur leads (src/lib/leads, hors zone prix) : normalisation, hachage IP HMAC, lecture d'attribution, ingest RPC, throttle déplacé
- [x] 11-07-PLAN.md — proxy.ts : branche publique d'attribution + compteur de visites, test du proxy réécrit
- [x] 11-08-PLAN.md — Modale de consentement (dialog natif), lien « Gérer les cookies », séquence après l'intro
- [x] 11-09-PLAN.md — Actions admin (statut, perte, correction, effacement, coût) gardées par requireAdmin

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-10-PLAN.md — Push des migrations sur la branche + suite RLS leads (source figée, journal immuable, dédoublonnage 9 mois)
- [x] 11-11-PLAN.md — Routes simulateur et contact branchées sur le pipeline (ordre anti-spam conservé, gardes ajoutées au contact)
- [x] 11-12-PLAN.md — /api/consent et journal, PostHog conditionné au consentement, mentions légales alignées
- [x] 11-13-PLAN.md — /admin/leads : tableau filtrable, pastille de statut en un geste, motif de perte, navigation admin

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 11-14-PLAN.md — Suites RLS consentement/entonnoir/rétention, canary, advisor
- [x] 11-15-PLAN.md — /admin/leads/[id] : attribution, contacts, journal en lecture seule, correction de source, effacement
- [x] 11-16-PLAN.md — /admin/entonnoir : entonnoir par source/campagne/mois, coût par RDV saisi à la main

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 11-17-PLAN.md — Prod DB : pré-vérification, validation propriétaire, application des migrations, advisor, suppression de la branche

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 11-18-PLAN.md — Validation propriétaire des commandes distantes, secret Vercel, preview, mise en prod, rattrapage du backfill, vérification de bout en bout (lead frais par exécution)

**UI hint**: yes

### Phase 12: Conversion, projects & step engine

**Goal**: Un lead devient client en un clic et suit son projet étape par étape dans son espace, pendant que l'admin voit tous les projets
**Depends on**: Phase 11
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, PORTAL-05, PORTAL-06, MAIL-01, MAIL-02, ADM-01
**Success Criteria** (what must be TRUE):

  1. L'admin convertit un lead en client en un clic et le client reçoit son invitation par e-mail
  2. Le client remplit un onboarding guidé dont les données société sont réutilisées dans ses documents
  3. Le client voit sa frise d'étapes, l'étape en cours et ce qu'on attend de lui ; une étape se débloque selon un fait enregistré, jamais par saisie manuelle
  4. Le client dépose et télécharge des fichiers (stockage privé, liens signés courts) et consulte des liens utiles ; il accorde ou révoque le droit de présenter son projet, avec date et texte conservés
  5. Un changement de statut ou d'étape déclenche un e-mail via une règle (modèle, délai) sans doublon par événement et destinataire, journalisé ; l'admin voit tous les projets, leur étape et leurs blocages

**Plans**: 22 plans
Plans:

- [x] 12-01-PLAN.md — Migration sv_projects_engine (tables, RLS, faits en ajout seul, RPC, bucket privé) + gardes statiques
- [x] 12-02-PLAN.md — Moteur d'étapes pur (faits -> étape, qui attend) et blocages/tri/filtres (TDD)
- [x] 12-03-PLAN.md — Schémas onboarding/actions, règles fichiers, texte d'accord, offres, textes FR
- [x] 12-04-PLAN.md — Moteur de mails : règles en code, modèles, outbox idempotente
- [x] 12-05-PLAN.md — Branche de test Supabase (accord propriétaire) + push de la migration + helpers RLS
- [x] 12-06-PLAN.md — Invitation via l'outbox, contrôles partagés, cron quotidien /api/cron/mail
- [x] 12-07-PLAN.md — Service de conversion lead -> client (compensation) + action admin
- [x] 12-08-PLAN.md — Services faits (mail de changement d'étape) et onboarding (fait système + mail admin)
- [x] 12-09-PLAN.md — Services fichiers (URL signées), liens utiles, accord de présentation
- [x] 12-10-PLAN.md — Couche de lecture RLS (portail, liste et fiche admin, activité)
- [x] 12-11-PLAN.md — Tests RLS : projets, faits, accords, outbox
- [x] 12-12-PLAN.md — Tests RLS : stockage privé, conversion atomique
- [x] 12-13-PLAN.md — UI partagée : frise, panneau fichiers, styles projet
- [x] 12-14-PLAN.md — Dialogue de conversion sur la fiche lead
- [x] 12-15-PLAN.md — Tableau admin /admin/projets (filtres étape/blocage, tri)
- [x] 12-16-PLAN.md — Actions admin projet (poser/annuler un fait, liens, fichiers)
- [x] 12-17-PLAN.md — Fiche projet admin /admin/projets/[id]
- [x] 12-18-PLAN.md — Actions portail + cartes onboarding et accord
- [x] 12-19-PLAN.md — Page portail /espace-client (héros, qui attend, frise, cartes)
- [x] 12-20-PLAN.md — Application en production de la migration (accord propriétaire)
- [x] 12-21-PLAN.md — Texte d'accord (décision propriétaire), CRON_SECRET, preview et déploiement
- [x] 12-22-PLAN.md — Vérification de bout en bout en production (fixtures permanentes)

**UI hint**: yes

### Phase 13: Document generation

**Goal**: Les documents contractuels et comptables sont générés en PDF figés, conformes, et retrouvables par le client
**Depends on**: Phase 12
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):

  1. À l'étape voulue, devis, contrat, cahier des charges, PV de recette et facture sont générés en PDF depuis un modèle versionné et les données du projet
  2. Un PDF émis ne change plus : octets stockés en écriture unique, empreinte SHA-256, version du modèle et copie des données consultables
  3. Le client retrouve tous ses documents dans son espace avec leur statut (à signer, signé, payé)
  4. Un test automatisé échoue si une mention légale française obligatoire manque dans le texte extrait d'un devis ou d'une facture

**Plans**: 20 plans
Plans:
**Wave 1**

- [x] 13-01-PLAN.md — Socle React-PDF (dépendances, polices embarquées, césure désactivée, montants en centimes, test rendu + extraction)
- [x] 13-02-PLAN.md — Migration sv_documents (documents en ajout seul, instantanés admin, bucket privé, RPC d'émission, outbox) + gardes statiques
- [x] 13-03-PLAN.md — Contrats de domaine : types et instantanés, identité vendeur gardée, schémas zod, textes FR

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 13-04-PLAN.md — Garde par étape et statut déduit des faits (TDD) + liste fermée SQL
- [x] 13-05-PLAN.md — Modèles devis et facture (PROFORMA) + test des mentions légales sur texte extrait (DOC-04)
- [x] 13-06-PLAN.md — Règle de mail « document émis » (modèle, clé d'unicité, listes fermées)
- [x] 13-07-PLAN.md — Branche de test Supabase (accord propriétaire) + push de la migration + helpers RLS

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 13-08-PLAN.md — Modèles contrat, cahier des charges, PV de recette + registre versionné + test de rendu
- [x] 13-09-PLAN.md — Tests RLS : isolation, ajout seul, stockage en écriture unique, chaîne de remplacement, outbox
- [x] 13-10-PLAN.md — Lecture RLS des documents, instantané admin, lien signé et vérification d'empreinte
- [x] 13-11-PLAN.md — Identité du vendeur fournie par le propriétaire (déblocage de l'émission)
- [x] 13-12-PLAN.md — Composants admin : aperçu puis émission, liste des émis, instantané en lecture seule

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 13-13-PLAN.md — Instantané, rendu et service d'émission (téléversement upsert:false, SHA-256, RPC, mails)
- [x] 13-14-PLAN.md — Onglet Documents du portail client (statuts, remplacés en retrait, téléchargement signé)
- [x] 13-15-PLAN.md — Formulaires admin devis, cahier des charges, aperçu de facture
- [x] 13-16-PLAN.md — Application en production de la migration (accord propriétaire)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 13-17-PLAN.md — Actions admin : aperçu, émission, téléchargement, empreinte, instantané

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 13-18-PLAN.md — Formulaires contrat et PV, section Documents dans la fiche projet admin

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 13-19-PLAN.md — Porte locale, preview Vercel (rendu PDF Linux) et déploiement (accord propriétaire)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 13-20-PLAN.md — Vérification de bout en bout en production (fixture permanente) + statut des relectures

**UI hint**: yes

### Phase 14: Electronic signature

**Goal**: Le client signe en ligne avec une preuve solide, et le projet avance sur la base de documents signés
**Depends on**: Phase 13
**Requirements**: SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05
**Success Criteria** (what must be TRUE):

  1. Le client consent d'abord à la signature électronique et à la convention de preuve, puis signe avec un code à usage unique (expire en 10 minutes, 5 essais maximum)
  2. Chaque signature écrit une piste d'audit en ajout seul et chaînée par hachage (horodatage, IP, empreinte, version) que l'admin peut exporter
  3. Le PDF signé est scellé avec une page certificat et l'empreinte du fichier stocké reste identique à celle signée
  4. Le client valide chaque étape livrée dans le PV de recette, et la signature débloque l'étape suivante

**Plans**: 19 plans
Plans:
**Wave 1**

- [x] 14-01-PLAN.md — pdf-lib + fontkit, compatibilité prouvée sur les PDF émis (3 types), polices du certificat, secret documenté
- [x] 14-02-PLAN.md — Liste fermée d'événements, JSON canonique, hachage de maillon et vérificateur hors ligne (TDD)
- [x] 14-03-PLAN.md — Textes juridiques versionnés, règle de signabilité et de signataire, réponses de PV, données du certificat (TDD)
- [x] 14-04-PLAN.md — Migration sv_signature : tables en ajout seul, chaîne de hachage, RPC code/PV/signature/scellé, outbox, garde « signé = gelé »

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-05-PLAN.md — Branche de test (accord propriétaire), push de la migration, spike iframe, helpers RLS
- [x] 14-06-PLAN.md — E-mails après signature et refus de PV (outbox, listes fermées)
- [x] 14-07-PLAN.md — Service du code à usage unique (HMAC, envoi Resend direct, IP)
- [x] 14-08-PLAN.md — Wrappers de la piste, lien d'aperçu et téléchargement du scellé vérifié
- [x] 14-09-PLAN.md — Page certificat pdf-lib et finalisation idempotente (scellé + fait)
- [x] 14-10-PLAN.md — Modèle de contrat v2 (convention de preuve) et textes FR de la phase

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 14-11-PLAN.md — Tests RLS : code, concurrence, consentement, PV
- [x] 14-12-PLAN.md — Tests RLS : ajout seul, falsification, parité SQL/TS, isolation, scellé atomique, gel
- [x] 14-13-PLAN.md — Contexte de signature et actions serveur du client
- [x] 14-14-PLAN.md — Vue admin des signatures et actions d'audit (export, intégrité, scellé, reprise)
- [x] 14-15-PLAN.md — Onglet Documents : « Lire et signer », téléchargement du scellé

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 14-16-PLAN.md — Page de signature et liste de recette du PV
- [x] 14-17-PLAN.md — Fiche document admin : bloc signature, piste, Remplacer gelé, avis sur faits manuels

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 14-18-PLAN.md — Application en production (accord propriétaire), secret Vercel, suppression de la branche

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 14-19-PLAN.md — Release gate, déploiement et vérification de bout en bout sur « Test E2E Sèvalys »
**UI hint**: yes

### Phase 15: Stripe payments & invoicing

**Goal**: Le client paie en ligne par étape, l'état « payé » est fiable, et les factures sont légales et immuables
**Depends on**: Phase 14
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05
**Success Criteria** (what must be TRUE):

  1. Le client paie un acompte ou un solde via Stripe Checkout, avec un montant calculé côté serveur
  2. Un document passe à « payé » uniquement après un webhook Stripe vérifié ; le rejeu d'un même événement ne crée aucun doublon
  3. Le client reçoit un reçu, des relances en cas d'acompte impayé, et le paiement débloque l'étape suivante
  4. Les factures ont une numérotation sans trou, ne sont plus modifiables une fois émises et se corrigent par avoir
  5. Les données de facture sont stockées de façon structurée, prêtes pour Factur-X

**Plans**: 21 plans
Plans:
**Wave 1**

- [x] 15-01-PLAN.md — SDK stripe@23.0.0, garde du mode de clé, vérification du webhook et table de correspondance des événements (TDD)
- [x] 15-02-PLAN.md — Contrats facture/avoir, calculs en centimes, statut déduit, correspondance EN 16931 (TDD)
- [x] 15-03-PLAN.md — Migration sv_invoices : drapeau test, compteurs sans trou, factures immuables, RPC émission/avoir/PDF, relances
- [x] 15-04-PLAN.md — Migration sv_payments : clients Stripe, sessions, événements idempotents, registre, RPC d'application du webhook
- [x] 15-05-PLAN.md — Textes FR des paiements, onglet Paiements actif, zone de prix du webhook

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-06-PLAN.md — Modèles PDF facture v2 et avoir v1, test des mentions étendu
- [x] 15-07-PLAN.md — E-mails de paiement (demande, reçu, relances, alertes admin, avoir) et parité SQL/TS
- [x] 15-08-PLAN.md — Branche de test (accord propriétaire), push des deux migrations, helpers RLS
- [x] 15-09-PLAN.md — Checkout, client Stripe, remboursement, route webhook publique

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-10-PLAN.md — Contexte de facturation, construction des factures, émission en deux temps et PDF figé
- [x] 15-11-PLAN.md — Tests RLS : numérotation concurrente, séries, bascule d'année, immuabilité, avoirs, isolation
- [x] 15-12-PLAN.md — Tests RLS : rejeu, faits de paiement, relances, anomalies, garde Checkout, isolation
- [x] 15-13-PLAN.md — Lecture RLS des factures, téléchargement signé, actions Payer et Télécharger du portail

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 15-14-PLAN.md — Factures d'acompte et finale automatiques après signature, balayage quotidien
- [x] 15-15-PLAN.md — Onglet Paiements du portail et pages de retour
- [x] 15-16-PLAN.md — Vue admin de facturation et actions (période, avoir, remboursement, données)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 15-17-PLAN.md — Formulaires admin : facture de période et avoir

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 15-18-PLAN.md — Section Facturation de la fiche projet, paiements à rapprocher

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 15-21-PLAN.md — Retrait de l'aperçu de facture des Documents, tests UI de la section Facturation

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 15-19-PLAN.md — Application en production (accord propriétaire), client de test signalé, Stripe et Vercel, suppression de la branche

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 15-20-PLAN.md — Release gate, déploiement et vérification de bout en bout en mode test Stripe sur « Test E2E Sèvalys »
**UI hint**: yes

### Phase 16: Mailing automation completion

**Goal**: Les relances partent seules, et la délivrabilité et les obligations de désinscription sont maîtrisées
**Depends on**: Phase 15
**Requirements**: MAIL-03, MAIL-04
**Success Criteria** (what must be TRUE):

  1. Un document non signé, un acompte impayé ou un projet livré sans avis déclenche automatiquement la relance prévue, une seule fois
  2. Un rebond ou une plainte Resend ajoute l'adresse à la liste de suppression et aucun e-mail marketing ne lui est plus envoyé
  3. Chaque e-mail marketing contient un lien de désinscription fonctionnel ; les flux transactionnel et marketing sont séparés

**Plans**: TBD

### Phase 17: Admin forecast dashboard

**Goal**: L'admin pilote chiffre d'affaires, coûts, marge et trésorerie, et sait d'où vient l'argent
**Depends on**: Phase 15
**Requirements**: ADM-02, ADM-03, ADM-04, ADM-05
**Success Criteria** (what must be TRUE):

  1. L'admin saisit des coûts récurrents et par projet
  2. Le dashboard affiche CA pipeline, signé, facturé et encaissé, en HT et TTC, et les montants concordent avec les factures et paiements
  3. Le dashboard projette marge et trésorerie à partir des échéances de paiement et des coûts
  4. Le CA signé est ventilé par source d'acquisition du lead d'origine

**Plans**: TBD
**UI hint**: yes

### Phase 18: Verified reviews

**Goal**: Chaque client livré peut laisser un avis vérifié, publié sans filtrage, et exploitable en SEO sans promesse d'étoiles
**Depends on**: Phase 16
**Requirements**: REV-01, REV-02, REV-03, REV-04
**Success Criteria** (what must be TRUE):

  1. Un client dont le PV est signé reçoit un lien d'avis unique, à usage unique, qui expire sous 60 jours
  2. Le lien Google Business est proposé quelle que soit la note donnée
  3. L'admin ne peut masquer un avis que pour illégalité, avec motif journalisé ; la page « Politique des avis » décrit la méthode de vérification
  4. Les avis publiés alimentent un JSON-LD `Review` sans clé de prix ni promesse d'étoiles, vérifié par test automatisé

**Plans**: TBD
**UI hint**: yes

### Phase 19: Ads preparation

**Goal**: Les futures campagnes Meta et Google s'appuient sur des conventions et un modèle de conversion prêts
**Depends on**: Phase 11
**Requirements**: ADS-01, ADS-02
**Success Criteria** (what must be TRUE):

  1. Une convention de nommage UTM pour Meta, Google et Google Business est documentée et appliquée par la capture de leads
  2. Une taxonomie d'événements et l'échelle Lead, Qualifié, RDV, Signé sont définies, avec un `event_id` partagé pour la déduplication

**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design System Foundation | v1.0 | 5/5 | Complete | 2026-05-15 |
| 2. Landing Page Rebuild | v1.0 | 6/6 | Complete | 2026-05-17 |
| 3. Services Page Rebuild | v1.0 | 6/6 | Complete | 2026-05-18 |
| 4. Rethemes + QA | v1.0 | 4/4 | Complete | 2026-05-18 |
| 5. Prospect Capture Backend | v1.1 | 4/4 | Complete | 2026-09-20 |
| 6. Service Pages (Template + Content) | v1.1 | 7/7 | Complete | 2026-09-20 |
| 7. Diagnostic Simulator | v1.1 | 6/6 | Complete | 2026-09-20 |
| 8. Landing Simplification & Pricing Policy | v1.1 | 6/6 | Complete | 2026-09-21 |
| 9. SEO & Discovery Wiring | v1.1 | 4/4 | Complete | 2026-10-01 |
| 10. Foundation, auth & isolation | v2.0 | 13/13 | Complete    | 2026-10-02 |
| 11. Lead attribution, pipeline & consent | v2.0 | 18/18 | Complete    | 2026-10-02 |
| 12. Conversion, projects & step engine | v2.0 | 22/22 | Complete   | 2026-10-03 |
| 13. Document generation | v2.0 | 20/20 | Complete    | 2026-10-03 |
| 14. Electronic signature | v2.0 | 19/19 | Complete   | 2026-10-04 |
| 15. Stripe payments & invoicing | v2.0 | 20/21 | In Progress|  |
| 16. Mailing automation completion | v2.0 | 0/TBD | Not started | - |
| 17. Admin forecast dashboard | v2.0 | 0/TBD | Not started | - |
| 18. Verified reviews | v2.0 | 0/TBD | Not started | - |
| 19. Ads preparation | v2.0 | 0/TBD | Not started | - |
