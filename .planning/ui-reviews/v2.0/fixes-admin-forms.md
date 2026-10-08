# v2.0 UI fixes: admin forms, destructive actions, projets, pilotage

Scope: `src/app/admin/{projets,pilotage}/**`, `src/components/admin/{projects,pilotage,shared}/**`, the forms
`EraseLeadForm`, `LiftSuppressionForm`, `HideReviewDialog`, `UnhideReviewForm`, `ReissueReviewLinkCard`, and the
number helpers. Exported props of those forms are unchanged. Commits: `fix(ui-admin-forms): ...` (4).

## Fixed

| Audit finding | Fix |
|---|---|
| High: `.pt-lead-panel` (absolute popover) reused as an inline form | New `.pt-inline-panel` (static, in flow) in `components/admin/shared/inline.css`; used by LiftSuppressionForm, ReminderHoldCard, RevokePanel, UnhideReviewForm, ReissueReviewLinkCard (x2) and the three cost forms. `.pt-lead-panel` is no longer used in any file I own. `leads.css` untouched. |
| Medium: four confirmation patterns, acid fill on destructive confirm, no confirmation on LiftSuppression / ReminderHold | One shared `ConfirmAction` / `ConfirmPanel` / `ConfirmButtons` (`shared/ConfirmAction.tsx`): outlined `--warm` confirm button (`.pt-confirm-btn`, never `--acid`), safe "Garder..." button first, Escape closes, focus returns to the trigger, result message in a live region mounted before its content. Applied to EraseLeadForm, LiftSuppressionForm, ReminderHoldCard (suspend and resume), RevokePanel, VoidCostPanel, RecurringRowActions (stop), HideReviewDialog (modal keeps `<dialog>` but uses `ConfirmButtons`), UnhideReviewForm, ReissueReviewLinkCard. |
| Ambiguous "Annuler" labels | "Annuler ce coût" becomes "Invalider ce coût..." (confirm "Confirmer l'invalidation", safe "Garder le coût"); "Annuler ce fait" becomes "Invalider ce fait" (confirm "Confirmer l'invalidation", safe "Garder ce fait"); recurring stop is "Arrêter cette charge..." then "Confirmer l'arrêt" / "Garder la charge"; hide review is "Masquer cet avis..." then "Confirmer le masquage" / "Garder l'avis visible". The dismiss "Annuler" of the reissue panel is now "Garder le lien actuel". Trigger and confirm labels always differ. |
| High: pilotage money columns not right-aligned / mono | Global `.pt-admin .pt-num` (alias `.pt-pilot-num`) in `pilotage.css`: mono, tabular, right-aligned from 768px (cards stay left on mobile). Applied to SourceTable, ProjectMarginTable, DetailPanel (th and td) and the costs page. `pt-pilot-table` applied to every pilotage table; tables get captions. |
| ProjectMarginTable empty state | Added ("Aucun projet à afficher sur cette période..."). |
| Undefined `pt-pilot-pager` | Replaced by shared `Pager` ("Précédent" / "Suivant", `pt-btn-ghost`, "Page x sur y"). |
| `<a href>` for internal links in pilotage / couts | `next/link` everywhere (pilotage, couts, treasury balance link). |
| High: project sheet loaders without try/catch | Loaders wrapped: Documents (also withheld when signatures cannot be read, so no wrong "signé" status), Facturation, relances, review link each show a `PanelUnavailable` state ("... indisponible", Recharger); a failed sheet read shows a recoverable "Fiche projet indisponible" instead of a crash; a missing project still returns 404. |
| Medium: projets list unbounded | Capped to 25 rows per page after filter and sort on the server, shared Pager, total count shown. |
| Number formatting | InvoiceList quantity "1,5" via `formatQuantityMilli`; cost inputs prefill with two decimals ("12,50") via `formatAmountInput`; minus sign unified: `formatSignedEuros` (U+2212) defined once in `money.ts`, pilotage re-exports it, admin billing screens use it; `formatEuros` keeps the ASCII hyphen on purpose (PDF and Factur-X). SignaturePanel actor kinds become Client / Sèvalys / Système (also FactJournal). "anomalie(s)" and "jour(s)", "projet(s)" use `countFr` (French rule: 0 and 1 are singular). |
| Headings | `pt-heading pt-subheading` on bare h3/h4 in InvoiceList, SnapshotPanel, DocumentsPanel; PanelUnavailable and lead-erase card use h2/h3 without skipping levels. |
| 44px targets | `pt-link-target` on inline links in ProjectsTable and ProjectMarginTable; ConfirmAction buttons use `pt-btn-*` (44px). |
| Inline `style={{}}` | Removed from all files I own (projets pages, pilotage pages, Documents/Quote/Contract/Acceptance/Snapshot panels, PostFactForm, ProjectSideCards, the five review/lead/mail forms, RevokePanel). Replaced by utility classes in `shared/inline.css`. |
| Live regions / loading labels | Cost `FormMessage` is a permanent `aria-live` container; ConfirmAction and review forms mount their region first; bare "..." loading text is now "Chargement du détail...". |
| Dead CSS `pt-pilot-anomalies` | Now used by the anomalies list. |

Tests: `shared/shared.test.ts` (ConfirmAction render, Pager, source guards: no `pt-btn-primary`, no `pt-lead-panel`, no inline style, no "Annuler" label in any destructive form, warm outline), `lib/documents/numberFormat.test.ts`, `projects/projectsPolish.test.ts`, and updates to the pinned pilotage, couts and project sheet tests.

## Not fixed (with reason)

- Server-side DB limit for the projets list: `loadAdminProjects` lives in `src/lib/server/projects/read.ts`, outside my files. The cap is applied to rows rendered per page after the read; the query itself still loads all projects (acceptable at current volume).
- `leads.css` `.pt-dialog` undefined `--pt-surface` / `--pt-border`, nav overflow, `admin/loading.tsx` / `error.tsx`, entonnoir swallowed error, emails table roles: other owners' files.
- `lead(s)` plural in `entonnoir/page.tsx` and `FunnelTable.tsx`: not my files; `countFr` / `pluralFr` in `lib/documents/numberFormat.ts` are ready to use.
- `PreviewIssuePanel`, `PeriodInvoiceForm`, `CreditNoteForm` keep `pt-btn-primary` on "Émettre ..." / confirm: these issue documents or invoices (constructive, one primary per form, pinned by `billingFormsUi.test.ts`), they are not destructive confirmations.
- Project sheet in-page section nav (UX M8) and a work-queue landing page (UX H3): product changes, not polish.
- Em dash placeholder (`EM_DASH`, UX L4) lives in `lib/admin/format`, not mine.
- Visual confirmation: audit is code-only; no browser pass was run. The panel width inside table cells (emails "Action" column, nowrap in `admin.css`) is handled with `white-space: normal` on the panel but should be checked at 360 / 768 / 1280.
