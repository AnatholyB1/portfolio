---
phase: 10-foundation-auth-isolation
plan: 13
subsystem: infra
tags: [vercel, deploy, e2e, auth, production]

requires:
  - phase: 10-foundation-auth-isolation
    provides: "plans 10-01..10-12 (auth stack, sv_* schema in prod, login/admin/client shells, email auth)"
provides:
  - Vercel Preview + Production configuration for the private platform
  - end-to-end verification of admin login, client invite, anti-enumeration
  - production deployment of Phase 10 with SV_LOGIN_ENABLED on
affects: [11, 12]

key-decisions:
  - "Production env: SV_LOGIN_ENABLED=true and SV_OTP_EXPIRY_MINUTES=60 (Supabase prod Auth settings read in dashboard: OTP expiry 3600 s, OTP length 8)"
  - "Promotion by pushing master (Vercel auto-deploys master to Production); owner confirmed auto-deploy is fine and replied 'approved' to the E2E checkpoint"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, FOUND-05, FOUND-06, FOUND-07]

completed: 2026-10-02
---

# Phase 10 Plan 13: Vercel setup, E2E and production promotion Summary

**The private platform (login, admin, client shell) is live in production on sevalys.com and anatholy-bricon.com.**

## What was done
- Task 1 (executor, commit 764f955): quality gates, Preview env (`SV_LOGIN_ENABLED=true`, `SV_OTP_EXPIRY_MINUTES=60`, Preview scope only), Preview deploy aliased to `sevalys-p10.vercel.app`, smoke checks via `vercel curl` (deployment protection kept on).
- Task 2 (E2E, orchestrator + owner, 2026-10-02):
  - Admin login on the Preview: email from `Sevalys <connexion@sevalys.com>` arrived in the `contact@sevalys.com` inbox (French, 8-digit code, "valable 60 minutes", fallback link, branded layout). The owner typed the code and reached `/admin` ("Administration · Sèvalys").
  - Invite: `anatholyb@gmail.com` was refused ("Cette adresse correspond déjà à un compte d'une autre application. Invitation bloquée par sécurité") — expected protection, the address already has an account from another app. Invite of `anatholyb+sv-test@gmail.com` (SIRET 90098846000011) succeeded: SIRET lookup pre-filled raison sociale/adresse/CP/commune/NAF 62.01Z; "Invitation envoyée à …"; the row appeared in "Clients invités"; the invitation email "Votre espace client Sèvalys est prêt" arrived.
  - Never-invited address: the page showed the same neutral message ("Si cette adresse est invitée, un code vient d'être envoyé.") and no email arrived.
  - Owner reply "approved" for the checkpoint (2026-10-02).
- Task 3 (production): lint fixed across the repo (`fix(lint)` commits; `eslint src scripts tests` → 0 errors, 1 pre-existing `CinemaIntro` exhaustive-deps warning); `SV_LOGIN_ENABLED=true` and `SV_OTP_EXPIRY_MINUTES=60` added to the Production environment; `git push origin master` (b607bca..e8a6f04) auto-deployed; new Production deployment Ready (33 s build).
- Production smoke (both domains): `/` 200; `/connexion` 200 with `X-Robots-Tag: noindex, nofollow`; `/admin` and `/espace-client` 307 → `/connexion?next=…`; `/auth/confirm` 200; `robots.txt` and `sitemap.xml` 200; sitemap contains 0 private routes. A fresh login request on `https://sevalys.com/connexion` for `contact@sevalys.com` sent the email to the inbox.

## Deviations / caveats
- The client-side steps (code entry as the invited client, `/espace-client` rendering, `/admin` 404 as client, Gecko admin app check) require typing one-time codes, which the orchestrator may not do; they were left to the owner. The owner's single "approved" reply covered the checkpoint; no per-step result for these was reported in chat.
- Preview emails link to `sevalys.com` (NEXT_PUBLIC_SITE_URL is read at runtime); correct on Production.
- First keystrokes typed into the `/connexion` email field right after page load were lost in browser automation twice (input empty on submit → validation error). Likely hydration timing; not reproduced by a human. Candidate follow-up.
- The invite wrote a test client "Test E2E Sèvalys" to the production `sv_clients` table; to be deleted on request.
- A deployment-protection automation-bypass token was created on the Vercel project by `vercel curl`; revoke in Vercel → Deployment Protection if not needed.
- `graphify update .` still to be run for the knowledge graph (project CLAUDE.md).
