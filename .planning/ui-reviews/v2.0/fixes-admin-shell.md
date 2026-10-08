# v2.0 UI fixes: admin shell and list pages

Scope: admin shell, `/admin` (clients), leads, entonnoir, emails, avis, liens. Code-level only (no browser pass): visual items below are verified by source guards and CSS reading, not screenshots.

## Fixed

| Audit item | Fix |
|---|---|
| No loading/error boundaries | `src/app/admin/loading.tsx` (role=status "Chargement…", nav kept), `error.tsx` (French, "Réessayer", back to dashboard, nav with `aria-current` from the path), `not-found.tsx` (private shell, no public navbar) |
| Admin nav overflow at 360px | Nav `ul` wraps (`flex-wrap`), all 8 links reachable, 44px targets; nav styles moved from `leads.css` to `admin.css`; `AdminNav` no longer imports `leads.css`; `current` optional; `adminNavKeyForPath` helper |
| No skip link / landmark | Skip link "Aller au contenu" in `admin/layout.tsx`, target `#admin-contenu` rendered by `AdminNav` (present on every admin page); `<main>` comes from `ShellMain` |
| No admin work queue | `/admin` opens on "À traiter" (`WorkQueue`, `lib/admin/workQueue.ts`, `lib/server/admin/workQueue.ts`): overdue invoices, documents awaiting signature, new leads, returning leads, blocked addresses (complaint/bounce not lifted), reviews of the last 7 days. RLS client only, parallel reads, per-tile failure shown as "lecture impossible", truncated reads refuse to show a count, "Rien à traiter" empty state. No migration |
| Clients heading hierarchy | h1 "Clients", queue and invite form as h2, list error state ("Clients indisponibles") |
| Convert button on new/lost leads | Inactive ghost button (`disabled` + `aria-disabled`), visible reason linked with `aria-describedby`; live dialog unchanged for qualified+ leads |
| Entonnoir swallows query error | `error` destructured, "Chiffres indisponibles" + Recharger; row cap `.limit(1000)`; cost editor panel stays in the cell flow so the scroll container cannot clip it |
| `.pt-lead-panel` absolute reuse | Static by default, floats only as a child of `.pt-lead-pill-wrap` (status pill popover). This also fixes the in-page forms in excluded files (`LiftSuppressionForm`, `ReminderHoldCard`, `RevokePanel`, `UnhideReviewForm`, `ReissueReviewLinkCard`) without touching them |
| Emails table | `role=table`, caption, `data-label` on every cell, Statut cell shows "Réactivée le … / Motif : …", Action shows a dash for lifted rows |
| Pagination / caps | Shared `Pager` ("Précédent"/"Suivant", `pt-btn-ghost`, "Page N", `rel`); clients, leads, avis, emails paginated (25, +1 row to detect a next page); leads source dropdown no longer reads 1000 rows (UTM convention + 200 most recent + selected source); `loadAdminReviews` / `loadSuppressions` take an optional bounded window (default cap 200), lifts read only for the page |
| 44px inline links | `.pt-admin .pt-admin-table a` is inline-flex, min-height 44px with focus ring |
| Liens tables | `pt-table` card layout on mobile with `data-label` and row headers |
| `.pt-dialog` undefined tokens | `--bg-2`, `--line`, `--ink`, `100dvh` |
| Live regions | StatusPill error line and LostPanel error always mounted; ConvertDialog banner and error wrapper always mounted; "Enregistrement…" |
| Inline styles | Layout `style={{}}` removed from all owned pages and components (classes in `admin.css`) |
| Empty/error states | Heading + helper + action on leads, entonnoir, emails, avis, review links, clients |
| Plurals | "lead(s)" replaced in funnel page and table |
| Review triage (UX M9, cheap part) | Two-line clamp of the review body above the details disclosure |

Tests added or updated (same commits): `admin/boundaries.test.ts`, `components/admin/AdminNav.test.ts`, `adminHome.test.ts`, `adminLists.test.ts`, `lib/admin/workQueue.test.ts`, `lib/server/admin/workQueue.test.ts`, `suppressionAdmin.test.ts` (window and lifts filter), `reviews/admin.test.ts` (fake client gains `range`).

## Not fixed (and why)

- Excluded files owned by the admin-forms agent: pilotage money columns (`.pt-num`), `pt-pilot-pager` / pilotage pager, projets list pagination, destructive-confirmation unification, "Annuler" wording, `InvoiceList` number formatting, `SignaturePanel` raw `actorKind`, `Link` vs `<a href>` in pilotage. `Pager` is exported (`@/components/admin/Pager`, `ADMIN_PAGE_SIZE`, `parsePage`) for them to reuse.
- `.pt-dialog` stays in `leads.css` (moving it to `portal.css` is out of scope: `portal.css` is off limits).
- `loadOpenReviewLinks` is not paginated (one row per unreviewed project, small by nature).
- Work queue does not include "projects waiting on Sèvalys": that needs the step engine and project loaders owned by the other agent.
- `EM_DASH` placeholder and em dash copy rule (UX L4): shared `lib/admin/format`, wider than this scope.
- No real-browser verification at 360/768/1280 (static pass only); the cost editor, nav wrapping and static panels should be checked visually.
