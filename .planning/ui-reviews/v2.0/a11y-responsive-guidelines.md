# v2.0 UI review: accessibility, responsive, performance hygiene, Web Interface Guidelines

Scope: milestone v2.0 (phases 10-19), code-level review only. No browser run, no src changes.
Method: `web-design-guidelines` (Vercel rules, fetched live) + `audit` skill dimensions.
Contrast ratios are computed from the token hex values (WCAG relative luminance). Items marked "verify" were inferred from code and need a quick browser check.

Files covered: `src/app/{espace-client,connexion,admin,avis,politique-des-avis,desinscription}/**`, `src/components/{portal,admin,consent}/**`, `AvisExcerpt.tsx`, and `portal.css`, `admin.css`, `leads.css`, `funnel.css`, `links.css`, `globals.css` (plus `client.css`, `project.css`, `pilotage.css`, `projects.css`, `reviewForm.css`, `consent.css`).

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Strong base (native `<dialog>`, labels, `aria-invalid`, 2px focus ring, reduced motion). Gaps: `--ink-faint` contrast, no skip link, conditional live regions |
| 2 | Performance | 3/4 | No heavy libraries, SVG chart is hand-rolled. Gaps: `AvisExcerpt` client fetch (CLS), no `loading.tsx` |
| 3 | Responsive | 2/4 | Tables and gutters are well handled. `AdminNav` does not fit at 360px (8 links, no wrap or scroll) and `body{overflow-x:hidden}` hides it |
| 4 | Theming | 3/4 | Tokens used throughout. Undefined `--pt-surface`/`--pt-border` in `.pt-dialog`, no `color-scheme` |
| 5 | Anti-patterns | 3/4 | Sober back-office look, no AI tells. Minor: duplicated nowrap/label hacks |
| **Total** | | **14/20** | Good. Fix the HIGH items and the nav before release |

Anti-patterns verdict: PASS. The private areas look intentional (mono labels, acid accent reserved for focus and primary actions, no gradients or glassmorphism). The only tell-adjacent item is the `// AVIS VÉRIFIÉS` mono eyebrow on the public excerpt, which is consistent with the site language.

## Findings

### HIGH

**H1. AdminNav overflows at 360px and the overflow is silently clipped**
- `src/components/admin/leads/leads.css:3-9` (`ul { display:flex; gap:24px }`, no `flex-wrap`, no `overflow-x`); markup in `src/components/admin/AdminNav.tsx:124-137`.
- 8 links (Clients, Leads, Projets, Entonnoir, Liens, Pilotage, Avis, E-mails) need roughly 650px. At 360px (328px content) the list overflows, and `globals.css` sets `body { overflow-x: hidden }`, so the last items (Pilotage, Avis, E-mails) are unreachable on phones, with no scrollbar. At 768px it is also tight (about 704px content).
- Also, `AdminNav` imports `leads.css` (line 2), so nav styling depends on a leads stylesheet.
- Fix: make `ul` `flex-wrap: wrap; gap: 4px 20px` or `overflow-x:auto` with `scrollbar-width:thin` and a visible fade; move nav rules into `admin.css`. Keep 44px height.

**H2. `--ink-faint` (#5A5751) fails contrast: about 2.7:1 on --bg, 2.5:1 on --bg-2**
- Text use: `src/app/politique-des-avis/page.tsx:39` ("Dernière mise à jour", 14px) fails 4.5:1 (WCAG 1.4.3).
- Non-text use: `src/components/portal/project/project.css:44` step marker border (2px, `--ink-faint`) fails 3:1 (WCAG 1.4.11) for the "not yet done" state, which carries meaning.
- Also `portal.css:371` disabled nav item (exempt as disabled, OK) and the global helpers `.label` / `.faint` in `globals.css:62,66` (any in-scope use of these classes inherits the failure).
- Fix: use `--ink-dim` (#9A9690, about 6.7:1 on --bg, 6.0:1 on --bg-3) for text, and `--pt-border-strong` (#6f6b64, about 3.7:1) for the marker border. Do not use `--ink-faint` for any informational text.

**H3. No `loading.tsx` / `error.tsx` anywhere in the private routes**
- Searched `src/app/{espace-client,admin,avis,connexion,desinscription}`: none exist (nor a root `error.tsx`/`global-error.tsx`).
- Every admin page does multiple awaited Supabase reads (`app/admin/page.tsx:24-45`, pilotage, entonnoir). With no `loading.tsx` the user sees a frozen previous page, and an exception shows the Next default error page, which is unbranded and in English.
- Fix: add `app/admin/loading.tsx`, `app/espace-client/loading.tsx` (reuse `.pt-main` skeleton or a `role="status"` "Chargement…" line) and `error.tsx` per segment with a French message, a "Réessayer" button and a link back. This also closes the empty/loading/error consistency gap.

**H4. Conditionally mounted live regions are not reliably announced**
- `src/components/consent/ConsentDialog.tsx` (`{failed && <p className="consent-error" aria-live="polite">`): a live region that is inserted already containing text is often not announced. Use `role="alert"`, or keep the element mounted and change its text.
- Same pattern: `src/components/admin/leads/StatusPill.tsx` (sr-only `aria-live` is mounted, good) but `<p className="pt-error">` right below has no role (error not announced). `LoginForm.tsx:78-82` `role="status"` notice is mounted with content on first render (not announced after a redirect, acceptable, but on client re-renders it is).
- Fix: mounted-but-empty container + text update (pattern already used correctly at `LoginForm.tsx:168`, `ReviewForm.tsx` counter, `HideReviewDialog.tsx:58`), or `role="alert"` for errors.

### MEDIUM

**M1. No skip link, and `<main>` is not the first focusable target**
- `src/components/portal/ShellHeader.tsx`, `AdminNav.tsx`, `ShellMain.tsx`. Keyboard users tab through the header, sign-out and 8 admin nav links on every admin page. Rule: "include skip link".
- Fix: first child of `.pt-root` (in the three layouts): `<a href="#contenu" className="pt-skip">Aller au contenu</a>`, `id="contenu" tabIndex={-1}` on `<main>` in `ShellMain.tsx:7`. Show on focus only.

**M2. `autoFocus` on mobile-relevant inputs**
- `LoginForm.tsx:105` (email), `OtpInput.tsx:72` (code), `CostEditor.tsx:62`, `RecurringRowActions.tsx:63`, `VoidCostPanel.tsx:41`.
- On phones it opens the keyboard immediately and scrolls the page, hiding the helper text. For the OTP step and for the disclosure panels (where focus moves after a user action) it is justified; for the first email field on `/connexion` it is not.
- Fix: keep for OTP and for panels opened by a click; remove on the email step or restrict to `(pointer:fine)` via `useEffect` + `matchMedia`.

**M3. Loading labels use three dots instead of the ellipsis character**
- `ConfirmForm.tsx:41` "Connexion en cours...", `LoginForm.tsx:113` "Envoi en cours...", `LoginForm.tsx:150` "Vérification...", `StatusPill.tsx:84` "Enregistrement...". Other places already use `…` (`ReviewForm.tsx` "Publication en cours…", `ConvertDialog.tsx`). Fix: replace with `…` (preceded by a normal letter, French typography: no space before `…`).
- Also, `LoginForm.tsx:112-114`: the button text changes but nothing is announced; the pending state is conveyed by `disabled` only. Acceptable, but a `role="status"` line (as in `ReviewForm.tsx` end) would be consistent.

**M4. French typographic details**
- Counters/units without non-breaking space: `ReviewForm.tsx` `{body.length} / {REVIEW_BODY_MAX}` (use `&nbsp;/&nbsp;`), "Encore {missing} caractères minimum", "Note (de 1 à 5)" and `${value} sur 5` in `ReviewRatingInput.tsx:87` (use `U+00A0`).
- `TreasuryChart.tsx` is the only in-scope file using nbsp/narrow nbsp for amounts; check that `format.ts` helpers used by the other tables (`formatDateFr`, euro formatters) emit `U+202F`/`U+00A0` before `€` and between thousands (rule: `Intl.NumberFormat` with `fr-FR` does this natively; hand-built formats do not).
- `politique-des-avis/page.tsx:40` hardcodes the date "8 octobre 2026" (fine for a legal page, but should come from a constant next to the policy version).
- No `text-wrap: balance` on `.pt-heading` / `.pt-display` (portal.css:32-49): headings wrap with orphans at 360px. Add `text-wrap: balance`.
- Numeric table columns: `tabular-nums` exists in funnel, pilotage, project and projects CSS but not on `.pt-table td` in `portal.css:473`. Add `font-variant-numeric: tabular-nums` for money columns (clients, leads tables use dates and SIRET).

**M5. `.pt-dialog` depends on undefined variables and viewport units**
- `src/components/admin/leads/leads.css:373-387`: `var(--pt-surface, #14161a)` and `var(--pt-border, rgba(...))` are not defined anywhere, so the hardcoded fallbacks always apply (theming drift: `--bg-2` is #111213). `max-height: calc(100vh - 32px)` breaks on mobile browsers with dynamic toolbars (use `100dvh`, as `consent.css` already does).
- The dialog is defined in `leads.css` but used by `HideReviewDialog` (which imports both `admin.css` and `leads.css` for it) and `ConvertDialog`. Move `.pt-dialog` to `portal.css` and use `--bg-2` / `--line-strong`.
- Missing: `overscroll-behavior: contain` on the dialog, `margin: auto` is UA default (ok), no fade (fine, consistent with D-11).
- Dialog behaviour is otherwise solid: native `showModal()` gives focus trap, Esc, inert background, `aria-labelledby` + `aria-describedby`, focus return to the trigger (`HideReviewDialog.tsx:38-42`). `ConvertDialog` should also return focus to its trigger on cancel (verify, only `HideReviewDialog` does it explicitly).

**M6. Consent dialog cannot be dismissed with Esc (`onCancel` preventDefault)**
- `ConsentDialog.tsx` (`onCancel={(e) => e.preventDefault()}`) is a deliberate design (a choice is required) and a keyboard user can still reach both buttons, so it is not a trap. However, it also means the dialog is modal on the first visit with no "decide later". Confirm this is the intended CNIL behaviour (both buttons present and equal weight: yes, same `.consent-btn` for refuse and accept, good).
- `consent.css:25` `.consent-title:focus { outline:none }` is acceptable (programmatic focus on a heading, `tabindex=-1`), but prefer `:focus:not(:focus-visible)`.
- `consent.css:4,13-16`: `width: 480px` with a `max-width` and a `<512px` override: OK at 360px (328px wide).

**M7. Popovers inside scroll containers (verify)**
- `funnel.css:110-111` `.pt-funnel-scroll { overflow-x:auto }` contains `CostEditor` whose `.pt-lead-panel` is `position:absolute` (`leads.css:207-217`). An `overflow-x:auto` container forces `overflow-y:auto` too, so the panel (about 200px tall) in the last row is clipped or creates an inner vertical scroll. At <768px the panel is `static`, so it enlarges the cell instead (acceptable).
- Same for the `StatusPill` menu (`leads.css:73-84`) if the leads table is ever placed in a scroll container (it is not today: card layout on mobile).
- Fix: use the native Popover API / `<dialog>`, or render the panel below the table row (static) at all widths.

**M8. Table semantics on mobile and the funnel table**
- Good: `ClientsTable.tsx:37-67` and `LeadsTable.tsx:47-90` add explicit `role` attributes and `<caption className="pt-sr-only">`, which compensates for `display:block` stacking (`portal.css:484-518`); `data-label` provides the stacked headers. Pattern to keep for every other table.
- Gap: the stacked-card pattern repeats the `data-label` text visually only (via `::before`, not read by AT in all browsers): acceptable because the role=cell + columnheader mapping is explicit.
- `.pt-table th` uses 14px mono uppercase `--ink-dim` on `--bg-2`: contrast OK (6.3:1).
- Funnel table (`funnel.css:109-115`): `min-width: 960px` inside a scroll wrapper, and `:focus-visible` outline on the wrapper (line 107 area) means the wrapper must be `tabindex=0` with a label. Verify `FunnelTable.tsx` sets `tabIndex={0}`, `role="region"` and `aria-label` (WCAG 2.1.1: scrollable region must be keyboard reachable). Sticky first column (`th[scope=row]`, `left:0`) is good.
- Empty state: `LeadsTable` has no in-table empty branch (check the page `app/admin/leads/page.tsx` renders `pt-empty`); `ClientsTable` does.

**M9. `AvisExcerpt` loads reviews with a client `fetch` after hydration**
- `src/components/sections/AvisExcerpt.tsx:54-72`. The section is `null` until the fetch resolves, then mounts about 400px of content in the middle of the home page: layout shift (CLS) for anything below it, a request waterfall (JS download, hydrate, fetch), and no content for crawlers (negates the review structured data intent if the section is meant to be indexable).
- Fix: make the parent a server component that calls the data layer directly and passes `reviews` to `AvisExcerptView` (already split out and pure). If it must stay client-side, reserve `min-height` for the section.
- Small a11y: `text-xs` (12px) mono eyebrow `// AVIS VÉRIFIÉS` is decorative; the `//` is read by screen readers. Use `aria-hidden="true"` on the prefix or hide the eyebrow.

**M10. No `color-scheme` / `theme-color` for native controls**
- `app/layout.tsx` only sets `lang="fr"`. Native pickers (`input[type=month]` in `funnel.css:~95`, the `<select>` popups, scrollbars, date inputs) render with light chrome on the dark UI; the month picker icon is dark-on-dark. Add `color-scheme: dark` to `:root` (or `.pt-root`) and `export const viewport = { themeColor: '#0A0B0C', colorScheme: 'dark' }`.

### LOW

**L1. Forms: attributes**
- Good: email (`autoComplete="email" inputMode="email"`), OTP (`one-time-code`, `inputMode=numeric`, `pattern`), onboarding billing fields (`billing street-address`, `postal-code`), `autoComplete="off"` on admin non-auth fields, labels with `htmlFor` everywhere, `aria-invalid` + `aria-describedby`, error summary with focus (`ReviewForm.tsx` `summaryRef`, `role="alert"`).
- Missing: `spellCheck={false}` on email/code/SIRET/URL inputs (`LoginForm.tsx:96`, `OtpInput.tsx:55`, `InviteForm.tsx:99`, `CompanyLookupFields.tsx:190`); `autoCapitalize="off"` on email fields.
- `ReviewForm.tsx` initial field (`rv-initial`, maxLength 1) lacks `autoComplete="off"`, and the title/body fields lack `name`/`autoComplete="off"`. `rv-first` has `given-name` (good).
- `CostForms.tsx:62,132,207,212` and `CostEditor.tsx` use `type="text" inputMode="decimal"` for euros: right choice for FR comma decimals; add placeholders with a pattern and an ellipsis ("12,50…") per the guideline.
- `ConvertDialog.tsx` uses `noValidate` plus `required`: errors come from the server only. Fine, but the first invalid field should be focused after a failed submit (the summary alert is announced, focus is not moved).
- `LoginForm.tsx:83-90`: `noValidate` + server error with `aria-describedby="pt-email-error"` pointing at an id that exists only when an error renders (see `ErrorMessage`); a dangling `aria-describedby` is harmless.
- Placeholders: none used as labels (good).

**L2. Rating control (`ReviewRatingInput.tsx:50-90`)**
- Good: `role=radiogroup`, roving tabindex, arrow/Home/End keys, 44x44 targets, `aria-label="n sur 5"`, `aria-invalid`.
- Issue: arrow keys change the value on focus move (matches native radios, acceptable). Visual-only value text is `aria-hidden`; fine because `aria-checked` carries it. The group has `aria-label` but the visible label `<span id="rv-rating-label">` (`ReviewForm.tsx` about line 17) is not wired: use `aria-labelledby="rv-rating-label"` so the visible and accessible names match, and mark the field required (`aria-required="true"` on the radiogroup plus "(obligatoire)" in the label).
- Unselected star stroke `--pt-border-strong` is 3.7:1 (passes 1.4.11).

**L3. Touch targets**
- Meets 44px for buttons, inputs, nav, pills, menu items, stars (`min-height:44px` throughout).
- Below 44 (WCAG 2.2 AA minimum is 24px, so these pass 2.5.8 but not the stricter 44px project rule): inline links `.pt-client a` `min-height:24px` (`client.css:89`), `projects.css:72`, `project.css:96,252,366` (24px), step marker 24px (not interactive). Native checkbox/radio are 20px but their `<label>` row is 44px (good, `reviewForm.css:147-153`).
- `OtpInput`: the real input is stretched over all cells (`portal.css:209-221`), so the whole row is a 44px+ target.

**L4. Focus visibility**
- Global ring is consistent: `portal.css:520-529` 2px `--acid` with 2px offset (acid on dark is about 14:1). `.pt-otp-input` uses `:has()` ring on the wrapper (`portal.css:222-229`): good.
- `.pt-sign-otp:focus-visible` (`project.css:~490`) swaps `outline` for a 2px border (changes box size by 1px, causing a small layout jump); use `outline` instead.
- `outline:none` only where a replacement exists (`consent.css:25`, `portal.css:530`, `project.css:491`). No bare `outline-none`. No `transition: all` in scope (verified by grep).
- Public pages (Tailwind-based `politique-des-avis`, `AvisExcerpt`) use default browser focus rings: acceptable (verify `globals.css` for a global `:focus-visible`).

**L5. Reduced motion**
- Covered: `portal.css:534-541` (global kill for `.pt-root`), `consent.css:55`, `reviewForm.css:177`, `leads.css:365`, `links.css:134`, `globals.css` `[data-reveal]` and cursor. Transitions are colour-only, no layout properties animated. Pass.

**L6. Responsive container**
- Gutters: `.pt-main` 16px at <768 and 32px after (`portal.css:394-413`), `.pt-auth` 32px 16px (line 74), header 16px: matches the 16px rule at 360px. Grids collapse at 768 (`.pt-grid-2`, `.pt-company-grid`). Header title truncates (`client.css:21-28`) so the sign-out button stays visible.
- `ConsentDialog` and `.pt-dialog` use `min(640px, 100vw - 32px)`: 16px gutter.
- Fixed `min-width: 200px/240px` on menus/forms (`leads.css:77`, `pilotage.css:146`) are fine inside 328px.
- Iframe previews: 480px high on mobile (`projects.css:26-29`, `project.css:577` 720px at >=640): fine; PDFs inside `iframe` on iOS Safari show only the first page and are not scrollable (verify; offer an "Ouvrir le PDF" link as a fallback).
- Potential horizontal scroll at 360: AdminNav (H1), funnel table (intentional, inside its own scroller), and `.pt-pilot-table td[data-label=Action] form { min-width:240px }` (`pilotage.css:146`) inside the stacked card layout (ok at 328px).

**L7. Heading structure**
- One `h1` per page, except: `app/espace-client/page.tsx` has 2 `<h1>` literals (probably branches, verify only one renders at a time), `app/avis/[token]/page.tsx` has 2 (same check). `/connexion` and `/desinscription` use `AuthCard` (title via the component, `h1#pt-auth-title`): fine.
- `ShellHeader` uses a `<span class="pt-heading">` for the client or admin name: right (not a heading).
- `ClientsTable.tsx:25` empty state uses `<h3>` directly under an `<h2>`: correct.
- No `scroll-margin-top` on anchored headings (`#avis`, `#cookies` anchors): the public Navbar is fixed, so jumps land under it. Add `scroll-margin-top: 96px` to anchor targets.

**L8. Charts and media**
- `TreasuryChart.tsx:42-48`: `role="img"` + `aria-label` + `<title>` and per-bar `<title>` + a textual description: very good. Legend uses colour swatches plus text. Check the series are distinguishable without colour (swatch classes `-line`, `-fill`, `-outline` suggest different shapes: good).
- No raster `<img>` in scope (icons are inline lucide with `aria-hidden`). No image optimisation issues.
- Blob URLs for PDF previews are revoked (`PreviewIssuePanel.tsx:60-77`, `PeriodInvoiceForm.tsx:80-97`, `CreditNoteForm.tsx:62-78`): good.

**L9. Keyboard menus**
- `StatusPill.tsx:49-67` menu implements Escape, ArrowUp/Down and focus return; it is missing Home/End, Tab-to-close and outside-click close (verify). `role="menu"` demands those behaviours; alternatively drop the menu role and use a disclosure of plain buttons.

**L10. Misc hygiene**
- Inline `style={{ minHeight: 44 }}` / `marginTop: 16` repeated in `HideReviewDialog.tsx`, `ConvertDialog.tsx`, admin pages (`app/admin/page.tsx:63`): move to utility classes (`.pt-stack`, `.pt-mt-16`) to keep the CSS contract.
- Language: `ConsentDialog.tsx` sets `lang={lang}` on the dialog (good for the EN/FR switch). The private areas are French-only by decision (D-12).
- Brand name "Sèvalys" is read by TTS as "Sevalys": optional `translate="no"` is not needed (French page).
- `rel`/`target`: no external `target=_blank` in scope found.
- Large lists: no list over 50 items rendered unvirtualized in scope has been found (admin tables are paginated or small, verify `app/admin/projets/page.tsx` and `liens/page.tsx` for unbounded queries).
- `OnboardingCard.tsx` (570 lines) and `SigningFlow.tsx` (473) are the heaviest client components: they are isolated to the client portal project page; consider `next/dynamic` for `SigningFlow` (only needed when a document is awaiting signature).

## Pass / fail checklist

| Check | Result |
|---|---|
| Form controls have labels / `htmlFor` | PASS |
| Error identification (`aria-invalid`, `aria-describedby`, alert, summary focus) | PASS (review form), PARTIAL (login: focus not moved) |
| Async status announced (`aria-live` / `role=status`) | PARTIAL (H4) |
| Modal focus trap, Esc, focus return | PASS (native `<dialog>`; verify focus return in ConvertDialog) |
| Visible focus on all interactives | PASS (global `:focus-visible` ring) |
| No bare `outline:none`, no `transition:all` | PASS |
| Skip link | FAIL (M1) |
| Heading hierarchy, one h1 | PASS (two files to verify, L7) |
| Landmarks (`header`, `nav aria-label`, `main`, `footer`) | PASS |
| Text contrast: `--ink`, `--ink-dim`, `--warm`, acid on dark | PASS (>= 6:1) |
| Text contrast: `--ink-faint` | FAIL (H2, about 2.7:1) |
| Non-text contrast (field borders `--pt-border-strong`) | PASS (3.7:1); step marker FAIL (H2) |
| Target size 44px | PASS (inline links 24px, L3) |
| Reduced motion | PASS |
| Table headers / scope / caption | PASS |
| Table mobile overflow | PASS (stacked cards; funnel in scroller, verify keyboard access) |
| Admin nav at 360px | FAIL (H1) |
| 16px gutters, no horizontal scroll at 360/768/1280 | PASS except H1 |
| `autocomplete` / `inputmode` / types | PASS (spellcheck missing, L1) |
| Pasting not blocked | PASS (OTP accepts paste: single input) |
| Ellipsis character, nbsp, curly quotes | PARTIAL (M3, M4) |
| `tabular-nums` on numbers | PARTIAL (M4) |
| Loading / empty / error state consistency | FAIL (H3), empty states PASS |
| Images dimensions / lazy / alt | N/A (no raster images in scope) |
| Heavy client components | PASS with note (L10), `AvisExcerpt` fetch (M9) |
| `color-scheme` / `theme-color` | FAIL (M10) |
| Destructive actions confirmed | PASS (hide review dialog, erase lead, void cost panels) |
| URL reflects state (filters) | PASS (`ProjectFilters`, `LeadFilters` use search params; verify) |

## Positive findings

- Single, small token set; all private CSS scoped under `.pt-root` / `.pt-admin`; the custom cursor and reveal animations from the public site are explicitly neutralised in `.pt-root`.
- Native `<dialog>` for all three modals: no custom focus-trap code to maintain.
- Explicit table roles plus a `sr-only` caption to protect semantics under `display:block`.
- OTP input is one real input (paste, SMS autofill, screen reader friendly) with decorative cells `aria-hidden`.
- Accessible SVG chart with textual alternative; PDF blob URLs revoked; reduced motion handled in every stylesheet.
- Consent dialog gives equal weight to "Refuser" and "Accepter" and is localised.

## Quick wins (under 1 hour in total)

1. `leads.css:3-9`: add `flex-wrap: wrap; gap: 4px 20px;` to the admin nav `ul` (fixes H1).
2. Replace `--ink-faint` with `--ink-dim` in `politique-des-avis/page.tsx:39` and the marker border in `project.css:44` with `var(--pt-border-strong)` (fixes H2).
3. Replace the four `...` with `…` (`ConfirmForm.tsx:41`, `LoginForm.tsx:113,150`, `StatusPill.tsx:84`).
4. Add `text-wrap: balance` to `.pt-heading, .pt-display` and `font-variant-numeric: tabular-nums` to `.pt-table td` in `portal.css`.
5. Add `color-scheme: dark` to `.pt-root` and a `viewport` export with `themeColor: '#0A0B0C'`.
6. `ConsentDialog.tsx`: switch the error paragraph to `role="alert"`; `StatusPill.tsx`: add `role="alert"` to its error `<p>`.
7. Define `--pt-surface`/`--pt-border` as aliases of `--bg-2`/`--line-strong` (or reference the real tokens), and switch `.pt-dialog` to `100dvh` with `overscroll-behavior: contain`.
8. Add `spellCheck={false}` to email, code, SIRET and URL inputs; wire the rating `aria-labelledby`.
9. Add `loading.tsx` + `error.tsx` under `app/admin` and `app/espace-client` (H3), and a skip link in the three layouts (M1).
10. Move `AvisExcerpt` data fetching to the server component parent (M9).

## Recommended actions (priority order)

1. [P1] `/adapt` - admin nav wrap/scroll at 360px (H1); verify funnel scroller keyboard access (M8).
2. [P1] `/colorize` - retire `--ink-faint` for text and meaningful borders (H2); define dialog tokens (M5, M10).
3. [P1] `/harden` - `loading.tsx`/`error.tsx`, live-region patterns, skip link, autoFocus policy (H3, H4, M1, M2).
4. [P2] `/typeset` - ellipsis, nbsp, `text-wrap`, `tabular-nums` (M3, M4).
5. [P2] `/optimize` - server-side `AvisExcerpt`, dynamic import of `SigningFlow` (M9, L10).
6. [P3] `/clarify` - required markers and error copy next-step wording on the review form (L2).
7. [P3] `/polish` - final pass after the above, re-run `/audit`.
