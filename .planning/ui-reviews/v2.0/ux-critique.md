# UX critique, milestone v2.0 (Plateforme Sèvalys, phases 10-19)

Method: code and template reading only (no browser, no production access, no src changes). Frameworks: `critique` (Nielsen heuristics, cognitive load, personas, emotional journey) with the `impeccable` laws. Context: `PRODUCT.md`, `.planning/ROADMAP.md`, phase CONTEXT/UI-SPEC files. The automated detector (`npx impeccable`) was not run: no browser and no mutation allowed, and this is a code-read pass. Verdicts below are therefore human-judgement only.

Scope read: `/connexion`, `/espace-client` (+ `/documents`, `/documents/[id]/signer`, `/paiements`), `/avis`, `/avis/[token]`, `/politique-des-avis`, `/desinscription`, `ConsentDialog`, simulator `Wizard`, `/admin` (clients, leads, lead detail, projets, project sheet, pilotage, avis, liens, e-mails), step engine copy (`src/lib/projects/steps.ts`, `copy.ts`), mail rules.

Caveat: this complements, and does not repeat, the earlier `portal-UI-REVIEW.md` and `public-UI-REVIEW.md` (visual 6-pillar audits). This file is about flow, information architecture and persona friction.

---

## 1. Scores per dimension (0-10)

| Dimension | Client portal | Admin | Public (consent, /avis, simulator) | Note |
|---|---|---|---|---|
| Visual hierarchy / primary action clarity | 6 | 5 | 6 | Client home has no single dominant "do this now" action once past onboarding. Admin has no home at all that says what needs attention. |
| Information architecture | 6 | 5 | 7 | Admin nav is 8 flat peers; the landing page `/admin` is the invite form. Client IA (Projet / Documents / Paiements) is clean. |
| Cognitive load | 7 | 5 | 7 | Admin project sheet stacks 6+ panels. Client is calm, plain French, one thing per card. |
| Emotional resonance / trust | 8 | 6 | 7 | Very strong in the client copy (no jargon, "Rien, votre projet est livré", honest review policy). Admin is utilitarian by design. |
| Error prevention and recovery | 8 | 7 | 6 | Excellent on signature/payment/OTP. Weak on the public review error paths and simulator. |
| Mobile / one-handed use | 7 | 4 | 6 | Admin is the weak point (see Persona 2). |
| Consistency | 7 | 7 | 5 | Two OTP lengths, two visual systems on public pages (Tailwind vs `pt-*`), em dash usage. |
| Help, status and feedback | 7 | 6 | 6 | Payment return banner with polling is exemplary. Dashboard has no cues for pending work. |

Overall health score (Nielsen, all v2.0 surfaces together): **29/40, Good with clear gaps** (below).

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Payment return polling, signing phases, "En attente de" panel are good. Gap: waiting-on is wrong in steps 2-3 (see H1). |
| 2 | Match real world | 3 | Warm, jargon-free French. Gap: "faits", "blocage", "TFA/TAV" leak into admin UI. |
| 3 | User control and freedom | 3 | Revoke fact, unhide review, change e-mail in login. Gap: consent modal cannot be dismissed on failure. |
| 4 | Consistency and standards | 3 | 6-digit signing code vs 8-digit login code; two styling systems. |
| 5 | Error prevention | 3 | Consent checkboxes, double-submit guards, hash display. Gap: simulator labels not bound to inputs. |
| 6 | Recognition over recall | 3 | Masked email shown at signing, project title on review form. Admin must remember what to look at each morning. |
| 7 | Flexibility and efficiency | 2 | No admin work queue, no saved filters, no keyboard or bulk paths. |
| 8 | Aesthetic and minimalist design | 3 | Client side restrained. Admin project sheet and lead header are crowded. |
| 9 | Error recovery | 3 | Good messages with next step on payment/upload. Review "link invalid" conflates throttle with expired. |
| 10 | Help and documentation | 3 | Contact always reachable, policy page exists. No in-flow explanation of what e-signature means legally for a layperson beyond two checkboxes. |
| | **Total** | **29/40** | |

AI-slop verdict: the portal and admin do not read as generic AI output. They are deliberately plain, tokenised (`--ink`, `--acid`, `--bg-2`), with no gradient text, no glass, no hero metric tiles on the client side. One exception worth watching: `PilotageKpis` renders a row of big-number tiles (`.pt-funnel-kpi-value`) with label and rule line. It is a legitimate use for a financial dashboard (each tile links to a detail and carries its calculation rule, which is better than the typical template), but it sits close to the "hero-metric" shape; keep the rule line, resist adding decorative accents.

---

## 2. Friction points, ranked

### HIGH

**H1. Step engine says "Sèvalys is working" at the moments the client must act (steps 2 and 3).**
Files: `src/lib/projects/steps.ts` (STEPS[1], STEPS[2]: `waitingOn: 'admin'`, expectedAction "Nous préparons votre devis" / "Nous préparons votre contrat et la demande d'acompte"), rendered by `src/components/portal/project/WhoWaits.tsx` on `src/app/espace-client/page.tsx`.
The gates are `quote_accepted` (step 2) and `contract_signed` + `deposit_received` (step 3): both are client actions. Once the quote or contract is issued, the panel still reads "En attente de Sèvalys". The only mitigation is a small dim line under the card (`awaitingSignature` helper, 14px, `--ink-dim`) linking to Documents. A non-technical owner reads the big panel, concludes nothing is needed, and the deposit (which "lance la production") waits. This is the single biggest conversion-of-work-into-revenue leak in the portal.
Fix: derive `waitingOn` and `expectedAction` from document/invoice state, not only the static step definition: if a signable document is `to_sign` show "Vous: signer le devis" with a primary button to `/espace-client/documents/[id]/signer`; if an invoice is `to_pay` show "Vous: régler l'acompte" with the pay action or link to `/espace-client/paiements`.

**H2. No primary call to action on the client home beyond onboarding.**
File: `WhoWaits.tsx` only renders a button when `showOnboardingCta`. Steps 3 (sign, pay), 5 (recette PV) and 6 (pay balance) have no button; the client has to find the right tab (`ClientNav`, no badge or count) and the right row. For an SME owner on a phone, "Documents" and "Paiements" tabs give no hint that one has something pending.
Fix: one dominant action button in the "En attente de" card per state; add a small dot or count on the nav tabs when an item awaits the client.

**H3. Admin has no "today" view; the landing page is the invite form.**
Files: `src/app/admin/page.tsx` (h1 "Inviter un client", then client table), `src/components/admin/AdminNav.tsx` (8 flat items: Clients, Leads, Projets, Entonnoir, Liens, Pilotage, Avis, E-mails).
The solo founder at 7am wants three answers: new leads since yesterday, projects blocked on me (and for how long), money to chase. Today that is 3 pages (Leads with the "à revoir" chip, Projets filtered by blocage, Pilotage anomalies) and the alerts mostly come by e-mail (`MAIL_RULES`: `document_signed_admin`, `review_published_admin`, `payment_reminder_admin`...). The app itself is passive.
Fix: make `/admin` a work queue: "À faire" (leads `new` and unseen returns, projects waiting on Sèvalys sorted by days, unpaid invoices over 14 days, anomalies), with clients/invite demoted to a secondary page.

**H4. Admin navigation is not designed for a phone.**
Files: `src/components/admin/leads/leads.css` (`.pt-admin .pt-admin-nav ul { display:flex; gap:24px }`, no `flex-wrap`, no `overflow-x`, no mobile rule), plus `AdminNav.tsx`.
Eight labels at 14px with 24px gaps is roughly 600px wide; on a 390px viewport it either overflows the card or forces horizontal page scroll, and the active tab can be off-screen. `ClientNav` has the same markup but only 3 items, so it is fine.
Fix: horizontal scroll with `scroll-snap` and the active item scrolled into view, or collapse to a select/bottom bar with the 4 daily entries (Leads, Projets, Pilotage, Avis) and "Plus".

**H5. Lead to client conversion is gated by an invisible rule, shown as a dead primary button.**
File: `src/app/admin/leads/[id]/page.tsx` (for `status === 'new'` and `'lost'`: a `pt-btn-primary` with `aria-disabled` plus helper "Convertible à partir de « Qualifié »").
A primary-styled button that does nothing is the classic mismatch; at 7am on a phone, tapping it yields no feedback beyond reading a small side note. The header row also stacks status pill, badge, project link, convert button, "Revenu" badge and "Lead précédent" badge in one flex line (`.pt-lead-header`), which wraps unpredictably on 390px.
Fix: when `new`, replace the dead button with a real primary "Qualifier ce lead" (sets status via the existing `setStatusAction`), then offer convert; or allow convert from `new` with an explicit confirmation. Move secondary badges out of the primary action row.

### MEDIUM

**M1. Simulator contact form: labels not bound to inputs, phone mandatory, headline over-promises.**
File: `src/components/simulateur/Wizard.tsx` (contact step, lines ~317-400): `<label>` without `htmlFor`/nesting for Nom, Email, Téléphone (screen readers announce unlabeled fields; tap on label does not focus). `type="tel" required`. Heading "Où vous envoyer votre diagnostic ?" while the sub says the result appears right after on screen; nothing is actually sent to the user, which breaks the promise and also removes a reason to give a valid email. Five RGPD rows (`.sim-rgpd`) sit between consent and the submit button, pushing "Obtenir mon diagnostic →" below the fold on a small phone. Result CTAs are both `btn-primary` (call, write), consistent with the SIMU-07 decision but there is no "book a slot" or in-page form fallback.
Fix: bind labels; make phone optional or justify it ("pour un rappel de 10 minutes"); rename heading to "Pour qui est ce diagnostic ?"; keep the legal mentions but collapse behind a visible "Traitement de vos données" summary line only if the CNIL requirement allows (the current comment says never collapse; the alternative is to move the submit button above the table on mobile via sticky bar).

**M2. Consent dialog blocks everything on first visit and has no escape if saving fails.**
File: `src/components/consent/ConsentDialog.tsx` (`onCancel` prevented, `showModal()`, failure only shows an inline error and keeps both buttons) and `consent.css`.
Positive: Accept and Refuse have identical weight (CNIL-clean) and the copy is short and plain. Negative: on mobile the modal covers the page right after the cinema intro, so first impression is a legal wall; a network blip on `/api/consent` leaves the visitor in a modal they cannot close.
Fix: after one failed attempt, allow "Continuer sans enregistrer" (treated as refusal, in-memory). Consider a bottom-sheet that does not block reading.

**M3. Review link page conflates "throttled" with "invalid", and the dead end has no way forward.**
File: `src/app/avis/[token]/page.tsx`: when `hitThrottle` denies, it renders `InvalidLink` ("Ce lien n'est plus valide... a déjà été utilisé ou a expiré"). A real client who reloaded several times, or shares an office IP (`getClientIp`) with colleagues opening the same email, is told the link is dead. Also `ReviewForm.tsx` repeats the same text for HTTP 410.
Fix: separate throttle copy ("Trop de visites, réessayez dans quelques minutes"). Give the invalid state a mailto with prefilled subject.

**M4. Review form asks a lot of an unmotivated respondent; no draft safety.**
File: `src/app/avis/[token]/ReviewForm.tsx`: rating, optional title, body (min 20, max 2000), display-mode radios, first name, optional initial, consent checkbox, link to policy. Eight decisions for a task the client does for free after the project is finished. The strict "no links or markup" error (`markup_or_link`) can reject innocently written text (a client mentioning the site address). No autosave; if 410/500 occurs the text is on screen but a refresh loses it. Rating star targets are 24px icons inside buttons (check `.rv-star` for 44px hit area; icon alone is 24).
Fix: make rating the first and only required step visible, reveal text, then name; preserve draft in `sessionStorage`; say why links are refused; confirm hit area is at least 44px.

**M5. Thank-you after the review is a dead end that celebrates little.**
File: `src/app/avis/[token]/ReviewThankYou.tsx`: "Merci pour votre avis" + "Voir la page Avis" + optional Google button. The Google CTA is deliberately equal for all ratings (compliant with the no-gating policy), but the peak-end moment is flat: no mention of what happens next, no link back to the client's own space, no reminder that they can reach out. Fine legally, a small missed opportunity emotionally.
Fix: one warm sentence naming the project and a "Retour à mon espace" link when a session exists.

**M6. The 6-digit signing code and the 8-digit login code live next to each other.**
Files: `LoginForm.tsx`/`OtpInput.tsx` (`OTP_LENGTH` from `lib/auth/schemas`, 8, segmented 4+4 cells) vs `SigningFlow.tsx` (`OTP_LEN = 6`, single input `pt-sign-otp`). Same mental model, different length and different widget. A client who just logged in with 8 digits is asked for 6, from another e-mail. Also the signing flow shows a long document iframe first with the consent boxes and code below; on mobile PDF iframes are unreliable (`SIG.read.mobileNote` acknowledges it).
Fix: align lengths and component or at least announce "code à 6 chiffres" in the e-mail subject; on mobile, default to "Ouvrir dans un nouvel onglet" as primary rather than a framed viewer.

**M7. Client file/document/payment tables rely on `data-label` stacking; the pay card is above the table only for the first invoice.**
File: `src/components/portal/project/PaymentsList.tsx`. The "next to pay" invoice gets a prominent card (good); additional `to_pay` invoices get a ghost "Payer" in the table. When two invoices are due, the second looks secondary though equally due. Test mode warning (`pt-warning`) in production data is shown per project group, fine.
Fix: list all `to_pay` invoices in the highlighted block (stack, sorted by due date).

**M8. Admin project sheet is one very long page; critical admin actions sit at the bottom on mobile.**
File: `src/app/admin/projets/[id]/page.tsx`: main column = Étape et faits (timeline, summary, PostFactForm, FactJournal), Files, Documents, Billing, then the side column cards (Info, Onboarding, Consent, ReminderHold, ReissueReviewLink, Links) collapse beneath. Everything the founder does at 7am (post a fact, issue the quote, see who is waiting) is deep in the scroll.
Fix: section anchors or a sticky in-page nav (Étapes, Documents, Facturation, Fichiers, Infos); collapse Files and journal by default.

**M9. Moderation page: reviews are published unmoderated, but the admin list gives no triage.**
File: `src/app/admin/avis/page.tsx`: flat chronological list of cards each with a collapsed "Détails et historique", no filter for Masqué/Publié, no unread marker, no jump to the project. Admin learns about a new review by e-mail (`review_published_admin`). Reasonable for a handful, but the "illegal only" rule is explained in a small helper paragraph and again in the dialog; good. Review body is hidden inside `<details>`: the moderator has to open each one just to read it.
Fix: show the first 2 lines and the star rating inline; badge for "nouveau depuis dernière visite".

**M10. Pilotage is dense and first-load shows test-data toggles and period controls above the numbers.**
File: `src/app/admin/pilotage/page.tsx`: controls (Période, Montants HT/TTC, TVA franchise note, "Inclure les données de test (séries TFA et TAV)", Appliquer) come before KPIs; a form with `Appliquer` means two taps to change period on a phone. "TFA/TAV" is internal jargon. Positive: every KPI tile carries its rule and an explicit "Chiffres indisponibles" state instead of a wrong number.
Fix: KPIs first, controls collapsed in a sticky row, auto-submit on change (or segmented links like `pilotageHref` already provides).

### LOW

- L1. `/avis` page ends with a card repeating the "Politique des avis" link already in the intro (`src/app/avis/page.tsx`). Redundant.
- L2. `/avis` pagination labels "Avis précédents" for older and "Avis plus récents" for newer is ambiguous direction wise; use "Plus anciens" / "Plus récents".
- L3. `/politique-des-avis` uses a Tailwind heading style (`text-4xl font-bold`, `h2 ... border-b`) different from `/avis` (`text-[32px] font-medium`). Mild inconsistency across two sibling public pages.
- L4. E-mail subjects use "—" (em dash) and the admin tables use `EM_DASH` as empty placeholder; the project laws forbid em dashes in copy (`reminderEmails.ts`, `paymentEmails.ts` subjects; `lib/admin/format`). Use ":" or "|" and a plain "-" placeholder.
- L5. `AdminNav`/`ShellHeader` for admin shows a static title "Sèvalys · Administration" on every page, wasting the top bar; page identity lives only in the h1 inside the card.
- L6. Login: "Pensez à vérifier vos courriers indésirables" is the only help if the code never arrives; no "Renvoyer" until 60s and no alternative (the roadmap mentions a link fallback; not surfaced in UI).
- L7. Project timeline `Timeline.tsx` for the client shows both `description` and `date` per step; step 6 name "Livraison et solde" combines two ideas; final done state gives no deliverables shortcut besides `PortalLinks`.
- L8. `ConsentCard` (client) and consent dialog (public) use different words for what is similar (project consent vs cookie consent). Make sure labels distinguish them ("Autorisation de citer ce projet").
- L9. Pilotage and lead tables use `role="table"/"row"/"cell"` on native elements (redundant, harmless) in `LeadsTable.tsx`.

---

## 3. Journey walk-throughs and emotional curve

### Client journey

| Moment | Emotion today | What helps | What hurts |
|---|---|---|---|
| Invitation e-mail to `/connexion` | Curious, slightly wary | Email prefill via `?email=`, "Pas de mot de passe", mailto help | None critical |
| Login code (8 digits) | Mild effort | Single real input (autofill works), 4+4 grouping, resend timer, "Changer d'adresse" | Spam folder is the only recovery advice |
| First project view | Reassured | "En attente de", 6-step frise, plain wording, named interlocutor with phone | Onboarding CTA good; later steps lack CTA (H2) |
| Quote then contract then deposit | Anxious (money, legal) | Hash and reference shown, explicit consent text versioned, cooldown messaging | Panel says "we are working" (H1); no price shown on the project page itself by design |
| Document review and e-sign | Careful | Steps indicator, mismatch screen for wrong signer, sealed PDF download | PDF iframe on phone; 6 vs 8 digits (M6) |
| Deposit payment | Highest anxiety | Dedicated pay card, "paiement sécurisé" note, return banner with polling and "annulé" recovery | Multiple invoices (M7) |
| Delivery | Relief | "Rien, votre projet est livré" | No celebration, no handover checklist or link to deliverables on completion |
| Review request e-mail | Neutral, low motivation | Honest policy, no gating, Google optional | `review_request` is `marketing` class (blocked if client unsubscribed); form has 8 fields (M4) |
| `/avis/<token>` then thank-you | Mildly generous | Name preview "Affiché publiquement", counter | M3, M5 |

Peak-end verdict: the peak (payment return banner, signature success card) is well handled. The end (delivery, review thank-you) is under-designed relative to the middle of the journey.

### Admin journey
Lead arrives (e-mail + `/admin/leads` list with "à revoir" chip) then status pill dropdown (menu with keyboard support, good) then conversion dialog (SIRET lookup reuse, existing-client warning, strong) then project sheet (step engine, facts, documents, billing) then pilotage then moderation then UTM link builder. The engine is thorough and defensible (immutable facts, revoke with reason, hash verification). The cost is that every task is "go to page X, find row, open sheet", and nothing tells the founder which row to open (H3).

### Public
Consent modal (M2) then simulator (M1) then `/avis` and `/politique-des-avis`. `/avis` empty state is honest and points to realisations and contact, never a dead end (matches Design Principle 5).

---

## 4. Persona red flags

**Non-technical SME owner (client)**
- Reads "En attente de Sèvalys" at step 3 while a contract and a deposit invoice are waiting for them (H1, H2).
- Sees two different code lengths and two senders in one session (M6).
- Opens `/espace-client/documents` on a phone, a five-column table that stacks via `data-label`; "Version 1", "Statut" columns add noise next to the single useful action "Lire et signer".
- On the review form, wonders why a link is refused and loses a long text if the connection drops (M4).
- Thinks "Brouillon, Dormant, Hors convention" are for them: they are not (admin only), good.

**Solo admin/founder at 7am on a phone**
- Opens `/admin`, lands on an invite form (H3).
- Nav is wider than the screen (H4).
- Lead detail has a dead primary button (H5), then a long page.
- Pilotage: must scroll past controls and a "TFA/TAV" checkbox before seeing money (M10).
- Moderation: must tap into `<details>` to read each review (M9).
- UTM `LinkBuilder`: 8 fields (source, medium, destination, offre, cible, mois, content, term) with live validation, powerful, but a desktop task; make sure the copy button is reachable on mobile.

**Anonymous visitor on mobile**
- Consent modal after the intro, cannot be dismissed if network fails (M2).
- Simulator: unlabeled inputs, required phone, 5-row legal block before the button (M1).
- `/avis`: good readable page, 800px max width, reviews with `ReviewCard`; OK.

---

## 5. Quick wins (under half a day each)

1. Bind `<label htmlFor>` to the three simulator inputs (`Wizard.tsx`); add `autoComplete` already present.
2. Replace the dead "Convertir en client" for `new` leads with "Qualifier ce lead" using the existing status action (`leads/[id]/page.tsx`).
3. Add `overflow-x: auto; flex-wrap: nowrap; scroll-snap-type: x proximity` to `.pt-admin-nav ul` and scroll the active link into view.
4. Throttle copy split in `avis/[token]/page.tsx` ("Trop de visites" vs "Lien non valide").
5. In `WhoWaits.tsx`, make the `awaitingSignature` hint a real button ("Lire et signer le devis") and add the same for a `to_pay` invoice linking to `/espace-client/paiements`.
6. Show a count dot on `ClientNav` Documents/Paiements when something awaits the client.
7. Move the Pilotage controls into a `<details>` or compact row below the tiles; rename the test checkbox to "Inclure les données de démonstration".
8. Replace "—" in e-mail subjects and in empty-cell placeholders with ":" and "-".
9. Rename pagination labels on `/avis` to "Plus anciens" / "Plus récents"; drop the duplicate policy card.
10. Show the review rating and first 2 lines inline in `/admin/avis` without opening `<details>`.
11. Add a "Continuer sans enregistrer" after a failed consent save.
12. Persist the review draft in `sessionStorage`.

---

## 6. Five bigger improvement ideas (ideas only, not scope)

1. **A real admin "Aujourd'hui" home.** One list ranked by money and delay: leads unanswered, projects blocked on Sèvalys, invoices late, signatures pending, anomalies, with a one-tap primary action per row. Turns the passive back office into a morning routine and replaces most of the admin e-mails.
2. **State-driven "next action" engine for the client.** Compute the single next action across steps, documents and invoices, show it as the page's only primary button, and echo it in every e-mail and in the nav badges. Eliminates the static `waitingOn` mismatch and shortens time-to-deposit.
3. **Guided delivery and handover moment.** On step 6 completion, a dedicated "Projet livré" view: deliverables and credentials checklist, how to reach support, and a human-feeling request for a review at the point of peak satisfaction, with an in-portal review entry that shares the same token flow. Raises review conversion beyond an easily-missed marketing e-mail.
4. **Phone-first admin shell.** Bottom tab bar (Aujourd'hui, Leads, Projets, Pilotage), swipe actions on lists (qualify, mark seen), and read-only compact versions of the pilotage KPIs. The solo-founder context justifies making the phone the primary admin device, not an afterthought.
5. **Make the simulator a two-step reveal.** Show the diagnostic first (score and 2 recommended offers), then ask for contact "pour recevoir le détail par e-mail" with a one-field minimal form (email) and a real e-mailed PDF/summary. Matches the headline promise, lowers the form wall, and gives the lead a reason to provide a valid address; keep full RGPD mentions on submit.

---

## 7. What is already strong (keep)

- Plain-language client copy and honest empty/error states with a next step (`PROJECT_COPY`, `ReturnBanner`).
- Payment return handling: URL param only chooses wording; confirmed state comes from the verified webhook, with polling and timeout wording.
- Signature flow: version-stamped consent texts, masked email, cooldown and hourly cap messaging, sealed document with hash prefix.
- Review policy as UX: same Google CTA regardless of rating, live preview of the displayed name, admin hiding limited to a closed list of legal reasons with a mandatory detail and journal.
- Accessibility basics: focus management on dialogs and success states, `aria-live` regions, roving tabindex on the star rating, `prefers-reduced-motion` respected in portal/admin CSS.
