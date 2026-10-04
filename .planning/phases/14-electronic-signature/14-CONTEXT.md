# Phase 14: Electronic signature - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Le client signe en ligne (signature simple par code à usage unique) les devis, contrats et PV de recette émis en phase 13 ; chaque signature écrit une piste d'audit en ajout seul chaînée par hachage, produit un PDF scellé avec page certificat, et pose automatiquement le fait qui débloque l'étape suivante. Le PV de recette permet de valider chaque critère d'acceptation livré. Requirements : SIGN-01 à SIGN-05. Signature avancée / horodatage qualifié (SIGN-06), paiement (phase 15) et relances (phase 16) sont hors périmètre.

</domain>

<decisions>
## Implementation Decisions

### Parcours de signature (SIGN-01, SIGN-02)
- **D-01:** **Documents signables : devis, contrat, PV de recette.** Faits produits : `quote_accepted`, `contract_signed`, `acceptance_signed`. Le cahier des charges est lu mais non signé (ses critères sont repris par le PV).
- **D-02:** **Page de signature dédiée avec PDF intégré** (`/espace-client/…/signer`) : le PDF émis est affiché dans la page (iframe sur lien signé court, mêmes octets que ceux dont l'empreinte est signée), puis cases de consentement, puis envoi du code. Pas de lecture obligatoire jusqu'en bas.
- **D-03:** **Consentement explicite avant tout code** : signature électronique et clause de convention de preuve, cases non précochées affichant le texte exact ; le texte et sa version sont enregistrés dans la piste d'audit. La clause de convention de preuve est ajoutée aux modèles de contrat (et reprise dans la page de consentement) ; texte à faire relire (blocker juridique existant).
- **D-04:** **Le code à usage unique part vers l'e-mail de connexion du client** (adresse de la session authentifiée). Le signataire déclaré à l'onboarding doit correspondre à l'utilisateur connecté, sinon blocage avec message clair. Code haché en base, expire à 10 minutes, 5 essais maximum.
- **D-05:** **Après 5 essais ratés ou expiration** : le code est invalidé, le client peut en redemander un (délai de 60 s, 5 envois par heure et par document maximum). Chaque envoi, échec et expiration est journalisé dans la piste d'audit.
- **D-06:** **Sèvalys ne contre-signe pas.** L'émission par l'admin vaut engagement du vendeur ; seule la signature client est tracée. Le contrat le précise.

### Scellement du PDF (SIGN-04)
- **D-07:** **Nouveau fichier scellé = pages de l'original + page certificat.** L'original reste intact en écriture unique (empreinte phase 13). L'objet scellé est stocké à part, avec son propre SHA-256. La piste d'audit enregistre les deux empreintes. Aucun re-rendu depuis l'instantané (ne jamais régénérer un document signé).
- **D-08:** **Page certificat « preuve complète lisible »** : document, version du modèle, SHA-256 de l'original, signataire (nom, fonction, e-mail), date/heure Europe/Paris et UTC, IP, empreinte du dernier maillon de la piste, mention de signature simple et de convention de preuve. Pas d'user-agent détaillé ni de géolocalisation.
- **D-09:** **Stockage dans le bucket privé existant `sv-…`, écriture unique, chemin non devinable, jamais écrasé.** Le client télécharge le scellé par lien signé de quelques minutes avec vérification d'empreinte comme en phase 13 ; l'original reste accessible côté admin. Pas de pièce jointe e-mail.

### Piste d'audit et export (SIGN-03, SIGN-04)
- **D-10:** **Une chaîne de hachage par document.** Chaque maillon hache le précédent ; export et vérification indépendants par document, pas de contention globale.
- **D-11:** **Parcours complet journalisé** : ouverture/lecture du document, consentements (texte, version), code envoyé, échec, expiration, signature, scellement, téléchargement du scellé, et pour le PV les coches/réserves. Chaque maillon : horodatage serveur, IP, empreinte du document, version du modèle, acteur.
- **D-12:** **Ajout seul garanti en base** : triggers refusant UPDATE/DELETE/TRUNCATE y compris pour `service_role`, insertion par fonction SQL (RPC) qui calcule le hachage et verrouille la fin de chaîne par document (anti-fork), RLS client en lecture de ses propres maillons. Test RLS et test de falsification sur la branche Supabase dédiée.
- **D-13:** **Export admin en JSON vérifiable**, bouton dans la fiche document, plus un contrôle d'intégrité en base qui recalcule la chaîne et affiche OK/rompue. Un utilitaire (testé) vérifie l'export hors ligne. Pas de CSV ni PDF de la piste.

### PV de recette et déblocage (SIGN-05)
- **D-14:** **Le client coche chaque critère d'acceptation** (repris du cahier des charges émis) comme livré, ou signale une réserve, puis signe le PV complet (un PV par projet, D-09 phase 13). Coches et réserves sont conservées dans la piste et reproduites dans le PV scellé.
- **D-15:** **Réserve = signature possible avec réserves inscrites au PV scellé ; refus d'un critère = envoi du code bloqué**, l'admin est notifié et réémet un PV corrigé qui remplace l'ancien (D-03 phase 13).
- **D-16:** **Producteur automatique de faits** : la signature pose `quote_accepted` / `contract_signed` / `acceptance_signed` (auteur = signataire, motif = référence du document) en lien direct avec le scellement. Les gestes admin manuels existants restent possibles en correction journalisée (phase 12 D-09), l'UI signale qu'une signature existe. Un échec de scellement ne doit jamais laisser un fait posé sans scellé : le planificateur définit l'atomicité (DB + stockage).
- **D-17:** **Signé = gelé.** Un document signé ne peut plus être remplacé (action « Remplacer » désactivée) ; les avenants sont hors phase, les correctifs passent par un fait correctif admin journalisé.
- **D-18:** **E-mails après signature via le moteur de mails existant** (règles en code, clé d'unicité par document) : confirmation au client (lien portail, sans pièce jointe) et alerte à l'admin.

### Hérité des phases précédentes (rappel)
- **D-19:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public. Bucket privé préfixé `sv-` sans toucher aux politiques `storage.objects` de Gecko. Client de test permanent « Test E2E Sèvalys » à réutiliser pour les vérifications de bout en bout, sans le supprimer. Statuts de document déduits des faits (phase 13 D-14). Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables (signatures, maillons, codes), noms des types d'événements, format JSON de l'export, découpage des plans.
- Bibliothèque de manipulation PDF pour la page certificat (`pdf-lib` prévu par la recherche STACK) et mise en page de la page certificat.
- Longueur du code de signature et mécanisme d'envoi (moteur de mails existant ou envoi direct).
- Libellés français de la page de signature, du consentement (hors texte juridique à relire), des e-mails.
- Atomicité entre écriture en base, upload du scellé et pose du fait (D-16).
- Durée du lien signé court de l'iframe et détail du téléchargement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 14 — objectif et critères de succès
- `.planning/REQUIREMENTS.md` — SIGN-01 à SIGN-05 ; SIGN-06 (différé) ; DOC-01 à DOC-04 (consommés)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures »
- `.planning/STATE.md` — blockers : relecture juridique de la convention de preuve et du contrat avant production

### Phases précédentes
- `.planning/phases/13-document-generation/13-CONTEXT.md` — documents figés, empreintes, remplacement, statuts déduits des faits, lien signé, PV (D-09), visualiseur à reconsidérer (D-15)
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — faits en ajout seul, frise calculée, moteur de mails à règles en code, liens signés
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — journal immuable, patron d'ajout seul
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — rôles en tables, `service_role` server-only, suite RLS sur branche

### Recherche v2.0
- `.planning/research/STACK.md` § PDF generation — `pdf-lib` pour la phase 14, SHA-256 via `node:crypto`
- `.planning/research/PITFALLS.md` — document non figé (ne jamais regénérer un document signé), preuve de signature
- `.planning/research/SUMMARY.md` — cycle de vie des documents, onglet documents

### Code existant (à vérifier avant planification)
- `supabase/migrations/20261004000000_sv_projects_engine.sql` — `sv_project_facts` (types de faits dont `quote_accepted`, `contract_signed`, `acceptance_signed`), `sv_mail_outbox` (liste fermée d'événements à étendre)
- `src/lib/server/projects/facts.ts`, `read.ts`, `access.ts` — faits et lecture projet
- `src/lib/server/mail/rules.ts`, `outbox.ts` — moteur de mails
- `src/lib/server/projects/onboarding.ts` — signataire et données client
- Code de la phase 13 (documents, instantanés, onglet Documents du portail, section Documents admin) — voir `.planning/phases/13-document-generation/13-*-SUMMARY.md` et `13-PATTERNS.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sv_project_facts` et calcul de l'étape : la signature devient producteur automatique des faits existants.
- Documents figés de la phase 13 (octets en écriture unique, SHA-256, version de modèle, instantané JSON) : base de l'empreinte signée et de la page certificat.
- Lien signé à la demande du bucket `sv-…` : téléchargement et iframe de lecture.
- Moteur de mails (`dedupe_key` unique) : e-mails de confirmation/alerte et, éventuellement, du code.
- Patron d'ajout seul (triggers `deny_mutation`) des phases 11-12 : piste d'audit.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans le même fichier, tables `sv_*`, tests Vitest colocalisés, suite RLS sur branche dédiée.
- `service_role` confiné aux modules `server-only`.

### Integration Points
- Onglet Documents du portail (statut « À signer » → page de signature) et fiche document admin (export piste, contrôle d'intégrité, « Remplacer » désactivé si signé).
- Extension de la liste fermée d'événements/modèles de `sv_mail_outbox`.
- Ajout d'une clause de convention de preuve au modèle de contrat (nouvelle version de modèle).

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Un utilitaire de vérification hors ligne de l'export de piste est attendu (testé).

</specifics>

<deferred>
## Deferred Ideas

- Horodatage qualifié RFC 3161 et signature avancée via un tiers (SIGN-06, v2 future)
- Avenants sur documents signés (hors phase 14)
- Export CSV / PDF de la piste d'audit
- Contre-signature électronique du vendeur
- Texte de la convention de preuve, conservation et RGPD de la piste : à traiter à la relecture juridique

</deferred>

---

*Phase: 14-Electronic signature*
*Context gathered: 2026-10-04*
