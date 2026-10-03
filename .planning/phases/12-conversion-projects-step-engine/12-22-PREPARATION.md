# 12-22 preparation (Task 1)

Run date: 2026-10-03.

- Fresh fixture address for this run: `anatholyb+sv-test-p12-202610031045@gmail.com`
- Lead created through `POST https://sevalys.com/api/contact` (`{"ok":true}`): id `e184cc42-edcb-4dfa-8264-587ad204d5d1`, channel `contact`, status `new`.
- Permanent fixture client present: id `a9f89b1a-e0da-460b-af97-faade3575723` (SIRET 90098846000011).
- Baselines before the run (production): `sv_projects` = 0, `sv_mail_outbox` = 0.
- Public checks: `/api/cron/mail` 401, `/admin/projets` and `/espace-client` redirect anonymous users to `/connexion`.

Only the contact form POST wrote to production (one lead plus its notification mail to contact@sevalys.com). Nothing else was written, nothing deleted.
