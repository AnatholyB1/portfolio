---
phase: 11
slug: lead-attribution-pipeline-consent
status: approved
reviewed_at: 2026-10-02
shadcn_initialized: false
preset: none
created: 2026-10-02
---

# Phase 11 — UI Design Contract

> Visual and interaction contract for: (A) the public consent modal and the "Gérer les cookies" footer link, (B) the admin leads table, lead detail, and funnel view.
> Mode: auto. Answers come from CONTEXT.md (D-01 to D-21), RESEARCH.md (Pattern 6, 7, 8), the Phase 10 UI-SPEC and `src/app/globals.css`. Items marked (assumed) are defaults chosen without owner input.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no `components.json`; do NOT initialize shadcn, inherited from Phase 10) |
| Preset | not applicable |
| Component library | none. Plain React components; native `<dialog>` for the modal |
| Icon library | lucide-react (installed) |
| Font | Display Space Grotesk (`--font-display`), Body Manrope (`--font-body`), Mono JetBrains Mono (`--font-mono`) |

Two style scopes, both reusing existing tokens (`--bg`, `--bg-2`, `--bg-3`, `--acid`, `--ink`, `--ink-dim`, `--ink-faint`, `--line`, `--line-strong`, `--warm`). No new global colour token.

- **Public scope (consent modal, footer link):** the modal is rendered OUTSIDE `.pt-root`, so `--pt-border-strong` is NOT available there. The modal defines its own scoped custom property `--consent-border: #6F6B64` on `.consent-dialog` (same value as `--pt-border-strong`, 3:1 on dark) for resting button borders. Do NOT reuse `.btn-ghost` (its hover turns the border and text `--acid`, which would favour one choice) and do NOT reuse the public `.label` class (11px mono uppercase, `--ink-faint`; incompatible with the 14px Label role). New dedicated classes, all NEW: `.consent-dialog`, `.consent-title`, `.consent-body`, `.consent-link`, `.consent-actions`, `.consent-btn`, `.consent-error`. No GSAP, no reveal animation. A 150ms opacity fade is allowed, disabled under `prefers-reduced-motion`.
- **Admin scope (`/admin/leads`, `/admin/leads/[id]`, `/admin/entonnoir`):** Phase 10 admin/portal styles. The real class convention is `.pt-…` with selectors scoped `.pt-admin .pt-…` in `src/components/admin/admin.css` (NOT an `.ad-` prefix). Resting borders of inputs, selects, ghost buttons use `--pt-border-strong` (defined in `portal.css` under `.pt-root`). Admin never imports `gsap`, `three`, `CinemaIntro`, `CustomCursor`, `LanguageContext`, or public `Navbar`/`Footer` (existing import-boundary test applies). French only, no `useLanguage()`.

Existing classes to REUSE (do not redefine):

| Class | Source | Use in this phase |
|-------|--------|-------------------|
| `.pt-admin-table` | admin.css / portal.css | Leads table. Stacks to cards below 768px through `data-label` on each `td`; `white-space: nowrap` rule is keyed to `td[data-label="Statut"]` (so the status pill column MUST use `data-label="Statut"`). Add `data-label="Arrivé le"`, `"Dernier contact"`, `"Retour"`, `"Source"`, `"Lead"` on the other cells |
| `.pt-summary` (`dl`) | admin.css | `Attribution` definition lists in lead detail (dt 14px `--ink-dim`, dd `--ink`; one column mobile, `max-content 1fr` at >= 768px) |
| `.pt-field-help` | admin.css | Helper text under fields (`lowercase hint`, character counter, `Manuel` hint) |
| `.pt-warn` | portal.css / admin.css | Non-blocking notices (`Le journal est en lecture seule.`, erased banner) |
| `.pt-error`, `.pt-success` | portal.css | Inline mutation feedback |
| `.pt-sr-only` | admin.css / portal.css | Visually hidden labels and live regions |
| `.pt-btn-primary` | portal.css | The single accent button per form (hover: `--ink` fill, existing) |
| `.pt-btn-ghost` | portal.css | `Appliquer les filtres`, `Annuler la perte`, `Annuler la saisie`, `Effacer définitivement` base (border `--pt-border-strong`, hover border `--ink-dim`, no acid) |
| `.pt-btn-text` | portal.css | `Réinitialiser`, `Précédent`, `Suivant`, `Saisir`, `Modifier` |
| `fieldset.pt-company` | admin.css | Card surface pattern: `--bg` fill, 1px `--pt-border-strong`, radius 8px, padding 16px. All new admin cards use this radius |

NEW admin classes (declared in admin.css as `.pt-admin .pt-…`). Names deliberately avoid the existing public `.pill`, `.tg` and admin/portal `.pt-status` (a 16px `--ink-dim` text paragraph, NOT a pill):

| New class | Purpose |
|-----------|---------|
| `.pt-lead-pill` | Status pill trigger (button) and `Revenu` badge base |
| `.pt-lead-pill-menu` | Status menu popover list |
| `.pt-lead-badge` | `Revenu`, `Manuel`, `Lead précédent` badges |
| `.pt-lead-chip` | Active filter chip and `N à revoir` count chip |
| `.pt-lead-filters` | Filter bar container |
| `.pt-lead-panel` | Inline `Perdu` panel and cost editor |
| `.pt-lead-grid` | Detail two-column grid |
| `.pt-funnel-kpis`, `.pt-funnel-kpi` | Headline strip and its cards |
| `.pt-funnel-table`, `.pt-funnel-scroll` | Funnel table (modifier of `.pt-admin-table` that disables the card collapse) and its scroll container |
| `.pt-funnel-rate` | Conversion rate line under a stage count |
| `.pt-seg` | Segmented control `Regrouper par` |

---

## Spacing Scale

Multiples of 4, same scale as Phase 10:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, pill inner gap |
| sm | 8px | Label to control, compact row padding, button gap in modal |
| md | 16px | Field spacing, table cell padding, modal inner gaps |
| lg | 24px | Card/modal padding, form groups |
| xl | 32px | Gap between admin blocks |
| 2xl | 48px | Page top/bottom padding |
| 3xl | 64px | Not used in this phase |

Exceptions:
- All interactive controls (modal buttons, footer link, status pill trigger, filters, table row actions) have a 44px minimum hit area (not a scale token).
- Consent modal: max-width 480px, width `calc(100vw - 32px)` below 512px, max-height `calc(100dvh - 32px)` with internal scroll. Radius 8px for the modal surface and admin cards (aligned to existing `fieldset.pt-company`), 100px for pill buttons (site convention).
- Admin leads page uses the 1120px shell width; lead detail uses a two-column grid (main 2fr, side 1fr, 32px gap) at >= 1024px, single column below.

---

## Typography

Exactly 4 sizes and 2 weights (400, 500), identical to Phase 10. No 12px text in new elements.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px Manrope (modal text, table cells, form text, notes, helper and error text) | 400 (500 for buttons and pill text) | 1.5 |
| Label | 14px (new classes only: `.consent-link`, `.pt-lead-*`, `.pt-funnel-rate`; field labels sentence case in `--ink-dim`; table headers JetBrains Mono uppercase, letter-spacing 0.08em; status pills; funnel column headers; footer button). This is NOT the public `.label` class (11px mono uppercase) and must not reuse it | 500 labels and pills, 400 table headers | 1.5 |
| Heading | 24px Space Grotesk, letter-spacing -0.02em (modal title, page `h1`, card titles) | 500 | 1.2 |
| Display | 32px JetBrains Mono, tabular figures (funnel headline counts only: leads, RDV, signés totals) | 500 | 1.2 |

Numeric columns in the table and funnel use `font-variant-numeric: tabular-nums`, right-aligned.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0A0B0C` (`--bg`) | Page background; modal backdrop is `rgba(10,11,12,0.8)` |
| Secondary (30%) | `#111213` (`--bg-2`) modal surface and table; `#0A0B0C` (`--bg`) admin cards per `fieldset.pt-company`; `#16181a` (`--bg-3`) row hover, inputs, modal button fill; borders `--line` / `--line-strong` (public) and `--pt-border-strong` (admin) | Modal, admin cards, tables, filters |
| Accent (10%) | `#C4F542` (`--acid`) | See reserved list |
| Destructive / error | `#E07856` (`--warm`) | Error messages, invalid field border, the `Effacer définitivement` button border and text. Nothing else |
| Text | `--ink` `#ECEAE3`, `--ink-dim` `#9A9690`, `--ink-faint` `#5A5751` (decorative or disabled only) | As Phase 10 |

Accent reserved for (and nothing else among NEW elements):
1. The single primary button per form, `.pt-btn-primary`, black `#000` text on `--acid`: `Marquer comme perdu`, `Enregistrer le coût`, `Enregistrer la correction`. The modal has none (see equality rule below). There is no `Confirmer` button anywhere in this phase.
2. The keyboard focus ring (2px `--acid`, 2px offset) on every interactive element, including both modal buttons.
3. The 2px left indicator of the active filter chip and the active admin nav item.
4. The `Signé` pill dot (8px) only.

Pre-existing acid behaviour, stated explicitly and NOT extended: the public `.btn-ghost:hover` (acid border and text) and `.foot-links a:hover` (acid text) already exist on the public site. New elements in this phase do not copy them: the consent buttons, the footer `Gérer les cookies` button and all admin ghost/text buttons use non-acid hovers (`--bg-3` fill or border/text change to `--ink` / `--ink-dim`).

Consent equality rule (LEAD-09, D-02, locked): `Accepter` and `Refuser` are two identical `.consent-btn` buttons: same size, same padding, same font (16px, 500), same 1px `--consent-border`, same `--ink` text on `--bg-3`, same hover (border becomes `--ink-dim`; no acid, no fill change that differs between them). NEITHER uses the accent fill, because the accent would favour one choice. They sit side by side (equal `flex: 1`) at >= 400px, stacked at equal full width below. Order is fixed: `Refuser`, `Accepter`, left to right and top to bottom. (assumed)

Status pills are never colour-only: each has a text label plus a distinct lucide icon or dot shape. Pill styling is neutral (`--bg-3` fill, 1px `--pt-border-strong`, `--ink` text); `Perdu` uses `--ink-dim` text with a `XCircle` icon, not `--warm` (warm means error).

---

## Screens and Interaction Contract

### C1. Consent modal (public, all locales)

Source: D-02, D-03, D-04, RESEARCH Pattern 6.

- Language decision: FR + EN + TH, through `src/lib/consent/text.ts` keyed by the existing `LanguageContext` locale, since the public site is trilingual. The log stores `locale` and `version`. TH and EN strings are translations of the FR source and must be proofread before launch (flag in plan). (assumed, resolves RESEARCH Open Question 2)
- Component: client component `ConsentDialog` mounted in `layout.tsx` next to `ClientProviders`. Native `<dialog class="consent-dialog">` + `showModal()`: inert background, native focus trap. SSR renders nothing; decision made after mount from `document.cookie` (`sv_consent`). Never call `cookies()` in a Server Component.
- Visibility: shown when the cookie is absent, expired, or its `version` differs from `CONSENT_VERSION`. Not shown on private paths (`isPrivatePath`) and not shown on `/mentions-legales` (so the visitor can read the policy). First-time visitors see it AFTER `CinemaIntro` ends or is skipped, never together.
- Blocking behaviour: `cancel` event (Escape) is `preventDefault()`ed; backdrop click does nothing. No close button.
- Layout (top to bottom, 16px gaps, 24px padding, radius 8px, surface `--bg-2`, 1px `--line-strong` border): heading (`.consent-title`, Heading 24px, `h2`, `tabIndex=-1`, receives initial focus so neither button is favoured), body paragraph (`.consent-body`, Body 16px, `--ink-dim`), a text link `.consent-link` to `/mentions-legales#cookies` (Label 14px Manrope, `--ink`, underlined, same tab), then `.consent-actions` with the two equal `.consent-btn` buttons.
- `aria-labelledby` (heading), `aria-describedby` (body). Language of the dialog content follows the active locale (`lang` attribute set on the dialog when different from page).
- Behaviour on click: disable both buttons, POST `/api/consent`, on success close and apply PostHog config (`buildPostHogConfig`); on Accept with a click id in `location.search`, `location.reload()`. On network error: keep the modal open, show inline `.consent-error` (`aria-live="polite"`, `--warm` text with `AlertCircle`), buttons re-enabled. Never silently treat an error as a choice.
- Reopen: footer link `ManageCookiesLink` opens the same dialog through a shared store; the current choice is not pre-highlighted. Close is only possible by choosing.
- Mobile 320px: buttons stacked, modal scrolls internally, body not truncated.
- Motion: none beyond a 150ms opacity fade (off under reduced motion).

### C2. Footer link "Gérer les cookies"

Added to `Footer.tsx` inside the existing `.foot-links` container, after the `mentions-legales` link. It is a `<button type="button">` (opens a dialog, not a navigation). Existing `.foot-links a` is 12px, `--ink-faint`, hover `--acid`, with no 44px hit area, and does not style a `<button>`. Decision (single, consistent with the Typography section): add a NEW override `.foot-links button` in `globals.css`: reset (`background: none; border: 0; font-family: inherit; cursor: pointer`), 14px (Label role), weight 400, colour `--ink-dim` (contrast >= 4.5:1, unlike `--ink-faint`), `min-height: 44px; padding: 0 4px`, underline on hover and focus-visible with colour `--ink` (no acid), focus ring 2px `--acid`. The sibling `<a>` links keep their existing 12px style (documented exception: untouched, out of scope for this phase). Label via `translations.ts`.

### A1. `/admin/leads` (list, LEAD-07)

- Primary visual anchor: the `N à revoir` chip (`.pt-lead-chip`) directly above the table, followed by the table itself. The chip is the first thing read; the table is the work surface.
- Admin nav in the existing header: `Clients`, `Leads`, `Entonnoir`. Active item: 2px accent underline, `aria-current="page"`. Page `h1` `Leads`.
- Filter bar (`.pt-lead-filters`, card surface per `fieldset.pt-company`, 16px padding, 16px gap, wraps): `Statut` select (all six statuses + `Tous`), `Source` select (distinct frozen sources + `Toutes`), `Retours uniquement` checkbox. Filters are GET params (URL state, shareable, work without JS); applied via an `Appliquer les filtres` button (`.pt-btn-ghost`, secondary) and a `Réinitialiser` text link (`.pt-btn-text`). Active filters shown as `.pt-lead-chip` with 2px accent left indicator.
- Table (`.pt-admin-table`) columns: `Lead` (name, 500; email below in `--ink-dim`), `Source` (frozen `source / medium`, campaign below in `--ink-dim`), `Statut` (pill, interactive; `data-label="Statut"`), `Arrivé le`, `Dernier contact`, `Retour` (badge). Sorted by `Dernier contact` descending. Pagination: 25 rows per page, `Précédent` / `Suivant` `.pt-btn-text`. Row click or the name link goes to the detail page. Row hover `--bg-3`. Below 768px rows collapse to stacked cards through the existing `data-label` mechanism (name, source, pill, dates).
- "Lead revenu" notification (resolves discretion, D-12): a badge `Revenu` (`.pt-lead-badge`, `RotateCcw` icon + text, Label 14px) in the `Retour` column and next to the name until the admin opens the detail page (clears `unseen_return`), plus a Resend notification email whose subject/first line contains `Lead revenu`. The count chip `N à revoir` sits above the table, linking to the `Retours uniquement` filter. (assumed)
- Status pill, one gesture: the pill (`.pt-lead-pill`) is a disclosure button (`aria-haspopup="menu"`, 44px hit area) opening `.pt-lead-pill-menu`, listing the other statuses as `<form action>` buttons (works without JS): Nouveau, Qualifié, RDV, Devis envoyé, Signé, Perdu. Picking any status except `Perdu` posts immediately (server action, `requireAdmin()`, `revalidatePath`), shows a polite live-region message `Statut mis à jour : {statut}.`. Pending: pill shows `Enregistrement...` and is disabled. Keyboard: Enter/Space opens, arrows move, Escape closes and returns focus to the pill.
- `Devis envoyé` is available but carries the helper tag `Manuel` (`.pt-lead-badge`) in the menu (set by hand until phase 13) (assumed).
- Choosing `Perdu` opens an inline panel (`.pt-lead-panel`) under the row (not a modal): `Motif de perte` radio group (closed list, required): `Hors budget`, `A choisi un concurrent`, `Sans réponse`, `Hors cible`, `Projet abandonné`, `Autre`; optional `Note` textarea (max 500 characters, counter in `.pt-field-help`); buttons `Marquer comme perdu` (`.pt-btn-primary`, accent) and `Annuler la perte` (`.pt-btn-ghost`). Submit is disabled until a reason is chosen. `Annuler la perte` closes the panel, keeps the previous status and returns focus to the pill. The note goes to `sv_lead_notes` (erasable).
- Empty state (no lead): heading `Aucun lead pour le moment`; body `Les demandes du simulateur et du formulaire de contact apparaîtront ici avec leur source.`
- Empty state (filters match nothing): heading `Aucun lead ne correspond`; body `Modifiez ou réinitialisez les filtres pour voir plus de résultats.` with `Réinitialiser` link.

### A2. `/admin/leads/[id]` (lead detail)

- Primary visual anchor: the page header block (name at Heading 24px with the status pill beside it) — the status is the first decision; the `Contacts` card is the first content card below it.
- Breadcrumb `Retour aux leads`. Header: name (Heading), status pill (same component), frozen source line `Source figée : {source} / {medium}{ / campagne}`, badges `Revenu` and `Lead précédent : {date}` (link to the previous lead, D-13) when applicable. Erased leads show a `.pt-warn` banner `Données personnelles effacées le {date}` and all PII fields render as `Effacé`.
- Main column cards (`.pt-lead-grid`, 32px gap):
  1. `Contacts`: chronological list, one entry per submission: date, channel (`Simulateur` / `Formulaire de contact`), identity (email, phone when present), answers or message. Consent snapshot line: `Consentement cookies : {Accepté|Refusé} le {date} (version {v})`.
  2. `Journal` (read-only timeline from `sv_lead_events`): date, actor, event label (`Lead créé`, `Contact ajouté`, `Statut modifié : X vers Y`, `Source corrigée`, `Lead lié`, `Données effacées`), reason code in plain French. No edit or delete controls anywhere on the journal; a `.pt-warn` line states `Le journal est en lecture seule.`
- Side column cards:
  1. `Attribution`: two `.pt-summary` definition lists `Premier contact` and `Dernier contact` (source, medium, campagne, contenu, terme, page d'atterrissage, référent; click ids shown only if present, truncated with `title`). Value font Body 16px, keys Label 14px (existing dt style).
  2. `Corriger la source` (LEAD-02): collapsed disclosure. Fields: `Source`, `Support (medium)`, `Campagne` (text, max 200, lowercase hint in `.pt-field-help`), `Motif de la correction` (textarea, required, 10 to 500 characters). Button `Enregistrer la correction` (`.pt-btn-primary`). Result appends a `source_corrected` event; the page shows `Source corrigée. L'ancienne valeur reste visible dans le journal.`
  3. `Effacer les données personnelles` (D-15): destructive card, collapsed disclosure. Explains the tombstone, requires `Motif` (closed list: `Demande de la personne`, `Fin de durée de conservation`, `Doublon`, `Autre`) and a typed confirmation of the lead email (the confirm button stays disabled until it matches, case-insensitive). Button `Effacer définitivement` (`.pt-btn-ghost` shape with `--warm` 1px border and `--warm` text; never accent fill). After confirm: success banner, page reloads in erased state.
- Mutation feedback: inline `.pt-success` (`CheckCircle`) or `.pt-error` (`AlertCircle`, `aria-live="polite"`), form values kept on error.

### A3. `/admin/entonnoir` (funnel, LEAD-08)

- Primary visual anchor: the headline strip (`.pt-funnel-kpis`) of four Display 32px figures at the top; the funnel table is the detail below it.
- `h1` `Entonnoir`. Controls (GET params): `Regrouper par` segmented control `.pt-seg` (`Source`, `Campagne`, `Mois`, with `Source + campagne + mois` as default combined view), `Période` month range (two `<input type="month">`, default last 6 months).
- Headline strip (4 `.pt-funnel-kpi` cards, grid 2 cols mobile / 4 cols desktop, 16px gap): `Leads`, `RDV`, `Signés`, `Coût par RDV (moyen)`, value in Display 32px mono, label Label 14px.
- Funnel table (`.pt-funnel-table`, one row per source/campagne/mois): columns `Source`, `Campagne`, `Mois`, `Visites`, `Simulations`, `Leads`, `Qualifiés`, `RDV`, `Signés`, `Coût par RDV`. Each stage after `Visites` shows count and, in `--ink-dim` `.pt-funnel-rate` (Label 14px) below, the conversion rate from the previous stage (`{n} %`). A subtle horizontal bar (4px high, `--ink-dim` fill on `--line`, width proportional to the row's visits) under the `Visites` and `Leads` cells is optional decoration; the numbers carry the meaning. Totals row pinned at the bottom, weight 500. Funnel is monotone by construction (RESEARCH); the UI never recomputes from status.
- Horizontal scroll inside `.pt-funnel-scroll` below 1024px with the first column sticky; unlike the leads table, `.pt-funnel-table` disables the `.pt-admin-table` card collapse (wide numeric data). Scroll container is focusable (`tabindex=0`, `aria-label="Tableau de l'entonnoir"`).
- `Coût par RDV` cell: shows the stored value in euros (`{n} €`, French number format) or `Non saisi` in `--ink-dim`. A text button `Saisir` / `Modifier` (`.pt-btn-text`) opens an inline editor (`.pt-lead-panel`) in the row: one numeric input `Coût par RDV (€)` (`inputmode=decimal`, > 0, max 2 decimals), `Enregistrer le coût` (`.pt-btn-primary`) and `Annuler la saisie` (`.pt-btn-ghost`; closes the editor, discards the typed value, returns focus to `Saisir` / `Modifier`). Stored in cents. Key = source + campagne + mois. Success message `Coût enregistré pour {source} / {campagne}, {mois}.`
- This is an internal cost figure for the owner: it never appears on any public path (the "no price" policy applies to public copy only).
- Empty state: heading `Pas encore de données`; body `L'entonnoir se remplit dès les premières visites avec source et les premières demandes. Revenez après la prochaine campagne.`

---

## Accessibility Contract

- Consent modal: native modal semantics, Escape neutralised on purpose, initial focus on the heading, both buttons keyboard-reachable in a fixed order, visible focus ring, contrast >= 4.5:1 text and >= 3:1 button borders (`--consent-border`), content readable at 320px and 200% zoom.
- Equal prominence is verified by a test: both buttons share the same class (`.consent-btn`) and computed size.
- Pills and badges carry text, never colour only. Status menu is keyboard operable.
- Every field has a visible `<label>`; errors via `aria-live="polite"`, `aria-invalid`, `aria-describedby`.
- Tables: real `<table>` with `<th scope>`; stacked-card collapse (leads list only) keeps label/value pairs readable by screen readers.
- Admin pages: `robots noindex, nofollow`, `lang="fr"`, titles `Leads | Administration`, `Détail du lead | Administration`, `Entonnoir | Administration`.
- `prefers-reduced-motion`: no transitions, no fade.

---

## Copywriting Contract

Admin copy: French, vouvoiement, short, no exclamation marks, no prices on any public path.

| Element | Copy |
|---------|------|
| Primary CTA (admin, status lost) | `Marquer comme perdu` |
| Primary CTA (cost) | `Enregistrer le coût` |
| Primary CTA (source correction) | `Enregistrer la correction` |
| Secondary: apply filters | `Appliquer les filtres` |
| Secondary: reset filters | `Réinitialiser` |
| Cancel: lost panel | `Annuler la perte` |
| Cancel: cost editor | `Annuler la saisie` |
| Empty state heading (leads) | `Aucun lead pour le moment` |
| Empty state body (leads) | `Les demandes du simulateur et du formulaire de contact apparaîtront ici avec leur source.` |
| Empty state heading (funnel) | `Pas encore de données` |
| Empty state body (funnel) | `L'entonnoir se remplit dès les premières visites avec source et les premières demandes. Revenez après la prochaine campagne.` |
| Error: status change | `Le statut n'a pas pu être modifié. Réessayez dans un instant.` |
| Error: lost without reason | `Choisissez un motif de perte avant de continuer.` |
| Error: correction without reason | `Indiquez le motif de la correction (10 caractères minimum).` |
| Error: cost invalid | `Saisissez un montant supérieur à 0, avec 2 décimales au plus.` |
| Error: generic admin | `Une erreur est survenue. Réessayez ou consultez les journaux.` |
| Success: status | `Statut mis à jour : {statut}.` |
| Success: source correction | `Source corrigée. L'ancienne valeur reste visible dans le journal.` |
| Destructive confirmation (erase) | `Effacer les données personnelles : Cette action est définitive. Le nom, l'e-mail, le téléphone et les notes de {nom} seront supprimés. La source et l'historique anonymisé sont conservés pour l'entonnoir. Saisissez {email} pour confirmer.` |
| Destructive button | `Effacer définitivement` |
| Lost reasons (closed list) | `Hors budget`, `A choisi un concurrent`, `Sans réponse`, `Hors cible`, `Projet abandonné`, `Autre` |
| Status labels | `Nouveau`, `Qualifié`, `RDV`, `Devis envoyé`, `Signé`, `Perdu` |

Consent modal copy (versioned, to be proofread; legal review required). `Accepter` / `Refuser` are locked by D-02 / LEAD-09:

| Element | FR | EN | TH |
|---------|----|----|----|
| Heading | `Votre choix sur les cookies` | `Your cookie choice` | `ตัวเลือกคุกกี้ของคุณ` |
| Body | `Nous mesurons l'audience du site pour l'améliorer. Avec votre accord, nous utilisons aussi des cookies pour mieux comprendre d'où viennent les visiteurs. Sans votre accord, aucune donnée n'est conservée sur votre appareil. Vous pouvez changer d'avis à tout moment.` | `We measure site traffic to improve it. With your consent, we also use cookies to understand where visitors come from. Without your consent, nothing is stored on your device. You can change your mind at any time.` | `เราวัดการเข้าชมเว็บไซต์เพื่อปรับปรุงบริการ หากคุณยินยอม เราจะใช้คุกกี้เพื่อทำความเข้าใจที่มาของผู้เข้าชมด้วย หากไม่ยินยอม จะไม่มีข้อมูลถูกเก็บในอุปกรณ์ของคุณ คุณเปลี่ยนใจได้ทุกเมื่อ` |
| Policy link | `En savoir plus` | `Learn more` | `ดูรายละเอียด` |
| Accept | `Accepter` | `Accept` | `ยอมรับ` |
| Refuse | `Refuser` | `Refuse` | `ปฏิเสธ` |
| Footer link | `Gérer les cookies` | `Manage cookies` | `จัดการคุกกี้` |
| Network error | `Votre choix n'a pas pu être enregistré. Réessayez.` | `Your choice could not be saved. Please try again.` | `ไม่สามารถบันทึกตัวเลือกของคุณได้ โปรดลองอีกครั้ง` |

Copy accuracy constraint: the body must stay true to the implemented behaviour (PostHog memory mode before consent, `sv_attr` choice per `ATTR_COOKIE_BEFORE_CONSENT`). If the owner flips to the strict variant, the body text and `CONSENT_VERSION` change together. `/mentions-legales` section 5 (IP "anonymisée") is aligned in the same plan.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (not initialized) | not required |
| Third-party | none declared | not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Verification

Check in a real browser at 320 to 390px and at 1280px: modal fits and scrolls, both consent buttons identical in size, `--consent-border` resolves outside `.pt-root`, status menu keyboard flow, funnel table horizontal scroll with sticky first column, 44px targets, contrast of every text token, and the modal appearing after (not during) the CinemaIntro. Manual pass in FR, EN and TH (Thai line-breaking and font fallback in the modal).
