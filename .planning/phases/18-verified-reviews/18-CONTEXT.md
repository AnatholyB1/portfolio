# Phase 18: Verified reviews - Context

**Gathered:** 2026-10-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Chaque client livré peut laisser un avis vérifié, publié sans filtrage, et exploitable en SEO sans promesse d'étoiles. Livre : lien d'avis unique à usage unique (60 jours), formulaire de dépôt, page publique `/avis` et extrait sur l'accueil, lien Google Business proposé quelle que soit la note, modération limitée à l'illégalité avec journal, page « Politique des avis », JSON-LD `Review` sans clé de prix, testé automatiquement. Requirements : REV-01, REV-02, REV-03, REV-04.

Hors périmètre : réponse publique de l'agence aux avis, avis sur les pages services, AggregateRating, réinscription marketing, campagnes. La règle, le délai, le modèle et le drapeau `REVIEW_REQUESTS_ENABLED` de la demande d'avis existent déjà (phase 16) : cette phase branche le vrai lien et lève le drapeau.

</domain>

<decisions>
## Implementation Decisions

### Formulaire et affichage (REV-01, REV-04)
- **D-01:** **Formulaire : note 1 à 5 obligatoire, texte obligatoire (minimum ~20 caractères), titre optionnel.** Fournit `reviewRating`, `reviewBody` et `name` pour le JSON-LD `Review`.
- **D-02:** **Le client choisit l'affichage de son nom** au dépôt : prénom + société (défaut), prénom + initiale, ou société seule. **Case de consentement de publication explicite** ; sans consentement, l'avis n'est pas publié. Le nom de société vient de `sv_clients`.
- **D-03:** **Affichage public : page `/avis` (liste complète + lien vers la Politique) et extrait de 2-3 avis récents sur l'accueil.** Pas d'avis sur les pages services. La garde « aucun prix » et le comportement de l'accueil restent intacts.
- **D-04:** **JSON-LD : un `Review` par avis publié, lié à l'entité Organization/ProfessionalService existante via `itemReviewed`, uniquement sur `/avis`.** Aucun `AggregateRating`, aucune clé de prix, aucune promesse d'étoiles. Test automatisé (vitest) : pas de clé de prix, pas d'`AggregateRating`, seuls les avis publiés et non masqués sont balisés.

### Publication et modération (REV-03)
- **D-05:** **Publication immédiate au dépôt**, sans file de validation ni filtrage par note ou ton. Les soumissions techniquement invalides (injection, longueur, liens) sont rejetées à la validation, jamais selon le contenu d'opinion. L'admin est alerté par e-mail de chaque nouvel avis.
- **D-06:** **Le masquage ne repose que sur une liste fermée de motifs légaux** (diffamation ou injure, données personnelles d'un tiers, contenu illégal, avis non authentique/usurpation) **plus un détail obligatoire.** Aucun motif lié à la note ou à l'opinion. Journal en ajout seul (patron `deny_mutation`) : masquage et levée sont tracés avec auteur, date, motif, détail ; l'avis n'est jamais supprimé.
- **D-07:** **Le client est notifié du masquage** (e-mail transactionnel, motif générique, contestation par retour d'e-mail). L'admin peut lever un masquage avec motif ; tout est journalisé.
- **D-08:** **Pas de réponse publique de l'agence** (hors périmètre).

### Cycle de vie du lien et Google (REV-01, REV-02)
- **D-09:** **Le jeton est créé au moment du mail J+7 (phase 16 D-05) ; le mail J+21 réutilise le même lien.** Jeton haché en base (jamais en clair), à usage unique, expire à 60 jours après le PV signé. Un lien expiré, utilisé ou invalide affiche un message clair sans fuite d'information. **L'admin peut réémettre un lien** (l'ancien est invalidé, action journalisée). Le fait « avis déposé » arrête les relances (D-05 de la phase 16).
- **D-10:** **Lien Google Business sur la page de remerciement après dépôt, bouton identique quelle que soit la note**, texte neutre, sans contrepartie ni promesse. Test automatisé pour chaque note de 1 à 5. L'URL Google vient d'une variable d'environnement avec garde au démarrage (le profil Google Business reste à créer côté propriétaire, voir PROJECT.md).
- **D-11:** **La phase 18 lève le drapeau `REVIEW_REQUESTS_ENABLED` et branche le vrai lien dans le modèle `review_request`.** Le lien Google n'apparaît pas dans le mail de demande (l'avis doit d'abord être rattaché au projet).

### Politique des avis (REV-03)
- **D-12:** **Page `/politique-des-avis` en français seul** (comme `/avis`). Contenu : méthode de vérification (lien unique après PV signé), publication sans filtrage, motifs de masquage limités à la légalité, aucune incitation ni contrepartie, durée de conservation.
- **D-13:** **Lien vers la Politique à côté de chaque bloc d'avis (`/avis` et extrait accueil), sur le formulaire de dépôt et dans le pied de page ;** page ajoutée au sitemap et à `llms.txt`.

### Hérité des phases précédentes (rappel)
- **D-14:** Règles d'e-mail en code, outbox idempotente, cron quotidien (phases 12, 16). La demande d'avis est classée `marketing` (désinscription et liste de suppression s'appliquent). Le mail de masquage est transactionnel.
- **D-15:** RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée, tables d'audit en ajout seul. Le formulaire public `/avis/[token]` est exempté d'authentification mais en `noindex` ; `/avis` et `/politique-des-avis` sont indexables. Client de test permanent « Test E2E Sèvalys » réutilisé, jamais supprimé.

### Claude's Discretion
- Structure exacte des tables (avis, jetons hachés, journal de modération), noms des types, format et entropie du jeton, découpage des plans.
- Libellés français, gabarit de la page de remerciement, design de la carte d'avis et de l'extrait accueil (tokens du design system, accessibilité).
- Limitation de débit sur le formulaire public, durée de conservation exacte à écrire dans la Politique.
- Emplacement de la vue admin des avis et de l'action de réémission dans la fiche projet ou une page `/admin/avis`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 18 — objectif et 4 critères de succès
- `.planning/REQUIREMENTS.md` — REV-01 à REV-04
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures », Google Business à créer
- `.planning/STATE.md` — décisions v2.0 et blockers

### Phases précédentes
- `.planning/phases/16-mailing-automation-completion/16-CONTEXT.md` — D-04 à D-06 (demande d'avis prête, drapeau éteint, J+7/J+21, flux marketing), désinscription, liste de suppression
- `.planning/phases/14-electronic-signature/14-CONTEXT.md` — fait `acceptance_signed` (PV signé)
- `.planning/phases/12-conversion-projects-step-engine/12-CONTEXT.md` — règles de mail en code, outbox
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — rôles en tables, `service_role` server-only, routes privées

### Recherche v2.0
- `.planning/research/SUMMARY.md` (lignes ~94 et ~126) — conformité des avis, jetons hachés 60 jours, test de garde
- `.planning/research/PITFALLS.md` (lignes ~96-104) — page « Politique des avis », lien Google inconditionnel, pas d'AggregateRating

### Code existant (à vérifier avant planification)
- `src/lib/server/mail/rules.ts` — événement `review_request`, `dedupeKey.reviewRequest`, classe `marketing`
- `src/lib/server/mail/flags.ts` — `reviewRequestsEnabled` (`REVIEW_REQUESTS_ENABLED`)
- `src/lib/server/mail/outbox.ts` — rendu et garde du drapeau, `reviewRequestContent`
- `src/lib/server/mail/reminderEmails.ts` — modèle de la demande d'avis
- `src/lib/server/reminders/` — balayage des relances et détection « projet livré, PV signé, aucun avis »
- `src/app/api/cron/mail/route.ts` — cron quotidien
- `src/lib/privateRoutes.ts`, `src/proxy.ts` — routes publiques exemptées, `noindex`
- `src/lib/serviceJsonLd.ts` — patron JSON-LD existant et son test
- `src/app/sitemap.ts`, `src/app/llms.test.ts`, `src/app/sitemap.test.ts` — sitemap et llms.txt
- `src/lib/priceScope.ts` — gardes « aucun prix »
- `src/app/desinscription/` — patron de page publique à jeton sans connexion
- `src/lib/server/mail/unsubscribeToken.ts` — patron de jeton (ici : haché en base, usage unique)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Règle `review_request` (J+7/J+21), clé d'unicité, drapeau et modèle déjà présents : à brancher, pas à recréer.
- Patron page publique à jeton (`/desinscription`) et jeton signé (`unsubscribeToken.ts`).
- Patron JSON-LD des services et son test : modèle du test de garde (pas de clés de prix, pas d'AggregateRating).
- Triggers `deny_mutation` et journaux en ajout seul des phases 11-17.

### Established Patterns
- Migrations `supabase/migrations/`, RLS dans la même migration, tables `sv_*`, tests Vitest colocalisés, suite RLS sur branche dédiée, `requireAdmin()` + `service_role` confiné.
- Contraintes `check` d'événement et de modèle étendues sans nom codé en dur.
- Aucune adresse e-mail dans les logs.

### Integration Points
- Nouvelles routes publiques `/avis`, `/avis/[token]`, `/politique-des-avis` : sitemap, `llms.txt`, pied de page, `privateRoutes` pour le formulaire à jeton.
- Extrait d'avis sur la page d'accueil (garde « aucun prix », intro cinéma intacts).
- Vue admin des avis (masquage, levée, réémission de lien) et alerte e-mail d'un nouvel avis.

</code_context>

<specifics>
## Specific Ideas

- Le lien Google est le même bouton pour une note de 1 comme de 5 : point de conformité central, à garder visible dans un test.
- Aucune étoile promise dans Google : `Review` seulement, jamais `AggregateRating`.

</specifics>

<deferred>
## Deferred Ideas

- Réponse publique de l'agence à un avis (champ + `comment` JSON-LD) — hors périmètre
- Avis affichés sur les pages services — écarté pour l'instant
- Politique des avis en anglais et thaï — écarté (avis français uniquement)
- Bouton « Laisser un avis » dans le portail client — non retenu

</deferred>

---

*Phase: 18-Verified reviews*
*Context gathered: 2026-10-08*
