# Phase 11: Lead attribution, pipeline & consent - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Chaque prospect arrive avec sa source tracée et figée côté serveur ; l'admin pilote le pipeline et l'entonnoir par source ; rien n'est mesuré (ni balise publicitaire, ni identifiant de clic, ni cookie PostHog) avant consentement. Livre : tables `sv_leads` / `sv_lead_contacts` / `lead_events` immuable, capture d'attribution par `proxy.ts`, branchement du simulateur et du formulaire de contact sans changer l'ordre des protections anti-spam, migration des `prospects` et purge réécrite, liste/pipeline/entonnoir admin, bandeau de consentement avec journal. Requirements : LEAD-01 à LEAD-09.

</domain>

<decisions>
## Implementation Decisions

### Bandeau de consentement et PostHog
- **D-01:** Avant accord, PostHog tourne **sans cookie ni localStorage** (persistance en mémoire, autocapture désactivée) ; après « Accepter » il passe en persistance complète. Après « Refuser » il reste en mode mémoire. Ce choix est un compromis assumé : la position CNIL sur la mesure d'audience sans cookie est à vérifier par la recherche (voir « Points à vérifier »).
- **D-02:** Le bandeau est une **modale centrée bloquante** : le visiteur doit choisir avant de naviguer. « Accepter » et « Refuser » ont la même taille et le même style (égalité stricte, LEAD-09). Tokens du design system, avec focus piégé et accessible au clavier.
- **D-03:** Le choix est mémorisé **13 mois** (cookie de choix). Un lien « Gérer les cookies » en pied de page rouvre la modale à tout moment.
- **D-04:** Chaque choix est journalisé (date, choix, version du texte, identifiant anonyme aléatoire porté par le cookie de choix, IP hachée comme `ip_hash` existant) via route serveur. **À la soumission d'un formulaire, le dernier choix est rattaché au lead** (preuve plus solide).
- **D-05:** Aucune balise publicitaire ni identifiant de clic (gclid, fbclid, ttclid) n'est chargé ou stocké avant accord (LEAD-01, LEAD-09).

### Capture de la source
- **D-06:** `proxy.ts` lit les paramètres à l'arrivée et pose un **cookie first-party `sv_attr`** (httpOnly, 30 jours) ; la route serveur le relit à la soumission. Aucun transport par le payload client (falsifiable, perdu à la fermeture d'onglet).
- **D-07:** **UTM seuls et référent avant accord**, au titre de donnée de fonctionnement du lead écrite côté serveur ; les identifiants de clic ne sont ajoutés qu'avec consentement. Tension à noter : D-02 impose le choix avant navigation, mais l'attribution doit rester correcte si le visiteur arrive, choisit, puis soumet.
- **D-08:** Premier contact = **écriture unique** (jamais écrasé). Dernier contact = remplacé à **chaque arrivée avec UTM ou référent externe** (ni direct, ni navigation interne), organique compris.
- **D-09:** Validation par **liste blanche** : `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`, `ttclid` ; longueur max 200 caractères ; normalisation en minuscules ; toute autre clé rejetée. Prépare la convention UTM de la phase 19.
  - *Note (révision des plans, 2026-10-02) :* les identifiants de clic (`gclid`, `fbclid`, `ttclid`) sont sensibles à la casse ; ils ne sont **pas** mis en minuscules, seuls les `utm_*` le sont. Écart délibéré et documenté par rapport à la lettre de D-09 (plan 11-02) : les mettre en minuscules casserait le rapprochement des conversions publicitaires (phase 19).
- **D-10:** Page d'atterrissage et référent sont stockés avec chaque jeu (premier / dernier contact).

### Leads, doublons, effacement
- **D-11:** Modèle : **`sv_leads`** (un par prospect : source figée, statut, jeu premier/dernier contact) + **`sv_lead_contacts`** (un par soumission : réponses du simulateur ou message du formulaire). `lead_events` (journal immuable, append-only) référence le lead.
- **D-12:** Doublon = **même e-mail ou même téléphone normalisés dans les 9 mois** : un contact s'ajoute au lead existant, la source du lead ne change pas, le dernier contact est mis à jour, et l'événement garde la source de cette arrivée. **Une notification admin « lead revenu »** est émise (badge dans la liste et/ou e-mail — format laissé à Claude).
- **D-13:** Après 9 mois, le même prospect crée un **nouveau lead lié à l'ancien** (lien « lead précédent », nouvelle source figée, ancien lead conservé pour l'historique).
- **D-14:** Correction de source : admin seulement, **motif obligatoire**, journalisée dans `lead_events` (LEAD-02).
- **D-15:** Effacement RGPD par **tombstone** : les données personnelles sont masquées ou supprimées (table PII séparée effaçable ou champs remplacés), les `lead_events` et la source restent sans identité, de sorte que l'entonnoir reste juste. Action admin avec motif. Les `lead_events` ne sont ni modifiables ni supprimables (LEAD-03).
- **D-16:** Les `prospects` existants sont migrés ; la purge de 12 mois est réécrite pour épargner les clients convertis et les données comptables (LEAD-06). Table de rétention unique à fixer (blocker STATE.md : purge prospects 12 mois, dédoublonnage 9 mois, factures 10 ans, effacement).
- **D-17:** Le simulateur et le formulaire de contact alimentent le pipeline **sans modifier l'ordre actuel des protections anti-spam** (LEAD-05). Le formulaire de contact n'a pas de téléphone : le doublon se fait alors sur l'e-mail seul.

### Pipeline et entonnoir admin
- **D-18:** Statuts, dans l'ordre : **Nouveau → Qualifié → RDV → Devis envoyé → Signé**, plus **Perdu**. « Devis envoyé » ne s'active réellement qu'avec la phase 13 ; le statut existe dès maintenant et se pose à la main.
- **D-19:** Vue admin = **tableau filtrable** (statut, source) avec **pastille de statut modifiable en un geste** ; pas de kanban. Marquer « Perdu » demande un **motif choisi dans une liste fermée** avec champ note optionnel (ex. Hors budget, A choisi un concurrent, Sans réponse, Hors cible, Projet abandonné, Autre).
- **D-20:** Entonnoir par **source + campagne + mois** : visites → simulations → leads → qualifiés → RDV → signés. Les **visites** sont des arrivées avec source enregistrées côté serveur dans une table de visites sans identifiant personnel. Le **coût par RDV** est saisi à la main par source/campagne/mois (LEAD-08).
- **D-21 (hérité des phases précédentes):** admin en français uniquement, `/admin` noindex, RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, vues en `security_invoker`.

### Claude's Discretion
- Structure exacte des tables et colonnes, noms de fonctions SQL, découpage des plans.
- Format de la notification « lead revenu » (badge, e-mail ou les deux).
- Texte exact du bandeau et de la politique (à faire relire), taille de l'identifiant anonyme.
- Hachage chaîné ou simple du journal `lead_events` (la recherche proposait « hash-chained » ; seule l'immuabilité est exigée par LEAD-03).
- Liste exacte des motifs de perte, au-delà des exemples ci-dessus.

### Points à vérifier par la recherche
- CNIL : mesure d'audience sans cookie avant consentement (D-01) et exemption éventuelle ; UTM avant consentement (D-07) ; le texte de consentement du simulateur couvre-t-il des e-mails de relance ?
- Compatibilité d'une modale bloquante (D-02) avec le Core Value « moins de 60 secondes », le LCP et l'accessibilité.
- Comportement de `posthog-js` en mode mémoire (`persistence: 'memory'`) et bascule après consentement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 11 — objectif et 5 critères de succès
- `.planning/REQUIREMENTS.md` — LEAD-01 à LEAD-09 ; ADS-01/02 (phase 19, convention UTM et `event_id`) pour ne pas bloquer la suite
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures » (client « Test E2E Sèvalys », admin `contact@sevalys.com`)
- `.planning/STATE.md` — blocker « table de rétention unique » à fixer en phase 11
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — décisions héritées (rôles en tables, admin FR, RLS, tests sur branche)

### Recherche v2.0
- `.planning/research/SUMMARY.md` § Phase 2 (attribution, consentement), pitfalls 1 et 5 — `sv_leads`, `sv_lead_events`, dédoublonnage 9 mois, consentement CNIL
- `.planning/research/ARCHITECTURE.md` — `proxy.ts` mince, cookie d'attribution
- `.planning/research/PITFALLS.md` — premier contact écrasé, effacement vs journal immuable, balises avant consentement
- `.planning/research/FEATURES.md`, `.planning/research/STACK.md` — capture UTM first-party en TypeScript

### Code existant
- `supabase/migrations/20260920000000_create_prospects_table.sql` — table `prospects`, RLS fermée, purge pg_cron 12 mois à réécrire
- `supabase/migrations/20260921010000_prospects_explicit_deny.sql` — dernier état de la politique `prospects` (cf. commit 47dd9fe)
- `src/lib/prospects-schema.ts`, `src/lib/simulateur/submit.ts`, `src/app/api/simulateur/route.ts` — chemin de capture actuel et ordre des protections anti-spam
- `src/app/api/contact/route.ts` — envoie seulement des e-mails Resend, n'écrit dans aucune table
- `src/components/analytics/PostHogProvider.tsx` — init actuel sans consentement (`persistence: 'localStorage+cookie'`, autocapture), coupure sur routes privées
- `src/lib/privateRoutes.ts` — routes privées, à garder cohérent avec le proxy
- `src/app/mentions-legales/page.tsx` — mentionne déjà cookies/consentement, à aligner avec le bandeau

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PostHogProvider.tsx` : point unique d'init PostHog, déjà route-aware ; à rendre dépendant du consentement.
- `prospects-schema.ts` + `submit.ts` : validation et soumission du simulateur, avec tests (`submit.test.ts`, `route.test.ts`).
- `createServiceRoleClient()` dans `src/lib/supabase.ts` et `src/lib/server/auth/dal.ts` : accès serveur aux tables `sv_*`.
- Suite RLS sur branche Supabase (phase 10) : à étendre pour `sv_leads`, `sv_lead_contacts`, `lead_events`.

### Established Patterns
- Next.js 16 : `proxy.ts` (pas `middleware.ts`), déjà présent depuis la phase 10 ; le cookie `sv_attr` s'y ajoute sans casser le gate portail/admin.
- Tests Vitest colocalisés ; gardes qui encodent la politique (aucun prix, CTA, liens).
- Migrations dans `supabase/migrations/` avec RLS activée dans le même fichier.

### Integration Points
- `/api/simulateur` et `/api/contact` : création de lead + contact, après les protections anti-spam existantes.
- `layout.tsx` : montage de la modale de consentement et du lien « Gérer les cookies » dans le pied de page.
- `/admin` : nouvelles pages liste leads, pipeline, entonnoir.
- Table `prospects` : migration puis purge pg_cron réécrite.

</code_context>

<specifics>
## Specific Ideas

- Modèle de référence : spec Notion « Back office leads Grand Ouest Habitat » (cité dans PROJECT.md).
- Notification « lead revenu » : un lead qui revient dans les 9 mois doit se voir dans l'admin sans fouiller le journal.

</specifics>

<deferred>
## Deferred Ideas

- Envoi serveur des conversions Meta CAPI / Google et audiences de relance (ADS-04, ADS-05) — v2 après la phase 19.
- Kanban du pipeline — non retenu pour la phase 11, à reconsidérer si le volume de leads le justifie.
- Convention UTM documentée et taxonomie d'événements avec `event_id` — phase 19 (la liste blanche de D-09 la prépare).

</deferred>

---

*Phase: 11-Lead attribution, pipeline & consent*
*Context gathered: 2026-10-02*
