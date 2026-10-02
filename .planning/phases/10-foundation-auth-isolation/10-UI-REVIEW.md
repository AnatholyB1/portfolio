# Phase 10 - UI Review (retroactive)

**Audited:** 2026-10-02
**Baseline:** 10-UI-SPEC.md (approved contract)
**Screenshots:** captured for logged-out screens only (connexion and confirm, desktop and mobile). Code-only for /espace-client, /admin, the code step of /connexion, and both emails.
**Source edited:** none (read-only audit)

---

## Pillar Scores

| Pillar | Score | Key finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Spec copy is followed almost word for word. Gaps: the email has no brand or heading, and the invite email is not covered by the spec. |
| 2. Visuals | 2/4 | The input and the submit button touch. Form children have no gap. The code step stacks with no rhythm. Admin submit is a 1072px bar. |
| 3. Color | 2/4 | Accent discipline is good. `--ink-faint` is used for interactive and essential text at about 2.6:1. Warning and error look identical. |
| 4. Typography | 3/4 | 12/16/24/32 and weights 400/500 are respected. Off-scale: the `.tg` tag at 10px, the OTP `clamp` (22-32px), and the 13/14px email text. |
| 5. Spacing | 2/4 | The 4/8/16/24/32/48/64 scale is respected. Rhythm inside the forms is missing, because the card `gap` does not reach inside `<form>`. |
| 6. Experience Design | 3/4 | State coverage is strong (pending, error, aria-live, resend countdown, no-access, reduced-motion). Weak spots: the OTP remounts while pending, the confirm button stays live after an error, and aria-disabled spans. |

**Overall: 15/24**

---

## Verdicts on the orchestrator's observations

1. **Input and button touching on /connexion: CONFIRMED, and it is a real defect.**
   - `.pt-card` has `display:flex; gap:16px` (portal.css:97-99). But the direct children of the card are `h1`, helper, the `<form>`, and the footer. The form itself has no class and no layout (LoginForm.tsx:56, 89).
   - Inside the form, `.pt-field` (input) is followed by an empty `aria-live` div (zero height, LoginForm.tsx:22), then the button. Nothing is between them. The 2px focus-ring offset visibly overlaps the button in the desktop screenshot.
   - The same root cause hits the code step. In LoginForm.tsx:92-115 the h2, the helper, the status line, the OTP, the error, and the three buttons all sit in an unstyled `<form>` with `margin:0` on every text element. Heading, helper and status are glued together. "Renvoyer le code" and "Changer d'adresse e-mail" are `inline-flex` and sit side by side on one line, instead of stacked.
   - The same applies to ConfirmForm.tsx:16, where the error, the link and the button are also unspaced.
   - Smallest fix: one rule, `.pt-card form { display:flex; flex-direction:column; gap:16px; }`. For the admin form, scope it to `.pt-auth .pt-card form`, or skip it, because InviteForm already uses its own grid and margins.

2. **Low-contrast uppercase mono labels and "Retour au site": CONFIRMED as a spec deviation. The spec itself is also weak here.**
   - `--ink-faint` is `#5A5751`. On `--bg-2` `#111213` that is about 2.6:1, well under the 4.5:1 AA threshold. Computed by hand, not measured in a browser.
   - The spec calls for this color on labels (Typography table). It also says "labels/disabled only (never for essential copy)".
   - The spec contradicts itself: it asserts contrast but only checks `--ink` and `#000`. `.label` at 12px in `--ink-faint` fails, and so do the table `th` cells.
   - The deviation: `.pt-back` (portal.css:109-115) is an actionable link, not a label. It is also 12px with no 44px hit area, despite the spec's 44px minimum for interactive controls. The nav items (disabled) and `.pt-btn-text:disabled` at opacity 0.5 are lower still.

3. **Mobile clipping: NOT a CSS bug.**
   - `.pt-auth` has `padding: 32px 16px 48px` and `align-items:center`. `.pt-card` has `width:100%; max-width:400px`. The Tailwind preflight supplies `box-sizing: border-box`; I found no override in `globals.css`.
   - Evidence of the artifact: in the 390px screenshot the card starts at x=50 and the brand is centered at about x=255. A 400px card centered with 50px margins means the layout viewport was about 500px, not 390px.
   - With a real 390px viewport the card is 358px wide. The OTP cell size works out to about 35px, with a 44px min height.
   - Recommendation: re-capture on a real 390px viewport (Playwright `--viewport-size` with `isMobile` / device emulation) before drawing any conclusion about overflow.

---

## Top Priority Fixes

1. **BLOCKER (visual): forms inside the auth card have no spacing.** User impact: the email field welded to the button, a cramped code step, misaligned secondary buttons. Fix: `.pt-card form { display:flex; flex-direction:column; gap:16px }` in portal.css (see above).
2. **MAJOR: `--ink-faint` carries interactive and essential text.** Fix: use `--ink-dim` (about 6.4:1) for `.pt-back`, for `.pt-label`, and for table `th`. Raise the spec's color rule from "ink-faint for labels" to "ink-dim for labels". Keep `--ink-faint` for placeholders and disabled items only. Also fix the invite email footer (`#5A5751` on `#111213`, inviteEmail.ts:43).
3. **MAJOR: admin primary button is 1072px wide.** `.pt-btn-primary` is `width:100%` globally (portal.css:215). The spec asks for full width on login only. Fix: scope it with `.pt-auth .pt-btn-primary { width:100% }`, or add `.pt-btn-primary--auto`. InviteForm.tsx:237-241 would then size to its content.
4. **MAJOR: login-code email has no brand or heading** (loginCodeEmail.ts:50-55). Recipients get an unidentified code mail. Add "Sèvalys" (text wordmark in the existing font stack) above the first line.
5. **MINOR: the code, at 32px with 0.3em letter-spacing, can overflow on 320px screens** (loginCodeEmail.ts:52). Available inner width is about 216px, the code needs about 230px. Drop to `font-size:28px;letter-spacing:0.2em` on small screens, or reduce the outer padding.
6. **MINOR: OtpInput remounts on every pending toggle** (LoginForm.tsx:98, `key={`${verPending}-...`}`). The 8 cells blank out during verification and the focus jumps. Key only on the error string.

---

## Deviations from the approved spec

| # | Where | Deviation | Severity |
|---|-------|-----------|----------|
| D1 | portal.css:109-115 (`.pt-back`) | Spec S1/S3 calls it a "discreet link", but an `--ink-faint` 12px link with no min hit area violates the 44px rule and the contrast rule | major |
| D2 | portal.css:215 | Primary button is full width in every context, including the 1120px admin card | major |
| D3 | portal.css:166 | OTP cell font is `clamp(22px,7vw,32px)`. The spec says exactly 4 sizes and mono 32px. Justified on mobile (35px cells), but it adds a fifth size | minor, acceptable |
| D4 | Header nav `Bientôt` (ShellHeader.tsx:22) | `.tg` is 10px (globals.css:279). The spec orders reuse of `.tg`, so spec and typography table conflict | minor (spec issue) |
| D5 | ShellHeader.tsx:20 | Disabled nav items are `<span aria-disabled>` with no role. Screen readers ignore `aria-disabled` on a generic span, so the "disabled" state is not announced | minor |
| D6 | admin/page.tsx:50,56 | Heading `marginBottom:24` on top of the card `gap:16` gives 40px between heading and content. The spec says 24px | minor |
| D7 | espace-client/page.tsx | No `aria-describedby` association from per-field server errors in InviteForm. Only SIRET has `aria-invalid`. The role-conflict and duplicate-email errors appear in a banner not tied to the email input (InviteForm.tsx:230-235) | minor |
| D8 | ConfirmForm.tsx:19-34 | Error and "Demander un nouveau code" are rendered above the primary button, which stays enabled. After an expired token, "Me connecter" invites another failed attempt. A missing `token_hash` is not detected up front (confirm/page.tsx:12) | minor |
| D9 | inviteEmail.ts:34 vs loginCodeEmail.ts:49 | The two emails are inconsistent: 12px radius with 1px border versus 8px radius with no border. The security line is 13px (`#9a9a94`), against 14px elsewhere. The invite email is not covered by S5 | minor |
| D10 | loginCodeEmail.ts:52 | Code font is `Courier New`, not JetBrains Mono. Acceptable (web fonts are unreliable in mail), and the spec says "monospace block" | none |

## Spec itself is weak

- **W1**: the Color rules never test `--ink-faint` contrast, while stating it must be used for labels. This directly yields the low-contrast labels. Change the label tone to `--ink-dim`, or darken the background behind them.
- **W2**: warning and error share `--warm` (spec: "Destructive / error ... only"). There is no distinct warning tone, so the "inactive establishment" or "SIRET not found" warnings look like errors. Differentiate by icon (`TriangleAlert` versus `AlertCircle`) or accept it explicitly.
- **W3**: the spec defines the form's internal layout only via the card, with no mention of forms. This is where the implementer lost the gap. Add "form children stack with 16px gap".
- **W4**: the spec covers only the login-code email (S5), although two emails shipped. Add a section for the invite email: heading, CTA, footnote, contrast.
- **W5**: no spec for the admin submit button width, nor for 320px email widths.
- **W6**: typography forbids a fifth size but mandates `.tg` (10px) and a mobile-fitting OTP. Allow a "caption 10-12px" exception, or define the tag in the typography table.
- **W7**: no admin responsive guarantee beyond "rows collapse to stacked cards", and no behaviour for long client names or emails (`overflow-wrap` is not set on `td`, portal.css:420).

## Detailed findings

### Pillar 1: Copywriting (3/4)
- Every key string matches the spec: "Recevoir mon code", "Se connecter", "Envoi en cours...", "Saisissez votre code", the helper, "Renvoyer le code (N s)", "Changer d'adresse e-mail", "Votre espace est en préparation", "Aucun client invité", "Accès non autorisé", "Bientôt", "Se déconnecter", "Retour au site" (LoginForm.tsx, espace-client/page.tsx, ClientsTable.tsx:20-23, NoAccess.tsx).
- Vouvoiement everywhere, no exclamation marks, no prices.
- Minus: the login-code email never says "Sèvalys" in the body (loginCodeEmail.ts:51-55). Only the subject does. Invite email text is "sans mot de passe à retenir" in HTML and "sans mot de passe" in text, a trivial mismatch (inviteEmail.ts:39 vs 57).
- Minus: "Vérification..." (LoginForm.tsx:102) and "Connexion en cours..." (ConfirmForm.tsx:33) are not in the spec table. Reasonable additions, but undocumented.

### Pillar 2: Visuals (2/4)
- Good focal point: centered card with wordmark, single acid button.
- Defect: fix 1 above. In the desktop screenshot the input (y 282-330) and the button (y 328-372) overlap by 2px, with the focus outline merging into the button.
- Defect: D2, the 1072px acid bar on /admin.
- The admin table sits inside a card with the same `--bg-2` as the table (portal.css:405), so the card padding of 24px plus cell padding of 16px gives a double inset with no visible gain.
- Icon-only buttons: none. Icons are paired with text and are `aria-hidden`. Good.

### Pillar 3: Color (2/4)
- Accent: used only for the primary button, the focus ring, the active nav indicator (never active in phase 10) and the email code digits. This matches the 4-item reserved list. `grep` shows no stray `--acid` use in portal.css beyond lines 190, 216, 315, 474.
- Hover on the primary button turns it `--ink` (portal.css:220), a clear and restrained state.
- Hard-coded colors only in the emails (inline styles, required) and `#000` on the button (spec).
- Contrast: `--ink-faint` on `--bg-2` is about 2.6:1 (labels, `.pt-back`, `th`, nav disabled, placeholder, the invite email footer). `--ink-dim` is about 6.4:1 and `--warm` about 6:1, both fine.
- W2: warning equals error.

### Pillar 4: Typography (3/4)
- Distinct sizes in portal.css: 12, 16, 24, 32, plus the OTP clamp 22-32 (portal.css:166) and `.tg` 10px (globals.css:279). Weights: 400 and 500 only. This is a real strength.
- `.pt-display` (32px) is defined but never used in the audited TSX. Dead class, harmless.
- Email: 13px security line (loginCodeEmail.ts:55) and 14px footnote (inviteEmail.ts:43) add sizes. Less relevant for mail.
- Line heights are consistent (1.2 on headings, 1.5 on body).

### Pillar 5: Spacing (2/4)
- Scale values are on-grid: 4/8/16/24/32/48/64, 44px controls, 400/960/1120 widths, gutters 16/32. Strong.
- The form internals have no gap (fix 1). The code step is the worst.
- Inline `style={{marginTop:16}}`, `{marginTop:24}`, and magic numbers in JSX (InviteForm.tsx:207, 222; admin/page.tsx:48-57) bypass the CSS file. Prefer a `.pt-stack` class.
- `.pt-error` and `.pt-warning` add no extra spacing, so messages touch the next control until the form gap is added.

### Pillar 6: Experience Design (3/4)
- Strong: pending text and disabled state on every submit; `aria-live` regions; `aria-invalid` and `aria-describedby` on the email, the code, and SIRET; 60s resend countdown with a computed `remaining`; the identical response message (D-09); NoAccess state; visible focus ring on every control, including a wrapper ring for the OTP; `prefers-reduced-motion` handled globally (portal.css:481-488); cursor reset so the public custom cursor is not inherited; no-JS-heavy back-office feel.
- SIRET flow: loading, found, failed, inactive, panel with manual fallback, and `company_source`. Complete.
- Weak: OTP remount (fix 6); confirm button after error (D8); aria-disabled spans (D5); invalid SIRET format is only reported after submit, never on blur (InviteForm.tsx:81-82, 86-87); autofocus on the email input renders an acid ring at first paint, which makes the screen look "active" before the user acts. It is spec-conformant but arguably noisy.
- Registry safety audit: skipped (no `components.json`, no third-party registries).

## What is genuinely good (keep)

- Strict adherence to the 4-size, 2-weight type system and the 4px spacing scale in CSS.
- A single acid element per view; accent exception for the email code documented in code comments.
- One real OTP input under 8 visual cells (paste and autofill compatible), with `one-time-code`, numeric mode, `pattern`, auto-submit.
- Server-side authorisation in pages and actions rather than layouts, plus noindex and canonical override.
- Table collapse to labelled stacked cards below 768px with a visually hidden `thead` (accessible).
- Copy discipline: it follows the contract precisely, in the right tone.
- Emails: inline styles, table layout, escaped HTML, a plain-text part, no tracking, expiry read from config.

## Files Audited

- C:\portfolio\.planning\phases\10-foundation-auth-isolation\10-UI-SPEC.md
- C:\portfolio\src\app\portal.css
- C:\portfolio\src\app\globals.css (tokens, `.tg`)
- C:\portfolio\src\components\portal\AuthCard.tsx, LoginForm.tsx, OtpInput.tsx, ConfirmForm.tsx, ShellHeader.tsx, ShellFooter.tsx, ShellMain.tsx, NoAccess.tsx, SignOutButton.tsx
- C:\portfolio\src\components\admin\InviteForm.tsx, ClientsTable.tsx
- C:\portfolio\src\app\connexion\page.tsx, src\app\auth\confirm\page.tsx, src\app\espace-client\page.tsx, src\app\espace-client\layout.tsx, src\app\admin\page.tsx
- C:\portfolio\src\lib\server\mail\loginCodeEmail.ts, inviteEmail.ts
- Screenshots: connexion-desktop.png, connexion-mobile.png, confirm-desktop.png (confirm-mobile.png not opened: same artifact as connexion-mobile)
