# Phase 10: Foundation, auth & isolation - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Un client invité accède à un espace privé sécurisé (`/espace-client`), un admin à une zone distincte (`/admin`), et aucune donnée ne fuit entre clients ni vers les utilisateurs Gecko (projet Supabase partagé). Livre : tables de rôles, login par code e-mail sur invitation, coquilles `noindex`, tests d'isolation, gardes « aucun prix » scopées, SPF/DKIM/DMARC vérifiés. Requirements : FOUND-01 à FOUND-07.

</domain>

<decisions>
## Implementation Decisions

### Invitation & rôles
- **D-01:** L'admin invite un client depuis un formulaire dans `/admin` : e-mail, nom du client et **SIRET**. Route serveur (service_role) crée `sv_clients` + le premier membre invité.
- **D-02:** Les informations publiques de l'entreprise sont récupérées automatiquement à partir du SIRET (API publique gratuite type recherche-entreprises.api.gouv.fr — à valider par la recherche) ; l'admin peut corriger/compléter si la recherche échoue. Le SIRET et les données récupérées sont stockés sur `sv_clients` (alimenteront contrat/facture, phases 13/15).
- **D-03:** Un client (entreprise) peut avoir plusieurs utilisateurs via `sv_client_members`. En phase 10, seul l'admin ajoute un membre.
- **D-04:** Rôles **exclusifs** : un e-mail admin ne peut pas être membre client (et inversement). Contrainte appliquée côté base/route d'invitation.
- **D-05:** Premier admin : le compte `contact@sevalys.com` — vérifier s'il existe déjà dans `auth.users` du projet Supabase, sinon le créer — puis l'insérer dans `sv_admins` via script/migration idempotent (pas d'auto-promotion possible depuis l'app).
- **D-06 (hérité de la recherche):** Rôles en tables (`sv_admins`, `sv_client_members`), jamais `user_metadata`/`app_metadata` ; « authentifié » n'accorde jamais d'accès. `signInWithOtp` avec `shouldCreateUser: false`.

### Parcours de connexion
- **D-07:** Une seule page `/connexion` ; redirection selon le rôle après vérification (admin → `/admin`, client → `/espace-client`).
- **D-08:** Session de **30 jours pour tous** (admin compris).
- **D-09:** Anti-énumération : réponse identique (« Si cette adresse est invitée, un code vient d'être envoyé ») quelle que soit l'adresse ; aucun e-mail envoyé aux non-invités ; limitation de débit.
- **D-10:** E-mail du code en français, expéditeur `Sevalys <connexion@sevalys.com>`, code à 6 chiffres bien visible, lien de secours, mention d'expiration. Le code est le chemin principal (les scanners d'e-mails brûlent les liens).

### Coquilles /espace-client et /admin
- **D-11:** Thème = tokens/variables CSS et polices du design system existant, version sobre type back-office ; **sans** intro cinéma, curseur custom ni GSAP (providers conditionnés par route).
- **D-12:** **Français uniquement** pour le portail et l'admin (pas de LanguageContext).
- **D-13:** Après login — Client : en-tête avec nom de l'entreprise, navigation squelette (Projet, Documents, Paiements, désactivés « bientôt »), déconnexion. Admin : liste des clients invités + formulaire d'invitation.
- **D-14:** Pas de navbar publique dans les coquilles ; seulement un lien discret « Retour au site » dans le pied.
- **D-15:** `noindex`, hors sitemap et `llms.txt`, `Disallow` dans robots pour `/espace-client`, `/admin`, `/connexion`.

### Tests d'isolation & environnement
- **D-16:** Tests RLS sur une **branche Supabase dédiée** (aucune écriture dans la base prod partagée avec Gecko) : migrations appliquées, utilisateurs de test créés/supprimés par les suites. Scénarios : client A vs client B, anonyme, utilisateur Gecko authentifié ; les tests doivent échouer si une politique est affaiblie.
- **D-17:** Gardes « aucun prix » : les tests existants restent limités aux chemins publics ; `/espace-client`, `/admin` et les futurs modèles de documents sont exclus via une liste explicite et documentée.
- **D-18:** Hérités de la recherche : RLS activée dans la même migration que chaque table ; vues en `security_invoker` ; `service_role` uniquement dans des modules `server-only` ; avis Supabase advisor lancé ; assertion du mode de clés d'environnement.

### E-mail / DNS (FOUND-07)
- **D-19:** Domaine d'envoi : `sevalys.com` via Resend (pas de sous-domaine pour l'instant). SPF/DKIM fournis par Resend, DMARC à ajouter ; l'admin ajoute les enregistrements chez le registrar.
- **D-20:** Critère « vérifié » avant d'activer le login : domaine « verified » dans Resend **+** enregistrements SPF/DKIM/DMARC confirmés par `dig` **+** e-mail de test reçu en boîte de réception (Gmail) avec en-têtes SPF/DKIM/DMARC = pass.

### Claude's Discretion
- Structure exacte des tables/colonnes, noms de helpers SQL, découpage des plans, choix de la limitation de débit, détails du formulaire et de la gestion d'erreur SIRET, organisation des route groups Next.js (`proxy.ts`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 10 — objectif, critères de succès
- `.planning/REQUIREMENTS.md` — FOUND-01 à FOUND-07
- `.planning/PROJECT.md` — décisions de cadrage v2.0, politique « aucun prix »
- `.planning/STATE.md` — blockers phase 10 (plan Vercel Hobby/Pro, politiques `gecko_*` actives)

### Recherche v2.0
- `.planning/research/SUMMARY.md` — conflits résolus (rôles en tables), phase 1 foundation
- `.planning/research/ARCHITECTURE.md` — `sv_tenants`/`sv_admins`/`sv_clients`/`sv_client_members`, helpers, proxy
- `.planning/research/STACK.md` — `@supabase/ssr`, OTP, Resend
- `.planning/research/PITFALLS.md` — fuites RLS, liens magiques brûlés, over-matching du proxy

### Code existant
- `supabase/migrations/20260920000000_create_prospects_table.sql` — patron RLS insert-only existant
- `supabase/migrations/20260921000000_gecko_cabane_integration.sql` — politiques `gecko_*` à ne pas casser
- `src/lib/supabase.ts` — clients browser/serveur/service_role actuels
- `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/llms.test.ts`, `src/app/sitemap.test.ts`, `src/app/layout.test.ts` — exclusions et gardes à adapter

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase.ts` : `createServiceRoleClient()` (à garder server-only) ; le client « serveur » anon n'a pas de cookies de session → remplacé par `@supabase/ssr` pour le portail.
- Resend déjà installé (`resend`) et utilisé pour la notification prospects ; zod disponible pour valider les entrées.
- Design system : variables CSS, Space Grotesk / Manrope / JetBrains Mono dans `globals.css`.

### Established Patterns
- Next.js 16 (App Router) → `proxy.ts` (pas `middleware.ts`) ; aucun proxy/middleware n'existe encore.
- Tests Vitest colocalisés (`*.test.ts`), gardes « aucun prix » dans `layout.test.ts`, `llms.test.ts`, `serviceSchema.test.ts`, `translations.test.ts`.
- Providers racine (`layout.tsx`) incluent cinéma/curseur/LanguageContext → à rendre route-aware.

### Integration Points
- `layout.tsx` (providers conditionnels), `robots.ts`/`sitemap.ts`/`llms.txt` (exclusions), nouvelle migration `sv_*` sur le projet Supabase partagé, DNS sevalys.com (Resend).

</code_context>

<specifics>
## Specific Ideas

- Formulaire d'invitation admin : e-mail + nom + SIRET avec pré-remplissage automatique des infos publiques de l'entreprise (raison sociale, adresse, forme juridique, NAF…).
- Compte admin attendu : `contact@sevalys.com`.

</specifics>

<deferred>
## Deferred Ideas

- Ajout d'un membre client par le client lui-même (self-service) — phase ultérieure.
- Sous-domaine d'envoi dédié (`mail.sevalys.com`) pour séparer la réputation marketing — à reconsidérer en phase 16.

</deferred>

---

*Phase: 10-Foundation, auth & isolation*
*Context gathered: 2026-10-01*
