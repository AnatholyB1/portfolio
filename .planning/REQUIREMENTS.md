# Requirements: BRICON ANATHOLY · Sèvalys — Milestone v2.0

**Defined:** 2026-10-01
**Core Value:** Un patron de PME arrive sur le site, comprend, fait confiance et sait comment nous contacter en moins de 60 secondes.
**Milestone goal:** Transformer le site vitrine en plateforme : prospect tracé → client → suivi, signature et paiement en ligne → pilotage admin.

## v2.0 Requirements

### Fondations & accès (FOUND)

- [x] **FOUND-01**: Un client invité peut se connecter sans mot de passe avec un code à 8 chiffres reçu par e-mail (lien en secours)
- [x] **FOUND-02**: Aucun compte ne peut être créé librement : l'accès se fait uniquement sur invitation d'un admin
- [x] **FOUND-03**: Les rôles admin et client sont portés par des tables dédiées, jamais déduits du simple statut « authentifié » (le projet Supabase est partagé avec Gecko)
- [x] **FOUND-04**: Un client ne peut lire aucune donnée d'un autre client ; des tests automatisés prouvent l'isolation (client A vs client B, anonyme, utilisateur Gecko)
- [x] **FOUND-05**: `/espace-client` et `/admin` existent comme coquilles `noindex`, hors sitemap et `llms.txt`, sans intro cinéma, curseur ni GSAP
- [x] **FOUND-06**: Les gardes de politique « aucun prix » restent actifs sur le site public et autorisent explicitement les prix dans le portail, l'admin et les modèles de documents
- [x] **FOUND-07**: SPF, DKIM et DMARC sont configurés et vérifiés pour le domaine d'envoi avant que le login par e-mail en dépende

### Prospects, attribution & consentement (LEAD)

- [x] **LEAD-01**: Chaque arrivée avec paramètres enregistre côté serveur UTM, identifiants de clic (si consentement), page d'atterrissage et référent, en deux jeux : premier contact et dernier contact
- [x] **LEAD-02**: La source d'un lead est figée à sa création ; seul un admin peut la corriger, avec un motif obligatoire journalisé
- [x] **LEAD-03**: Le journal `lead_events` est en ajout seul (aucune mise à jour ni suppression) et permet l'anonymisation d'un lead pour le droit à l'effacement
- [x] **LEAD-04**: Un même prospect (e-mail ou téléphone normalisés) revenu dans les 9 mois ajoute un contact au lead existant sans changer sa source
- [ ] **LEAD-05**: Le simulateur et le formulaire de contact alimentent le pipeline de leads, sans casser l'ordre actuel des protections anti-spam
- [ ] **LEAD-06**: Les `prospects` existants sont migrés et la purge de 12 mois est réécrite pour épargner les clients convertis et les données comptables
- [x] **LEAD-07**: L'admin voit la liste des leads, le pipeline par statut et change un statut en un geste, avec motif de perte
- [ ] **LEAD-08**: L'admin voit l'entonnoir par source et campagne (visites, simulations, leads, qualifiés, RDV, signés) et saisit à la main le coût par RDV
- [x] **LEAD-09**: Un bandeau de consentement propose Accepter et Refuser à égalité, journalise chaque choix (date, texte, version) et bloque toute balise publicitaire avant accord

### Espace client & suivi de projet (PORTAL)

- [ ] **PORTAL-01**: Un admin convertit un lead en client en un clic, ce qui envoie l'invitation
- [ ] **PORTAL-02**: Le client remplit un onboarding guidé (informations société) dont les données alimentent ses documents
- [ ] **PORTAL-03**: Le client voit son projet en frise d'étapes, l'étape en cours et les actions qu'on attend de lui
- [ ] **PORTAL-04**: Une étape se débloque selon les faits enregistrés (document signé, paiement reçu), pas selon une saisie manuelle
- [ ] **PORTAL-05**: Le client dépose et télécharge des fichiers et consulte des liens utiles ; stockage privé, dépôt direct, URLs signées courtes
- [ ] **PORTAL-06**: Le client peut accorder ou révoquer le droit de présenter son projet (portfolio, réseaux), avec date et texte accepté conservés

### Documents (DOC)

- [ ] **DOC-01**: Les documents (devis, contrat, cahier des charges, PV de recette, facture) sont générés en PDF à partir de modèles versionnés et des données du projet, selon l'étape
- [ ] **DOC-02**: Chaque PDF émis est figé : octets stockés en écriture unique avec empreinte SHA-256, version du modèle et copie des données utilisées
- [ ] **DOC-03**: Le client retrouve tous ses documents dans son espace avec leur statut (à signer, signé, payé)
- [ ] **DOC-04**: Un test automatisé vérifie les mentions légales françaises obligatoires dans le texte extrait de chaque facture et devis

### Signature électronique (SIGN)

- [ ] **SIGN-01**: Le client signe un document avec un code à usage unique envoyé par e-mail (haché, expire à 10 minutes, 5 essais maximum)
- [ ] **SIGN-02**: Avant signature, le client consent explicitement à la signature électronique et à la clause de convention de preuve
- [ ] **SIGN-03**: Chaque signature écrit une piste d'audit en ajout seul et chaînée par hachage (horodatage, IP, empreinte du document, version)
- [ ] **SIGN-04**: Le PDF signé est scellé avec une page certificat, et la piste d'audit est exportable
- [ ] **SIGN-05**: Le PV de recette permet au client de valider chaque étape livrée

### Paiements & facturation (PAY)

- [ ] **PAY-01**: Le client paie un acompte ou un solde par étape via Stripe Checkout, avec des montants calculés côté serveur
- [ ] **PAY-02**: L'état « payé » vient uniquement d'un webhook Stripe vérifié (corps brut) et idempotent (table d'événements)
- [ ] **PAY-03**: Le client reçoit un reçu et des relances d'acompte impayé ; le paiement reçu débloque l'étape suivante
- [ ] **PAY-04**: Les factures ont une numérotation sans trou, sont immuables une fois émises et se corrigent par avoir
- [ ] **PAY-05**: Les factures sont stockées en données structurées, prêtes pour Factur-X et une plateforme agréée

### Mailing automatique (MAIL)

- [ ] **MAIL-01**: Un moteur de règles envoie un e-mail à partir d'un événement (statut, étape, document, paiement) avec un modèle et un délai
- [ ] **MAIL-02**: Chaque envoi est idempotent (aucun doublon par événement et destinataire) et journalisé
- [ ] **MAIL-03**: Des relances automatiques partent pour document non signé, acompte impayé et demande d'avis
- [ ] **MAIL-04**: Les rebonds et plaintes Resend alimentent une liste de suppression ; chaque e-mail marketing a un lien de désinscription ; flux transactionnel et marketing sont séparés

### Pilotage admin (ADM)

- [ ] **ADM-01**: L'admin voit tous les projets, leur étape en cours et ce qui les bloque
- [ ] **ADM-02**: L'admin saisit les coûts (récurrents et par projet)
- [ ] **ADM-03**: Le dashboard affiche CA pipeline, signé, facturé et encaissé, en centimes, HT et TTC
- [ ] **ADM-04**: Le dashboard projette marge et trésorerie à partir des échéances de paiement et des coûts
- [ ] **ADM-05**: Le dashboard rattache le CA signé à la source d'acquisition du lead d'origine

### Avis vérifiés (REV)

- [ ] **REV-01**: Chaque client dont le projet est livré (PV signé) reçoit un lien d'avis unique à usage unique qui expire sous 60 jours
- [ ] **REV-02**: Le client est invité à publier aussi sur Google Business ; le lien est affiché quelle que soit la note, sans filtrage
- [ ] **REV-03**: La modération porte uniquement sur la légalité, avec motif journalisé ; une page « Politique des avis » décrit la méthode de vérification
- [ ] **REV-04**: Les avis publiés alimentent un balisage JSON-LD `Review`, sans clé de prix et sans promesse d'étoiles dans Google, avec un test automatisé

### Préparation acquisition (ADS)

- [ ] **ADS-01**: Une convention de nommage UTM pour Meta, Google et Google Business est documentée et appliquée par la capture (LEAD-01)
- [ ] **ADS-02**: Une taxonomie d'événements et une échelle de conversions (Lead, Qualifié, RDV, Signé) sont définies, avec un `event_id` partagé pour la déduplication

## Future Requirements

### Acquisition avancée

- **ADS-03**: Kit de contenu organique (calendrier et modèles de posts à partir des projets livrés et des avis publiés)
- **ADS-04**: Envoi serveur des conversions Meta CAPI et Google (consentement requis, reprise en cas d'échec)
- **ADS-05**: Audiences de relance Meta par profondeur d'abandon du simulateur

### Plateforme

- **PAY-06**: Facturation récurrente (maintenance)
- **PAY-07**: Connexion à une plateforme agréée de facturation électronique et émission Factur-X
- **ADM-06**: Scénarios de prévision comparés
- **PORTAL-07**: Page de statut publique par projet et statistiques en direct des services (agent vocal)
- **SIGN-06**: Horodatage qualifié RFC 3161 et signature avancée via un tiers

### Reporté de v1.1

- Pages secteurs `/secteurs/*` et blog
- Études de cas réelles (SVC2-01)
- Simulateur v2 : questions par secteur, A/B (SIMU2-01/02)
- Pied de page branché sur LanguageContext, gardes `prefers-reduced-motion` JS

## Out of Scope

| Feature | Raison |
|---------|--------|
| Mot de passe ou connexion sociale pour les clients | Invitation + code e-mail suffit, moins de surface d'attaque |
| Service de signature tiers (Yousign, Docusign) | Décision : signature simple maison, sans coût par enveloppe |
| Prix sur une page publique, sitemap, `llms.txt` ou JSON-LD | Politique site-wide PRIX-01, les prix vivent dans l'espace authentifié |
| Filtrage des demandes d'avis selon la note | Interdit par les règles Google et la législation sur les avis |
| Édition ou suppression de `lead_events` | Journal d'attribution immuable par conception |
| CMS pour les modèles de documents | Modèles versionnés dans le code |
| CRM complet, chat dans le portail, constructeur d'automatisation | Hors besoin, risque de dérive de périmètre |
| Import automatique des dépenses publicitaires | Coût par RDV saisi à la main dans ce milestone |
| Modification de `/api/crm/*`, `/demo`, `/demo/feuillette` | Contrainte du projet |
| Stripe Invoicing comme facture légale | Une seule source de facture légale : nos PDF |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 10 | Complete |
| FOUND-02 | Phase 10 | Complete |
| FOUND-03 | Phase 10 | Complete |
| FOUND-04 | Phase 10 | Complete |
| FOUND-05 | Phase 10 | Complete |
| FOUND-06 | Phase 10 | Complete |
| FOUND-07 | Phase 10 | Complete |
| LEAD-01 | Phase 11 | Complete |
| LEAD-02 | Phase 11 | Complete |
| LEAD-03 | Phase 11 | Complete |
| LEAD-04 | Phase 11 | Complete |
| LEAD-05 | Phase 11 | Pending |
| LEAD-06 | Phase 11 | Pending |
| LEAD-07 | Phase 11 | Complete |
| LEAD-08 | Phase 11 | Pending |
| LEAD-09 | Phase 11 | Complete |
| PORTAL-01 | Phase 12 | Pending |
| PORTAL-02 | Phase 12 | Pending |
| PORTAL-03 | Phase 12 | Pending |
| PORTAL-04 | Phase 12 | Pending |
| PORTAL-05 | Phase 12 | Pending |
| PORTAL-06 | Phase 12 | Pending |
| MAIL-01 | Phase 12 | Pending |
| MAIL-02 | Phase 12 | Pending |
| ADM-01 | Phase 12 | Pending |
| DOC-01 | Phase 13 | Pending |
| DOC-02 | Phase 13 | Pending |
| DOC-03 | Phase 13 | Pending |
| DOC-04 | Phase 13 | Pending |
| SIGN-01 | Phase 14 | Pending |
| SIGN-02 | Phase 14 | Pending |
| SIGN-03 | Phase 14 | Pending |
| SIGN-04 | Phase 14 | Pending |
| SIGN-05 | Phase 14 | Pending |
| PAY-01 | Phase 15 | Pending |
| PAY-02 | Phase 15 | Pending |
| PAY-03 | Phase 15 | Pending |
| PAY-04 | Phase 15 | Pending |
| PAY-05 | Phase 15 | Pending |
| MAIL-03 | Phase 16 | Pending |
| MAIL-04 | Phase 16 | Pending |
| ADM-02 | Phase 17 | Pending |
| ADM-03 | Phase 17 | Pending |
| ADM-04 | Phase 17 | Pending |
| ADM-05 | Phase 17 | Pending |
| REV-01 | Phase 18 | Pending |
| REV-02 | Phase 18 | Pending |
| REV-03 | Phase 18 | Pending |
| REV-04 | Phase 18 | Pending |
| ADS-01 | Phase 19 | Pending |
| ADS-02 | Phase 19 | Pending |

**Coverage:**
- v2.0 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0

---
*Requirements defined: 2026-10-01*
*Last updated: 2026-10-01 after roadmap creation (traceability filled)*
