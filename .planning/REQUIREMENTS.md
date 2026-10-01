# Requirements: Sèvalys v1.1 — Extension de l'offre & refonte commerciale

**Defined:** 2026-09-20
**Core Value:** Un patron de PME comprend l'offre, fait confiance, et sait contacter Sèvalys en moins de 60 secondes.

## v1 Requirements

### PRIX (politique tarifaire)

- [x] **PRIX-01**: Aucun prix, fourchette de prix, ou mention tarifaire n'est affiché sur les 9 pages de service, la landing, ou le simulateur
- [x] **PRIX-02**: Le calculateur ROI (`/calculateur-roi`) n'affiche plus de prix (contradiction directe avec PRIX-01 sinon)

### SVC (pages de service, 9 au total)

- [x] **SVC-01**: Chaque offre (Landing Page, Rebranding+Premium, Projet sur-mesure, Agent Vocal IA, Maintenance, Community Management, Branding, Meta Ads, Google Ads) a sa propre page dédiée `/services/[slug]`
- [x] **SVC-02**: Chaque page de service suit la structure : problème résolu → fonctionnement → enjeux → preuve sociale → FAQ → double CTA (simulateur / contact) — jamais de prix
- [x] **SVC-03**: `/services` devient une page d'index listant les 9 services avec lien vers chaque page dédiée
- [x] **SVC-04**: La page Branding distingue explicitement son périmètre de l'offre existante "Rebranding + Site Premium"
- [x] **SVC-05**: Chaque page de service inclut un schema.org `FAQPage` + un bloc de réponse directe citable sous les titres clés (H1/H2)
- [x] **SVC-06**: Le contenu des pages de service vit dans le système i18n existant (`translations.ts`, fr/en/th), rédigé de façon concise

### SIMU (simulateur de diagnostic)

- [x] **SIMU-01**: Le visiteur répond à une série de questions sur ses problèmes/besoins, avec logique de branchement (questions non pertinentes sautées selon les réponses précédentes)
- [x] **SIMU-02**: À la fin, le simulateur recommande un sous-ensemble de 2 à 4 services pertinents parmi les 9 — jamais "tous les services"
- [x] **SIMU-03**: L'écran de résultat affiche une jauge/score visuel en complément de la recommandation textuelle (purement visuel, non stocké comme métrique)
- [x] **SIMU-04**: Le formulaire de capture de contact apparaît uniquement entre la dernière question et l'affichage du résultat — jamais avant la première question
- [x] **SIMU-05**: Le formulaire inclut une case de consentement RGPD non pré-cochée avec mentions Art. 13 (identité du responsable, finalité, base légale, durée de conservation, droits)
- [x] **SIMU-06**: Le simulateur ne mentionne, n'affiche, ni n'estime aucun prix à aucune étape
- [x] **SIMU-07**: L'écran de résultat propose une action unique claire ("nous contacter"), présentée avec deux canaux (appeler / écrire) — pas deux objectifs concurrents
- [x] **SIMU-08**: `/simulateur` est écrit comme une page pilier explicative et citable (pas un formulaire nu), conformément à la stratégie GEO/AEO

### CRM (stockage des prospects)

- [x] **CRM-01**: Chaque soumission du simulateur crée un enregistrement prospect dans une nouvelle table Supabase dédiée (même projet Supabase que le CRM existant — pas de réutilisation du schéma products/orders/stock)
- [x] **CRM-02**: La table prospects est protégée par une politique RLS insert-only côté écriture publique
- [x] **CRM-03**: La soumission du simulateur est protégée contre le spam (rate-limiting et/ou honeypot)
- [x] **CRM-04**: Une notification email (via Resend, cohérent avec `/api/contact`) informe l'équipe Sèvalys de chaque nouveau prospect

### LANDING (landing simplifiée)

- [x] **LANDING-01**: La landing suit l'ordre : problèmes résolus → aperçu des services (cartes renvoyant vers chaque page dédiée) → fonctionnement → enjeux → preuve sociale → CTA
- [x] **LANDING-02**: Tous les CTA de la landing renvoient vers le simulateur ou le contact direct (téléphone/email) — aucun CTA ne pointe vers un prix ou une ancre de prix
- [x] **LANDING-03**: La preuve sociale réutilise les réalisations existantes (Feuillette, Gecko Cabane, Les Folies Temps Danse) comme témoignages/études de cas visibles sur la landing

### SEO (intégration stratégie SEO/GEO/AEO)

- [x] **SEO-01**: Chaque nouvelle page (9 pages de service + `/simulateur`) est ajoutée à `sitemap.ts`, référencée dans `llms.txt`, et suit le pattern title/H1 "[Service] à Tours · [bénéfice]"
- [ ] **SEO-02**: Le schema.org global (`Organization`/`ProfessionalService`) est étendu avec un objet `Service` distinct par offre, relié via `hasOfferCatalog`
- [ ] **SEO-03**: Un audit des ancres/liens internes est effectué pour vérifier qu'aucun lien cassé n'est introduit par la restructuration de `/services` en page d'index

## v2 Requirements

Différenciants identifiés par la recherche, reportés après validation du v1 :

### Simulateur avancé

- **SIMU2-01**: Questions adaptées par secteur (restaurant/commerce/école/artisan), liées aux futures pages `/secteurs/*`
- **SIMU2-02**: A/B testing du libellé/ordre des questions et du CTA de résultat

### Preuve sociale

- **SVC2-01**: Études de cas réelles par service pour Community Management, Branding, Meta Ads, Google Ads une fois les premiers clients onboardés (remplace la preuve sociale partagée/placeholder du v1)
- **SVC2-02**: Collecte active d'avis Google (aucun avis visible actuellement, cf. `docs/strategie-seo-geo-llm-2026-09.md`)

### CRM avancé

- **CRM2-01**: Pipeline CRM formel (étapes, scoring, routage de leads) si le volume de prospects du simulateur le justifie

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-devis / estimation de prix instantanée dans le simulateur | Viole directement PRIX-01/SIMU-06 — le pattern de `/calculateur-roi` ne doit pas être copié |
| Mur d'email avant la première question du simulateur | Tue le taux de complétion ; contredit le placement optimal documenté (après les questions, avant le résultat) |
| Recommandation générique "vous avez besoin de tout" | Contredit SIMU-02 et l'objectif de qualification réelle |
| Pipeline CRM complet (étapes, scoring persistant, nurture) | Hors périmètre — contrainte projet "no functional changes to CRM" ; voir CRM2-01 en v2 si le volume le justifie |
| Chatbot conversationnel IA à la place du simulateur structuré | Complexité d'un second build façon VAPI, hors périmètre ; le questionnaire structuré suffit à l'objectif de qualification |
| Dashboards temps réel Meta/Google Ads sur les pages de service | Intégration API complexe et non demandée ; réservé à un éventuel outil client futur, pas une page de vente |
| Pages `/secteurs/*` (restaurant, commerce, école, artisan) | Mentionnées dans la stratégie SEO comme chantier adjacent futur, pas un des livrables explicites de ce milestone |
| Modification des tables CRM existantes (products/orders/stock, agent vocal VAPI) | Contrainte projet explicite : "no functional changes to CRM or VAPI" (PROJECT.md) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRIX-01 | Phase 8 | Complete |
| PRIX-02 | Phase 8 | Complete |
| SVC-01 | Phase 6 | Complete |
| SVC-02 | Phase 6 | Complete |
| SVC-03 | Phase 6 | Complete |
| SVC-04 | Phase 6 | Complete |
| SVC-05 | Phase 6 | Complete |
| SVC-06 | Phase 6 | Complete |
| SIMU-01 | Phase 7 | Complete |
| SIMU-02 | Phase 7 | Complete |
| SIMU-03 | Phase 7 | Complete |
| SIMU-04 | Phase 7 | Complete |
| SIMU-05 | Phase 7 | Complete |
| SIMU-06 | Phase 7 | Complete |
| SIMU-07 | Phase 7 | Complete |
| SIMU-08 | Phase 7 | Complete |
| CRM-01 | Phase 5 | Complete |
| CRM-02 | Phase 5 | Complete |
| CRM-03 | Phase 5 | Complete |
| CRM-04 | Phase 5 | Complete |
| LANDING-01 | Phase 8 | Complete |
| LANDING-02 | Phase 8 | Complete |
| LANDING-03 | Phase 8 | Complete |
| SEO-01 | Phase 9 | Complete |
| SEO-02 | Phase 9 | Pending |
| SEO-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26/26 ✓
- Unmapped: 0

**Phase summary:**
- Phase 5 — Prospect Capture Backend: CRM-01, CRM-02, CRM-03, CRM-04 (4)
- Phase 6 — Service Pages (Template + Content): SVC-01 through SVC-06 (6)
- Phase 7 — Diagnostic Simulator: SIMU-01 through SIMU-08 (8)
- Phase 8 — Landing Simplification & Pricing Policy: PRIX-01, PRIX-02, LANDING-01, LANDING-02, LANDING-03 (5)
- Phase 9 — SEO & Discovery Wiring: SEO-01, SEO-02, SEO-03 (3)

---
*Requirements defined: 2026-09-20*
*Last updated: 2026-09-20 — roadmap created, 26/26 requirements mapped to Phases 5-9*
