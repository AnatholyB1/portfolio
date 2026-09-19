---
phase: quick-260919-wig
plan: 01
subsystem: api
tags: [resend, nextjs, route-handler, email, contact-form, css]

requires: []
provides:
  - "Resend-backed /api/contact Route Handler sending confirmation + notification emails"
  - "ContactSection.tsx now posts to internal /api/contact instead of the retired n8n/Railway webhook"
  - "Dark-theme-legible <select> option list styling"
affects: [contact-form, email-infra]

tech-stack:
  added: [resend]
  patterns:
    - "Route Handlers lazily instantiate external SDK clients (new Resend(...)) inside the handler function, not at module top-level, so a missing env var surfaces as a request-time 500 instead of a build-time crash"
    - "Inline HTML-escape helper for interpolating untrusted user input into email HTML bodies"

key-files:
  created:
    - src/app/api/contact/route.ts
  modified:
    - src/components/sections/ContactSection.tsx
    - src/app/globals.css
    - package.json
    - package-lock.json
    - .env.example

key-decisions:
  - "Validated payload fields (name, email, projectType, message) before touching Resend, returning 400 on invalid input per plan spec"
  - "Sent both emails via Promise.all for concurrency, checked both results' error field before returning 502"
  - "Kept .field select's existing chevron/appearance:none rules untouched; only added color: var(--ink) to .field select option"

patterns-established:
  - "Contact/lead-capture email flows go through Resend Route Handlers, not external webhooks"

requirements-completed: []

duration: ~20min
completed: 2026-09-19
---

# Quick Task 260919-wig: n8n to Resend contact form migration Summary

**Resend-backed `/api/contact` Route Handler replacing the n8n/Railway webhook, sending both a confirmation email to the prospect and a lead-notification email to contact@sevalys.com, plus a dark-theme fix for the project-type dropdown's open list.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-19T21:41:53Z
- **Tasks:** 2/2 completed
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- New `/api/contact` Route Handler validates input, HTML-escapes untrusted fields, and sends two emails via `resend.emails.send()` (prospect confirmation + agency notification)
- `ContactSection.tsx` no longer depends on `NEXT_PUBLIC_FORM_URL` / the n8n webhook — posts directly to the internal route with `{ name, email, projectType, message }`
- `.field select option` now has `color: var(--ink)`, fixing illegible (default black-on-dark) text in the open dropdown list
- `.env.example` documents `RESEND_API_KEY` with setup and domain-verification notes (no real key committed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Resend-backed /api/contact Route Handler** - `8c1d7c9` (feat)
2. **Task 2: Point the contact form at /api/contact and fix the dropdown's open-list styling** - `7d08ded` (feat)

**Plan metadata:** committed separately by the orchestrator after this summary.

## Files Created/Modified
- `src/app/api/contact/route.ts` - New Route Handler: validates payload, escapes HTML, sends confirmation + notification emails via Resend
- `src/components/sections/ContactSection.tsx` - Removed `FORM_URL`/n8n fallback and `fullMessage` concatenation; posts to `/api/contact` with separate `projectType` field
- `src/app/globals.css` - `.field select option` gained `color: var(--ink)` alongside existing `background: var(--bg)`
- `package.json` / `package-lock.json` - Added `resend` (^6.28.1) dependency
- `.env.example` - New `# ─── Resend ───` section documenting `RESEND_API_KEY` (placeholder only)

## Decisions Made
- Instantiated `new Resend(process.env.RESEND_API_KEY)` lazily inside the POST handler (not module top-level) so a missing key fails at request time with a clear 500, not at build time
- Used `Promise.all` to send both emails concurrently, checking `error` on each result independently before deciding success/failure
- Reused the exact French tone from `src/lib/translations.ts` ("On répond sous 24h ouvrées") in the confirmation email body

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` and `<done>` specs; no Rule 1-4 fixes were needed to complete the plan's own scope.

## Issues Encountered

`npm run build` initially failed with `Error: supabaseUrl is required` while collecting page data for `/api/crm/stock` — this is a **pre-existing, out-of-scope** issue: this fresh worktree has no `.env.local`, so `src/lib/supabase.ts` (used only by the unrelated CRM routes, not touched by this plan) throws when instantiating its Supabase client at module load. Confirmed our changes are unaffected by re-running `npm run build` with dummy Supabase env vars set only for that command (not committed anywhere) — the build completed successfully, with `/api/contact` compiling correctly as a dynamic route. Logged to `.planning/quick/260919-wig-n8n-resend-pour-le-formulaire-de-contact/deferred-items.md` per the scope-boundary rule; not fixed here.

`npx tsc --noEmit` passed with zero output (no errors) on the first attempt.

## User Setup Required

**External service requires manual configuration — Resend.**

1. Create a Resend account and generate an API key: Resend Dashboard -> API Keys -> Create API Key
2. Add `RESEND_API_KEY=<real-key>` to `.env.local` (local dev, gitignored) AND to the Vercel project's Environment Variables (Project -> Settings -> Environment Variables) for production
3. Verify the `sevalys.com` sending domain in Resend: Dashboard -> Domains -> Add Domain -> add the DNS records Resend provides. Until verified, Resend will reject sends `from: 'Sèvalys <contact@sevalys.com>'` — use the sandbox sender `onboarding@resend.dev` for local testing until verification completes
4. No real API key was fabricated or committed anywhere — `.env.example` only documents the variable name and setup steps

## Known Stubs

None. `/api/contact` is fully wired: validates real input, calls the real Resend SDK, and `ContactSection.tsx` posts to it directly — no mock/placeholder data path exists. The only thing blocking a fully working end-to-end send is the user-supplied `RESEND_API_KEY` (see User Setup Required above), which is an external-service credential, not a code stub.

## Next Phase Readiness

- Contact form is fully migrated off n8n/Railway; no remaining code references to `NEXT_PUBLIC_FORM_URL` (only historical mentions remain in `.planning/phases/02-*` planning docs, which are documentation of past decisions and out of scope to edit)
- Once the user adds a real `RESEND_API_KEY` (see User Setup Required) and verifies the `sevalys.com` domain in Resend, the form is ready for a live manual smoke test: submit the form and confirm (a) the prospect receives a confirmation email, (b) `contact@sevalys.com` receives the lead notification, (c) the dropdown's open list is legible
- Deferred: pre-existing `npm run build` failure when Supabase env vars are absent (unrelated to this task) — see `deferred-items.md`

---
*Quick task: 260919-wig*
*Completed: 2026-09-19*

## Self-Check: PASSED

- FOUND: src/app/api/contact/route.ts
- FOUND: RESEND_API_KEY in .env.example
- FOUND: .field select option color rule in src/app/globals.css
- FOUND: fetch to /api/contact in src/components/sections/ContactSection.tsx
- FOUND: commit 8c1d7c9
- FOUND: commit 7d08ded
