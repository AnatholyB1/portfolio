---
phase: 11-lead-attribution-pipeline-consent
plan: 18
status: awaiting-manual-verification
completed_tasks: [1, 2, 3]
pending_tasks: [4]
requirements: [LEAD-01, LEAD-05, LEAD-06, LEAD-07, LEAD-08, LEAD-09]
---

# Plan 11-18 — Deploy and production verification

## Task 1 — local suites and secret

767 unit tests, lint (0 errors, 2 warnings), `tsc --noEmit` and `npm run build` pass. `SV_IP_HASH_SECRET` generated locally into the gitignored `.env.local` (never printed). No remote command ran in this task.

Two fixes were needed before deploy (commit 64483af, 2e406bb): an ESLint override for `tests/rls/**` (untyped SQL result rows) and the link audit now strips query strings and allows the two admin lead detail links.

## Task 2 — owner go (recorded verbatim, 2026-10-02)

Reply to the exact 6-step remote command list: **"deploy prod"**.

## Task 3 — remote steps and automated production checks

1. `SV_IP_HASH_SECRET` added to Vercel Production and Preview (sensitive, value never printed; `vercel env ls` shows both).
2. `git push origin HEAD:refs/heads/phase-11-preview` → preview Ready. On the preview: `/` returns 200 with no `sv_attr` cookie (non-canonical host skipped by design); anonymous `/admin/leads` lands on `/connexion?next=/admin/leads`.
3. `git push origin master` → production Ready.
4. Production checks with real GET navigations (`Sec-Fetch-*`, browser UA):
   - UTM arrival → `Set-Cookie: sv_attr_lt` and `sv_attr_ft`, `Secure; HttpOnly; SameSite=lax; Max-Age=2592000`.
   - Plain arrival → no `sv_attr` cookie.
   - `?gclid=...` without consent → cookie holds only the `utm_*`, no click id.
   - A7 resolved: the UTM request was a CDN `HIT` and the cookies were still set (the proxy runs before the cache).
5. `POST /api/contact` after a UTM landing with fresh fixture address `anatholyb+sv-test-p11-202610022148@gmail.com` → `{"ok":true}`. Lead `4145809b-d04b-499d-97dd-b0e085a08ded` created: channel `contact`, source `verif11 / test / phase11`, first and last touch params identical, `contact_count` 1.
6. `select sv_private.backfill_legacy_prospects()` → 0 rows to migrate; legacy leads (1) = prospects (1); 2 leads in total; visit counters recorded (3 rows).

### Incident during verification

A first check showed no cookie on the UTM request. Cause: the test used `curl -I` (HEAD), which the proxy ignores on purpose (only GET navigations count as arrivals). Diagnosed with a temporary `x-attr-debug` response header (commits 310f552, e7a95f3), removed in 403b127; production no longer emits it. No code defect.

Note: `git checkout` on Windows rewrote `src/proxy.ts` with CRLF locally, which breaks the proxy static-contract tests; normalised to LF locally (content identical to the committed blob).

## Task 4 — manual verification on production (pending, owner)

Checklist: see 11-18-PLAN.md Task 4 (steps 1-7). Not yet performed; results to be recorded here.

The verification lead is not a permanent fixture (12-month tombstone purge); later runs must use a fresh plus-addressed address.
