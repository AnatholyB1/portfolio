# Sèvalys client portal (phase 10): UX/UI critique

Method: the 4 requested skills were loaded and applied (critique heuristics and AI-slop lens, web-interface guidelines, design-taste anti-patterns, ui-ux-pro-max checklist). I did not run the `npx impeccable` deterministic detector or the live guideline fetch: this was a read-only pass on code and screenshots. Mobile screenshots: the card's right-edge clipping is a headless-window artifact, not a bug. `.pt-card` is `width:100%; max-width:400px` inside 16px padding (portal.css:66-100), so it cannot overflow. One real horizontal scroll does exist on mobile: the client nav (finding F8).

## 1. Executive summary

1. The base is sound: security choices are right (one-time code, anti-scanner confirm page, same answer for every address), the copy is plain French, and there are no gradients, glow or glass.
2. Layout polish is not there yet. Both login forms have zero spacing between their elements, because `<form>` is not a flex container, so the card's `gap:16px` never reaches the fields (LoginForm.tsx:56, :89).
3. Form labels are 12px uppercase mono in `#5A5751` on `#111213`. That is a 2.6:1 contrast ratio, which fails WCAG AA. A non-technical owner reads them as decoration, not instructions.
4. The code step stacks two headings and two intros ("Connexion" + email intro + "Saisissez votre code" + code intro) and never shows which address the code went to.
5. The invitation email says "est prêt". The client then lands on "Votre espace est en préparation", with three greyed-out "Bientôt" tabs. The promise in the email and the first screen contradict each other.
6. The invite link opens a blank `/connexion`, so the client has to retype the address the email was just sent to. That makes 3 steps and 2 emails before they see an empty page.
7. The client home has no Sèvalys brand, no human contact and no next step. For a local agency, the missing human is the biggest missed trust signal.
8. Admin: after a SIRET lookup, "Nom du client" stays empty (InviteForm.tsx:97-103 never sets `name`). The lookup only fires on blur, so pressing Enter skips it, and the 5 pre-filled inputs make the form feel twice as long as it is.
9. AI-slop verdict: none of the loud tells, but several quiet ones. A centered card in an empty viewport, faint mono-uppercase labels and a "coming soon" nav read as a template, not as Sèvalys.
10. Nielsen score: about 24/40 ("acceptable, needs work"). Four P0 items, all small (S effort), fix most of what a client feels on first contact.

## 2. Prioritized findings

| ID | Screen | What the user experiences | Why it matters | Concrete fix | Effort | Prio |
|---|---|---|---|---|---|---|
| F1 | /connexion, /auth/confirm | The email field touches the button. In the code step, the heading, text, cells and three buttons are all glued together. | It looks broken and lowers trust on the very first screen. Tap targets also have no spacing (8px minimum). | portal.css: `.pt-card > form { display:flex; flex-direction:column; gap:16px; } .pt-card > form .pt-btn-text { align-self:center; }` | S | P0 |
| F2 | /connexion code step | Sees "Connexion", then "Saisissez l'adresse e-mail…" (step-1 text still shown, AuthCard.tsx:22), then a second 24px heading "Saisissez votre code" (LoginForm.tsx:92). It never says where the code was sent. | Contradictory instructions, and no way to catch a typo in the address. The spec (S1) says step 2 *replaces* step 1. | Let LoginForm own the heading and helper per step: AuthCard `title`/`helper` optional, then render `<h1>Connexion</h1>` + helper in step 1, and `<h1>Saisissez votre code</h1>` in step 2. Replace the status line with `Code envoyé à {email}. Il arrive en général en moins d'une minute. Pensez à vérifier vos courriers indésirables.` Echoing the address the user typed reveals nothing, so the anti-enumeration rule (D-09) still holds. | S | P0 |
| F3 | All forms, footer link | Labels and "Retour au site" are 12px mono uppercase, `--ink-faint` on `--bg-2` = 2.6:1 (portal.css:48-57, :109-117). | Fails WCAG 1.4.3. Hard to read for 50+ owners and on phones in daylight. The spec itself says ink-faint is "never for essential copy". | `.pt-label { font-family:var(--font-body); font-size:14px; font-weight:500; text-transform:none; letter-spacing:0; color:var(--ink-dim); }` (6.4:1). Do the same for `.pt-back`. Keep mono uppercase for table `th` only. | S | P0 |
| F4 | Admin invite | After a successful SIRET lookup, "Nom du client" stays empty but is required. "Raison sociale" holds the same data 2 fields lower. | Duplicate typing, and two "name" fields with unclear roles. This name is what the client sees in their header. | Put SIRET first in the grid. In `onSiretBlur`: `setName(n => n || d.nom || '')`. Rename the field to `Nom affiché au client` with helper `Prérempli depuis la raison sociale, modifiable.` | S | P0 |
| F5 | Admin invite | Pasting a SIRET and pressing Enter submits without any lookup, because the lookup is bound to `onBlur` only (InviteForm.tsx:175). The company is saved as `manual` with empty fields. | Silent data loss on the main admin action. | Trigger the lookup in `onChange` once 14 digits are present (keep blur as a fallback). Disable the submit button while `lookup.phase==='loading'`. | S | P1 |
| F6 | Invite email to /connexion | The email says "Votre espace client… est prêt". The CTA opens an empty `/connexion` (invite.ts:129). The client retypes their address, waits for a second email, enters 8 digits, then lands on "en préparation". | Expectation broken at the peak moment. Highest drop-off risk for non-technical users. | Subject and title: `Votre espace client Sèvalys est ouvert`. Body: list the 3 steps (`1. Cliquez sur le bouton · 2. Votre adresse est déjà remplie · 3. Saisissez le code reçu par e-mail`). CTA URL: `/connexion?email={encoded}` to pre-fill the field (LoginForm initial state). Sign with a person: `Anatholy, Sèvalys · Tours`. Footer `#5A5751` to `#9A9690` (2.6:1 to 6.4:1, inviteEmail.ts:43). | M | P1 |
| F7 | /espace-client | The first screen after logging in is a single card: "en préparation" plus a mailto link. No Sèvalys mark in the header (ShellHeader.tsx:14), no contact person, no "what next". | A small B2B relationship runs on a known human. Seen a few times a month, this page should reassure and route. | Add `SevalysMark` before the company name in the header. Empty-state body: `Votre interlocuteur : Anatholy Bricon` + `tel:` link + mailto, then `Prochaine étape : nous vous prévenons par e-mail dès que votre premier document est en ligne.` | S | P1 |
| F8 | /espace-client header | Three disabled tabs with a 10px "BIENTÔT" pill each (globals.css:279). On mobile this row scrolls sideways (portal.css:293-300). | The first interactive-looking items do nothing. "Coming soon" chrome is placeholder scaffolding. | Remove the nav until a section ships. Move the three items into the empty-state card as a short "Ce qui arrive ici" list: `Projet: suivi d'avancement`, `Documents: devis, contrats, livrables`, `Paiements: factures et règlements`. | M | P1 |
| F9 | /auth/confirm | A heading and one button, no explanation of why one more click is needed. With an empty `token_hash`, the button still shows and only then fails (confirm/page.tsx:12-16). | Looks like a phishing or broken step. The click is required (anti-scanner), but the user should know why. | Helper: `Pour votre sécurité, confirmez la connexion en un clic.` If `!tokenHash`, render the error state directly (`Ce lien n'est plus valide.` + `Demander un nouveau code`). | S | P1 |
| F10 | All inputs | At rest, the field edge (`#2a2a2a` on `#16181a`, about 1.3:1) is nearly invisible. Only the acid focus ring shows where to type. | Fails WCAG 1.4.11 (3:1 for UI components). The empty input in the screenshot reads as a dark bar. | `.pt-input, .pt-otp-cell { border-color:#6F6B64 }` (about 3.4:1). Note that this needs an exception to the "no new tokens" rule, or reuse `--ink-faint` (2.5:1, still short). | S | P1 |
| F11 | /connexion desktop | A 400px card pinned 64px from the top of a 1440x900 viewport. About 60% of the screen is empty, and nothing says what this space is or what to do without an invitation. | Feels unfinished, offers no context and no help path. | `.pt-auth { justify-content:center; min-height:100dvh; }`, card `max-width:440px`. Under the card: `Pas de mot de passe : un code à usage unique vous est envoyé par e-mail.` and `Un souci pour vous connecter ? contact@sevalys.com`. | S | P2 |
| F12 | Admin invite (read-back) | After a lookup, 5 open inputs in a 2-column grid. NAF sits alone. The form is about 2x longer than needed for a value that is usually correct. | Admin scanning cost. Editable-by-default invites accidental edits. | When `source==='api'`: show a read-only summary (raison sociale / adresse, CP commune / NAF) with a `Corriger` text button that reveals the inputs. Manual mode keeps the inputs. Layout: address full row, `CP | Commune` as `1fr 2fr`. | M | P2 |
| F13 | Admin table | Columns are Client / SIRET / E-mail / Date. No "has the client logged in?" status, SIRET is raw 14 digits, no resend. | The admin's real question after inviting is "did they get in?". | Add a `Statut` column (`Invité` / `Connecté le …` from `last_sign_in_at`). Format SIRET as `123 456 789 00012`. Make the email a `mailto:` link. | M | P2 |
| F14 | Login-code email | No brand or greeting in the body, sender shown as "Sevalys" (no accent, loginCodeEmail.ts:4), 8 digits shown as one block. | Phishing-like anonymity. An 8-digit string is error-prone to transcribe on a phone. | Add `Sèvalys` wordmark text at the top, From `Sèvalys <connexion@…>`, display code `4821 0937` (display only; also in the text part). Add `bgcolor` attributes on tables so clients that drop CSS backgrounds don't leave lime on white. | S | P2 |
| F15 | Code cells | 8 identical cells with 4px gaps. On a 320px phone, the cells are about 26px wide. | Hard to keep your place when checking the code against the email. | Group visually as 4+4: `.pt-otp-cell:nth-child(5){ margin-left:8px }` (mirrors F14). | S | P2 |

## AI-slop check (honest)

| Tell | Present? | Evidence |
|---|---|---|
| Default gradients, glow, glassmorphism | No | portal.css has no `box-shadow`, no `backdrop-filter`, no gradient. Motion is limited to 150-200ms colour transitions with reduced-motion respected. |
| Filler or "AI" copy (Elevate, seamless…) | No | Copy is specific, uses vouvoiement, and the errors state cause and fix. This is the strongest anti-slop asset. |
| Emoji or meaningless icons | No | Only AlertCircle, CheckCircle and LogOut, each paired with text. |
| Centered-everything layout with no point of view | Yes | Logo plus centered card in an empty viewport, identical on mobile. It is the default auth template layout (F11). |
| Dev-tool aesthetic applied to non-dev users | Yes | Near-black with one neon lime accent, plus JetBrains Mono uppercase tracked labels in faint grey. This is the Vercel/Resend/Linear-clone look. It is on-brand with the site, but on forms for SME owners it is style over function (F3). |
| Placeholder "coming soon" chrome | Yes | Three disabled nav tabs with "Bientôt" pills (F8). |
| Generic empty-state card | Yes | Heading plus paragraph plus mailto, no human or next step (F7). |
| Over-rounding | Mild | 100px pill CTA, 12px cards, 8px inputs. Consistent, but the full-width lime pill is the stock template button. Acceptable as brand. |

Verdict: if told "AI made the login screen", I would believe it. The admin and the copy feel authored, but the visual layer does not yet say "a person in Tours runs this".

## 3. Keep as is

- One real OTP input under visual cells, with `autocomplete="one-time-code"`, `inputmode=numeric`, paste support and auto-submit on the last digit (OtpInput.tsx:34-49).
- The confirm page only acts on POST (anti link-scanner), and the same response for every address (anti-enumeration). Keep the principles and only reword the copy (F2, F9).
- 60-second resend with a visible countdown, and "Changer d'adresse e-mail" as an escape route.
- Errors in `aria-live` with icon plus text (never colour alone), plus `aria-invalid` and `aria-describedby`.
- Disabled buttons with explicit pending labels ("Envoi en cours...", "Invitation en cours...").
- Non-blocking SIRET warnings (not found, closed establishment), and a manual fallback.
- The admin table collapses to labelled stacked cards under 768px (portal.css:431-465).
- Restraint: one accent used for the CTA and focus, no decorative motion, emails with no tracking pixel and a plain-text part.

## 4. Quick wins (under 1 hour in total)

1. **Form spacing** (5 min): add the `.pt-card > form { display:flex; flex-direction:column; gap:16px }` rule (F1).
2. **Readable labels** (10 min): switch `.pt-label` and `.pt-back` to 14px Manrope, sentence case, `--ink-dim` (F3).
3. **Clean code step** (15 min): drop the step-1 helper in step 2, use a single h1 "Saisissez votre code", and add `Code envoyé à {email}.` (F2).
4. **SIRET pre-fills the name and runs on input** (15 min): `setName(n => n || d.nom || '')`, trigger the lookup at 14 digits, and disable submit while loading (F4, F5).
5. **Copy alignment** (10 min): invite email subject "est ouvert", footer colour `#9A9690`, confirm-page helper `Pour votre sécurité, confirmez la connexion en un clic.` (F6 partial, F9).
