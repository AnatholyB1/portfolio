# Phase 17: Admin forecast dashboard - Research

**Researched:** 2026-10-07
**Domain:** Tableau de bord financier admin (Next.js 16 App Router + Supabase Postgres/RLS), agrégation de données comptables en centimes entiers, tables de coûts en ajout seul
**Confidence:** HIGH (tout repose sur du code et des migrations lus dans ce dépôt ; aucune nouvelle bibliothèque)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CA pipeline et CA signé (ADM-03)**
- **D-01:** **Pipeline = devis émis non signés.** Somme HT/TTC du devis actif (dernier de la chaîne de remplacement) de chaque projet dont le contrat n'est pas signé. Montants réels lus dans les instantanés de devis (`sv_document_snapshots`) ; aucune saisie, aucune estimation sur lead, aucune pondération par statut. Un lead sans devis ne compte pas.
- **D-02:** **CA signé = total du devis actif à la date du fait `contract_signed`.** Un devis remplacé après signature (avenant) ajuste le signé par un delta daté ; le signé reste reconstituable à toute date.
- **D-03:** **Facturé = factures émises moins avoirs ; encaissé = paiements « paid » moins remboursements confirmés** (journal `sv_invoice_payment_events`). Les séries de test `TFA-`/`TAV-` (client de test permanent) sont **exclues par défaut**, avec une bascule admin « inclure les tests ». Tous les chiffres existent en centimes entiers, HT et TTC (en franchise art. 293 B, HT = TTC mais les deux colonnes restent alimentées depuis les champs de facture).
- **D-04:** Les montants du dashboard **se recalculent depuis les tables sources** (factures, lignes, événements de paiement, instantanés de devis), jamais depuis un agrégat stocké divergent. Un test de concordance compare totaux du dashboard et sommes brutes des factures/paiements.

**Saisie des coûts (ADM-02)**
- **D-05:** **Dépenses réelles seulement** (sous-traitance, outils, hébergement, publicité, licences). Le temps de l'admin n'est pas un coût ; pas de TJM interne.
- **D-06:** **Coûts récurrents modélisés** : libellé, catégorie, montant en centimes, fréquence (mensuelle ou annuelle), date de début, date de fin optionnelle. Le dashboard les déplie par mois. Toute modification est une **nouvelle ligne** (historique conservé, ajout seul), pas un UPDATE.
- **D-07:** **Coût par projet** : ligne rattachée à un projet, avec date et catégorie. **Montant payé en centimes** (TVA d'achat non récupérable en franchise, le coût est le TTC payé) avec un champ TVA optionnel conservé pour une évolution de régime.

**Projection de marge et de trésorerie (ADM-04)**
- **D-08:** **Entrées futures = factures émises impayées à leur échéance** (`due_date`). Le reste à facturer des devis signés (signé − facturé) s'affiche en « à facturer », non daté, **hors courbe**. Pas de courbe probable, pas de calendrier estimé.
- **D-09:** **Horizon fixe de 6 mois, projection mensuelle**, à partir d'un **solde bancaire de départ saisi** par l'admin (daté, en ajout seul : un réajustement est une nouvelle ligne). Sans solde saisi, l'interface le signale et affiche le flux net cumulé depuis zéro.
- **D-10:** **Marge par projet et globale.** Marge projet = CA signé (ou facturé net s'il est supérieur) − coûts rattachés au projet. Marge globale = somme des marges projet − coûts récurrents de la période. Une **marge réalisée** (encaissé − coûts payés) est affichée à côté de la marge projetée.

**Attribution et lecture du dashboard (ADM-05)**
- **D-11:** **CA signé ventilé par la source figée du lead d'origine** (premier contact, corrigée par l'admin avec motif le cas échéant, phase 11 D-14), regroupée par source puis par campagne. Un projet sans lead (`lead_id` nul) apparaît sur une ligne « Direct / hors lead ». Pas de bascule dernier contact.
- **D-12:** **Page `/admin/pilotage`** (français, `noindex`, mêmes gabarit et garde `requireAdmin` que l'admin existant) avec : sélecteur de période (mois / trimestre / année), bascule HT/TTC, bascule « inclure les tests », tuiles pipeline / signé / facturé / encaissé, tableau par source et par projet, courbe de trésorerie sur 6 mois. **Chaque chiffre est cliquable** et ouvre la liste des factures, paiements ou devis qui le composent (réconciliation).
- **D-13:** **Les coûts se gèrent sur `/admin/pilotage/couts`** (récurrents, par projet, solde de départ). Le coût par RDV de l'entonnoir (phase 11, `sv_acquisition_costs`) reste sur `/admin/entonnoir` et n'est pas fusionné.
- **D-14 (hérité) :** Admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, vues en `security_invoker`, rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes `priceScope`). Tables comptables en ajout seul (patron `deny_mutation`). Fuseau `Europe/Paris`, formats `fr-FR`. Client de test permanent « Test E2E Sèvalys » réutilisé, jamais supprimé.

### Claude's Discretion
- Structure exacte des tables (coûts, récurrences, solde de départ), noms de fonctions SQL et de vues, découpage des plans.
- Liste des catégories de coûts, libellés français, présentation des tuiles et du graphique (accessible, tokens du design system).
- Méthode de calcul du signé à date (SQL vs module serveur), mise en cache éventuelle, pagination des listes de drill-down.
- Détail du traitement des cas limites : devis remplacé avant signature, projet signé sans devis actif, facture d'acompte non payée, avoir partiel.

### Deferred Ideas (OUT OF SCOPE)
- Valeur estimée sur les leads et pipeline pondéré par statut — écarté pour l'instant
- Courbe de trésorerie « probable » et calendrier estimé du reste à facturer — écarté
- Temps valorisé (TJM interne) et marge « économique » — écarté
- Bascule d'attribution dernier contact — écarté
- Alertes de trésorerie négative, export comptable — possible phase ultérieure
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-02 | L'admin saisit les coûts (récurrents et par projet) | Trois nouvelles tables en ajout seul (`sv_recurring_costs`, `sv_project_costs`, `sv_cash_balances`), RPC `service_role` d'insertion, page `/admin/pilotage/couts`, patron `deny_mutation` + révocation par ligne de type `fact_revoked` |
| ADM-03 | CA pipeline, signé, facturé, encaissé, en centimes, HT et TTC | Module serveur d'agrégation pur sur lignes lues par client RLS admin ; forme du JSON de devis, chaîne `replaces_document_id`, faits `contract_signed`, formule facturé = net à payer − avoirs, encaissé = `paid` − `refunded` (attention : `refunded` cumulatif) |
| ADM-04 | Projection de marge et de trésorerie depuis échéances et coûts | Dépliage mensuel des coûts récurrents, factures impayées par `due_date`, solde de départ daté, horizon 6 mois, règles pour retards/virements en cours |
| ADM-05 | CA signé rattaché à la source du lead d'origine | Jointure `sv_projects.lead_id -> sv_leads.source_source / source_campaign` (colonnes figées, corrigeables) ; ligne « Direct / hors lead » |
</phase_requirements>

## Summary

La phase n'exige aucune nouvelle dépendance. Tout le matériau existe : le devis actif est la tête de la chaîne `sv_project_documents.replaces_document_id` (helper `chainHeads` dans `src/lib/documents/steps.ts`) et son instantané `sv_document_snapshots.data` porte `totalCents`, `depositCents`, `balanceCents` (JSON `QuoteSnapshot`, centimes entiers, une seule valeur car franchise TVA) ; les factures et avoirs sont dans `sv_invoices` (centimes, `kind`, `series`, `is_test`, `due_date`, `credits_invoice_id`, `net_to_pay_cents`, `prepaid_cents`) ; l'encaissé vient du journal `sv_invoice_payment_events` (`paid`, `refunded`) ; la source d'acquisition est sur `sv_leads` via `sv_projects.lead_id`. Les nouvelles données sont trois tables de saisie admin, en ajout seul, sur le même patron que `sv_invoices`.

Trois pièges de données doivent être traités dans les plans, car ils faussent les chiffres sans erreur visible : (1) la facture finale reprend le total complet du devis et déduit l'acompte (`prepaid_cents`), donc **facturé = somme des `net_to_pay_cents` moins les avoirs**, jamais la somme des `total_*` ; (2) l'événement `refunded` écrit par le webhook `charge.refunded` porte `amount_refunded`, qui est **cumulatif par charge** : le total remboursé d'une facture est le maximum, pas la somme ; (3) les colonnes `sv_leads.source_source/medium/campaign` sont la source **dernier contact à la création** (hypothèse A3 de la phase 11, `classifyChannel(lastTouch ?? firstTouch)`), alors que `first_touch` est un jsonb non corrigeable : voir Open Question 1, la décision D-11 parle de « premier contact ».

Le volume est celui d'un indépendant (dizaines de projets, centaines de factures) : l'agrégation se fait en TypeScript pur côté serveur sur des lignes lues via le client RLS admin (colonnes `authenticated` suffisantes, y compris pour le journal de paiements), ce qui rend toutes les règles testables en Vitest sans base, et laisse la suite RLS ne tester que les tables nouvelles et un test de concordance sur branche.

**Primary recommendation:** Une migration `20261009000000_sv_pilotage.sql` (3 tables append-only + RPC d'insertion `service_role`), un module `src/lib/server/pilotage/` (fonctions pures d'agrégation + chargeur RLS), et deux pages `/admin/pilotage` et `/admin/pilotage/couts`, sans vue SQL d'agrégat ni bibliothèque de graphique (SVG inline).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Saisie coûts / solde (écriture) | API / Backend (server actions + RPC `service_role`) | Database (triggers `deny_mutation`, CHECK) | Aucun GRANT d'écriture pour `authenticated` ; patron des tables comptables existantes |
| Stockage coûts, historique | Database / Storage | — | Ajout seul, RLS admin-only, FK `on delete restrict` |
| Lecture des sources (factures, paiements, devis, faits, leads) | API / Backend (client RLS admin, `requireAdmin`) | Database (RLS `is_admin()`) | Montants et snapshots admin-only ; pas de `service_role` nécessaire |
| Calcul pipeline / signé / facturé / encaissé / marge / trésorerie | API / Backend (module pur TS) | — | Règles métier multi-sources, testables sans base, recalcul depuis tables sources (D-04) |
| Bascules période / HT-TTC / tests | Frontend Server (SSR, `searchParams`) | Browser (formulaire GET) | Aucun état client : le serveur recalcule, URL partageable |
| Courbe de trésorerie | Frontend Server (SVG rendu serveur) | — | Pas de JS client ni de librairie ; accessible (table équivalente) |
| Drill-down des chiffres cliquables | Frontend Server (route avec `searchParams`) | API / Backend | Liste = mêmes lignes que celles du calcul, filtrées par la clé du chiffre |
| Garde d'accès | API / Backend (`requireAdmin()` dans page ET action) | — | Un layout n'est pas rejoué à chaque navigation (commentaire de `src/app/admin/layout.tsx`) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (déjà installé) [VERIFIED: package.json] | Pages `/admin/pilotage*`, server actions | Stack du projet |
| React | 19.2.3 [VERIFIED: package.json] | Composants serveur | Stack du projet |
| @supabase/supabase-js | ^2.117.2 [VERIFIED: package.json] | Lectures RLS, `rpc()` via `callRpc` | Stack du projet |
| zod | version déjà installée [VERIFIED: usage dans `src/lib/admin/leadSchemas.ts`] | Validation des formulaires de coûts | Patron `costSchema` de l'entonnoir |
| Vitest | déjà installé [VERIFIED: vitest.config.ts] | Tests unitaires + `test:rls` | Stack du projet |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/documents/money.ts` (`toCents`, `formatEuros`) | interne | Saisie en euros vers centimes ; affichage (NBSP, pas d'`Intl` pour les montants) | Tous les montants du dashboard et du formulaire de coûts |
| `src/lib/documents/invoiceMath.ts` (`amountDueCents`, `billingSummary`) | interne | Reste dû après avoirs ; précédent pour « facturé = net − avoirs » | Facturé, reste dû, facture impayée |
| `src/lib/documents/invoiceStatus.ts` (`invoiceStatus`) | interne | Statut dérivé (`paid`, `processing`, `credited`, `refunded`, `to_pay`) | Choix des factures impayées pour la projection |
| `src/lib/documents/steps.ts` (`chainHeads`) | interne | Tête de chaîne de remplacement | Devis actif |
| `src/lib/server/rpc.ts` (`callRpc`) | interne | Wrapper `service_role` qui renvoie des codes `sv_*` | Insertion de coûts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG inline pour la courbe | recharts / chart.js | Ajoute une dépendance, du JS client et un risque de paquet douteux pour 6 points ; interdit de fait par la politique « admin sans cinéma/GSAP » |
| Agrégation TS | Vue SQL `security_invoker` | La vue serait mieux pour de gros volumes mais la règle « signé à date » (chaîne + faits révoqués + delta daté) et la déduction acompte sont beaucoup plus lisibles et testables en TS ; à reconsidérer seulement si le volume dépasse quelques milliers de factures |

**Installation:** aucune. `npm install` n'est pas requis.

**Version verification:** non applicable, aucun paquet ajouté.

## Package Legitimacy Audit

Aucun paquet externe n'est recommandé par cette phase. slopcheck non exécuté (rien à vérifier).

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Admin (navigateur)
   |  GET /admin/pilotage?periode=T&base=HT&tests=0
   v
page.tsx (RSC) --requireAdmin()--> client RLS (JWT admin, jamais service_role)
   |
   v
loader (server-only)  ---- lit en parallele ----+
   |   sv_invoices (+credits_invoice_id, is_test, due_date, net_to_pay, prepaid)
   |   sv_invoice_payment_events (invoice_id, kind, amount_cents, occurred_at)
   |   sv_project_documents (chaine replaces_document_id, issued_at) + sv_document_snapshots (totalCents)
   |   sv_project_facts (contract_signed, fact_revoked, occurred_at)
   |   sv_projects (lead_id, title, client_id) + sv_clients(is_test) + sv_leads (source_*)
   |   sv_recurring_costs / sv_project_costs / sv_cash_balances (NOUVEAU)
   v
Fonctions pures (aucune E/S, horloge injectee)
   pipeline() / signedAt() / invoiced() / collected() / expandRecurring()
   projectMargin() / cashProjection(6 mois) / signedBySource()
   |
   v
PilotageView  --> tuiles + tableaux + SVG tresorerie + liens drill-down (?detail=facture|paiement|devis&cle=...)

Saisie : /admin/pilotage/couts  --server action (requireAdmin + zod)--> callRpc(service_role) --> RPC SECURITY DEFINER --> INSERT only
         (UPDATE/DELETE/TRUNCATE refuses par deny_mutation, y compris service_role)
```

### Recommended Project Structure
```
supabase/migrations/20261009000000_sv_pilotage.sql   # 3 tables + RLS + deny_mutation + 3 RPC
src/lib/server/pilotage/            # dans la zone de prix autorisee (src/lib/server)
├── periods.ts                      # mois/trimestre/annee en dates Europe/Paris, horizon 6 mois
├── quotes.ts                       # devis actif, montant a une date, delta d'avenant
├── billing.ts                      # facture / encaisse / reste du / filtre tests
├── costs.ts                        # etat effectif des couts (revocation), depliage recurrent
├── forecast.ts                     # marge projet/globale, tresorerie 6 mois
├── attribution.ts                  # signe par source/campagne
├── load.ts                         # lectures RLS, une requete par table, colonnes explicites
├── adminCosts.ts                   # callRpc d'ecriture (server-only)
└── *.test.ts                       # Vitest colocalise
src/app/admin/pilotage/page.tsx           # tableau de bord
src/app/admin/pilotage/couts/page.tsx     # saisie
src/app/admin/pilotage/couts/actions.ts   # server actions (+ actions.test.ts)
src/components/admin/pilotage/            # tuiles, tableaux, TreasuryChart (SVG), formulaires
tests/rls/pilotage.rls.test.ts
```
Ne pas placer de code chiffré dans `src/lib/admin/` ni `src/lib/pilotage/` : ces chemins ne sont pas dans `PRICE_ALLOWED_ZONES` (`src/lib/priceScope.ts`). `src/lib/server`, `src/components/admin` et `src/app/admin` le sont. [VERIFIED: priceScope.ts]

### Pattern 1: Forme du devis et devis actif
**What:** Le devis actif d'un projet est la tête de chaîne des documents `doc_type='quote'` ; son total se lit dans `sv_document_snapshots.data`.
**Forme (QuoteSnapshot)** [VERIFIED: src/lib/documents/snapshot.ts]:
`{ schemaVersion:1, docType:'quote', reference, revision, issuedOn, lines:[{designation,quantity,unitPriceCents,totalCents}], totalCents, depositCents, balanceCents, depositPercent, validityDays, validUntil, leadTime, client, project, seller, templateVersion }`.
Il n'existe qu'un seul total : « Pas de TVA calculée (D-11) » dans `money.ts`. HT = TTC = `data.totalCents` tant que `vat_regime='franchise'`.
**Lecture:** `sv_document_snapshots` est lisible en `select` par `authenticated` avec la politique `is_admin()` ; `sv_project_documents` expose `id, project_id, doc_type, revision, replaces_document_id, issued_at` à `authenticated`. Lire tous les documents `quote` en une requête (`.eq('doc_type','quote')`), calculer les têtes par projet avec `chainHeads` projet par projet, puis lire les snapshots avec `.in('document_id', headIds)` (plus, pour le signé à date, les documents antérieurs à la date du fait).
```typescript
// Source: src/lib/server/documents/read.ts (loadActiveSnapshot) et src/lib/documents/steps.ts (chainHeads)
// Version batch : une requete pour tous les projets
const { data: docs } = await rls
  .from('sv_project_documents')
  .select('id, project_id, doc_type, revision, replaces_document_id, issued_at')
  .eq('doc_type', 'quote');
const { data: snaps } = await rls
  .from('sv_document_snapshots')
  .select('document_id, data')
  .in('document_id', docIds); // lire data->totalCents ; ne jamais faire confiance a un autre champ
```
Lire `data.totalCents` après garde de type (`Number.isSafeInteger`, `>= 0`) ; si `docType !== 'quote'` ou total invalide, exclure et signaler une anomalie visible (pas un zéro silencieux).

### Pattern 2: Signé à date (D-02)
**What:** `signedCents(project, asOf)` = total du devis actif à `asOf`, si un fait `contract_signed` effectif existe à `<= asOf`.
**Faits effectifs** [VERIFIED: sv_invoices.sql `has_effective_fact`, adminView.ts `effective`]: un fait est effectif s'il n'existe aucun `fact_revoked` avec `target_fact_id = f.id`. Date de signature = `occurred_at` du `contract_signed` effectif (le plus récent s'il y en a plusieurs après révocation puis re-signature). `sv_project_facts` est lisible par `authenticated` avec `occurred_at`.
**Algorithme (module pur):**
1. `t0` = `occurred_at` du `contract_signed` effectif ; absent => signé = 0 et le projet est « pipeline » s'il a un devis actif.
2. Signé de base = total du devis tête-de-chaîne dont `issued_at <= t0` (le dernier émis avant ou à la signature, et non « la tête actuelle »).
3. Delta d'avenant : pour chaque révision `r` émise après `t0`, `delta_r = total(r) - total(précédente)`, daté `issued_at(r)`. Signé à date `d` = base + somme des deltas avec `issued_at <= d`.
4. Signé total « maintenant » = total de la tête actuelle (si tête émise après `t0`) sinon base. Les deux sont égaux par construction (somme télescopique) : en faire un test.
**Cas limites à fixer dans les plans :**
- Devis remplacé avant signature : seul le dernier avant `t0` compte (les anciens n'ajoutent rien).
- Contrat signé sans devis actif (anomalie de données) : signé = 0, projet listé dans « anomalies » du drill-down.
- Fait `contract_signed` révoqué : le projet redevient pipeline.
- Important : `checkIssuable` refuse de remplacer un devis une fois `quote_accepted` posé (`signed_no_replace`), mais le remplacement reste possible entre `quote_accepted` absent et `contract_signed` ; ne pas supposer que l'avenant est impossible. La règle « pas de remplacement d'un document signé » est une garde TypeScript, non revérifiée dans la RPC (STATE.md, 13-REVIEW WR-08). [VERIFIED: steps.ts, STATE.md]
**Période:** le « CA signé de la période » = somme des signés dont `t0` tombe dans la période + deltas d'avenant datés dans la période. Cela rend le signé additif entre périodes.

### Pattern 3: Pipeline (D-01)
Pipeline = somme de `total(tête de chaîne)` pour les projets ayant un devis actif, **sans** `contract_signed` effectif. C'est un stock instantané (pas une activité de période) : l'afficher « à ce jour », en précisant que la sélection de période ne le filtre pas (ou le filtre par `issued_at` du devis si le propriétaire préfère ; choisir « à ce jour » et le dire dans l'UI). Un lead sans devis n'apparaît pas (aucune lecture de `sv_leads` pour le pipeline).

### Pattern 4: Facturé / encaissé (D-03)
[VERIFIED: sv_invoices.sql, sv_payments.sql, invoiceMath.ts, webhook.ts]
- **Facturé TTC (net)** = `Σ net_to_pay_cents` des lignes `kind <> 'credit_note'` − `Σ total_incl_tax_cents` des avoirs (`kind='credit_note'`). Raison : la facture finale reprend le total du devis et déduit l'acompte via `prepaid_cents` (`net_to_pay = total_incl − prepaid`) ; sommer `total_*` compterait l'acompte deux fois. C'est la formule de `billingSummary` (« le total de la finale inclut l'acompte déjà compté par la facture d'acompte »).
- **Date d'un avoir** : `issued_on` (Europe/Paris, calculé en SQL). Date d'une facture : `issued_on`. Utiliser `issued_on` (date) pour les périodes, jamais `issued_at` converti côté JS.
- **Facturé HT** : colonnes `total_excl_tax_cents`/`vat_total_cents`/`prepaid_cents`. En franchise HT = TTC. Pour une ligne `vat_regime='standard'` (aucune aujourd'hui), HT_net = `net_to_pay_cents` − part de TVA : décision à documenter dans le code (proposition : `round(net × excl/incl)`) et couverte par un test marqué « régime standard hypothétique ».
- **Séries de test** : exclure par défaut `is_test = true` (la CHECK impose `is_test = (series in ('TFA','TAV'))`). Filtre sur la colonne `is_test`, pas sur le préfixe de `number`. Un avoir hérite `is_test` de son origine.
- **Encaissé** : événements `kind='paid'`, `amount_cents` (TTC, = dû à l'instant du paiement, imposé par `sv_apply_stripe_event` sinon `anomaly`). Les anomalies (`duplicate_payment`, `amount_mismatch`…) sont stockées avec `kind='anomaly'`, donc **ne comptent pas** : à afficher en alerte de réconciliation, jamais dans l'encaissé. Date = `occurred_at` converti en date Europe/Paris côté serveur avec la même fonction que `parisDateOf` de `src/lib/documents/dates.ts`.
- **Remboursé** : le webhook `charge.refunded` écrit `kind='refunded'` avec `amount_cents = amount_refunded` du charge, valeur **cumulative**. Deux remboursements partiels sur le même charge donnent deux lignes aux montants croissants. Remboursé par facture = `max(amount_cents)` des lignes `refunded` de cette facture (résolue via `payment_intent_id`), et sa date = celle de la ligne qui porte ce maximum ; la variation par période = différence entre les maxima à la fin et au début de la période. `refund_requested` n'est pas un remboursement confirmé : exclure (D-03 dit « confirmés »).
- **Encaissé net** = Σ paid − Σ remboursé (par facture, borné à ≥ 0).
- Le journal est lisible par `authenticated` uniquement sur `id, invoice_id, kind, amount_cents, method, occurred_at` (suffisant). `livemode`, `client_id`, `payment_intent_id` ne sont pas accordés ; le filtre « tests » passe par la facture (`is_test`), pas par `livemode`. Les événements sans `invoice_id` (anomalies orphelines) ne sont pas lus par ce chemin ; si l'on veut les signaler, utiliser un `service_role` server-only strictement limité à un `count`, sinon s'en passer (recommandé : s'en passer).
- Avoir sur facture déjà payée sans remboursement demandé : l'encaissé reste inchangé, le facturé baisse. Cet écart est réel (argent à rendre ou avoir à imputer) ; l'afficher comme « avoirs non remboursés » dans le drill-down plutôt que de le masquer.

### Pattern 5: Source d'acquisition (ADM-05, D-11)
- Chemin : `sv_projects.lead_id -> sv_leads.id`. `lead_id` est nullable, FK `on delete restrict`. Les leads effacés (tombstone RGPD) gardent leur source et restent joignables. [VERIFIED: leads_core.sql, projects_engine.sql]
- Colonnes à utiliser : `source_source`, `source_medium`, `source_campaign` (et `source_kind in ('touch','direct','legacy')`). Elles sont figées par le trigger `protect_lead_source` et **ne se modifient que via `sv_correct_lead_source`** (motif 10-500 car., événement `source_corrected` + note). C'est donc la seule donnée qui reflète « corrigée par l'admin avec motif » ; `first_touch` jsonb n'est pas modifiable ni corrigé par cette RPC.
- **Divergence à trancher (Open Question 1)** : l'en-tête de `leads_core.sql` note « A3 source figée = dernier contact (last touch) à la création », et `ingest` passe `p_first_touch` et `p_last_touch` tandis que `v_touch := coalesce(p_last_touch, p_first_touch)` alimente `source_*`. D-11 écrit « premier contact ». L'entonnoir (`sv_funnel_v`) regroupe sur `source_source`/`source_campaign`. Recommandation prescriptive : **ventiler sur `source_source`/`source_campaign`**, pour la cohérence avec l'entonnoir et parce que c'est la seule valeur corrigeable, en nommant l'en-tête de colonne « Source figée du lead » et non « premier contact » tant que l'écart n'est pas confirmé.
- Lignes : regrouper par `(source_source, source_campaign ?? '')` ; ligne spéciale « Direct / hors lead » pour `lead_id` nul. Un lead `source_kind='direct'` a `source_source='direct'` : **ne pas le confondre** avec « hors lead » ; deux lignes distinctes, ou fusion explicite décidée dans le plan.
- Lecture : `sv_leads` en `select` admin (RLS `is_admin()`), colonnes explicites `id, source_source, source_medium, source_campaign, source_kind` uniquement, sans contacts ni e-mail (minimisation).
- Le CA signé par source = `signedCents` du projet (Pattern 2), pas le CA facturé. La somme des lignes de la ventilation doit être égale au signé total (test).

### Pattern 6: Tables de coûts en ajout seul (ADM-02)
Reprendre exactement le patron de `sv_invoices` / `sv_project_facts` [VERIFIED: migrations]. Chaque table : `create table if not exists public.sv_*`, `enable row level security`, `revoke all ... from anon, authenticated, service_role`, `grant select ... to authenticated` (+ `grant select to service_role`), politique `for select to authenticated using ((select sv_private.is_admin()))`, triggers `before update or delete ... for each row` et `before truncate ... for each statement` sur `sv_private.deny_mutation()`. **Aucun `grant insert`** : l'insertion passe par une RPC `public.sv_*` `security definer`, `set search_path = ''`, `revoke ... from public, anon, authenticated`, `grant execute ... to service_role`. Cette règle est imposée par `src/lib/migrationLint.test.ts` (règles 1 à 6 : RLS + revoke par table, `revoke` + `search_path` par fonction, vues `security_invoker`, pas d'écriture pour `anon/authenticated`, journaux `*_events` immuables). Ne pas utiliser `service_role` pour des `insert` directs (aucun grant).
Tous les FK sortants en `on delete restrict`, aucun vers `auth.users` (suppression d'un utilisateur de test jamais bloquée par un journal). `created_by uuid null` sans FK.

Schéma proposé (noms laissés à la discrétion du planificateur) :
```sql
-- Coûts récurrents : une ligne = une version d'une série ; modifier = nouvelle ligne même series_id
create table if not exists public.sv_recurring_costs (
  id bigint generated always as identity primary key,
  series_id uuid not null,                       -- identifie la charge ; génerée par la RPC pour une nouvelle série
  label text not null check (char_length(btrim(label)) between 1 and 120),
  category text not null check (category in ('sous_traitance','outils','hebergement','publicite','licences','autre')),
  amount_cents bigint not null check (amount_cents > 0),
  frequency text not null check (frequency in ('monthly','yearly')),
  starts_on date not null check (extract(day from starts_on) = 1 or true), -- voir pitfall 6 : jour libre pour l'annuel
  ends_on date null check (ends_on is null or ends_on >= starts_on),
  stopped boolean not null default false,        -- vrai = série arrêtée à partir de starts_on de cette version
  created_by uuid null,
  created_at timestamptz not null default now()
);
-- Coût par projet : une dépense réelle ; correction = ligne 'void' qui pointe la cible
create table if not exists public.sv_project_costs (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  incurred_on date not null,
  category text not null check (category in (...)),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),   -- TTC payé (D-07)
  vat_cents bigint null check (vat_cents is null or vat_cents >= 0),
  voids_cost_id bigint null references public.sv_project_costs (id) on delete restrict,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create unique index ... on public.sv_project_costs (voids_cost_id) where voids_cost_id is not null; -- une seule annulation par ligne
-- Solde de départ : réajustement = nouvelle ligne, la plus récente par id fait foi
create table if not exists public.sv_cash_balances (
  id bigint generated always as identity primary key,
  as_of date not null,
  amount_cents bigint not null,                  -- peut être négatif (découvert)
  note text null check (note is null or char_length(note) <= 200),
  created_by uuid null,
  created_at timestamptz not null default now()
);
```
Pour les récurrents sans UPDATE : la version applicable à un mois `m` est la ligne de la série ayant le plus grand `(starts_on, id)` avec `starts_on <= m` ; si `stopped` ou `ends_on < m`, la série est inactive ce mois. Pour une correction de coût par projet, une ligne `void` référence la cible (même schéma que `fact_revoked`) et la validation (cible existante, non déjà annulée, même projet, pas d'annulation d'annulation) vit dans la RPC.
**Validation en RPC** (comme `sv_upsert_acquisition_cost`) : refuser montant ≤ 0, libellé vide, catégorie hors liste, projet inexistant, date absurde (écart de plus de 10 ans) ; codes d'erreur `sv_*` avec `errcode = 'P0001'`, que `callRpc` convertit.

### Pattern 7: Dépliage mensuel et projection (ADM-04, D-08..D-10)
Module pur `expandRecurring(rows, fromMonth, toMonth) -> Map<'YYYY-MM', cents>` :
- Mensuel : chaque mois `m` de `max(starts_on, from)` à `min(ends_on, to)` ; annuel : le coût entier tombe le mois d'anniversaire de `starts_on` (vision trésorerie). Documenté comme hypothèse A2.
- Mois en clé de chaîne `YYYY-MM` et dates en `YYYY-MM-DD` Europe/Paris ; jamais d'objet `Date` locale dans les calculs de mois (le serveur Vercel est en UTC).
Projection de trésorerie sur 6 mois à partir du mois courant `M0` :
- Solde de départ = dernière ligne `sv_cash_balances` (max `id`). Mois `k` : `ouverture(k) = clôture(k-1)` ; `clôture = ouverture + entrées − sorties`.
- **Entrées futures** = factures `kind<>'credit_note'` non payées (`invoiceStatus` ≠ `paid`/`credited`/`refunded`), au montant `amountDueCents(net_to_pay, avoirs)`, au mois de `due_date`. Facture en retard (`due_date` < aujourd'hui Paris) => mois courant, marquée « en retard ». Facture `processing` (virement en cours) : compte encore à son échéance ; sa date d'attente est dans `pending` côté `adminView`, pas nécessaire ici.
- **Sorties** = coûts récurrents dépliés + coûts projet futurs (date `incurred_on` > aujourd'hui ; les coûts datés du passé sont des réalisés).
- Si le solde de départ a un `as_of` dans le passé, les flux réalisés entre `as_of` et aujourd'hui (paid − remboursé, coûts) sont ajoutés au solde courant avant la projection ; sans cela le solde dérive. Sans solde saisi : flux net cumulé depuis zéro et message explicite (D-09).
- « À facturer » (D-08) = `max(0, signé − facturé)` par projet, affiché hors courbe.
- Marge (D-10) : projet = `max(signé, facturé net)` − Σ coûts effectifs du projet ; globale = Σ marges projet − coûts récurrents de la période (dépliés). Marge réalisée = encaissé net − coûts payés (projet datés ≤ aujourd'hui + récurrents échus). Périodes : filtrer coûts projet par `incurred_on`, signé/facturé/encaissé par leurs dates, et afficher la règle sous le chiffre.

### Pattern 8: Page admin
[VERIFIED: src/app/admin/entonnoir/page.tsx, AdminNav.tsx, layout.tsx]
- `export const dynamic = 'force-dynamic'`, `metadata = { title: 'Pilotage' }` (le layout admin pose déjà `robots: noindex`), `const { supabase } = await requireAdmin()`, gabarit `ShellHeader variant="admin"` + `ShellMain width="admin"` + `<AdminNav current="pilotage" />` + `ShellFooter`. Formulaire `method="get"` avec radio `pt-seg` pour période/base/tests, comme l'entonnoir.
- `AdminNav` : ajouter `'pilotage'` au type `AdminNavItem` et `{ key:'pilotage', href:'/admin/pilotage', label:'Pilotage' }` dans `ITEMS` ; `/admin/pilotage/couts` utilise le même `current="pilotage"`.
- `src/lib/privateRoutes.ts` protège déjà le préfixe `/admin` ; aucune modification de route privée nécessaire. `priceScope` autorise `src/app/admin` et `src/components/admin`.
- Server actions : chaque action rappelle `requireAdmin()` (la garde de page ne la couvre pas), valide avec zod, appelle `callRpc`, puis `revalidatePath('/admin/pilotage')` et `/admin/pilotage/couts` (patron `saveCostAction`).
- Validation de `searchParams` : liste blanche (`periode in {mois,trimestre,annee}`, `base in {ht,ttc}`, `tests in {0,1}`, `detail`, `cle`) ; toute valeur inconnue retombe sur le défaut (patron `PAR` de l'entonnoir). Aucune valeur de `searchParams` n'est injectée dans une requête sans filtrage.
- Drill-down (D-12) : liens `?detail=facture&cle=<clé>` rendant, sous le tableau, la liste des factures/paiements/devis qui composent le chiffre, produite par **les mêmes fonctions** qui calculent le total (chaque fonction renvoie `{ totalCents, items[] }`, le total est `Σ items`). C'est la garantie structurelle de concordance. Paginer côté serveur (par exemple 50 lignes par page, paramètre `page`).
- Courbe : composant serveur `TreasuryChart` en `<svg role="img" aria-label=...>` avec un `<title>`/`<desc>`, plus un `<table>` équivalent visible ou `sr-only` (accessibilité, pas de dépendance à la couleur seule), couleurs depuis les tokens de `admin.css`/`portal.css`.
- Formats : montants avec `formatEuros` (NBSP, virgule) ; dates avec `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })` ; jamais d'`Intl` pour les montants (commentaire de `money.ts`).

### Anti-Patterns to Avoid
- **Sommer `total_incl_tax_cents` pour « facturé »** : double compte l'acompte (Pattern 4).
- **Sommer les lignes `refunded`** : montants cumulatifs (Pattern 4).
- **Utiliser `kind='anomaly'` comme encaissé** ou lire `livemode` : non accordé à `authenticated`, et le filtre test doit venir de `sv_invoices.is_test`.
- **Prendre la tête actuelle de chaîne comme signé** : fausse l'histoire quand un avenant suit la signature (Pattern 2).
- **Agrégat stocké, vue matérialisée ou colonne cache** : interdit par D-04.
- **`service_role` dans la page** : toutes les lectures du dashboard passent par le client RLS admin.
- **Flottants et `Intl` pour les montants** : centimes entiers, `Number.isSafeInteger`, `bigint` Postgres lu comme nombre (valeurs bien en dessous de 2^53 ; PostgREST renvoie les `bigint` en nombre JSON, convertir avec `Number()` puis valider).
- **Mettre le code chiffré dans `src/lib/admin` ou `src/lib/pilotage`** : hors des zones de prix autorisées.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tête de chaîne des devis | Nouvelle requête récursive | `chainHeads` (`src/lib/documents/steps.ts`) | Déjà testé, gère révisions et racines |
| Fait effectif | Nouvelle lecture des faits | Logique `effective()` (adminView.ts) / `has_effective_fact` SQL | Règle de révocation unique ; extraire en fonction partagée plutôt que de dupliquer |
| Reste dû / statut de facture | Recalcul ad hoc | `amountDueCents`, `invoiceStatus` | Source unique des statuts ; évite les écarts avec la page projet |
| Format monétaire | `toLocaleString` | `formatEuros`, `toCents` | U+202F illisible à l'extraction PDF/copie ; saisie « 12,5 » gérée |
| Écriture comptable | `insert` direct | RPC `security definer` + `deny_mutation` | Seule voie accordée, imposée par `migrationLint.test.ts` |
| Rôle admin | Métadonnées JWT | `requireAdmin()` + `sv_private.is_admin()` | Rôles en tables (FOUND-03) |
| Graphique | Bibliothèque de charts | SVG serveur de 6 points | Pas de dépendance, pas de JS client |
| Dates de mois Paris | `new Date()` + `getMonth()` | `parisDateOf` / dates ISO en chaîne (`src/lib/documents/dates.ts`) | Fuseau UTC du serveur |

**Key insight:** Le risque de cette phase n'est pas technique mais sémantique : chaque chiffre peut être « juste » et pourtant divergent des factures. La parade est structurelle (total = Σ des éléments du drill-down, test de concordance contre sommes brutes SQL).

## Runtime State Inventory

Non applicable : phase additive (nouvelles tables et pages), ni renommage ni migration de données existantes. Aucune donnée stockée, configuration de service, tâche OS, secret ou artefact de build n'est renommé. La migration n'est pas rétroactive : aucune ligne de coût n'existe avant la saisie.

## Common Pitfalls

### Pitfall 1: Acompte compté deux fois
**What goes wrong:** Facturé gonflé du montant de l'acompte dès l'émission de la facture finale.
**Why it happens:** `total_incl_tax_cents` d'une facture finale = total du devis ; l'acompte est déduit dans `prepaid_cents`/`net_to_pay_cents`.
**How to avoid:** Facturé et encaissé sur `net_to_pay_cents` (comme `billingSummary`).
**Warning signs:** Facturé > signé sur un projet entièrement facturé ; test de concordance rouge.

### Pitfall 2: Remboursements partiels sommés
**What goes wrong:** Encaissé net trop bas.
**Why it happens:** `charge.refunded` porte `amount_refunded` cumulatif ; chaque événement répète les remboursements précédents.
**How to avoid:** Par facture, `max(amount_cents)` des `refunded`, jamais la somme ; test avec deux événements (30 puis 50 => 50).
**Warning signs:** Remboursé supérieur au payé.

### Pitfall 3: Avenant mal daté
**What goes wrong:** Signé de la période faux ou non additif entre périodes.
**Why it happens:** Utiliser la tête actuelle de chaîne ou `issued_at` en UTC.
**How to avoid:** Pattern 2 (base à `t0` + deltas datés), dates en Europe/Paris.
**Warning signs:** Somme des signés mensuels ≠ signé annuel.

### Pitfall 4: Tests et clients de test dans les chiffres
**What goes wrong:** Le client permanent « Test E2E Sèvalys » fausse CA et marge.
**How to avoid:** Filtre `is_test` sur `sv_invoices` ; pour devis/signé/pipeline, filtrer via `sv_clients.is_test` du projet (le devis n'a pas de série). Appliquer le **même** filtre aux coûts de projets de test (coûts rattachés à un projet de test exclus par défaut). La bascule « inclure les tests » couvre tout le dashboard, pas seulement la facturation.
**Warning signs:** Pipeline non nul sans devis réel ; factures `TFA-` visibles par défaut.

### Pitfall 5: Retards et virements en cours
**What goes wrong:** Trésorerie optimiste ou factures « perdues » de la courbe.
**How to avoid:** Factures échues non payées placées au mois courant et marquées en retard ; `processing` = non payée ; `failed`/`expired` = non payée ; facture entièrement avoirée = 0. Facture sans `due_date` (cas impossible via RPC, `sv_invoice_due_missing`) : la placer au mois courant et l'afficher.

### Pitfall 6: Coûts annuels et jours de mois
**What goes wrong:** Coût annuel étalé ou dupliqué ; mois à 31 jours.
**How to avoid:** Annuel = un décaissement au mois d'anniversaire de `starts_on` ; ne comparer que des mois `YYYY-MM`, jamais des jours (un coût au 31 janvier tombe en février sans surprise). Ne pas imposer `starts_on` au 1er du mois en base ; stocker la date réelle, déplier par mois.

### Pitfall 7: Colonnes non accordées
**What goes wrong:** `select *` ou colonne hors grant => erreur « permission denied » en prod seulement.
**How to avoid:** Colonnes explicites. `sv_invoices` : liste des colonnes accordées à `authenticated` (voir migration). `sv_invoice_payment_events` : `id, invoice_id, kind, amount_cents, method, occurred_at` uniquement. `sv_project_facts` : sans `actor_id`. `sv_project_documents` : sans `storage_path`. Un test de grants de colonnes existe comme modèle (`src/lib/server/invoices/columnGrants.test.ts`) : en ajouter un pour le loader.

### Pitfall 8: Une lecture échouée prise pour zéro
**What goes wrong:** Un tableau de bord vide présenté comme « 0 € ».
**How to avoid:** Comme `DocumentsLoadError` / `InvoicesLoadError` : lever une erreur typée si une requête échoue, afficher un état d'erreur, jamais un total partiel.

### Pitfall 9: Limite de lignes PostgREST
**What goes wrong:** Troncature silencieuse à 1000 lignes par défaut.
**How to avoid:** Paginer le chargeur (`range`) ou borner explicitement et lever une erreur si le plafond est atteint ; très improbable ici mais invisible quand ça arrive.

### Pitfall 10: Statut du lead côté entonnoir vs signé
`sv_leads.signed_at` (entonnoir) n'est pas la source du CA signé : D-02 impose le fait `contract_signed`. Ne pas réutiliser `sv_funnel_v.signed` (c'est un compteur de leads) pour les euros.

## Code Examples

### Dépliage des coûts récurrents (forme du module pur)
```typescript
// Source : à écrire, patron src/lib/admin/funnel.ts (module pur, testable)
export type RecurringRow = {
  id: number; seriesId: string; amountCents: number; frequency: 'monthly' | 'yearly';
  startsOn: string; // 'YYYY-MM-DD'
  endsOn: string | null; stopped: boolean;
};
const ym = (d: string) => d.slice(0, 7);

export function effectiveVersionFor(rows: RecurringRow[], month: string): RecurringRow | null {
  // plus grand (startsOn, id) avec ym(startsOn) <= month
  let best: RecurringRow | null = null;
  for (const r of rows) {
    if (ym(r.startsOn) > month) continue;
    if (!best || r.startsOn > best.startsOn || (r.startsOn === best.startsOn && r.id > best.id)) best = r;
  }
  return best;
}
```

### RPC d'insertion en ajout seul
```sql
-- Source : patron public.sv_upsert_acquisition_cost et sv_record_checkout_session (migrations du dépôt)
create or replace function public.sv_add_project_cost(
  p_project_id uuid, p_incurred_on date, p_category text, p_label text,
  p_amount_cents bigint, p_vat_cents bigint, p_actor uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'sv_cost_amount_invalid' using errcode = 'P0001';
  end if;
  perform 1 from public.sv_projects where id = p_project_id;
  if not found then raise exception 'sv_project_not_found' using errcode = 'P0001'; end if;
  -- ... validation catégorie / libellé / date, puis insert ... returning id
  return jsonb_build_object('cost_id', 0);
end;
$$;
revoke all on function public.sv_add_project_cost(uuid, date, text, text, bigint, bigint, uuid) from public, anon, authenticated;
grant execute on function public.sv_add_project_cost(uuid, date, text, text, bigint, bigint, uuid) to service_role;
```

### Chargeur RLS avec erreur typée
```typescript
// Source : patron src/lib/server/invoices/adminView.ts (fonction read) 
async function read(run: () => PromiseLike<{ data: unknown; error: unknown }>) {
  const res = await run();
  if (res.error) throw new PilotageLoadError(); // jamais un total partiel
  return (res.data ?? []) as Record<string, unknown>[];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vue SQL d'agrégat (entonnoir) | Agrégation TS pure sur lignes sources pour les règles multi-étapes | Cette phase | Testable sans base ; la vue `sv_funnel_v` reste valable pour les compteurs |
| `UPSERT` sur coût manuel (`sv_acquisition_costs`) | Ajout seul + version/annulation | Politique v2.0 des tables comptables | Historique conservé ; ne pas imiter l'upsert de l'entonnoir |

**Deprecated/outdated:** néant (code du dépôt à jour au 2026-10-07).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Les colonnes `source_*` de `sv_leads` représentent le dernier contact à la création, alors que D-11 dit « premier contact » ; recommandation de ventiler sur `source_*` | Pattern 5 | Ventilation différente de l'intention du propriétaire ; à confirmer (Open Question 1) |
| A2 | Un coût annuel est un décaissement unique au mois d'anniversaire (vision trésorerie), y compris pour la marge de période | Pattern 7 | Marge mensuelle irrégulière ; alternative : étaler sur 12 mois pour la marge |
| A3 | Le pipeline est un stock « à ce jour » non filtré par la période | Pattern 3 | Le propriétaire peut attendre un pipeline par période d'émission du devis |
| A4 | HT d'une facture en régime `standard` = `round(net × excl/incl)` | Pattern 4 | Faux pour une facture finale avec acompte ; sans effet tant que tout est en franchise |
| A5 | Les événements `paid` orphelins (sans `invoice_id`) ne sont pas lus par le dashboard | Pattern 4 | Ils n'apparaissent pas dans l'encaissé de toute façon (kind `anomaly`), seulement non signalés |
| A6 | Catégories de coûts : sous_traitance, outils, hebergement, publicite, licences, autre | Pattern 6 | Libellés à valider avec le propriétaire (discrétion de Claude) |
| A7 | Le total `data.totalCents` des instantanés `quote` est présent et entier pour tous les devis émis (schemaVersion 1) | Pattern 1 | Un devis sans total valide fausserait pipeline/signé ; traité comme anomalie visible |

## Open Questions

1. **Source figée : dernier ou premier contact ?**
   - What we know: `sv_leads.source_*` = `coalesce(p_last_touch, p_first_touch)` à la création, corrigeable ; `first_touch` jsonb existe séparément et n'est pas corrigeable (protégé, pas dans `sv_correct_lead_source`). D-11 veut « premier contact, corrigée par l'admin ».
   - What's unclear: si le propriétaire entend par « source figée » la colonne `source_*` (quel que soit son nom dans la phase 11) ou strictement `first_touch`.
   - Recommendation: ventiler sur `source_*` (cohérent avec l'entonnoir et les corrections), libellé « Source figée du lead », et noter l'écart dans le plan ; ne pas ajouter de bascule (hors périmètre). À confirmer au `discuss`/revue.

2. **Pipeline et période**
   - What we know: D-01 définit le pipeline comme un stock de devis non signés.
   - What's unclear: filtrage éventuel par période.
   - Recommendation: « à ce jour », mentionné dans l'UI.

3. **Facture finale avec avoir et acompte**
   - What we know: l'avoir est plafonné au `total_incl_tax_cents` de l'origine, pas à son net.
   - What's unclear: comportement chiffré si un avoir dépasse `net_to_pay` d'une finale avec acompte.
   - Recommendation: borner par facture à `max(0, net − avoirs)` pour le « dû » et signaler l'excédent comme anomalie de réconciliation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | build, Vitest | ✓ (node_modules présent) | — | — |
| Branche Supabase de test (`SV_TEST_*` dans `.env.test.local`) | `npm run test:rls` | non vérifié (fichier gitignoré non lu) | — | Les tests unitaires purs couvrent l'essentiel ; la suite RLS exige une branche propriétaire-approuvée (patron 11-01, 15-08) |
| Projet Supabase partagé (prod) | Application de la migration | ✓ (migrations 11 à 16) | — | Appliquer d'abord sur branche, prod en fin de phase (patron « NOT applied to production until… ») |

**Missing dependencies with no fallback:** aucune connue.
**Missing dependencies with fallback:** branche RLS à (re)créer avec approbation du propriétaire si elle a été supprimée (STATE.md : la branche de la phase 11 devait être supprimée ; vérifier).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unitaires `vitest.config.ts`, RLS `vitest.rls.config.ts`) |
| Config file | `vitest.config.ts` (inclut `src/**/*.test.ts`, alias `server-only` vers un stub) ; `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, `SV_TEST_*`) |
| Quick run command | `npx vitest run src/lib/server/pilotage` |
| Full suite command | `npm test` (puis `npm run test:rls` sur branche) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-02 | Migration : 3 tables RLS + revoke + `deny_mutation`, RPC revoke/grant | unit (lint statique) | `npx vitest run src/lib/migrationLint.test.ts src/lib/pilotageMigration.test.ts` | ❌ Wave 0 (`pilotageMigration.test.ts`, patron `paymentsMigration.test.ts`) |
| ADM-02 | RPC refuse montant ≤ 0, projet inconnu, double annulation ; UPDATE/DELETE refusés même `service_role` ; non-admin ne lit rien | RLS integration | `npm run test:rls -- tests/rls/pilotage.rls.test.ts` | ❌ Wave 0 |
| ADM-02 | Action serveur : garde admin, validation zod, centimes | unit | `npx vitest run src/app/admin/pilotage/couts/actions.test.ts` | ❌ Wave 0 |
| ADM-03 | Devis actif, signé à date (avenant), pipeline, séries test exclues | unit | `npx vitest run src/lib/server/pilotage/quotes.test.ts` | ❌ Wave 0 |
| ADM-03 | Facturé = net − avoirs (acompte non doublé) ; encaissé = paid − refunded cumulatif | unit | `npx vitest run src/lib/server/pilotage/billing.test.ts` | ❌ Wave 0 |
| ADM-03 | Concordance : total dashboard = sommes brutes SQL sur factures/paiements (D-04) | RLS integration | `npm run test:rls -- tests/rls/pilotage.rls.test.ts` | ❌ Wave 0 |
| ADM-03 | Total = Σ éléments du drill-down | unit | `npx vitest run src/lib/server/pilotage/billing.test.ts` | ❌ Wave 0 |
| ADM-04 | Dépliage mensuel/annuel, versions, arrêt ; trésorerie 6 mois, retards, solde absent | unit | `npx vitest run src/lib/server/pilotage/forecast.test.ts src/lib/server/pilotage/costs.test.ts` | ❌ Wave 0 |
| ADM-04 | Marge projet/globale/réalisée | unit | `npx vitest run src/lib/server/pilotage/forecast.test.ts` | ❌ Wave 0 |
| ADM-05 | Ventilation par source/campagne ; « Direct / hors lead » ; Σ lignes = signé total ; correction de source reflétée | unit + RLS | `npx vitest run src/lib/server/pilotage/attribution.test.ts` | ❌ Wave 0 |
| UI | Page : garde admin, noindex, colonnes accordées du chargeur | unit | `npx vitest run src/lib/server/pilotage/load.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/server/pilotage`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` vert + `npm run test:rls` vert sur branche + `npm run build` avant `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/pilotage/*.test.ts` — fixtures chiffrées en centimes (devis avec avenant, finale avec acompte, avoir partiel, deux remboursements cumulatifs, facture de test)
- [ ] `src/lib/pilotageMigration.test.ts` — lint statique de la nouvelle migration (patron `invoicesMigration.test.ts`)
- [ ] `tests/rls/pilotage.rls.test.ts` — ajout seul, rôles, concordance (réutiliser `makeUser`, `svc()` de `tests/rls/helpers.ts`, client de test permanent)
- [ ] Test de colonnes accordées du chargeur (patron `columnGrants.test.ts`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | oui (hérité) | Session fraîche via `requireAdmin()` / `getVerifiedSession()` |
| V3 Session Management | oui (hérité) | Déjà couvert par la DAL ; rien de nouveau |
| V4 Access Control | **oui** | `requireAdmin()` dans chaque page ET action ; RLS `sv_private.is_admin()` sur les 3 tables ; aucun grant d'écriture ; rôles en tables |
| V5 Input Validation | **oui** | zod côté action + CHECK/validation en RPC ; liste blanche des `searchParams` ; centimes entiers sûrs |
| V6 Cryptography | non | Aucun secret ni chiffrement ajouté |

### Known Threat Patterns for Next.js + Supabase (données financières)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Lecture des montants par un client du portail | Information disclosure | Politiques admin-only sur les nouvelles tables ; snapshots déjà admin-only ; test RLS « client/anon ne lit rien » |
| Modification d'un coût passé | Tampering | Triggers `deny_mutation` (UPDATE/DELETE/TRUNCATE) y compris `service_role`, pas de grant d'`insert` |
| Écriture directe depuis le navigateur | Elevation of privilege | `revoke all` + RPC `service_role` uniquement ; action serveur gardée |
| Injection via `searchParams` / filtres | Tampering | Liste blanche, requêtes paramétrées du client Supabase, aucune concaténation SQL |
| Fuite de données personnelles dans le dashboard | Information disclosure | Lecture de `sv_leads` limitée aux colonnes de source (pas d'e-mail ni contact) ; pas de PII en logs (`callRpc` ne journalise que des codes `sv_*`) |
| Prix exposés au public | Information disclosure | Code uniquement sous `src/lib/server`, `src/components/admin`, `src/app/admin` (zones `priceScope`) ; route couverte par `/admin` dans `privateRoutes` |
| Chiffres falsifiés par des données de test | Repudiation/Integrity | Filtre `is_test` par défaut, bascule explicite affichée |

## Sources

### Primary (HIGH confidence) — code et migrations du dépôt lus dans cette session
- `supabase/migrations/20261007000000_sv_invoices.sql` — colonnes de `sv_invoices`, `net_to_pay`/`prepaid`, séries, avoirs, grants de colonnes, `has_effective_fact`
- `supabase/migrations/20261007010000_sv_payments.sql` — journal de paiements, kinds, grants de colonnes, anomalies
- `supabase/migrations/20261005000000_sv_documents.sql` — chaîne de remplacement, snapshots admin-only
- `supabase/migrations/20261003000000_sv_leads_core.sql`, `20261003010000_sv_consent_funnel.sql` — source figée, `sv_correct_lead_source`, `sv_funnel_v` (security_invoker), `sv_acquisition_costs`
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_projects.lead_id`, `sv_project_facts` (colonnes accordées, `occurred_at`)
- `src/lib/documents/{snapshot,money,invoiceMath,invoiceStatus,steps}.ts`, `src/lib/server/documents/read.ts`, `src/lib/server/invoices/adminView.ts`, `src/lib/server/stripe/webhook.ts` (`charge.refunded`), `src/lib/server/rpc.ts`, `src/lib/server/auth/dal.ts`, `src/lib/priceScope.ts`, `src/lib/migrationLint.test.ts`, `src/app/admin/entonnoir/*`, `src/components/admin/AdminNav.tsx`, `vitest*.config.ts`
- `.planning/phases/17-admin-forecast-dashboard/17-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence)
- Aucune source externe : phase sans nouvelle bibliothèque.

### Tertiary (LOW confidence)
- Néant.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — aucune dépendance nouvelle, tout est dans le dépôt
- Architecture: HIGH — patrons directement lus (tables append-only, RPC, page admin)
- Pitfalls: HIGH pour acompte/remboursement cumulatif/colonnes accordées (lus dans le code) ; MEDIUM pour la sémantique « source figée » (Open Question 1) et les conventions de période
- Données réelles : non vérifiées en base (aucun accès à la production ; les formes viennent des migrations et des tests)

**Research date:** 2026-10-07
**Valid until:** 2026-11-06 (stable, dépend uniquement du code interne ; revalider si les phases 15/16 sont modifiées)
