# Phase 19: Ads preparation - Context

**Gathered:** 2026-10-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Les futures campagnes Meta et Google s'appuient sur des conventions et un modèle de conversion prêts. Livre : convention de nommage UTM (Meta, Google, Google Business) documentée et appliquée par la capture de leads, avec générateur de liens admin ; taxonomie d'événements fermée ; échelle de conversions Lead, Qualifié, RDV, Signé ; `event_id` déterministe partagé pour la déduplication ; journalisation serveur des conversions. Requirements : ADS-01, ADS-02.

Hors périmètre : envoi serveur Meta CAPI / Google (ADS-04), audiences de relance (ADS-05), kit de contenu organique (ADS-03), hachage de PII pour les plateformes, nouvelles balises ou pixels publicitaires, toute modification du bandeau de consentement.

</domain>

<decisions>
## Implementation Decisions

### Vocabulaire UTM (ADS-01)
- **D-01:** **`utm_source` = plateforme, `utm_medium` = type.** `utm_source` ∈ `meta`, `google`, `gbp` ; `utm_medium` ∈ `paid_social`, `cpc`, `organic`, `referral`. Exemples : Meta Ads = `meta`/`paid_social`, Google Ads = `google`/`cpc`, fiche Google Business = `gbp`/`organic`. Google Ads et Google Business restent des sources distinctes.
- **D-02:** **`utm_campaign` = `offre_cible_aaaamm`** (ex. `agent-vocal_restaurants_202611`) ; `utm_content` = variante de création (`video-a`, `carrousel-1`) ; `utm_term` = mot-clé Google Ads uniquement. Minuscules, sans accents ni espaces, tirets pour les mots, séparateur `_` entre les trois blocs, ~60 caractères maximum.
- **D-03:** **Alias → valeur canonique à la capture** (table en code) : `facebook`, `fb`, `instagram`, `ig` → `meta` ; `adwords`, `googleads`, `google-ads` → `google`, etc. Un UTM conforme passe tel quel. La valeur canonique est stockée ; la valeur brute est conservée pour l'audit.

### Application par la capture et outillage (ADS-01)
- **D-04:** **Un UTM hors convention est conservé et marqué « hors convention » avec un motif** (source inconnue, medium inconnu, campagne mal formée). Jamais de perte de lead ni de source ; la liste blanche de clés (phase 11 D-09) est inchangée. L'indicateur est visible dans l'entonnoir et la fiche lead admin pour correction.
- **D-05:** **Documentation dans le repo + générateur de liens admin.** Un document décrit la convention, les exemples et la table d'alias ; une page admin compose l'URL de destination avec des UTM valides et la valide contre **le même module de règles que la capture** (une seule source de vérité, module pur partagé avec `src/lib/attribution/`). Le lien du profil Google Business utilise `gbp`/`organic`.

### Taxonomie d'événements (ADS-02)
- **D-06:** **Liste fermée en code, noms snake_case :** `page_view_attributed`, `simulator_started`, `simulator_completed`, `lead_submitted`, `lead_qualified`, `rdv_booked`, `quote_sent`, `deal_signed`, `lead_lost`. Les quatre conversions sont `lead_submitted`, `lead_qualified`, `rdv_booked`, `deal_signed` ; les autres sont du suivi.
- **D-07:** **Définis et journalisés côté serveur, aucun envoi.** Chaque changement de statut de lead (et la soumission) enregistre l'événement avec son `event_id` dans le journal serveur (`sv_lead_events` ou table dédiée, à décider par le planificateur). Aucun envoi Meta CAPI ou Google (ADS-04) ; aucun nouvel événement navigateur.
- **D-08:** **Propriétés sans PII :** `event_name`, `event_id`, `occurred_at`, `lead_id`, source et campagne figées, identifiants de clic seulement si consentement, `value` + `currency` (voir D-11). Aucun e-mail ni téléphone dans le journal ; le hachage pour CAPI relève d'ADS-04.

### Échelle de conversions et `event_id` (ADS-02)
- **D-09:** **Quatre rangs : Lead = `new` (à la création), Qualifié = `qualified`, RDV = `rdv`, Signé = `signed`.** `quote_sent` est un événement de suivi sans rang ; `lost` est un événement de sortie qui n'annule pas les conversions déjà émises. Une conversion par rang et par lead.
- **D-10:** **`event_id` déterministe par lead + étape** (ex. UUIDv5 de `lead_id` + nom d'événement), identique côté navigateur et serveur, avec clé d'unicité (une seule émission par rang et par lead, rejouable sans doublon). Pour les événements d'avant lead (visite, simulateur) : UUID aléatoire posé par le proxy.
- **D-11:** **Valeur réelle à Signé seulement :** `deal_signed` porte le total du devis actif en centimes + `EUR` (instantanés de devis, phase 17 D-02) ; Lead, Qualifié et RDV sont comptés sans montant. Aucune valeur estimée.

### Hérité des phases précédentes (rappel)
- **D-12:** Capture first-party par `proxy.ts` (cookie `sv_attr`), premier contact écrit une fois, dernier contact remplacé, identifiants de clic seulement après consentement et sensibles à la casse (phase 11). Statuts de lead `new → qualified → rdv → quote_sent → signed` + `lost`, journal des événements en ajout seul.
- **D-13:** RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, admin en français, `noindex`, sans cinéma/curseur/GSAP, garde « aucun prix » du site public inchangée (valeurs de devis seulement côté serveur/admin). Client de test permanent « Test E2E Sèvalys » réutilisé.

### Claude's Discretion
- Structure des tables et colonnes (marquage hors convention, valeur brute, journal des conversions), noms de fonctions SQL, découpage des plans.
- Liste exacte des alias et du vocabulaire de `utm_medium` au-delà des exemples ; longueur maximale précise des blocs de campagne.
- Emplacement du document de convention (`docs/`) et de la page du générateur dans la navigation admin.
- Rétro-marquage ou non des leads existants (probablement non).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 19 — objectif et 2 critères de succès
- `.planning/REQUIREMENTS.md` — ADS-01, ADS-02 ; ADS-03 à ADS-05 (hors périmètre)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures »
- `.planning/STATE.md` — décisions v2.0

### Phases précédentes
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — D-06 à D-10 (capture, liste blanche, casse des click ids), D-11 à D-20 (modèle de leads, statuts, entonnoir, coût par RDV), consentement
- `.planning/phases/17-admin-forecast-dashboard/17-CONTEXT.md` — D-02 (CA signé par devis actif), D-11 (source figée du lead)
- `.planning/phases/18-verified-reviews/18-CONTEXT.md` — lien du profil Google Business (`gbp`)

### Code existant (à vérifier avant planification)
- `src/lib/attribution/params.ts`, `touch.ts`, `cookie.ts` — liste blanche et parsing à étendre (vocabulaire, alias, marquage hors convention)
- `src/lib/leads/ingest.ts`, `requestAttribution.ts`, `visits.ts` — chemin de capture appliquant la convention
- `supabase/migrations/20261003000000_sv_leads_core.sql` — `sv_leads` (statuts, source figée), journal d'événements, `sv_set_lead_status`
- `src/app/admin/entonnoir/`, `src/app/admin/leads/` — pages admin à imiter pour le générateur et l'indicateur hors convention
- `src/components/admin/AdminNav.tsx`, `src/lib/priceScope.ts`, `src/lib/privateRoutes.ts`
- `src/lib/server/pilotage/dashboard.ts` — lecture du devis actif pour la valeur de `deal_signed`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Parsing pur d'attribution (`ALLOWED_KEYS`, `parseAttrParams`) partagé par le proxy et les routes : point d'ancrage de la normalisation et du marquage.
- `sv_set_lead_status` et le journal immuable des événements de lead : source naturelle des conversions et de leur `event_id`.
- Devis actif et instantanés (phase 13/17) : source de la valeur de `deal_signed`.

### Established Patterns
- Modules purs sans dépendance `next/*`, migrations `sv_*` avec RLS, journaux en ajout seul, tests Vitest colocalisés, suite RLS sur branche dédiée, pages admin avec `requireAdmin()`.

### Integration Points
- Normalisation des UTM dans le chemin de capture (proxy et ingestion de lead) ; indicateur hors convention dans l'entonnoir et la fiche lead.
- Écriture du journal de conversions à chaque changement de statut (RPC existante ou trigger).
- Nouvelle entrée admin pour le générateur de liens.

</code_context>

<specifics>
## Specific Ideas

- La convention doit rester lisible : plateforme dans la source, type dans le medium, offre et cible dans la campagne.
- Un seul module de règles pour la capture et le générateur, afin que les liens produits ne soient jamais « hors convention ».

</specifics>

<deferred>
## Deferred Ideas

- Envoi serveur des conversions Meta CAPI et Google (ADS-04) — avec consentement et reprise
- Audiences de relance par profondeur d'abandon du simulateur (ADS-05)
- Kit de contenu organique (ADS-03)
- Hachage e-mail/téléphone pour l'appariement plateforme — avec ADS-04
- Valeurs estimées par rang pour nourrir l'optimisation avant les premières signatures
- Événements navigateur PostHog par étape de conversion

</deferred>

---

*Phase: 19-Ads preparation*
*Context gathered: 2026-10-08*
