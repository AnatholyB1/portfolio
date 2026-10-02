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

- [ ] **Phase 10: Foundation, auth & isolation** - Rôles en tables, connexion par code e-mail sur invitation, coquilles `/espace-client` et `/admin`, isolation prouvée par tests
- [ ] **Phase 11: Lead attribution, pipeline & consent** - Source tracée côté serveur, journal immuable, pipeline admin, entonnoir par source, bandeau de consentement
- [ ] **Phase 12: Conversion, projects & step engine** - Lead converti en client, onboarding, frise d'étapes, fichiers, moteur de mails minimal, vue projets admin
- [ ] **Phase 13: Document generation** - PDF figés depuis modèles versionnés, mentions légales testées, onglet documents du client
- [ ] **Phase 14: Electronic signature** - Signature simple par code, piste d'audit chaînée, PDF scellé, PV de recette
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
- [ ] 10-03-PLAN.md — FOUND-07 : script de vérification DNS/Resend, édition SPF/DMARC, test Gmail (D-20)

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

- [ ] 10-12-PLAN.md — Prod DB : pré-vérification lecture seule, validation humaine avant DDL, application du schéma sv_*, advisor, test à blanc du script de récupération admin

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 10-13-PLAN.md — Env Vercel + drapeau de login, Preview auto-référencée (bypass protection), vérification de bout en bout, mise en prod sous validation humaine, graphify update

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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
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
| 10. Foundation, auth & isolation | v2.0 | 10/13 | In Progress|  |
| 11. Lead attribution, pipeline & consent | v2.0 | 0/TBD | Not started | - |
| 12. Conversion, projects & step engine | v2.0 | 0/TBD | Not started | - |
| 13. Document generation | v2.0 | 0/TBD | Not started | - |
| 14. Electronic signature | v2.0 | 0/TBD | Not started | - |
| 15. Stripe payments & invoicing | v2.0 | 0/TBD | Not started | - |
| 16. Mailing automation completion | v2.0 | 0/TBD | Not started | - |
| 17. Admin forecast dashboard | v2.0 | 0/TBD | Not started | - |
| 18. Verified reviews | v2.0 | 0/TBD | Not started | - |
| 19. Ads preparation | v2.0 | 0/TBD | Not started | - |
