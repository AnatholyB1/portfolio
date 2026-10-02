---
phase: 10-foundation-auth-isolation
verified: 2026-10-02
status: human_needed
score: 5/5 criteria verified in code; 4 client-session steps pending human observation
human_verification:
  - test: "Connexion en tant que client invité (code à 8 chiffres), arrivée sur /espace-client"
    expected: "Coquille /espace-client rendue sans intro/curseur/GSAP, session persistante"
    why_human: "Nécessite de saisir un code à usage unique reçu par e-mail"
  - test: "Connecté en client, ouvrir /admin"
    expected: "404, aucune donnée admin"
    why_human: "Non observé en E2E (couvert par dal.test.ts et RLS, pas en navigateur)"
  - test: "Utilisateur Gecko authentifié ouvre /admin et l'app Gecko continue de fonctionner"
    expected: "Refus sur /admin, app Gecko inchangée après migration prod"
    why_human: "Non observé en E2E"
---

# Phase 10 Verification

Goal: client invité -> espace privé, admin -> zone distincte, aucune fuite entre clients ni vers Gecko.

## Commands run (read-only)
- `npx tsc --noEmit`: exit 0, no errors.
- `npx vitest run`: 39 files, 525 tests, all passed.
- `npx eslint src scripts tests`: 0 errors, 1 pre-existing warning (CinemaIntro exhaustive-deps).
- RLS suite not run (per instructions).

## Success criteria
1. Code 8 chiffres, invitation seule: VERIFIED in code and partly E2E. `src/app/connexion/actions.ts`, gate RPC `sv_login_allowed` (migration, service_role only), `src/lib/auth/schemas.ts`. E2E on Preview: admin code login worked, uninvited address gets neutral message with no email. Client login not observed (human).
2. Admin refuse aux clients/Gecko: VERIFIED by code and tests. `requireAdmin` in `src/lib/server/auth/dal.ts` reads `sv_admins` through RLS client, `notFound()` if no row; roles never from metadata (dal.test.ts asserts it). Client-as-/admin browser check not observed (human).
3. Tests d'isolation + canary: VERIFIED from artifacts (not re-run). `tests/rls/{isolation,roles,selfsignup,auth}.rls.test.ts`, `scripts/rls-canary.mjs`, `npm run test:rls`; Gecko users covered (`makeGeckoAdmin`). Migration: RLS enabled on all 5 sv_* tables, SELECT-only policies, sv_tenants no policy, exclusivity triggers. 50/50 and canary RED per 10-07 SUMMARY (orchestrator-reported; migration lint test passes in vitest).
4. Coquilles noindex, hors sitemap/llms: VERIFIED. `admin/layout.tsx` and `espace-client/layout.tsx` set `robots: {index:false,...}`; `robots.ts` disallows `PRIVATE_PREFIXES`; `llms.test.ts` and `privateRoutes.test.ts` pass; prod smoke: /connexion noindex, sitemap has 0 private routes, signed-out redirects 307. No-cinema/cursor/GSAP: route-aware providers (10-06), unit tested; visual check not done in browser.
5. Garde prix + SPF/DKIM/DMARC: VERIFIED. `src/lib/priceScope.ts` + `priceScope.test.ts` pass; DNS pass and Gmail inbox delivery per 10-03 SUMMARY, and login emails reached inbox in E2E.

## Requirements
FOUND-01 satisfied (client step human), FOUND-02 satisfied, FOUND-03 satisfied, FOUND-04 satisfied (suite run reported), FOUND-05 satisfied, FOUND-06 satisfied, FOUND-07 satisfied. REQUIREMENTS.md still marks all "Pending": update checkboxes/traceability.

## Non-blocking notes
- Test client "Test E2E Sèvalys" in prod `sv_clients` is a PERMANENT fixture (owner decision 2026-10-02, PROJECT.md "Permanent test fixtures"); keep it.
- Vercel automation-bypass token: owner decided to keep it (2026-10-02).
- Possible hydration timing issue losing first keystrokes on /connexion email field (not human-reproduced).
- Preview emails link to sevalys.com (runtime env); fine on Production.
- `graphify update .` not yet run.
- No debt markers or stubs found in inspected files.
