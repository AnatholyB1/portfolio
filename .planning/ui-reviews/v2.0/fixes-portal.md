# Client portal: UI/UX fixes applied (milestone v2.0)

Branch `worktree-agent-ad9218658e659c36c`, base `38cfe07`. Sources: `portal-UI-REVIEW.md`, `ux-critique.md`, `a11y-responsive-guidelines.md`, UI-SPEC 10/12/14/15.
Verification: vitest on `src/components/portal`, `src/app/espace-client`, `src/app/connexion`, `src/lib/projects`, `src/lib/server/projects`, `priceScope`, `privateRoutes`, `linkAudit` (343 tests green); full suite: 2470 pass, 2 unrelated failures (see end); `tsc --noEmit` clean; `eslint` 0 errors (4 pre-existing warnings).

## Fixed

| Audit item | Fix | Files |
|---|---|---|
| No loading/error boundary (portal #1, a11y H3) | `loading.tsx` (shell + `role="status"` card), `error.tsx` (client component, French, "Réessayer" button, shell and sign-out kept, heading focused), copy in `PROJECT_COPY.boundaries` | `src/app/espace-client/{loading,error}.tsx` |
| Public 404 in the signing flow (portal #2) | `not-found.tsx` with `ShellHeader`/`ShellMain`/`ShellFooter`, links back to documents and project; no marketing Navbar/Footer | `src/app/espace-client/not-found.tsx` |
| Home sections not cards, `.pt-onb`/`.pt-consent` undefined (portal #3) | Onboarding and Consent are `pt-card` sections; Files wrapped in a `pt-card` section in the page (FilesPanel stays shared with admin); `.pt-onb`, `.pt-consent`, `.pt-onb-blocks`, `.pt-consent-form` defined | `OnboardingCard.tsx`, `ConsentCard.tsx`, `page.tsx`, `project.css` |
| Unstyled `h2` (portal #3) | `pt-heading` for card titles, new `pt-subheading` (16/500) for sub-blocks (pay card, return banner, wrong signer); documents/payments/empty states styled | pages, `PaymentsList`, `ReturnBanner`, `SigningFlow`, `FilesPanel`, `portal.css` |
| `.pt-summary` only under `.pt-admin` (portal #8) | Portal-scoped `.pt-root .pt-onb .pt-summary` with the same values as admin | `project.css` |
| Project H1 24px instead of Display (portal #4) | `pt-display` (32px) on the project H1; `text-wrap: balance` on headings | `page.tsx`, `portal.css` |
| Two OTP implementations (portal #5, UX M6) | Signing uses the shared `OtpInput` (props `length`, `label`, `autoSubmit`, controlled `value`, `inputRef`, `disabled`). Signing: 6 digits, no auto-submit (signing is an explicit act), `readOnly` + `aria-busy` while verifying (focus kept, no `disabled`), focus changes border colour only (no 1px shift). Login stays 8. Copy states the count: login helper "Saisissez les 8 chiffres reçus" (from `OTP_LENGTH`), signing "Code à 6 chiffres envoyé à …" and label from `SIG.code.label`. Removed `.pt-sign-otp` CSS | `OtpInput.tsx`, `LoginForm.tsx`, `SigningFlow.tsx`, `copy.ts`, `project.css` |
| Anchor CTA does not move focus (portal #6) | `HashFocusLink` client component (scrolls, focuses the target, honours reduced motion, falls back to a normal anchor); `h2#onboarding` has `tabIndex={-1}` and `scroll-margin-top` | `HashFocusLink.tsx`, `OnboardingCard.tsx`, `project.css` |
| Autosave only on blur, labels unstyled (portal #7) | Choices that complete the billing/VAT block ("same address" with VAT chosen, "Non assujetti" with address known) save immediately via an effect; text fields still save on leaving the block. Field labels use `pt-label`, VAT legend `pt-label` | `OnboardingCard.tsx` |
| Journey wording, who-waits (UX H1/H2, summary #6) | Steps 2 and 3 now `waitingOn: 'client'` with "Signez votre devis…", "Signez votre contrat, puis réglez l'acompte…" and descriptions "vous signez…". Pure `buildClientActions` drives `WhoWaits`: onboarding anchor, direct link to the signing page for one document (or "Voir mes documents"), "Payer l'acompte/le solde/la facture" link to payments. First action is the primary button, the others ghost. Page loads invoices (RLS client, read failure tolerated). The old "document waiting" line only shows when no action is shown | `steps.ts`, `clientActions.ts`, `WhoWaits.tsx`, `page.tsx`, `copy.ts` |
| Contrast (portal #9, a11y) | Upcoming-step ring uses `--pt-border-strong` (#6f6b64, 3.54:1 on `--bg-2`, was 2.60:1). Text buttons in the disabled/countdown state keep `--ink-dim` (6.38:1) and no opacity. No `--ink-faint` left in portal CSS | `project.css`, `portal.css` |
| Skip link, main landmark (a11y M1) | `SkipLink` component first in the three private layouts; `ShellMain` and `AuthCard` expose `<main id="contenu" tabIndex={-1}>`; `.pt-skip` shown on focus only | `SkipLink.tsx`, layouts, `ShellMain.tsx`, `AuthCard.tsx`, `portal.css` |
| Live regions mounted with text (a11y H4) | Error regions in pay/payments/documents are mounted empty (`.pt-live`, out of flow while empty, which also removes the dead 8px gaps); login notice region mounted before its text; signing "code sent" status is filled after the form mounts | `PayButton`, `PaymentsList`, `DocumentsList`, `LoginForm`, `SigningFlow`, `portal.css` |
| Ellipsis style (portal QW10, a11y) | `…` in `Envoi en cours…`, `Vérification…`, `Connexion en cours…` | `LoginForm`, `ConfirmForm` |
| Dead legacy nav CSS (portal #10) | Removed `.pt-nav*`, `.pt-nav-item*`, `.pt-client-nav-off` | `portal.css`, `project.css` |
| Off-scale spacing, inline layout styles (portal #10) | 10px to 8px, 20px to 16/24px, 6px to 8px, header gap 12 to 16, warning padding 12 to 16; removed the `#6F6B64` fallback; removed `margin-bottom: 24px` on the pay card and banner (the card wrapper is now a `.pt-stack` with 24px gap); inline layout wrappers replaced by ShellMain gap, `.pt-stack`, `.pt-stack-sm`, `.pt-msg-icon`, `.pt-who-icon`, `.pt-link-icon`, `.pt-code-email`, `.pt-field-start` | CSS and components |
| Hard-coded French (portal QW7) | Files table headers and uploader labels, interlocutor card, boundary and skip-link copy moved to `PROJECT_COPY` | `copy.ts`, `FilesPanel.tsx`, `page.tsx` |
| `accent-color: var(--acid)` on signing checkboxes (portal QW8) | Now `var(--ink)` | `project.css` |
| `autoFocus` on the mobile email input (a11y M2) | Removed (OTP input keeps it, justified after a user action) | `LoginForm.tsx` |
| `aria-disabled` on `<label>` (portal QW9) | Removed | `FilesPanel.tsx` |
| Mobile payments amount alignment (portal Pillar 2) | Amount cell left-aligned in the stacked layout | `project.css` |
| Tabular numerals in tables, `spellCheck`/`autoCapitalize` on email (a11y) | Added | `portal.css`, `LoginForm.tsx` |
| Documents page N+1 sequential bundle reads (portal Pillar 6) | Bundles read with `Promise.all` | `documents/page.tsx` |

Tests pinned and updated in the same commits: `steps.test.ts` (waiting sides), `lib/server/projects/read.test.ts` (client now waits at step 2; the "admin waiting" scenarios now seed step 4), `portalPage.test.ts` (no wrapper div, `HashFocusLink`), `signingUi.test.ts` and `authUi.test.ts` (shared OTP). New: `boundaries.test.ts`, `clientActions.test.ts`, `portalFixes.test.ts` (cards, headings, spacing, contrast, live regions).

## Not fixed (and why)

- **Public JSON-LD on private routes** (portal Pillar 6): injected by `src/app/layout.tsx`, outside my files. Needs the shell owner to skip it when `isPrivatePath`.
- **`--ink-faint` token value** in `globals.css` (a11y/public): owned by another agent. Portal CSS no longer depends on it.
- **Admin skip link / ShellMain**: `ShellMain` now carries `id="contenu"`, and `SkipLink` plus `.pt-skip` exist, so the admin layout only has to render `<SkipLink />` (import from `@/components/portal/SkipLink`). Do not hard-code `href="#contenu"` in `src/app/**`: `linkAudit.test.ts` rejects it for files outside `components/portal/`.
- **Nav tab counts/badges** (UX H2 second half) and **listing all `to_pay` invoices in the highlighted block** (UX M7): not in the requested list; the who-waits panel now carries the action instead.
- **NoAccess copy drift vs 10-UI-SPEC**: product decision (spec or code), left as is.
- **Three primary buttons visible at once** (portal Pillar 2): the who-waits action is primary, other actions are ghost; onboarding "Confirmer" and consent "Enregistrer" remain primary per 12-UI-SPEC.
- **`<summary>` disclosure marker, nav link width 44px, nested `pt-pay-card` inside a card**: low value, left.
- **Real-browser pass at 320-390px and device check of the sticky action bar/iframe**: code-only environment, not verified.
- Side effects to know about: `FilesPanel` is shared with the admin project sheet, so its `h2` is now `pt-heading` there; the disabled text-button style change in `portal.css` also affects admin text buttons; marking steps 2 and 3 as client-side changes the admin "Attend le client" filter and tri for those steps (requested wording change, but admin may want a "devis pas encore émis" distinction later).
- Unrelated failing tests in the full suite (not touched by this work): `pilotageMigration.test.ts` ("no internal day-rate column", migration text) and a timing flake in `seal.test.ts` (5 s timeout on 40 reserves, passes on rerun).
