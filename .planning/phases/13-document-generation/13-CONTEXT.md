# Phase 13: Document generation - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Les documents contractuels et comptables sont générés en PDF figés, conformes, et retrouvables par le client. Livre : modèles PDF versionnés (devis, contrat, cahier des charges, PV de recette, facture), émission par l'admin avec aperçu, PDF stocké en écriture unique avec empreinte SHA-256, version du modèle et copie des données, onglet Documents du client avec statuts déduits des faits, section Documents dans la fiche projet admin, test des mentions légales sur le texte extrait. Requirements : DOC-01 à DOC-04.

Hors périmètre : signature et consentement (phase 14), paiements, numérotation légale sans trou, immuabilité des factures émises et avoirs (phase 15), relances automatiques (phase 16).

</domain>

<decisions>
## Implementation Decisions

### Émission et cycle de vie (DOC-01, DOC-02)
- **D-01:** **Geste admin explicite.** Dans la fiche projet, l'admin voit les documents attendus à l'étape courante et clique « Générer ». Aucune génération automatique à l'arrivée d'une étape : un devis ou un contrat ne part jamais sans relecture.
- **D-02:** **Aperçu puis émission.** L'admin saisit les données, voit un aperçu PDF non conservé, puis clique « Émettre » : seul ce PDF est figé (octets en écriture unique, SHA-256, version du modèle, copie JSON des données) et visible du client. Pas d'état « brouillon » stocké.
- **D-03:** **Correction après émission = nouveau document qui remplace l'ancien.** L'ancien est conservé, marqué « remplacé », jamais modifié ni supprimé.
- **D-04:** **Visible à l'émission + e-mail.** Dès « Émettre », le document apparaît dans l'espace client et un e-mail part via le moteur de mails existant (nouvelle règle en code, clé d'unicité par document).
- **D-05:** **Garde par étape, un seul document actif par type et par projet.** Devis et cahier des charges à l'étape 2, contrat à l'étape 3, PV de recette à l'étape 5, facture à l'étape 6. Un nouvel émis remplace l'actif du même type. Pas d'avenants en phase 13. La facture n'est que prévisualisable en phase 13 (voir D-14), la règle d'un actif par type ne s'y applique pas encore.

### Contenu et saisie (DOC-01)
- **D-06:** **Devis : lignes libres par projet.** Formulaire admin dans la fiche projet : lignes (désignation, quantité, prix unitaire HT), taux de TVA, % d'acompte, validité, délai. Aucun catalogue de prix. Totaux calculés côté serveur en centimes entiers.
- **D-07:** **Contrat : modèle fixe versionné dans le code** (clauses non éditables par l'admin), alimenté par les données du projet : parties, offre, montants du devis accepté, acompte, dates. Le texte juridique est à faire relire avant mise en production (blocker existant). La clause de convention de preuve sera ajoutée en phase 14.
- **D-08:** **Cahier des charges : sections structurées saisies par l'admin** (contexte et objectif, périmètre, livrables, hors périmètre, planning, critères d'acceptation), préremplies avec l'objectif d'onboarding (`sv_client_onboarding.project_goal`). Les critères d'acceptation sont réutilisés par le PV de recette.
- **D-09:** **PV de recette : un par projet**, reprend les critères d'acceptation du cahier des charges émis, date de livraison, réserves éventuelles (champ admin) et zone d'acceptation. La validation par étape livrée et la signature relèvent de la phase 14.

### Facture et mentions légales (DOC-04)
- **D-10:** **Phase 13 livre le modèle PDF de facture, sa prévisualisation et le test des mentions, mais n'émet aucune facture réelle.** Numéro légal, émission officielle, immuabilité et avoirs restent en phase 15 (PAY-04). Une facture prévisualisée porte un numéro provisoire clairement non légal (ex. « PROFORMA »/« APERÇU »), jamais stocké comme facture émise.
- **D-11:** **Régime de TVA du vendeur : franchise en base.** Mention « TVA non applicable, art. 293 B du CGI », montants HT = TTC, aucun calcul de TVA. Le modèle ne suppose pas la TVA, mais prévoit un champ de régime dans la configuration vendeur afin qu'un passage futur à la TVA ne demande qu'une nouvelle version de modèle. À confirmer par l'expert-comptable avant mise en production (blocker existant).
- **D-12:** **Identité du vendeur dans une constante versionnée dans le code** (nom, forme juridique, SIRET, adresse, RM/RCS, IBAN, conditions de paiement, régime de TVA). Copiée dans l'instantané de chaque document. Les valeurs réelles sont à demander au propriétaire pendant la planification (non connues du dépôt).
- **D-13:** **Test des mentions sur le texte extrait d'un vrai PDF.** Le test génère un devis et une facture avec des données d'exemple, en extrait le texte, et vérifie une liste explicite de mentions par type (identité et SIRET du vendeur, art. 293 B, pénalités de retard, indemnité forfaitaire de 40 €, validité du devis, date, désignation, montants, identité et SIREN du client…). Il doit échouer si une mention est retirée du modèle. Il couvre les variantes (adresse de facturation identique ou différente). Périmètre : devis et facture (DOC-04), pas contrat/CDC/PV.

### Onglet Documents du client (DOC-03)
- **D-14:** **Statut déduit des faits, aucune colonne de statut stockée.** « À signer », « signé » et « payé » se calculent depuis les faits du projet (`contract_signed`, `quote_accepted`, `deposit_received`, `acceptance_signed`, `balance_received`…) comme la frise. En phase 13, un document à signer affiche « À signer », signé/payé s'allument quand les faits existent (posés à la main par l'admin d'ici là). Les phases 14-15 n'ont rien à migrer. Le statut « remplacé » vient du chaînage de remplacement (D-03), pas d'un fait de signature.
- **D-15:** **Liste + téléchargement par lien signé.** Onglet Documents du portail : liste par projet (type, date d'émission, version, statut), bouton « Télécharger » qui génère à la demande un lien signé de quelques minutes (jamais stocké en base ni envoyé par e-mail), même mécanisme que les fichiers de la phase 12. Les documents remplacés restent listés en retrait. Pas de visualiseur PDF intégré en phase 13 (à reconsidérer en phase 14 pour la lecture avant signature).
- **D-16:** **Vue admin : section Documents dans la fiche projet existante** : documents attendus à l'étape, formulaire de saisie + aperçu + Émettre, liste des documents émis avec version du modèle, empreinte SHA-256 et volet lecture seule de l'instantané de données. L'admin télécharge les mêmes octets que le client. Pas de page transverse `/admin/documents`.

### Hérité des phases précédentes (rappel)
- **D-17:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes d'import existantes). Bucket de stockage privé préfixé `sv-` sur le projet Supabase partagé avec Gecko, sans toucher aux politiques `storage.objects` de Gecko. Client de test permanent « Test E2E Sèvalys » à réutiliser pour les vérifications de bout en bout, sans le supprimer. Faits en ajout seul, étape courante calculée (phase 12, D-08/D-09). Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables et colonnes (document, instantané, versions, remplacement), noms de types, découpage des plans.
- Mécanisme d'écriture unique du stockage (nouveau bucket privé ou chemin dédié, interdiction d'écraser) et chemin non devinable.
- Spike `@react-pdf/renderer` sur Next 16 / Turbopack : `serverExternalPackages`, polices TTF locales embarquées, rendu en runtime Node ; à faire en premier plan (blocker STATE.md).
- Bibliothèque d'extraction de texte PDF pour le test de mentions.
- Mise en page, typographie et libellés des PDF et de l'onglet Documents (sobre, tokens du design system).
- Libellés et gabarit de l'e-mail d'émission (français, sans prix).
- Forme exacte de l'aperçu (route de rendu, durée de vie, absence de stockage).
- Registre des versions de modèle (`v1`, `v2`…) et colonne en base qui enregistre la version utilisée.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 13 — objectif et 4 critères de succès
- `.planning/REQUIREMENTS.md` — DOC-01 à DOC-04 ; SIGN-01 à SIGN-05 et PAY-01 à PAY-05 (consommateurs futurs : empreinte stable, statuts par faits, facture structurée, numérotation phase 15)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures »
- `.planning/STATE.md` — blockers : relecture comptable (mentions de facture, TVA) avant la phase 13, relecture juridique avant la phase 14, spike React-PDF en premier plan

### Phases précédentes
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — faits en ajout seul, frise calculée, onboarding structuré, fichiers privés et liens signés, moteur de mails à règles en code
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — journal immuable, patron de table en ajout seul
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — rôles en tables, `service_role` server-only, suite RLS sur branche

### Recherche v2.0
- `.planning/research/STACK.md` § PDF generation — `@react-pdf/renderer` ^4.9.0, `serverExternalPackages`, modèles `src/pdf/templates/<doc>/v1/…`, SHA-256 via `node:crypto`, `pdf-lib` seulement pour la phase 14
- `.planning/research/PITFALLS.md` — PDF stocké en bucket public, document non figé (ne jamais regénérer un document signé), légalité des factures, e-facture (calendrier PA, Factur-X)
- `.planning/research/SUMMARY.md` § phase documents — registre de modèles `v{n}`, polices embarquées, statuts de cycle de vie, test des mentions, onglet documents du portail

### Code existant
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_projects`, `sv_project_facts` (types de faits existants), `sv_client_onboarding`, `sv_project_files` et bucket `sv-project-files`, `sv_mail_outbox` (liste fermée d'événements et modèles à étendre)
- `src/lib/server/projects/facts.ts`, `read.ts`, `access.ts` — faits, lecture projet, accès (calcul des statuts depuis les faits)
- `src/lib/server/projects/files.ts`, `src/lib/projects/fileRules.ts` — mécanisme de lien signé à réutiliser pour le téléchargement
- `src/lib/server/projects/onboarding.ts` — données de société, signataire, TVA, adresse de facturation consommées par les modèles
- `src/lib/server/mail/rules.ts`, `outbox.ts`, `stepChangedEmail.ts` — moteur de mails à étendre pour l'e-mail d'émission
- `src/app/admin/projets/`, `src/app/espace-client/` — fiche projet admin et portail à étendre
- `src/lib/projects/copy.ts` — libellés français de la frise et du portail

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Table de faits typés en ajout seul (`sv_project_facts`) et calcul de l'étape courante : source des statuts de document (D-14) ; les faits `quote_accepted`, `contract_signed`, `deposit_received`, `acceptance_signed`, `balance_received` existent déjà.
- `sv_client_onboarding` (signataire, contact projet, TVA, adresse de facturation, objectif) et `sv_clients.company` (jsonb issu de la recherche SIRET) : alimentent parties et en-têtes des modèles.
- Lien signé à la demande et liste blanche de types (fichiers phase 12) : patron pour le téléchargement de document.
- Moteur de mails (`rules.ts`, `outbox.ts`, `sv_mail_outbox` avec `dedupe_key` unique) : accueille la règle « document émis → client ».
- Gardes d'import `priceScope` : les modèles de documents sont déjà une zone où les prix sont autorisés.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans le même fichier, tables `sv_*`, triggers `deny_mutation` pour l'ajout seul.
- Tests Vitest colocalisés ; suite RLS sur branche Supabase pour chaque nouvelle table.
- `service_role` confiné aux modules `server-only` ; actions serveur admin avec tests.
- Aucun `@react-pdf/renderer` ni bibliothèque PDF dans `package.json` pour l'instant (à ajouter, avec spike de compatibilité).

### Integration Points
- Fiche projet admin → section Documents → rendu PDF serveur → bucket privé + table de documents + instantané → règle de mail → onglet Documents du portail (actuellement « bientôt » dans la navigation squelette).
- Extension de la liste fermée d'événements/modèles de `sv_mail_outbox`.

</code_context>

<specifics>
## Specific Ideas

- Franchise en base de TVA : tous les documents affichent des montants sans TVA et la mention de l'art. 293 B ; le contrat et le devis reprennent les mêmes montants.
- Un document émis ne se modifie jamais : toute correction passe par un remplacement visible dans la liste (document précédent en retrait).
- Le PV de recette reprend littéralement les critères d'acceptation du cahier des charges émis.

</specifics>

<deferred>
## Deferred Ideas

- Visualiseur PDF intégré dans le portail — à reconsidérer en phase 14 (lecture avant signature).
- Plusieurs documents actifs d'un même type (acompte + solde en deux factures, plusieurs PV par étape livrée, avenants) — phases 14-15 ; la validation « de chaque étape livrée » (SIGN-05) y est traitée.
- Page transverse `/admin/documents` (tous clients, filtres type/statut) — quand le volume le justifiera.
- Modèles de contrat par offre (9 textes) — contredit la frise commune ; à reconsidérer après les premiers projets réels.
- Catalogue d'offres avec prix par défaut — non retenu ; lignes libres.
- Extension du test de mentions au contrat, au cahier des charges et au PV — hors DOC-04.
- Clauses particulières par projet dans le contrat — non retenu ; modèle fixe.
- Facture réelle, numérotation sans trou, immuabilité, avoirs, Factur-X — phase 15.

</deferred>

---

*Phase: 13-Document generation*
*Context gathered: 2026-10-03*
