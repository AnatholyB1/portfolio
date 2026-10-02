---
phase: 11
slug: lead-attribution-pipeline-consent
status: draft
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

Two style scopes, both reusing existing tokens (`--bg`, `--bg-2`, `--bg-3`, `--acid`, `--ink`, `--ink-dim`, `--ink-faint`, `--line`, `--line-strong`, `--warm`). No new colour token.

- **Public scope (consent modal, footer link):** public site design system from `globals.css` (existing `.btn`, `.label`, `.mono` classes where they fit). No GSAP, no reveal animation on the modal. A 150ms opacity fade is allowed, disabled under `prefers-reduced-motion`.
- **Admin scope (`/admin/leads`, `/admin/leads/[id]`, `/admin/entonnoir`):** Phase 10 admin/portal styles (`admin.css`, `portal.css`, `.pt-root`, `--pt-border-strong: #6F6B64` for resting borders of inputs, selects, ghost buttons). New classes live in `src/components/admin/admin.css` under an `.ad-` prefix. Admin never imports `gsap`, `three`, `CinemaIntro`, `CustomCursor`, `LanguageContext`, or public `Navbar`/`Footer` (existing import-boundary test applies). French only, no `useLanguage()`.

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
- Consent modal: max-width 480px, width `calc(100vw - 32px)` below 512px, max-height `calc(100dvh - 32px)` with internal scroll. Radius 12px (cards) and 100px pill buttons (site convention).
- Admin leads page uses the 1120px shell width; lead detail uses a two-column grid (main 2fr, side 1fr, 32px gap) at >= 1024px, single column below.

---

## Typography

Exactly 4 sizes and 2 weights (400, 500), identical to Phase 10. No 12px text.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px Manrope (modal text, table cells, form text, notes, helper and error text) | 400 (500 for buttons and pill text) | 1.5 |
| Label | 14px (field labels sentence case in `--ink-dim`; table headers JetBrains Mono uppercase, letter-spacing 0.08em; status pills; funnel column headers; footer link) | 500 labels and pills, 400 table headers | 1.5 |
| Heading | 24px Space Grotesk, letter-spacing -0.02em (modal title, page `h1`, card titles) | 500 | 1.2 |
| Display | 32px JetBrains Mono, tabular figures (funnel headline counts only: leads, RDV, signés totals) | 500 | 1.2 |

Numeric columns in the table and funnel use `font-variant-numeric: tabular-nums`, right-aligned.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0A0B0C` (`--bg`) | Page background; modal backdrop is `rgba(10,11,12,0.8)` |
| Secondary (30%) | `#111213` (`--bg-2`) cards, modal surface, table; `#16181a` (`--bg-3`) row hover, inputs; borders `--line` / `--line-strong` | Modal, admin cards, tables, filters |
| Accent (10%) | `#C4F542` (`--acid`) | See reserved list |
| Destructive / error | `#E07856` (`--warm`) | Error messages, invalid field border, the `Effacer les données` confirm button border and text. Nothing else |
| Text | `--ink` `#ECEAE3`, `--ink-dim` `#9A9690`, `--ink-faint` `#5A5751` (decorative or disabled only) | As Phase 10 |

Accent reserved for (and nothing else):
1. The single primary button per view: modal has none (see equality rule below); admin: `Enregistrer le coût`, `Enregistrer la correction`, `Confirmer`, black `#000` text on `--acid`.
2. The keyboard focus ring (2px `--acid`, 2px offset) on every interactive element, including both modal buttons.
3. The 2px left indicator of the active filter chip and the active admin nav item.
4. The `Signé` pill dot (8px) only.

Consent equality rule (LEAD-09, D-02, locked): `Accepter` and `Refuser` are two identical ghost-style pill buttons: same size, same padding, same font (16px, 500), same 1px `--pt-border-strong` border, same `--ink` text on `--bg-3`, same hover. NEITHER uses the accent fill, because the accent would favour one choice. They sit side by side (equal `flex: 1`) at >= 400px, stacked at equal full width below, with the DOM order `Refuser` then `Accepter` on neither emphasis basis (order fixed: `Refuser`, `Accepter`, left to right and top to bottom). (assumed)

Status pills are never colour-only: each has a text label plus a distinct lucide icon or dot shape. Pill styling is neutral (`--bg-3` fill, 1px `--line-strong`, `--ink` text); `Perdu` uses `--ink-dim` text with a `XCircle` icon, not `--warm` (warm means error).

---

## Screens and Interaction Contract

### C1. Consent modal (public, all locales)

Source: D-02, D-03, D-04, RESEARCH Pattern 6.

- Language decision: FR + EN + TH, through `src/lib/consent/text.ts` keyed by the existing `LanguageContext` locale, since the public site is trilingual. The log stores `locale` and `version`. TH and EN strings are translations of the FR source and must be proofread before launch (flag in plan). (assumed, resolves RESEARCH Open Question 2)
- Component: client component `ConsentDialog` mounted in `layout.tsx` next to `ClientProviders`. Native `<dialog>` + `showModal()`: inert background, native focus trap. SSR renders nothing; decision made after mount from `document.cookie` (`sv_consent`). Never call `cookies()` in a Server Component.
- Visibility: shown when the cookie is absent, expired, or its `version` differs from `CONSENT_VERSION`. Not shown on private paths (`isPrivatePath`) and not shown on `/mentions-legales` (so the visitor can read the policy). First-time visitors see it AFTER `CinemaIntro` ends or is skipped, never together.
- Blocking behaviour: `cancel` event (Escape) is `preventDefault()`ed; backdrop click does nothing. No close button.
- Layout (top to bottom, 16px gaps, 24px padding): heading (Heading 24px, `h2`, `tabIndex=-1`, receives initial focus so neither button is favoured), body paragraph (Body 16px, `--ink-dim` `--ink`), a text link to `/mentions-legales#cookies` (Label 14px, underlined, opens in the same tab and then the modal stays hidden on that page), then the two equal buttons.
- `aria-labelledby` (heading), `aria-describedby` (body). Language of the dialog content follows the active locale (`lang` attribute set on the dialog when different from page).
- Behaviour on click: disable both buttons, POST `/api/consent`, on success close and apply PostHog config (`buildPostHogConfig`); on Accept with a click id in `location.search`, `location.reload()`. On network error: keep the modal open, show inline error (`aria-live="polite"`, `--warm` text with `AlertCircle`), buttons re-enabled. Never silently treat an error as a choice.
- Reopen: footer link `ManageCookiesLink` opens the same dialog through a shared store; the current choice is not pre-highlighted. Close is only possible by choosing.
- Mobile 320px: buttons stacked, modal scrolls internally, body not truncated.
- Motion: none beyond a 150ms opacity fade (off under reduced motion).

### C2. Footer link "Gérer les cookies"

Added to `Footer.tsx`. Text link (Label 14px, `--ink-dim`, underline on hover/focus, 44px hit area) next to existing legal links. Label via `translations.ts`. It is a `<button type="button">` styled as a link (opens a dialog, not a navigation).

### A1. `/admin/leads` (list, LEAD-07)

- Admin nav in the existing header: `Clients`, `Leads`, `Entonnoir`. Active item: 2px accent underline, `aria-current="page"`. Page `h1` `Leads`.
- Filter bar (card, 16px padding, 16px gap, wraps): `Statut` select (all six statuses + `Tous`), `Source` select (distinct frozen sources + `Toutes`), `Retours uniquement` checkbox. Filters are GET params (URL state, shareable, work without JS); applied via a `Filtrer` button (secondary ghost) and a `Réinitialiser` text link. Active filters shown as chips with 2px accent left indicator.
- Table columns: `Lead` (name, 500; email below in `--ink-dim`), `Source` (frozen `source / medium`, campaign below in `--ink-dim`), `Statut` (pill, interactive), `Arrivé le`, `Dernier contact`, `Retour` (badge). Sorted by `Dernier contact` descending. Pagination: 25 rows per page, `Précédent` / `Suivant` text buttons. Row click or the name link goes to the detail page. Row hover `--bg-3`. Below 768px rows collapse to stacked cards (name, source, pill, dates).
- "Lead revenu" notification (resolves discretion, D-12): a badge `Revenu` (pill, `RotateCcw` icon + text, Label 14px) in the `Retour` column and next to the name until the admin opens the detail page (clears `unseen_return`), plus a Resend notification email whose subject/first line contains `Lead revenu`. A count chip `N à revoir` sits above the table, linking to the `Retours uniquement` filter. (assumed)
- Status pill, one gesture: the pill is a `<details>`-style disclosure button (`aria-haspopup="menu"`, 44px hit area) listing the other statuses as `<form action>` buttons (works without JS): Nouveau, Qualifié, RDV, Devis envoyé, Signé, Perdu. Picking any status except `Perdu` posts immediately (server action, `requireAdmin()`, `revalidatePath`), shows a polite live-region message `Statut mis à jour : {statut}.`. Pending: pill shows `Enregistrement...` and is disabled. Keyboard: Enter/Space opens, arrows move, Escape closes and returns focus to the pill.
- `Devis envoyé` is available but carries the helper tag `Manuel` in the menu (set by hand until phase 13) (assumed).
- Choosing `Perdu` opens an inline panel under the row (not a modal): `Motif de perte` radio group (closed list, required): `Hors budget`, `A choisi un concurrent`, `Sans réponse`, `Hors cible`, `Projet abandonné`, `Autre`; optional `Note` textarea (max 500 characters, counter in Label style); buttons `Marquer comme perdu` (primary, accent) and `Annuler` (ghost). Submit is disabled until a reason is chosen. The note goes to `sv_lead_notes` (erasable).
- Empty state (no lead): heading `Aucun lead pour le moment`; body `Les demandes du simulateur et du formulaire de contact apparaîtront ici avec leur source.`
- Empty state (filters match nothing): heading `Aucun lead ne correspond`; body `Modifiez ou réinitialisez les filtres pour voir plus de résultats.` with `Réinitialiser` link.

### A2. `/admin/leads/[id]` (lead detail)

- Breadcrumb `Retour aux leads`. Header: name (Heading), status pill (same component), frozen source line `Source figée : {source} / {medium}{ / campagne}`, badges `Revenu` and `Lead précédent : {date}` (link to the previous lead, D-13) when applicable. Erased leads show a banner `Données personnelles effacées le {date}` and all PII fields render as `Effacé`.
- Main column cards (32px gap):
  1. `Contacts`: chronological list, one entry per submission: date, channel (`Simulateur` / `Formulaire de contact`), identity (email, phone when present), answers or message. Consent snapshot line: `Consentement cookies : {Accepté|Refusé} le {date} (version {v})`.
  2. `Journal` (read-only timeline from `sv_lead_events`): date, actor, event label (`Lead créé`, `Contact ajouté`, `Statut modifié : X vers Y`, `Source corrigée`, `Lead lié`, `Données effacées`), reason code in plain French. No edit or delete controls anywhere on the journal; a Label-style line states `Le journal est en lecture seule.`
- Side column cards:
  1. `Attribution`: two definition lists `Premier contact` and `Dernier contact` (source, medium, campagne, contenu, terme, page d'atterrissage, référent; click ids shown only if present, truncated with `title`). Value font Body 16px, keys Label 14px.
  2. `Corriger la source` (LEAD-02): collapsed disclosure. Fields: `Source`, `Support (medium)`, `Campagne` (text, max 200, lowercase hint), `Motif de la correction` (textarea, required, 10 to 500 characters). Button `Enregistrer la correction` (accent). Result appends a `source_corrected` event; the page shows `Source corrigée. L'ancienne valeur reste visible dans le journal.`
  3. `Effacer les données personnelles` (D-15): destructive card, collapsed disclosure. Explains the tombstone, requires `Motif` (closed list: `Demande de la personne`, `Fin de durée de conservation`, `Doublon`, `Autre`) and a typed confirmation of the lead email (the confirm button stays disabled until it matches, case-insensitive). Button `Effacer définitivement` with `--warm` 1px border and `--warm` text (never accent fill). After confirm: success banner, page reloads in erased state.
- Mutation feedback: inline success banner (`CheckCircle`) or error banner (`AlertCircle`, `aria-live="polite"`), form values kept on error.

### A3. `/admin/entonnoir` (funnel, LEAD-08)

- `h1` `Entonnoir`. Controls (GET params): `Regrouper par` segmented control (`Source`, `Campagne`, `Mois`, with `Source + campagne + mois` as default combined view), `Période` month range (two `<input type="month">`, default last 6 months).
- Headline strip (4 cards, grid 2 cols mobile / 4 cols desktop, 16px gap): `Leads`, `RDV`, `Signés`, `Coût par RDV (moyen)`, value in Display 32px mono, label Label 14px.
- Funnel table (one row per source/campagne/mois): columns `Source`, `Campagne`, `Mois`, `Visites`, `Simulations`, `Leads`, `Qualifiés`, `RDV`, `Signés`, `Coût par RDV`. Each stage after `Visites` shows count and, in `--ink-dim` Label style below, the conversion rate from the previous stage (`{n} %`). A subtle horizontal bar (4px high, `--ink-dim` fill on `--line`, width proportional to the row's visits) under the `Visites` and `Leads` cells is optional decoration; the numbers carry the meaning. Totals row pinned at the bottom, weight 500. Funnel is monotone by construction (RESEARCH); the UI never recomputes from status.
- Horizontal scroll inside the table card below 1024px with the first column sticky; no card-collapse for this table (wide numeric data). Scroll container is focusable (`tabindex=0`, `aria-label="Tableau de l'entonnoir"`).
- `Coût par RDV` cell: shows the stored value in euros (`{n} €`, French number format) or `Non saisi` in `--ink-dim`. A pencil text button `Saisir` / `Modifier` opens an inline editor in the row: one numeric input `Coût par RDV (€)` (`inputmode=decimal`, > 0, max 2 decimals), `Enregistrer le coût` (accent) and `Annuler`. Stored in cents. Key = source + campagne + mois. Success message `Coût enregistré pour {source} / {campagne}, {mois}.`
- This is an internal cost figure for the owner: it never appears on any public path (the "no price" policy applies to public copy only).
- Empty state: heading `Pas encore de données`; body `L'entonnoir se remplit dès les premières visites avec source et les premières demandes. Revenez après la prochaine campagne.`

---

## Accessibility Contract

- Consent modal: native modal semantics, Escape neutralised on purpose, initial focus on the heading, both buttons keyboard-reachable in a fixed order, visible focus ring, contrast >= 4.5:1 text and >= 3:1 button borders, content readable at 320px and 200% zoom.
- Equal prominence is verified by a test: both buttons share the same class and computed size.
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

Consent modal copy (versioned, to be proofread; legal review required):

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

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Verification

Check in a real browser at 320 to 390px and at 1280px: modal fits and scrolls, both consent buttons identical in size, status menu keyboard flow, funnel table horizontal scroll with sticky first column, 44px targets, contrast of every text token, and the modal appearing after (not during) the CinemaIntro. Manual pass in FR, EN and TH (Thai line-breaking and font fallback in the modal).
