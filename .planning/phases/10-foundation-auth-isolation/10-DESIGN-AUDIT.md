# Phase 10 — Design audit (merged report)

Date: 2026-10-02. Scope: what shipped in Phase 10 — `/connexion` (email step + 8-digit code step), `/auth/confirm`, `/espace-client`, `/admin` (invite form + clients table), and the two emails (login code, invitation).

Three independent reviews, merged here:
- 6-pillar UI review against the approved spec → `10-UI-REVIEW.md` (score **15/24**)
- UX/UI critique with an anti-"AI slop" check → `10-AUDIT-UX-CRITIQUE.md` (about **24/40** on Nielsen heuristics)
- WCAG 2.2 AA accessibility review with measured contrast → `10-AUDIT-A11Y.md` (22 findings, ratios computed by `10-AUDIT-contrast.js`)

**Limits.** Only the logged-out screens were captured in a browser (`connexion-desktop.png`, `confirm-desktop.png`). The code step, `/admin`, `/espace-client` and both emails were judged from code, the spec and earlier live use. Screen-reader behaviour is inferred from the markup. Treat those findings as very likely, not proven, until someone checks them on a real phone and mail client.

## The verdict in five lines
1. The foundations are right: one-time code, the click-to-confirm page that defeats link scanners, the same answer for every address, plain French, no gradients, glow, glass, emoji or filler copy.
2. It is **not finished as a design**. The visual layer is the default dark "dev-tool" template (a centred card in an empty screen, faint uppercase mono labels, a neon accent), applied to forms meant for non-technical business owners.
3. The biggest problems are small and cheap: form spacing, text and field contrast, and a messy code step.
4. The business-critical weak spot is the client's first impression: the invitation says the space is ready, the first screen says "en préparation", and there is no human on the page.
5. "AI slop" check: none of the loud signs, several quiet ones (see below). Honest read: if told AI made the login screen, you would believe it.

## Fix first (P0, about 45 minutes in total)

| # | Problem | What the user feels | Fix |
|---|---------|---------------------|-----|
| 1 | Email field and button touch; on the code step everything is glued together | Looks broken, hard to tap | Make the form inside the card a column with 16px gap (`.pt-card > form`, `portal.css`). Root cause: the gap is on the card, the `<form>` in between has no layout (`LoginForm.tsx:56`, `:89`; also `ConfirmForm`) |
| 2 | Labels, "Retour au site", table headers, placeholder and the invite-email footer are `--ink-faint` on dark: **2.5 to 2.7:1** (needs 4.5:1) | Instructions read as decoration, impossible in daylight on a phone | 14px body font, sentence case, `--ink-dim` (6.4:1) for labels and links. Footer `#9A9690` in `inviteEmail.ts:43` |
| 3 | Code step shows two headings and two intros, and never says where the code went (`AuthCard.tsx:22`) | Contradictory, no way to catch a typo | One heading "Saisissez votre code"; replace the status line with "Code envoyé à {email}…" (echoing what the user typed does not break the anti-enumeration rule) |
| 4 | After a SIRET lookup, "Nom du client" stays empty (`InviteForm.tsx:97-103`) | Admin retypes data already on screen | `setName(n => n \|\| d.nom)`; rename the field "Nom affiché au client" |

Also in this tier: the empty input and the OTP cells have a resting border of about **1.3:1** (needs 3:1), so the field looks like a dark bar until focused — border colour `#6F6B64` (about 3.4:1). Needs a small exception to the spec's "no new tokens" rule.

## Next (P1)

| # | Problem | Fix |
|---|---------|-----|
| 5 | Pasting a SIRET and pressing Enter skips the lookup (it only runs on blur, `InviteForm.tsx:175`); the company is saved as manual with empty fields | Run the lookup as soon as 14 digits are present; disable submit while it loads; stop each blur from overwriting fields the admin edited |
| 6 | Invitation email promises "prêt", client lands on "en préparation"; the button opens an empty `/connexion` so the client retypes the address (`invite.ts:129`) | Wording "est ouvert" plus 3 numbered steps; button to `/connexion?email=…` with the field pre-filled; sign with a person ("Anatholy, Sèvalys · Tours") |
| 7 | Client home: no Sèvalys mark, no named contact, no next step (`ShellHeader.tsx:14`) | Add the mark; empty state names the contact with phone and email and says what happens next |
| 8 | Three disabled "Bientôt" tabs that do nothing; on a phone this row scrolls sideways (`portal.css:293-300`) | Remove the nav until a section exists; list the three upcoming sections inside the empty-state card |
| 9 | `/auth/confirm` does not say why one more click is needed, and shows the button even with no token | "Pour votre sécurité, confirmez la connexion en un clic."; with no token, show the error state directly |
| 10 | Resend button is `disabled` during the 60 s countdown: keyboard users cannot reach it, and nothing announces when it is available again | Keep it focusable with `aria-disabled`, announce availability |
| 11 | Wide primary button: "Inviter le client" stretches about 1070px on desktop (`.pt-btn-primary { width:100% }`, `portal.css:215`) | Full width only inside the login card |
| 12 | Login-code email never names Sèvalys in its body (`loginCodeEmail.ts:50-55`); the 8-digit block may overflow at 320px | Wordmark at the top; show the code as `4821 0937`; verify width in real mail clients |
| 13 | The code input remounts on every submit (`LoginForm.tsx:98`), so cells blank and focus jumps while checking; auto-submits on the 8th digit with no warning; no visible label or active-cell highlight | Keep the input mounted; add a visible label and an active cell |

## Later (P2)

- Centre the login card vertically and add a reassurance line ("Pas de mot de passe…") and a help address under it.
- Admin: after a successful lookup show a read-only summary with a "Corriger" button instead of five open inputs.
- Admin table: add a status column ("Invité" / "Connecté le …"), format the SIRET with spaces, make the email a link.
- Group the 8 code cells visually 4+4.
- On narrow screens the clients table loses its table semantics and empty cells show a label with no value.
- Between 768px and about 1100px the client name may collapse in the header; verify in a browser.

## "AI slop" check

| Sign | Present? |
|------|----------|
| Default gradients, glow, glassmorphism | No |
| Filler or "AI" copy | No — the French copy is the strongest asset |
| Emoji or meaningless icons | No |
| Centred-everything layout with no point of view | **Yes** (login card floating in an empty screen) |
| Dev-tool aesthetic on non-dev users | **Yes** (near-black, one neon accent, faint mono uppercase labels) |
| Placeholder "coming soon" chrome | **Yes** (disabled tabs) |
| Generic empty-state card | **Yes** (no person, no next step) |

What would make it feel authored instead of templated: a named human and a real next step on the client home, warmer and larger form labels, a visible brand moment (mark in the portal header, wordmark in emails), and layout that uses the space instead of floating in it.

## Keep as is
- The single real OTP input under visual cells (paste, autofill, numeric keypad).
- The click-to-confirm page and the identical response for every address.
- The 60 s resend with a visible countdown, and "Changer d'adresse e-mail".
- Errors with icon plus text, announced to screen readers, with `aria-invalid` and `aria-describedby`.
- Pending labels on buttons ("Envoi en cours…").
- Non-blocking SIRET warnings with a manual fallback.
- The admin table turning into labelled cards on phones.
- Restraint: one accent, no decorative motion, reduced-motion respected, emails with a plain-text part and no tracking pixel.
- The 4-size, 2-weight type scale and the 4px spacing scale.

## What passes, measured
Body text 15.6 to 16.4:1, `--ink-dim` 6.4:1, error colour 6.2:1, accent-button text 16.5:1, focus ring 14.7:1 on the card and 15.5:1 on the page, email code digits 15.5:1.

## Lessons for the next UI specs (Phases 11 to 17)
The approved Phase 10 spec caused part of the problem, so the next ones should add:
1. A contrast check for every text token, including `--ink-faint`, and a rule that interactive or essential text never uses it.
2. A spacing rule inside forms (the gap was lost at the one place the spec said nothing).
3. A resting-border contrast rule for inputs (3:1).
4. Warnings and errors need different treatment (today both use `--warm`).
5. Cover every email, not just the login code.
6. Allow the sizes actually needed (the spec allowed four sizes but also required a 10px tag and a mobile-fitting code input).
7. A "first impression" line for each client-facing page: who is the human, what happens next.
8. Verify new screens in a real browser at phone width before sign-off, since the headless capture here was misleading.

## Decision needed
Implement the P0 group (items 1 to 4 plus the input border) now as one small change, then P1 as a second pass? Estimated 45 minutes and roughly two hours.
