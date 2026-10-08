# Client Portal (milestone v2.0) - UI Review

**Audited:** 2026-10-08
**Scope:** `src/app/espace-client/**`, `src/app/connexion/**`, `src/app/auth/**`, signing page (`espace-client/documents/[id]/signer`), `src/components/portal/**`, `src/app/portal.css`, `src/components/portal/client.css`, `src/components/portal/project/project.css`
**Baseline:** 10-UI-SPEC.md (approved), 12-UI-SPEC.md (draft), 13/14/15 UI-SPECs by reference, plus project rules (French only, noindex, no cinema/cursor/GSAP, dark tokens, 44px targets, accessible forms)
**Screenshots:** not captured. `curl http://localhost:3000` returned 000 (no dev server), and the portal needs an authenticated session anyway. This is a code-only audit. The 10-UI-SPEC "check at 320-390px in a real browser" requirement is therefore NOT verified by this review.
**Constraints honoured:** read-only on source, nothing committed, no production calls. The only file written is this report. `.planning/ui-reviews/.gitignore` already blocks image files.

---

## Pillar Scores

| Pillar | Score | Key finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Strong, centralised French copy that matches the spec. Minor drift and a few strings outside `PROJECT_COPY`. |
| 2. Visuals | 2/4 | Home page mixes carded and bare sections, and every non-`.pt-client` `h2` renders as plain body text, so the hierarchy is flat. |
| 3. Color | 3/4 | Token discipline is good (3 hex values in the scope). Accent mostly reserved. A few contrast and reserved-accent slips. |
| 4. Typography | 3/4 | Scale (14/16/24/32) and weights (400/500) are respected. Heading roles and onboarding labels are not applied. |
| 5. Spacing | 3/4 | Mostly on the 4px scale. A handful of off-scale values and inline-style layout. Banner margin double-counts with flex gap. |
| 6. Experience Design | 2/4 | Good pending/aria-live work, but no `error.tsx`/`loading.tsx`, public 404 shell inside the private zone, and several interaction gaps. |

**Overall: 16/24**

No pillar scored 1 and there are no BLOCKER-class defects (nothing found that prevents a client from completing login, onboarding, signing or payment). Everything below is WARNING-class, ordered by severity.

---

## Top 10 Prioritized Findings

| # | Severity | Finding | Fix suggestion (no code changed) |
|---|----------|---------|-----------------------------------|
| 1 | HIGH | **No error or loading boundaries anywhere under `/espace-client`.** `find app -name error.tsx -o -name loading.tsx -o -name global-error.tsx` returns nothing. Every portal page is `force-dynamic` with several Supabase reads (`app/espace-client/page.tsx:34,77-107`). Only `paiements/page.tsx:46-52` catches a load failure and shows `pt-error`. A thrown read on Projet or Documents falls to Next's default error screen, unstyled and outside the dark theme. Navigation also shows no pending state. | Add `app/espace-client/error.tsx` (French copy `PROJECT_COPY.errors.generic`, retry button, `pt-root` shell) and `loading.tsx` (header plus a muted placeholder card). Mirror the Payments pattern: catch read failures and render the 12-UI-SPEC "pt-error banner with retry". |
| 2 | HIGH | **Public 404 rendered inside the private zone.** `signer/page.tsx:46,54` calls `notFound()` for a bad UUID or unknown document. The root `app/not-found.tsx:15-27` renders the public `Navbar` and `Footer` and the marketing hero (`svc-h1`). This breaks the "no public Navbar in private shells" rule (10-UI-SPEC "Route and Provider Constraints") and strands a signing client with no sign-out or portal link. | Add `app/espace-client/not-found.tsx` using `ShellHeader` and `ShellMain` with a French message and a "Retour à mes documents" link. |
| 3 | HIGH | **Home page sections are not the cards the spec asked for, and headings are unstyled.** `OnboardingCard.tsx:542-543`, `FilesPanel.tsx:141-143` and `ConsentCard.tsx:26-27` render bare `<section>`/`<div>` with no `pt-card` (12-UI-SPEC S1: "each in a `pt-card`"). `.pt-onb` and `.pt-consent` have no CSS (grep: no definition). Their `h2`s have no class. Tailwind v4 preflight resets `h1-h6` to `font-size: inherit; font-weight: inherit`, and `.pt-client h2` only matches inside `.pt-client`. Result: "Vos informations", "Fichiers du projet" and "Présentation de votre projet" read as 16px/400 body text floating on the page background between real cards. Same defect on `documents/page.tsx:80,86`, `paiements/page.tsx:82,89`, `PaymentsList.tsx:123` (`À payer`), `SigningFlow.tsx:333` and the pay banner `h2`. | Wrap Onboarding, Files and Consent in `pt-card` (in the page or inside the components). Add one rule, e.g. `.pt-root .pt-card h2 { Heading/sub-heading style }`, or give each `h2` the existing `pt-heading` / `.pt-client h2` treatment. |
| 4 | MEDIUM | **Page title does not meet the display contract and competes with the who-waits panel.** `espace-client/page.tsx:117` uses `pt-heading` (24px) for the project H1, but 12-UI-SPEC specifies Display 32px for the project title. `.pt-who-name` (`project.css:129-135`) is also 24px. Page title and "En attente de vous" carry the same visual weight, so there is no focal point. `.pt-display` exists in `portal.css:41` and is unused here. | Use `pt-display` for the project H1 on the home page, per spec. |
| 5 | MEDIUM | **Two different OTP implementations with different behaviour.** Login: 8 cells over one overlay input (`OtpInput.tsx`), read-only while pending so focus survives. Signing: a 6-digit single input with 0.5em letter-spacing (`SigningFlow.tsx:415-429`, `project.css:472-492`) that is `disabled` during verification (`SigningFlow.tsx:425`), so focus drops and screen readers lose context. Its focus state swaps to a 2px border (`project.css:489-491`), causing a 1px layout shift. | Use `readOnly` plus `aria-busy` while pending, as `OtpInput` does. Keep the 1px border and rely on outline for focus. Consider sharing one OTP component with a length prop. |
| 6 | MEDIUM | **"Compléter mes informations" CTA does not move focus.** `WhoWaits.tsx:28` links to `#onboarding`, which is an `h2` without `tabIndex` (`OnboardingCard.tsx:543`). The page scrolls (smooth) but keyboard and screen-reader focus stay on the link. 12-UI-SPEC S1.1 says "scrolls/focuses". | Add `tabIndex={-1}` to the target heading (the pattern already used in `ReturnBanner.tsx:78`) and focus it on hash navigation. Add `scroll-margin-top`. |
| 7 | MEDIUM | **Onboarding autosave only fires on blur of the form (`OnboardingCard.tsx:102-106`).** Checkbox and radio changes (billing-same, TVA status) set `dirty` but nothing saves until the user leaves the block. A client who ticks "Non assujetti" and closes the tab loses it. There is also no visible "unsaved" cue. Labels are also unstyled: `Field` renders `<label htmlFor>` without `.pt-label` (`OnboardingCard.tsx:62`), so labels are 16px ink, not the 14px/500/`--ink-dim` Label role. The VAT `legend` (`:405`) is unstyled too. | Call `flush()` directly on checkbox/radio `onChange`. Apply `pt-label` to `Field` labels and a legend style to the VAT fieldset. |
| 8 | MEDIUM | **Company read-back is unstyled in the portal.** `OnboardingCard.tsx:145` uses `<dl className="pt-summary">`, but `.pt-summary` is only defined as `.pt-admin .pt-summary` in `components/admin/admin.css:84-105`. In the portal the `dt`/`dd` pairs render as default stacked text with no label/value differentiation. | Add a portal-scoped `.pt-root .pt-summary` rule in `project.css` (or move the shared rule out of the admin scope). |
| 9 | LOW-MEDIUM | **Contrast of meaningful low-emphasis text.** (a) The resend button during the countdown sets `opacity: 0.5` on an `--ink-dim` button (`portal.css:275-281`, text from `LoginForm.tsx:163-165`). Effective contrast is roughly 2.9:1 on the card, for a visible "Renvoyer le code (42 s)" that carries information. (b) Upcoming timeline marker ring uses `--ink-faint` (`project.css:44`): about 2.6:1 on `--bg-2`, below the 3:1 non-text threshold the spec itself applies to field borders (the spec permits `--ink-faint` for this ring, but the cue is also the only visual marker of "à venir"). | (a) Keep the countdown text at full `--ink-dim` and signal disabled via `aria-disabled` plus cursor only. (b) Use `--pt-border-strong` for the ring. |
| 10 | LOW | **Dead and drifting CSS plus off-scale values.** Legacy header nav rules `.pt-nav*` and `.pt-nav-item[aria-disabled]` with `--ink-faint` (`portal.css:346-391`) and `.pt-client-nav-off` (`project.css:310,328-330`) are unused since the nav became active. Off-scale spacing: `gap: 10px` (`client.css:13`), `padding-top: 20px` (`client.css:67`), `gap: 4px 20px` (`client.css:94`), icon `marginLeft: 6` (`PortalLinks.tsx:32`). `.pt-pay-banner` has `margin-bottom: 24px` (`project.css:662`) on top of the 32px flex gap, giving a 56px gap after the banner only. Layout wrappers repeat inline `style={{display:'flex',flexDirection:'column',gap:32}}` on four pages although `ShellMain` already applies `gap: 32px` (`portal.css:394-402`). | Delete dead rules, snap to 8/12/16/24, drop the banner margin, and replace inline layout styles with a class. |

---

## Quick Wins (each under about 15 minutes)

1. Add `tabIndex={-1}` to `<h2 id="onboarding">` (`OnboardingCard.tsx:543`) and call `.focus()` from the CTA.
2. One CSS rule for `.pt-root .pt-card h2` (and for the unclassed `h2`s) so Documents, Paiements, pay card, mismatch and empty states get heading weight.
3. Apply `pt-label` to the `Field` label in `OnboardingCard.tsx:62`.
4. Use `pt-display` for the home page H1 (`espace-client/page.tsx:117`).
5. Replace `disabled` with `readOnly` on the signing OTP input (`SigningFlow.tsx:425`).
6. Remove `margin-bottom: 24px` from `.pt-pay-banner` and `.pt-pay-card` where the parent already has a flex gap.
7. Move the hard-coded French in `FilesPanel.tsx:194-198` (`Nom`, `Déposé par`, `Ajouté le`, `Taille`, `Action`) and `espace-client/page.tsx:47-50` (interlocutor name, phone) into `PROJECT_COPY` or a constants module.
8. Drop `accent-color: var(--acid)` on the signing checkboxes/radios (`project.css:458`). It is outside the reserved-accent list (10-UI-SPEC "Accent reserved for"). Use `--ink`, as the progress bars do.
9. Add `FilesPanel` `aria-disabled` removal: `aria-disabled` is not a valid attribute on `<label>` (`FilesPanel.tsx:144`). Disable the nested input only.
10. Normalise ellipses: `Envoi en cours...` / `Vérification...` / `Connexion en cours...` (login, three dots) versus `Préparation…` / `Enregistrement…` (portal, single character). Pick one.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Strengths
- Copy is centralised in `lib/projects/copy.ts` and `lib/auth/schemas.ts` (`LOGIN_COPY`). Login strings match 10-UI-SPEC verbatim: `Recevoir mon code`, `Se connecter`, `Saisissez votre code`, `Renvoyer le code`, `Changer d'adresse e-mail` (`LoginForm.tsx:113,150,164,179`), under-card notes (`connexion/page.tsx:41-44`), `Ce lien n'est plus valide.` (`ConfirmForm.tsx:13`).
- Vouvoiement and no exclamation marks throughout. Specific CTAs (`Confirmer les informations de ma société`, `Enregistrer mon accord`, `Lire et signer`, `Télécharger`). Error copy is actionable and French. Empty states exist for no project, no documents, no invoices, no files.
- Required fields say "(obligatoire)" in text (`OnboardingCard.tsx:64`), not only by symbol.

Deviations and gaps
- `NoAccess.tsx:20` heading is `Ce compte n'a pas d'espace client`; the spec says `Accès non autorisé` with a different body. The shipped copy is arguably friendlier but is an undocumented departure. Update the spec or the code.
- `FilesPanel.tsx:194-198`: five table headers hard-coded outside `PROJECT_COPY`.
- `espace-client/page.tsx:47-50`: interlocutor name, city and phone hard-coded in the page component.
- Mixed ellipsis style (three dots versus `…`). See Quick Win 10.
- Generic labels were not found (`Submit`, `OK`, `Click here`): none present.

### Pillar 2: Visuals (2/4)

- Biggest defect: Finding 3. On the home page the visual rhythm is card, card, **bare**, **bare**, card, **bare**, card. `OnboardingCard`, `FilesPanel` and `ConsentCard` are not wrapped in `pt-card` (`espace-client/page.tsx:136-156`), so the spec's "each in a pt-card" is not met and the focal structure is lost on a long scroll page.
- Hierarchy is flat: H1 24px equals the who-waits name 24px (Finding 4), and sub-section `h2`s inherit body size (Finding 3).
- Nested cards: `.pt-pay-card` (bg-2, border) sits inside `.pt-card` section (also bg-2, border) in `PaymentsList.tsx:122` / `paiements/page.tsx:88`. Double border, no depth cue.
- Up to three acid primary buttons can be visible at once on the home page: who-waits CTA (`WhoWaits.tsx:28`), "Confirmer les informations de ma société" (`OnboardingCard.tsx:162`) and "Enregistrer mon accord" (`ConsentCard.tsx:53`). 10-UI-SPEC says one primary button per view. 12-UI-SPEC lists these as allowed primaries, but together they dilute the accent.
- Positives: timeline has three non-colour cues (icon, text badge, sr-only suffix) (`Timeline.tsx:35-47`). Icon-only buttons are absent; every icon is `aria-hidden` and paired with text. Header is consistent across all portal pages. No cinema, cursor, GSAP or three imports in scope (grep on `components/portal`, `app/espace-client`, `app/connexion`, `app/auth` found them only inside `*.test.ts` guard files).
- `<summary className="pt-btn-text">` (`OnboardingCard.tsx:561`) is `display: inline-flex`, which removes the native disclosure marker, so there is no expand/collapse affordance.
- Mobile payments table: `.pt-pay-amount-cell` is `text-align: right` (`project.css:638-642`) while the other cells in the stacked card layout are left-aligned, so the amount looks misaligned beneath its `data-label`.

### Pillar 3: Color (3/4)

- Only three hard-coded values in scope: `#6f6b64` (the approved `--pt-border-strong`, `portal.css:8`), a duplicate fallback `#6F6B64` (`client.css:68`), and `#000` on acid (`portal.css:249`). Everything else uses tokens.
- `--ink-faint` as a text colour: only `portal.css:371` (dead disabled-nav rule). As a non-text ring: `project.css:44`. Spec compliance is OK, contrast is weak (Finding 9b).
- Error `--warm` only for errors and invalid borders (`portal.css:299,173`, `project.css:494,558`). Warnings use the muted-acid left border, not `--warm` (`portal.css:301-308`), as the spec requires.
- Accent outside the reserved list: `accent-color: var(--acid)` on signing checkboxes and radios (`project.css:458`). Low severity. Current-step marker, `--acid-soft` row, nav underline, focus ring and primary buttons are all within the reserved list.
- Disabled/resend opacity contrast: Finding 9a.
- Not verifiable without screenshots: actual 60/30/10 distribution on rendered pages.

### Pillar 4: Typography (3/4)

Distribution (counted across `portal.css`, `client.css`, `project.css`):
- Sizes: 14px x21, 16px x12, 24px x5, 32px x2, plus `clamp(22px, 7vw, 32px)` on the OTP cells (`portal.css:193`). No 12px, no 700. Weights: 400 x5, 500 x19. This matches the "4 sizes, 2 weights" contract.
- One inline override: `fontSize: 14, color: 'var(--ink-dim)'` on the awaiting-signature line (`espace-client/page.tsx:125`) duplicating `.pt-who-since`.
- Defects: unclassed `h2`s fall back to body size/weight (Finding 3). Onboarding labels do not use the Label role (Finding 7). Home H1 uses 24px instead of Display 32px (Finding 4). `.pt-client h2` is 16px/500 display font (as the spec notes), but sibling `h2`s outside `.pt-client` get nothing. `.pt-sign-legend` (16/500) is used for an `h2` in the signing read panel, an acceptable but inconsistent heading style.
- Body text is 16px (inputs also 16px, so no iOS zoom). Tabular numerals are applied to amounts and file sizes.

### Pillar 5: Spacing (3/4)

- 44px minimum is applied to buttons, inputs, nav links, checkbox rows, radio rows and file pick (`portal.css:185,236,358`, `project.css:166,281,544`). Pay buttons go to 48px on mobile. Nav links are 44px tall but only as wide as their text (`project.css:309-319`); height requirement met, width is not.
- Scale adherence is good: gutters 16/32, cards 24, `ShellMain` gap 32, desktop top padding 48, header 64.
- Off-scale: `client.css:13` (10px), `:67` (20px), `:94` (20px column gap), `PortalLinks.tsx:32` (6px). 12px appears in `client.css:7` and `portal.css:156,201` (the OTP group gap is spec-approved; the header gap is a new use that 12-UI-SPEC forbids).
- Inline-style layout wrappers (26 inline `style={{` occurrences in scope; 6 are layout wrappers) bypass the stylesheet and duplicate `ShellMain`'s gap.
- Banner double spacing (Finding 10).
- Empty `<p class="pt-error">` nodes are always rendered in flex columns (`PayButton.tsx:58`, `PaymentsList.tsx:157`, `DocumentsList.tsx:121`), adding an 8px gap of dead space under buttons and tables.

### Pillar 6: Experience Design (2/4)

Strengths
- Login: uncontrolled email input survives hydration (`LoginForm.tsx:39-42,96-103`), OTP is one real input with paste/autofill, input stays mounted while verifying (`OtpInput.tsx:68`), resend uses `aria-disabled` and keeps focus, with a polite live-region announcement (`LoginForm.tsx:123-125,168`). `aria-invalid` plus `aria-describedby` on login fields.
- Pending states and double-submit guards on login, confirm, pay (`PayButton.tsx:22-30`), downloads and consent.
- `ReturnBanner` focuses its heading, polls the webhook-derived status with a 30s cap and a "slow" fallback. Pay flow resolves the amount server-side.
- Reduced motion handled (`portal.css:534-541`; `project.css:294-299,601-605`). Visible acid focus ring on all interactive elements. Tables collapse to labelled cards on mobile. Signing has sticky action bar with safe-area padding. noindex robots on the three layouts (`espace-client/layout.tsx`, `connexion/layout.tsx`, `auth/layout.tsx`); `ClientProviders` suppresses cinema and cursor on private paths (`components/ui/ClientProviders.tsx:19`); `ConsentDialog` and PostHog also check `isPrivatePath`.

Gaps
- No `error.tsx`, `loading.tsx` or `global-error.tsx` (Finding 1). Home and Documents pages have no read-failure state at all (only Payments does).
- Public 404 in the signing flow (Finding 2).
- Anchor CTA does not move focus (Finding 6). Blur-only autosave for toggles (Finding 7). Signing OTP `disabled` while verifying (Finding 5).
- Documents page runs `loadProjectBundle` inside a `for` loop per project (`documents/page.tsx:51-55`), an N+1 pattern on a `force-dynamic` page with no loading UI; it also cannot degrade gracefully if one project read fails.
- No skip-to-content link on any shell, and the sticky mobile action bar plus iframe viewer have not been exercised on devices here (no screenshots).
- Root layout injects the public site JSON-LD (Organization, FAQ) on private routes too (`app/layout.tsx:234-241`). The pages are noindex, but this is unnecessary payload and a mismatch with "private zones carry no public SEO data".
- Checkbox-only consent has no focus ring on the native control itself (the ring comes from `:focus-within` on `.pt-sign-consent`, but `.pt-consent-check` in onboarding/consent has no `:focus-within` rule; the global `input:focus-visible` rule does cover it, so this is only a visual-size concern with the default 24px native box in light chrome on a dark theme).
- Registry audit: `components.json` does not exist; shadcn is not initialised. Skipped, per the spec's Registry Safety table.

---

## Files Audited

- `src/app/portal.css`, `src/components/portal/client.css`, `src/components/portal/project/project.css`, `src/app/globals.css` (token and heading greps)
- `src/app/espace-client/layout.tsx`, `page.tsx`, `documents/page.tsx`, `paiements/page.tsx`, `documents/[id]/signer/page.tsx`
- `src/app/connexion/layout.tsx`, `page.tsx`; `src/app/auth/layout.tsx`, `confirm/page.tsx`; `src/app/espace-client/actions.ts` (message paths only)
- `src/components/portal/AuthCard.tsx`, `LoginForm.tsx`, `OtpInput.tsx`, `ConfirmForm.tsx`, `NoAccess.tsx`, `ShellHeader.tsx`, `ShellMain.tsx`, `ShellFooter.tsx`, `SignOutButton.tsx`
- `src/components/portal/project/ClientNav.tsx`, `ProjectSelector.tsx`, `WhoWaits.tsx`, `Timeline.tsx`, `OnboardingCard.tsx`, `FilesPanel.tsx`, `PortalLinks.tsx`, `ConsentCard.tsx`, `DocumentsList.tsx`, `PaymentsList.tsx`, `PayButton.tsx`, `ReturnBanner.tsx`, `SigningFlow.tsx`, `AcceptanceChecklist.tsx`
- `src/lib/projects/copy.ts`, `src/lib/auth/schemas.ts`, `src/lib/privateRoutes.ts`, `src/components/ui/ClientProviders.tsx`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/components/admin/admin.css` (`.pt-summary` scope check)
- Design contracts: `.planning/phases/10-foundation-auth-isolation/10-UI-SPEC.md`, `.planning/phases/12-conversion-projects-step-engine/12-UI-SPEC.md` (13/14/15 UI-SPECs consulted only by reference through the CSS comments)
