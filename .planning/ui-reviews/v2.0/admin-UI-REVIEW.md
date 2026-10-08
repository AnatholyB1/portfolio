# Admin area — 6-pillar UI review (milestone v2.0)

Code-only audit (no screenshots). Baselines: UI-SPEC phases 10, 11, 17, `portal.css`, `globals.css`. Overall **16/24**.

| Pillar | Score | Key finding |
|---|---|---|
| Copywriting | 3/4 | French throughout, specific CTAs; ambiguous "Annuler" labels, raw actor values, some non-fr-FR numbers |
| Visuals | 2/4 | Absolute-positioned "dropdown" class reused for 6 inline forms, nav overflow, four confirmation patterns |
| Color | 3/4 | Tokens used well, status never colour alone; acid fill on destructive confirm buttons, dialog hardcoded fallbacks |
| Typography | 3/4 | Only 14/16/32px and two weights; money columns lose mono/right-aligned/tabular styling in pilotage tables |
| Spacing | 3/4 | Mostly on 4/8/16/24/32; off-scale values, heavy inline styling (~84 `style={{}}`) |
| Experience design | 2/4 | No loading/error boundaries, swallowed query error, inconsistent pagination and destructive flows |

## Top findings

1. **High — `.pt-lead-panel` is absolutely positioned and reused as an inline form.** `leads.css:207-217` (`position:absolute; top:calc(100% + 4px)`), reused without a positioned ancestor in `LiftSuppressionForm.tsx:16`, `ReminderHoldCard.tsx:39`, `RevokePanel.tsx:35`, `UnhideReviewForm.tsx:19`, `ReissueReviewLinkCard.tsx:66,86`. Mobile override (`leads.css:349-355`) hides it below 768px; probably floats on desktop. Verify visually. Fix: neutral static `.pt-inline-panel` for in-page forms, keep `.pt-lead-panel` for true popovers.
2. **High — pilotage money columns not right-aligned/mono.** `.pt-funnel-num` is scoped to `.pt-funnel-table` (`funnel.css:295-299`) but used in `SourceTable.tsx:514-518`, `ProjectMarginTable.tsx:576-608`, `DetailPanel.tsx:60,93`. Fix: global `.pt-admin .pt-num` (right, mono, tabular-nums).
3. **High — no `loading.tsx` / `error.tsx` under `src/app/admin`.** Every page is `force-dynamic`; `projets/[id]/page.tsx:80-88` awaits several loaders with no try/catch. Fix: `admin/loading.tsx` and French `admin/error.tsx` with retry, keeping `AdminNav`.
4. **High — entonnoir hides query errors as an empty state.** `entonnoir/page.tsx:493-501` ignores `error`; `data ?? []` renders "Pas encore de données" (`:588-595`). Reuse pilotage's "Chiffres indisponibles".
5. **Medium — four different destructive confirmation patterns** (typed email in `<details>`, modal `<dialog>`, inline panel, inline warning). `VoidCostPanel.tsx:113` and `RecurringRowActions.tsx:117` use `pt-btn-primary` (acid fill) contrary to spec 11 (warm outline). `LiftSuppressionForm` and `ReminderHoldCard` have no confirmation. "Annuler" means both "void" and "dismiss". Fix: one shared confirm component, "Garder…" as safe default.
6. **Medium — 8-item nav overflows on small screens** (`leads.css:3-9`, no wrap/scroll). `AdminNav.tsx:2` imports `leads.css` (shell styles in a feature stylesheet).
7. **Medium — `emails/page.tsx:442-471` breaks table conventions** (no roles, caption, `data-label`).
8. **Medium — inconsistent pagination/caps.** Projets, avis, emails, clients load everything; leads source dropdown loads up to 1000 rows (`leads/page.tsx:73`). Two different pager markups/wording (`DetailPanel.tsx:104` uses undefined `pt-pilot-pager`).
9. **Medium — 44px target rule fails for inline table links** (`ClientsTable.tsx:57`, `LeadsTable.tsx:135`, `ProjectsTable.tsx:402`, `ProjectMarginTable.tsx:573-588`).
10. **Low — number/copy formatting:** `InvoiceList.tsx:163` prints "1.5"; `CostEditor.tsx:63`, `CostForms.tsx:135` give "12,5"; `money.ts:48` hyphen vs U+2212 in pilotage; `SignaturePanel.tsx:253` raw `actorKind`; "lead(s)"/"anomalie(s)" plurals.

## Cross-page inconsistencies

- Headings: clients page `h1` is "Inviter un client", real list is `h2`; bare `h3/h4` in `InvoiceList`, `SignaturePanel`.
- Internal links via `<a href>` (pilotage, couts) vs `Link` elsewhere.
- Empty/error states differ page by page; `ProjectMarginTable` has no empty state.
- `/admin/liens` tables use `pt-admin-table` without `pt-table` (no mobile card view).
- `.pt-dialog` uses undefined `--pt-surface` / `--pt-border` (renders `#14161a`, not `--bg-2`).

## Quick wins

`flex-wrap` on the nav; global `.pt-num`; `data-label`/role/caption on emails table; `Link` in pilotage; warm outline for cost confirm buttons; rename dismiss "Annuler"; replace `pt-pilot-pager`; define `--pt-surface`/`--pt-border`; remove unused `.pt-pilot-anomalies`; add `admin/loading.tsx` + `admin/error.tsx`.
