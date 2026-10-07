# Phase 17: Admin forecast dashboard - Context

**Gathered:** 2026-10-07
**Status:** Ready for planning

<domain>
## Phase Boundary

L'admin saisit ses coûts (récurrents et par projet) et pilote depuis une page unique le chiffre d'affaires (pipeline, signé, facturé, encaissé, en HT et TTC), la marge et la trésorerie projetées, avec le CA signé ventilé par source d'acquisition du lead d'origine. Les montants du dashboard concordent avec les factures et paiements de la phase 15. Requirements : ADM-02 à ADM-05. Hors périmètre : estimation de valeur sur les leads, courbe « probable » pondérée, calendrier d'échéances estimé, temps valorisé en coût, connexion bancaire, compta complète.

</domain>

<decisions>
## Implementation Decisions

### CA pipeline et CA signé (ADM-03)
- **D-01:** **Pipeline = devis émis non signés.** Somme HT/TTC du devis actif (dernier de la chaîne de remplacement) de chaque projet dont le contrat n'est pas signé. Montants réels lus dans les instantanés de devis (`sv_document_snapshots`) ; aucune saisie, aucune estimation sur lead, aucune pondération par statut. Un lead sans devis ne compte pas.
- **D-02:** **CA signé = total du devis actif à la date du fait `contract_signed`.** Un devis remplacé après signature (avenant) ajuste le signé par un delta daté ; le signé reste reconstituable à toute date.
- **D-03:** **Facturé = factures émises moins avoirs ; encaissé = paiements « paid » moins remboursements confirmés** (journal `sv_invoice_payment_events`). Les séries de test `TFA-`/`TAV-` (client de test permanent) sont **exclues par défaut**, avec une bascule admin « inclure les tests ». Tous les chiffres existent en centimes entiers, HT et TTC (en franchise art. 293 B, HT = TTC mais les deux colonnes restent alimentées depuis les champs de facture).
- **D-04:** Les montants du dashboard **se recalculent depuis les tables sources** (factures, lignes, événements de paiement, instantanés de devis), jamais depuis un agrégat stocké divergent. Un test de concordance compare totaux du dashboard et sommes brutes des factures/paiements.

### Saisie des coûts (ADM-02)
- **D-05:** **Dépenses réelles seulement** (sous-traitance, outils, hébergement, publicité, licences). Le temps de l'admin n'est pas un coût ; pas de TJM interne.
- **D-06:** **Coûts récurrents modélisés** : libellé, catégorie, montant en centimes, fréquence (mensuelle ou annuelle), date de début, date de fin optionnelle. Le dashboard les déplie par mois. Toute modification est une **nouvelle ligne** (historique conservé, ajout seul), pas un UPDATE.
- **D-07:** **Coût par projet** : ligne rattachée à un projet, avec date et catégorie. **Montant payé en centimes** (TVA d'achat non récupérable en franchise, le coût est le TTC payé) avec un champ TVA optionnel conservé pour une évolution de régime.

### Projection de marge et de trésorerie (ADM-04)
- **D-08:** **Entrées futures = factures émises impayées à leur échéance** (`due_date`). Le reste à facturer des devis signés (signé − facturé) s'affiche en « à facturer », non daté, **hors courbe**. Pas de courbe probable, pas de calendrier estimé.
- **D-09:** **Horizon fixe de 6 mois, projection mensuelle**, à partir d'un **solde bancaire de départ saisi** par l'admin (daté, en ajout seul : un réajustement est une nouvelle ligne). Sans solde saisi, l'interface le signale et affiche le flux net cumulé depuis zéro.
- **D-10:** **Marge par projet et globale.** Marge projet = CA signé (ou facturé net s'il est supérieur) − coûts rattachés au projet. Marge globale = somme des marges projet − coûts récurrents de la période. Une **marge réalisée** (encaissé − coûts payés) est affichée à côté de la marge projetée.

### Attribution et lecture du dashboard (ADM-05)
- **D-11:** **CA signé ventilé par la source figée du lead d'origine** (premier contact, corrigée par l'admin avec motif le cas échéant, phase 11 D-14), regroupée par source puis par campagne. Un projet sans lead (`lead_id` nul) apparaît sur une ligne « Direct / hors lead ». Pas de bascule dernier contact. **Amendement (propriétaire, 2026-10-07, après recherche) :** « source figée du lead » = colonnes `sv_leads.source_*` (corrigeables avec motif, déjà utilisées par l'entonnoir), et non `first_touch`. La colonne s'intitule « Source figée du lead ».
- **D-12:** **Page `/admin/pilotage`** (français, `noindex`, mêmes gabarit et garde `requireAdmin` que l'admin existant) avec : sélecteur de période (mois / trimestre / année), bascule HT/TTC, bascule « inclure les tests », tuiles pipeline / signé / facturé / encaissé, tableau par source et par projet, courbe de trésorerie sur 6 mois. **Chaque chiffre est cliquable** et ouvre la liste des factures, paiements ou devis qui le composent (réconciliation).
- **D-13:** **Les coûts se gèrent sur `/admin/pilotage/couts`** (récurrents, par projet, solde de départ). Le coût par RDV de l'entonnoir (phase 11, `sv_acquisition_costs`) reste sur `/admin/entonnoir` et n'est pas fusionné.
- **D-14 (hérité) :** Admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, vues en `security_invoker`, rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes `priceScope`). Tables comptables en ajout seul (patron `deny_mutation`). Fuseau `Europe/Paris`, formats `fr-FR`. Client de test permanent « Test E2E Sèvalys » réutilisé, jamais supprimé.

### Claude's Discretion
- Structure exacte des tables (coûts, récurrences, solde de départ), noms de fonctions SQL et de vues, découpage des plans.
- Liste des catégories de coûts, libellés français, présentation des tuiles et du graphique (accessible, tokens du design system).
- Méthode de calcul du signé à date (SQL vs module serveur), mise en cache éventuelle, pagination des listes de drill-down.
- Détail du traitement des cas limites : devis remplacé avant signature, projet signé sans devis actif, facture d'acompte non payée, avoir partiel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 17 — objectif et 4 critères de succès
- `.planning/REQUIREMENTS.md` — ADM-02 à ADM-05 ; PAY-01 à PAY-05 (données consommées)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix » (admin autorisé), « Permanent test fixtures »
- `.planning/STATE.md` — décisions v2.0 et blockers

### Phases précédentes
- `.planning/phases/15-stripe-payments-invoicing/15-CONTEXT.md` — factures légales, avoirs, séries `TFA`/`TAV`, journal de paiements, franchise art. 293 B, statuts déduits des faits
- `.planning/phases/14-electronic-signature/14-CONTEXT.md` — fait `contract_signed`, `acceptance_signed`
- `.planning/phases/13-document-generation/13-CONTEXT.md` — devis, instantanés, chaîne de remplacement, immuabilité
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — `sv_projects`, `lead_id`, faits en ajout seul
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — source figée (D-14), entonnoir, `sv_acquisition_costs` (D-20)
- `.planning/phases/16-mailing-automation-completion/16-CONTEXT.md` — cron quotidien, moteur de mails

### Code existant (à vérifier avant planification)
- `supabase/migrations/20261007000000_sv_invoices.sql` — `sv_invoices` (totaux HT/TTC/net en centimes, `kind`, `series`, `is_test`, `credits_invoice_id`, `due_date`), lignes, déductions
- `supabase/migrations/20261007010000_sv_payments.sql` — `sv_invoice_payment_events` (kinds `paid`, `refunded`, `anomaly`…), `sv_stripe_events`
- `supabase/migrations/20261005000000_sv_documents.sql` — `sv_project_documents` (chaîne `replaces_document_id`), `sv_document_snapshots` (montants du devis, lecture admin seule)
- `supabase/migrations/20261003000000_sv_leads_core.sql` — `sv_leads` (source figée, `first_touch`, `last_touch`, `channel`, `converted_client_id`)
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_projects` (`lead_id`, `offer`), `sv_project_facts`
- `src/lib/documents/money.ts`, `invoiceMath.ts`, `invoiceStatus.ts`, `schemas.ts` (`quoteInputSchema`, lignes du devis) — calcul monétaire et statuts
- `src/lib/server/invoices/` (`adminView.ts`, `read.ts`) — lecture admin des factures
- `src/app/admin/entonnoir/`, `src/app/admin/leads/`, `src/app/admin/projets/` — pages et actions admin à imiter ; `src/components/admin/AdminNav.tsx`
- `src/lib/priceScope.ts`, `src/lib/privateRoutes.ts` — gardes de prix et routes privées

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Factures, lignes, journal de paiements et avoirs en centimes entiers et en ajout seul : sources directes du facturé et de l'encaissé.
- Instantanés de devis (`sv_document_snapshots`) et chaîne de remplacement : source du pipeline et du signé.
- Source figée du lead (`first_touch`, corrections journalisées) et `sv_projects.lead_id` : jointure pour la ventilation du signé par source.
- `money.ts` / `invoiceMath.ts` : arithmétique en centimes à réutiliser, jamais de flottants.
- Page `/admin/entonnoir` et `sv_acquisition_costs` : patron d'une page admin à table filtrable et de saisie manuelle par mois.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans le même fichier, tables `sv_*`, `revoke` puis `grant`, triggers `deny_mutation` pour l'ajout seul, tests Vitest colocalisés, suite RLS sur branche dédiée.
- `requireAdmin()` + client RLS pour les lectures ; `service_role` confiné aux modules `server-only` ; actions serveur admin avec tests.

### Integration Points
- Nouvelle entrée de navigation admin (« Pilotage ») dans `AdminNav`.
- Vue ou fonctions SQL `security_invoker` pour les agrégats ; pas de nouvelle donnée de paiement.
- Lien depuis la fiche projet admin vers la marge du projet (optionnel, à la discrétion du planificateur).

</code_context>

<specifics>
## Specific Ideas

- Le propriétaire facture en TJM : le signé est une estimation, d'où l'écart signé/facturé affiché comme « reste à facturer ».
- Le client de test permanent produit des factures `TFA-`/`TAV-` : elles ne doivent jamais fausser les chiffres réels par défaut.

</specifics>

<deferred>
## Deferred Ideas

- Valeur estimée sur les leads et pipeline pondéré par statut — écarté pour l'instant
- Courbe de trésorerie « probable » et calendrier estimé du reste à facturer — écarté
- Temps valorisé (TJM interne) et marge « économique » — écarté
- Bascule d'attribution dernier contact — écarté
- Alertes de trésorerie négative, export comptable — possible phase ultérieure

</deferred>

---

*Phase: 17-Admin forecast dashboard*
*Context gathered: 2026-10-07*
