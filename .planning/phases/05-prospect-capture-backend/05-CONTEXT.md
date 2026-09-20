# Phase 5: Prospect Capture Backend - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the server-side foundation that lets the future diagnostic simulator (Phase 7) persist a qualified prospect: a new, dedicated Supabase table (not a reuse of the existing products/orders/stock schema), locked down with insert-only RLS for public writes, protected against spam, and wired to notify the Sèvalys team by email. No UI in this phase — the simulator's frontend and its recommendation logic are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Contact fields (prospect record)
- **D-01:** Nom, email, ET téléphone sont tous les trois obligatoires sur le formulaire de capture (pas seulement nom+email comme `/api/contact` aujourd'hui) — décision explicite pour garantir un canal d'appel direct, cohérent avec le CTA "appeler" mis en avant partout.
- **D-02:** Pas de champ "nom d'entreprise / secteur" — reste volontairement minimal (nom, email, téléphone uniquement). Le contexte métier se précise à l'oral lors de l'appel de suivi.

### Diagnostic detail stored
- **D-03:** La table stocke, en plus des 2-4 services recommandés, les réponses brutes du prospect à chaque question du simulateur (pas seulement le résultat agrégé) — pour que l'équipe puisse personnaliser l'appel de suivi ("vous avez indiqué X"). Le schéma doit donc prévoir un champ structuré (ex. JSON) pour les réponses, en plus du/des champ(s) pour les services recommandés.

### RGPD / rétention
- **D-04:** Rétention de 12 mois pour un prospect non converti, puis suppression automatique. Cette durée doit être mentionnée explicitement dans la case de consentement Art. 13 du formulaire (Phase 7) et implémentée comme politique de purge côté données (ce phase pose le schéma ; le mécanisme de purge — cron/scheduled function ou check applicatif — doit être planifié ici puisque c'est une propriété de la donnée stockée, pas de l'UI).

### Claude's Discretion
- Choix technique RLS/clé : le pattern existant du repo (`src/lib/supabase.ts`, `createServerClient()`) utilise en réalité la clé **anon**, pas une clé service-role, malgré le commentaire trompeur dans le code. Pour la table prospects, Claude doit décider entre (a) réutiliser ce même pattern anon-key + une politique RLS INSERT-only stricte scoped à cette table (cohérent avec l'existant), ou (b) introduire une vraie clé service-role pour l'API route d'écriture (plus sûr mais nouveau pattern dans ce repo). Recommandation research (STACK.md/PITFALLS.md) : option (a) avec RLS bien scopée est suffisante et plus cohérente avec le reste du code — à confirmer/exécuter au planning.
- Mécanisme anti-spam exact (honeypot vs rate-limit vs les deux) : CAPTCHA explicitement déconseillé par la recherche (friction excessive pour l'audience PME locale visée) — Claude choisit l'implémentation technique (honeypot + rate-limit léger recommandé par PITFALLS.md).
- Mécanisme de purge à 12 mois (cron Supabase / Edge Function scheduled / vérification applicative au prochain accès) — détail d'implémentation, pas une question de vision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone v1.1 section, constraint "no functional changes to CRM or VAPI"
- `.planning/REQUIREMENTS.md` — CRM-01, CRM-02, CRM-03, CRM-04 (this phase's scope)
- `.planning/ROADMAP.md` — Phase 5 goal and success criteria

### Research (v1.1 milestone)
- `.planning/research/STACK.md` — zod recommendation, anon-key vs service-role finding on `src/lib/supabase.ts`
- `.planning/research/ARCHITECTURE.md` — no tracked Supabase schema in repo today (no `.sql`/migration files); suggested build order (this phase blocks everything downstream)
- `.planning/research/PITFALLS.md` — Pitfall 1 (CRM schema mismatch — no leads table exists), Pitfall 4 (spam/RLS risk from anon-key pattern), Pitfall 10 (RGPD consent)
- `.planning/research/SUMMARY.md` — synthesized executive summary and roadmap implications

### SEO/GEO/AEO strategy (cross-cutting, informs future phases but not this one directly)
- `docs/strategie-seo-geo-llm-2026-09.md` §9 — addendum covering the 4 new services and `/simulateur` pillar page concept

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/contact/route.ts`: closest existing precedent for a "validate payload → send Resend notification" server route. New `api/simulateur` (Phase 7, but its backend contract is shaped by this phase) should follow the same validate-then-act pattern, not write directly from the browser.
- `src/lib/supabase.ts`: exports `createServerClient()` — currently instantiates with the **anon key** despite naming/comment suggesting service_role. Any new server-side Supabase write should either extend this file consistently or introduce a real service-role client — decide during planning (see Claude's Discretion above).

### Established Patterns
- No tracked Supabase schema/migrations exist anywhere in the repo (`.sql` files absent) — this is the first phase that would benefit from documenting the new table's DDL in the plan/summary artifacts, since nothing is currently tracked in git.
- Resend is the established notification channel (`RESEND_API_KEY` env var, `resend.emails.send`, HTML templates with `escapeHtml` helper) — reuse this exact library/pattern for CRM-04, do not introduce a different email provider.

### Integration Points
- New Supabase table (name TBD at planning, e.g. `prospects` or `simulateur_leads`) lives in the **same Supabase project** as the existing `products`/`orders`/`stock` tables — same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), no new project/credentials needed.
- A new API route (e.g. `src/app/api/simulateur/route.ts` or a dedicated prospect-capture endpoint) will be the actual write path — this phase should produce the table + RLS + spam guard + notification logic in a form Phase 7 can call directly, even though the simulator UI itself is out of scope here.

</code_context>

<specifics>
## Specific Ideas

No specific technical references given by the user beyond the four decisions above (contact fields, diagnostic detail stored, retention period, and the general "reuse the same Supabase project" instruction from milestone kickoff). Implementation specifics (table name, exact RLS policy syntax, spam-guard library/approach) are Claude's discretion per the decisions above.

</specifics>

<deferred>
## Deferred Ideas

- Company name / sector field on the capture form — explicitly rejected (D-02), not deferred to a future phase, just excluded from this milestone's scope.
- Formal CRM pipeline (stages, scoring, lead routing) — already captured in `.planning/REQUIREMENTS.md` as CRM2-01 (v2 requirement), reconfirmed here as out of scope for Phase 5.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 5-prospect-capture-backend*
*Context gathered: 2026-09-20*
