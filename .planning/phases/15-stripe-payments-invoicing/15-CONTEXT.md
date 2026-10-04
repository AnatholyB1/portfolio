# Phase 15: Stripe payments & invoicing - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Le client paie en ligne (Stripe Checkout hébergé) l'acompte puis les factures de période et le solde ; l'état « payé » vient uniquement d'un webhook Stripe vérifié et idempotent ; les factures sont légales (numérotation sans trou, immuables une fois émises, corrigées par avoir) et stockées en données structurées prêtes pour Factur-X. Le paiement de l'acompte débloque l'étape suivante. Requirements : PAY-01 à PAY-05. Facturation récurrente automatique (PAY-06), plateforme agréée / Factur-X émis (PAY-07), relances complètes et désinscription (phase 16), dashboard (phase 17) sont hors périmètre.

</domain>

<decisions>
## Implementation Decisions

### Stripe : mode et moyens de paiement (PAY-01, PAY-02)
- **D-01:** **Mode test partout sauf production réelle.** Previews, tests et client de test permanent « Test E2E Sèvalys » utilisent les clés de test ; les clés live ne servent qu'en production pour de vrais clients. Garde-fou d'assertion du mode de clé au démarrage (patron de l'assertion Supabase de la phase 10). Aucun paiement live sur le client de test. **Précision de mise en œuvre (recherche, à valider à la relecture) :** le client de test vit dans la base de production, donc un seul jeu de clés par environnement ne suffit pas ; le mode est porté par un drapeau « test » par client, la production détient les deux jeux de clés et deux points de webhook, et les factures de test utilisent des séries séparées `TFA-` / `TAV-` pour ne jamais consommer un numéro `FA-` réel.
- **D-02:** **Moyens de paiement : carte + virement Stripe** (IBAN virtuel par client, rapprochement automatique, frais vérifiés par la recherche : 0,5 % plafonné à 5 € par paiement, plus 0,50 € par remboursement, 1 à 3 jours). Pas de prélèvement SEPA (contestable 8 semaines).
- **D-03:** **Pas de virement hors Stripe.** Tout paiement passe par Checkout ; l'IBAN de la constante vendeur n'apparaît que sur la facture. PAY-02 est strict : « payé » ne vient que du webhook vérifié (corps brut, signature) et idempotent (table d'événements Stripe, clé d'unicité sur l'identifiant d'événement).
- **D-04:** **Paiement en attente (virement) = statut « paiement en cours ».** Rien ne se débloque tant que Stripe n'a pas confirmé par webhook final ; le client et l'admin voient l'attente. Les écarts de montant du virement (trop ou trop peu) sont à traiter par l'admin : le planificateur prévoit une vue admin minimale pour les cas non rapprochés.
- **D-05:** **Montants calculés côté serveur uniquement**, en centimes entiers, à partir du devis émis (pourcentage d'acompte) et des factures émises ; le client ne transmet jamais de montant.

### Échéancier : acompte, factures de période, solde (PAY-01, PAY-03)
- **D-06:** **Acompte + factures de période en TJM + facture finale.** Le propriétaire chiffre en TJM : après l'acompte, facturation mensuelle ou par sprint de deux semaines selon le projet. Pas de calendrier d'échéances prédéfini au devis.
- **D-07:** **Acompte :** le bouton « Payer l'acompte » apparaît dès le contrat signé (fait `contract_signed` posé par la phase 14). La demande d'acompte (facture d'acompte numérotée + e-mail via le moteur de mails) part automatiquement à ce fait. Le montant est le pourcentage d'acompte du devis émis appliqué au total.
- **D-08:** **Factures de période émises par l'admin, à la demande :** lignes libres (jours × TJM, période couverte), totaux calculés côté serveur, aperçu puis « Émettre » comme en phase 13 ; le client la paie via Checkout. Marche pour un rythme mensuel ou par sprint. Elles ne posent aucun fait d'étape (seuls l'acompte et le solde final font avancer la frise).
- **D-09:** **Facture finale automatique après le PV de recette signé** (`acceptance_signed`) : solde du reliquat en **déduisant l'acompte**, avec une ligne de déduction explicite ; bouton « Payer le solde ». Le paiement pose `balance_received`. **Précision :** la facture finale ne facture que le travail non encore facturé par les factures de période (pas de double facturation) et ne déduit que l'acompte ; les factures de période déjà émises ne sont pas déduites du total du devis.
- **D-10:** **Déblocage :** le paiement confirmé de l'acompte pose `deposit_received` (auteur = webhook, motif = référence de la facture), ce qui fait passer à l'étape 4 (Production). Le solde pose `balance_received`. Les gestes admin manuels existants restent possibles en correction journalisée (phase 12 D-09), l'UI signale qu'un paiement Stripe existe.

### Facture légale (PAY-04, PAY-05)
- **D-11:** **Numérotation `FA-AAAA-0001`**, séquence unique remise à zéro chaque année, sans trou. **Avoirs en séquence propre `AV-AAAA-0001`.** Attribution atomique en base (fonction SQL avec verrou), jamais côté application seule ; test de non-trou et de concurrence.
- **D-12:** **Facture d'acompte émise à la demande d'acompte, avant paiement.** Le numéro est attribué à l'émission ; le statut « payé » vient du webhook. Une facture jamais payée se corrige par avoir, pas par suppression.
- **D-13:** **Immuabilité :** une facture émise ne se modifie ni ne se supprime (triggers refusant UPDATE/DELETE y compris pour `service_role`, patron des phases 11-14) ; octets PDF en écriture unique avec SHA-256, comme les documents de la phase 13. Réutiliser le modèle PDF de facture et le test des mentions (DOC-04), qui passent de l'aperçu à l'émission réelle.
- **D-14:** **Correction par avoir** admin (total ou partiel, motif obligatoire), émis comme document numéroté lié à la facture d'origine. Une case optionnelle déclenche aussi le remboursement Stripe, confirmé par webhook ; sans la case, l'app n'appelle pas l'API de remboursement.
- **D-15:** **Données de facture structurées** (PAY-05) : tables d'en-tête et de lignes en centimes (vendeur, acheteur, régime de TVA, mentions, références de commande/devis, période, déduction d'acompte) suffisantes pour produire plus tard un Factur-X ; aucun Factur-X émis en phase 15 (PAY-07). Le régime reste la franchise en base art. 293 B (phase 13 D-11), HT = TTC, avec champ de régime conservé pour une évolution.

### Reçu, relances, déblocage (PAY-03)
- **D-16:** **Reçu = e-mail Sèvalys + facture acquittée dans le portail** via le moteur de mails existant (règle en code, clé d'unicité par facture et événement). La facture passe « payée » par déduction du fait/paiement, sans nouveau PDF ni reçu Stripe natif en double.
- **D-17:** **Relances d'acompte impayé : J+3 puis J+7, alerte admin à J+14**, via `send_after` et le cron quotidien existant (aucune fréquence plus fine que quotidienne tant que le plan Vercel n'est pas confirmé). La phase 16 (MAIL-03) reprend et généralise l'automatisation ; ne pas dupliquer son périmètre.

### Hérité des phases précédentes (rappel)
- **D-18:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes `priceScope`). Statuts de document déduits des faits (phase 13 D-14). Client de test permanent « Test E2E Sèvalys » réutilisé, sans le supprimer. Fuseau `Europe/Paris`, formats `fr-FR`. Un document signé est gelé ; ne jamais régénérer un PDF émis.

### Claude's Discretion
- Structure exacte des tables (factures, lignes, paiements, événements Stripe, séquences), noms des types et des événements de mail, découpage des plans.
- Détail du Checkout (session par facture, expiration, URL de retour, métadonnées pour le rapprochement), gestion des événements Stripe utiles (session complétée, paiement asynchrone réussi/échoué, remboursement).
- Atomicité entre émission, PDF stocké, session Checkout et fait posé ; reprise après échec partiel.
- Libellés français du portail (onglet Paiements activé), de l'admin, des e-mails.
- Vue admin minimale pour paiements en attente ou non rapprochés.
- Bibliothèque Stripe et version d'API, mise en place du webhook et du secret.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 15 — objectif et 5 critères de succès
- `.planning/REQUIREMENTS.md` — PAY-01 à PAY-05 ; PAY-06/PAY-07 (différés) ; DOC-01 à DOC-04 (consommés)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures » (test/live Stripe tranché ici)
- `.planning/STATE.md` — blockers : relecture comptable (mentions de facture, franchise art. 293 B, e-facturation 2027, numéro de TVA), plan Vercel (cron quotidien)

### Phases précédentes
- `.planning/phases/14-electronic-signature/14-CONTEXT.md` — signature, faits automatiques (`contract_signed`, `acceptance_signed`), piste d'audit en ajout seul, document signé gelé
- `.planning/phases/13-document-generation/13-CONTEXT.md` — modèles PDF, facture en aperçu (D-10), franchise en base (D-11), identité vendeur (D-12), test des mentions (D-13), statuts déduits des faits (D-14)
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — faits en ajout seul, frise calculée, moteur de mails à règles en code, cron quotidien
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — journal immuable, patron d'ajout seul
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — rôles en tables, `service_role` server-only, suite RLS sur branche

### Recherche v2.0
- `.planning/research/STACK.md`, `PITFALLS.md`, `SUMMARY.md` — Stripe Checkout hébergé, webhook idempotent sur corps brut, légalité des factures, e-facture (calendrier PA, Factur-X)

### Code existant (à vérifier avant planification)
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_project_facts` (types dont `deposit_received`, `balance_received`), `sv_mail_outbox` (liste fermée d'événements à étendre)
- `supabase/migrations/20261005000000_sv_documents.sql`, `20261006000000_sv_signature.sql` — documents figés, signature
- `src/lib/documents/` (money, schemas, snapshot, legalMentions, status, fixtures) et `src/lib/server/documents/` (issue, prepare, render, download, read, adminView) — émission, instantané, empreinte, modèle de facture en aperçu
- `src/lib/server/signature/` — producteur des faits `contract_signed` / `acceptance_signed`
- `src/lib/server/projects/facts.ts`, `read.ts`, `access.ts` — faits et accès projet
- `src/lib/server/mail/rules.ts`, `outbox.ts` — moteur de mails
- `src/lib/privateRoutes.ts`, `src/proxy.ts` — routes privées (webhook Stripe public à exempter de l'authentification)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Chaîne d'émission de document figé (phase 13) : PDF rendu, SHA-256, instantané JSON, stockage en écriture unique, remplacement ; à étendre pour les factures numérotées et les avoirs.
- Modèle PDF de facture et test des mentions légales déjà écrits (aperçu seulement) : passent à l'émission réelle.
- Faits `deposit_received` / `balance_received` déjà dans la liste fermée ; statut « payé » déduit des faits.
- Moteur de mails à règles en code avec `dedupe_key` et `send_after` : e-mails de demande, reçu, relances J+3/J+7/J+14.
- Producteurs de faits automatiques de la phase 14 : déclencheurs de la facture d'acompte et de la facture finale.
- Patron d'ajout seul (triggers `deny_mutation`) : factures, paiements, événements Stripe.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans le même fichier, tables `sv_*`, tests Vitest colocalisés, suite RLS sur branche dédiée.
- `service_role` confiné aux modules `server-only` ; actions serveur admin avec tests.
- Gardes `priceScope` : prix autorisés dans portail, admin, modèles.

### Integration Points
- Onglet « Paiements » du portail (désactivé « bientôt » dans la navigation squelette) et section Facturation de la fiche projet admin.
- Route webhook Stripe publique (corps brut, vérification de signature) à exclure de la garde d'authentification du proxy.
- Extension de la liste fermée d'événements et modèles de `sv_mail_outbox`.
- Variables d'environnement Stripe (clé secrète, secret de webhook, assertion du mode).

</code_context>

<specifics>
## Specific Ideas

- Le propriétaire facture en TJM : rapports et facturation mensuels, éventuellement sprints de deux semaines ; l'acompte est déduit de la dernière facture.
- Les écarts de virement sont l'effet de bord accepté du choix du virement Stripe.

</specifics>

<deferred>
## Deferred Ideas

- Facturation récurrente automatique (maintenance, périodes TJM générées seules) — PAY-06
- Connexion à une plateforme agréée et émission Factur-X — PAY-07
- Prélèvement SEPA — écarté (contestable 8 semaines)
- Calendrier d'échéances prédéfini au devis — écarté (mal adapté au TJM)
- Virement hors Stripe avec fait admin — écarté (PAY-02 strict)
- Relances généralisées, rebonds, désinscription — phase 16
- Dashboard CA facturé/encaissé — phase 17

</deferred>

---

*Phase: 15-Stripe payments & invoicing*
*Context gathered: 2026-10-04*
