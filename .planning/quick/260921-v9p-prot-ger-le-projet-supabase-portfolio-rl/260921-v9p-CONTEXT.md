# Quick Task 260921-v9p: Protéger le projet Supabase portfolio (RLS + security definer functions) avant fusion multi-tenant - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Task Boundary

Le projet Supabase `portfolio` (id: `ubxllsvanurkwkohzxau`, host `db.ubxllsvanurkwkohzxau.supabase.co`) sert de base cible pour la fusion progressive de plusieurs projets Supabase clients (geckocabane, ziko, ghjulianu-codani, sellerieduchet, sellerieduchet-preview). Ces migrations de données sont gérées séparément (déjà en cours — un fichier `supabase/migrations/20260921000000_gecko_cabane_integration.sql` non commité est déjà présent). Cette tâche NE couvre PAS la migration de données elle-même : elle couvre uniquement le durcissement sécurité du projet cible, avant que davantage de données tenant n'y soient fusionnées.

</domain>

<decisions>
## Implementation Decisions

### Périmètre de protection
- Focus: RLS policies et fonctions SECURITY DEFINER (pas rotation de clés API, pas backup, pas revue des accès équipe dans cette tâche)

### Findings à corriger (get_advisors security, project_id=ubxllsvanurkwkohzxau)

**IMPORTANT — révision de périmètre (2026-09-21, après premier passage planner+checker) :** la base `portfolio` héberge déjà, physiquement, des tables d'autres tenants fusionnés (ex: `gecko_*` provient de geckocabane, déjà migré). Des sessions Claude Code dédiées et actives existent pour ces tenants (ex: `gecko-cabane-7e`, `ziko-platform-0f`, `ghjulianu-codani-51`, `ecurie-db`). Pour éviter tout conflit avec leur travail, cette tâche est restreinte aux tables et fonctions 100% natives du site portfolio lui-même. Les findings ci-dessous concernant gecko_* et rh_* (tenants tiers) sont explicitement HORS PÉRIMÈTRE pour cette tâche, même s'ils constituent de vraies vulnérabilités dans la même base — ils relèvent des sessions dédiées à ces tenants.

1. ~~`public.gecko_is_admin()`~~ — HORS PÉRIMÈTRE (tenant geckocabane, cf. session `gecko-cabane-7e`).
2. ~~`public.swap_shift_employees(uuid,uuid,uuid,uuid)`~~ — HORS PÉRIMÈTRE (appartient probablement au tenant rh_*/sellerieduchet, pas défini dans ce repo).
3. ~~`public.gecko_phone_verifications`~~ — HORS PÉRIMÈTRE (tenant geckocabane).
4. `public.prospects` — DANS LE PÉRIMÈTRE. Table 100% native du site portfolio (leads du simulateur Sèvalys, `src/app/api/simulateur/route.ts`). RLS activé, aucune policy → actuellement verrouillé pour tout le monde sauf service_role. Ajouter une policy explicite deny-all (anon/authenticated) pour lever le lint sans changer le comportement (l'écriture se fait déjà via service_role).
5. Auth: "Leaked Password Protection" désactivé → l'activer (config projet auth, pas SQL). Ce toggle est global au projet Supabase Auth (pas spécifique à une table/tenant) donc reste dans le périmètre : il ne touche aucune policy ni fonction d'un autre tenant.

### Ce qui N'EST PAS dans le périmètre
- Migration de données des projets sources (geckocabane, ziko, ghjulianu-codani, sellerieduchet, sellerieduchet-preview) — gérée séparément
- Rotation des clés API / secrets
- Revue des accès équipe / rôles d'organisation
- Isolation multi-tenant complète au niveau schéma (out of scope pour cette tâche — à considérer dans une tâche future si le modèle multi-tenant se confirme)
- **Toute correction sur les tables/fonctions `gecko_*` ou `swap_shift_employees` (tenant rh_*)** — laissé aux sessions dédiées à ces tenants pour éviter un conflit d'édition concurrente sur les mêmes policies

### Claude's Discretion
- Wording exact des policies RLS pour `gecko_phone_verifications` et `prospects` — s'appuyer sur le usage apparent de la table (comment: "Diagnostic simulator leads (Sèvalys v1.1)") pour définir la policy la plus restrictive qui ne casse pas le flux applicatif existant.
- Décider entre `SECURITY INVOKER` vs `REVOKE EXECUTE` selon ce qui préserve le comportement fonctionnel actuel des deux fonctions.

</decisions>

<specifics>
## Specific Ideas

Utiliser les tools MCP Supabase (`get_advisors`, `apply_migration`, `execute_sql`) pour appliquer et vérifier les correctifs directement sur le projet `ubxllsvanurkwkohzxau`. Une migration SQL versionnée (`supabase/migrations/`) doit être créée pour les changements DDL (policies, REVOKE, search_path), cohérente avec le pattern déjà utilisé dans le repo (voir migration gecko_cabane_integration existante). Après application, relancer `get_advisors` (type=security) pour confirmer la disparition des findings corrigés.

</specifics>

<canonical_refs>
## Canonical References

- Supabase RLS lint reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Supabase search_path lint reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- Supabase SECURITY DEFINER exposure references: lint 0028 / 0029
- Supabase leaked password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

</canonical_refs>
