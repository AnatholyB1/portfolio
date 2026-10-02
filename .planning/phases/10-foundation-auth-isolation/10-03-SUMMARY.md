---
phase: 10-foundation-auth-isolation
plan: 03
subsystem: infra
tags: [dns, spf, dkim, dmarc, resend, cloudflare, deliverability]

requires: []
provides:
  - scripts/verify-email-dns.mjs (6 PASS/FAIL checks, optional --send-test)
  - sevalys.com mail authentication verified (SPF, DKIM, DMARC all PASS)
  - Gmail inbox placement evidence for login mail from connexion@sevalys.com
affects: [10-12, 10-13]

key-files:
  created:
    - scripts/verify-email-dns.mjs

key-decisions:
  - "Root SPF: v=spf1 include:_spf.google.com include:spf.brevo.com ~all (MX is Google Workspace, Brevo DKIM CNAMEs present; Resend uses the send.sevalys.com return-path so it is not in the root SPF)"
  - "DMARC stays p=none this phase; rua extended to mailto:rua@dmarc.brevo.com,mailto:contact@sevalys.com"

requirements-completed: [FOUND-07]

completed: 2026-10-02
---

# Phase 10 Plan 03: Email authentication (D-20) Summary

**sevalys.com now passes SPF, DKIM and DMARC and a test mail from connexion@sevalys.com lands in a Gmail inbox.**

## Accomplishments
- Task 1: `scripts/verify-email-dns.mjs` (commit d9ad9bc) checks DKIM, root SPF (exactly one record), DMARC, the `send.sevalys.com` return-path SPF, Resend domain status and Resend tracking flags.
- Task 2 (done by the orchestrator in Chrome with the owner's explicit approval, 2026-10-02): added ONE TXT on `@` in Cloudflare with the SPF above, and edited the existing `_dmarc` TXT in place. Live DNS afterwards: exactly one `v=spf1` record on the root and exactly one `_dmarc` record.
- Script result after the edits: 6/6 PASS, exit 0.
- Resend dashboard: `sevalys.com` Verified; API: `open_tracking=false`, `click_tracking=false`.
- Task 3: test mail "Test de délivrabilité Sèvalys" sent with `--send-test` (Resend id `01a0fc46-f59d-7377-86e9-e43ca375b77d`) to the owner's Gmail.

## Gmail evidence (Authentication-Results of the received message)
- `dkim=pass header.i=@sevalys.com header.s=resend`
- `spf=pass` (smtp.mailfrom on `rsend.sevalys.com`, sender IP permitted)
- `dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=sevalys.com`
- Labels: INBOX, IMPORTANT (not spam). From: `Sevalys <connexion@sevalys.com>`, Reply-To: `contact@sevalys.com`.

## Decisions and open facts
- `contact@sevalys.com` IS an existing login in at least one of Ziko / RH / Gecko (owner answer). D-05 expects it to be the first admin; plan 10-12 preflight must confirm read-only in prod `auth.users` and `gecko_admins` before the seed runs, and must never reuse or delete the account outside the D-05 seed path.
- The SPF `include:spf.brevo.com` and `include:_spf.google.com` were chosen from the observed MX/DKIM records, not from an inventory of every sender; any other service sending as `@sevalys.com` must be added to the single SPF record (never a second `v=spf1`).
- `SV_LOGIN_ENABLED` remains OFF; plan 10-13 turns it on after evidence above and the end-to-end check.

## Deviations
- Task 2 and 3 were executed by the orchestrator rather than the executor agent because they require the owner's browser sessions (Cloudflare, Gmail); the executor had stopped at a human-action checkpoint. No DNS change was made without the owner's approval.
- Gmail "Show original" kept closing its tab in Chrome; headers were read through the Gmail connector (RAW message) instead.
