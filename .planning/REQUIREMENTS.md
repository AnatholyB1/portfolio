# Requirements: Sèvalys v1.1 — Extension de l'offre & refonte commerciale

**Defined:** 2026-09-20
**Core Value:** Un patron de PME comprend l'offre, fait confiance, et sait contacter Sèvalys en moins de 60 secondes.

## v1 Requirements

### PRIX (politique tarifaire)

- [ ] **PRIX-01**: Aucun prix, fourchette de prix, ou mention tarifaire n'est affiché sur les 9 pages de service, la landing, ou le simulateur
- [ ] **PRIX-02**: Le calculateur ROI (`/calculateur-roi`) n'affiche plus de prix (contradiction directe avec PRIX-01 sinon)

### SVC (pages de service, 9 au total)

- [ ] **SVC-01**: Chaque offre (Landing Page, Rebranding+Premium, Projet sur-mesure, Agent Vocal IA, Maintenance, Community Management, Branding, Meta Ads, Google Ads) a sa propre page dédiée `/services/[slug]`
- [ ] **SVC-02**: Chaque page de service suit la structure : problème résolu → fonctionnement → enjeux → preuve sociale → FAQ → double CTA (simulateur / contact) — jamais de prix
- [ ] **SVC-03**: `/services` devient une page d'index listant les 9 services avec lien vers chaque page dédiée
- [ ] **SVC-04**: La page Branding distingue explicitement son périmètre de l'offre existante "Rebranding + Site Premium"
- [ ] **SVC-05**: Chaque page de service inclut un schema.org `FAQPage` + un bloc de réponse directe citable sous les titres clés (H1/H2)
- [ ] **SVC-06**: Le contenu des pages de service vit dans le système i18n existant (`translations.ts`, fr/en/th), rédigé de façon concise

### SIMU (simulateur de diagnostic)

- [ ] **SIMU-01**: Le visiteur répond à une série de questions sur ses problèmes/besoins, avec logique de branchement (questions non pertinentes sautées selon les réponses précédentes)
- [ ] **SIMU-02**: À la fin, le simulateur recommande un sous-ensemble de 2 à 4 services pertinents parmi les 9 — jamais "tous les services"
- [ ] **SIMU-03**: L'écran de résultat affiche une jauge/score visuel en complément de la recommandation textuelle (purement visuel, non stocké comme métrique)
- [ ] **SIMU-04**: Le formulaire de capture de contact apparaît uniquement entre la dernière question et l'affichage du résultat — jamais avant la première question
- [ ] **SIMU-05**: Le formulaire inclut une case de consentement RGPD non pré-cochée avec mentions Art. 13 (identité du responsable, finalité, base légale, durée de conservation, droits)
- [ ] **SIMU-06**: Le simulateur ne mentionne, n'affiche, ni n'estime aucun prix à aucune étape
- [ ] **SIMU-07**: L'écran de résultat propose une action unique claire ("nous contacter"), présentée avec deux canaux (appeler / écrire) — pas deux objectifs concurrents
- [ ] **SIMU-08**: `/simulateur` est écrit comme une page pilier explicative et citable (pas un formulaire nu), conformément à la stratégie GEO/AEO

### CRM (stockage des prospects)

- [ ] **CRM-01**: Chaque soumission du simulateur crée un enregistrement prospect dans une nouvelle table Supabase dédiée (même projet Supabase que le CRM existant — pas de réutilisation du schéma products/orders/stock)
- [ ] **CRM-02**: La table prospects est protégée par une politique RLS insert-only côté écriture publique
- [ ] **CRM-03**: La soumission du simulateur est protégée contre le spam (rate-limiting et/ou honeypot)
- [ ] **CRM-04**: Une notification email (via Resend, cohérent avec `/api/contact`) informe l'équipe Sèvalys de chaque nouveau prospect

### LANDING (landing simplifiée)

- [ ] **LANDING-01**: La landing suit l'ordre : problèmes résolus → aperçu des services (cartes renvoyant vers chaque page dédiée) → fonctionnement → enjeux → preuve sociale → CTA
- [ ] **LANDING-02**: Tous les CTA de la landing renvoient vers le simulateur ou le contact direct (téléphone/email) — aucun CTA ne pointe vers un prix ou une ancre de prix
- [ ] **LANDING-03**: La preuve sociale réutilise les réalisations existantes (Feuillette, Gecko Cabane, Les Folies Temps Danse) comme témoignages/études de cas visibles sur la landing

### SEO (intégration stratégie SEO/GEO/AEO)

- [ ] **SEO-01**: Chaque nouvelle page (9 pages de service + `/simulateur`) est ajoutée à `sitemap.ts`, référencée dans `llms.txt`, et suit le pattern title/H1 "[Service] à Tours · [bénéfice]"
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

*(remplie par le roadmapper)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRIX-01 | — | Pending |
| PRIX-02 | — | Pending |
| SVC-01 | — | Pending |
| SVC-02 | — | Pending |
| SVC-03 | — | Pending |
| SVC-04 | — | Pending |
| SVC-05 | — | Pending |
| SVC-06 | — | Pending |
| SIMU-01 | — | Pending |
| SIMU-02 | — | Pending |
| SIMU-03 | — | Pending |
| SIMU-04 | — | Pending |
| SIMU-05 | — | Pending |
| SIMU-06 | — | Pending |
| SIMU-07 | — | Pending |
| SIMU-08 | — | Pending |
| CRM-01 | — | Pending |
| CRM-02 | — | Pending |
| CRM-03 | — | Pending |
| CRM-04 | — | Pending |
| LANDING-01 | — | Pending |
| LANDING-02 | — | Pending |
| LANDING-03 | — | Pending |
| SEO-01 | — | Pending |
| SEO-02 | — | Pending |
| SEO-03 | — | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 26 ⚠️ (to be resolved by roadmapper)

---
*Requirements defined: 2026-09-20*
*Last updated: 2026-09-20 after initial definition*
