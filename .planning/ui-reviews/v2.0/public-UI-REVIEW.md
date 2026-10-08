# v2.0 Public Surfaces — UI Review

**Audited:** 2026-10-08
**Baseline:** 18-UI-SPEC.md / 11 consent specs / globals.css + portal.css tokens / project rules (no prices, identical Google button, no star promises, equal consent prominence, FR quality, 44px targets, focus traps, 16px mobile gutters)
**Screenshots:** not captured (code-only audit, read-only brief). Contrast figures are computed from tokens, not measured in a browser.

## Pillar Scores

| Pillar | Score | Key finding |
|---|---|---|
| 1. Copywriting | 3/4 | Strong, honest FR copy; small elliptic phrasing, redundant policy links, FR-only footer links on a trilingual site |
| 2. Visuals | 2/4 | Duplicate `h1` and `id` on thank-you, no focus move, inconsistent heading style between /avis and /politique-des-avis |
| 3. Color | 3/4 | Token-clean; `--ink-faint` text fails contrast in footer links and policy date |
| 4. Typography | 2/4 | `font-bold` 36px/20px on policy vs `font-medium` 32px/24px elsewhere; 12px footer links |
| 5. Spacing | 2/4 | Text links under 44px, home gutter 20px vs 16px rule, inline-style spacing mixed with Tailwind |
| 6. Experience Design | 2/4 | Footer "Gérer les cookies" is a silent no-op on /mentions-legales; thank-you focus loss; client-fetched excerpt causes layout shift |

**Overall: 14/24**

Rule compliance that PASSES (verified):
- Google button: `ReviewThankYou` takes no rating prop (`src/app/avis/[token]/ReviewThankYou.tsx:5`), and `thankYouFor` ignores the submission (`ReviewForm.tsx:45-47`). The same `pt-btn-ghost` is rendered for every rating.
- No prices or "€" in any audited public review/desinscription/politique file.
- No AggregateRating: the only rating field is per-review `ratingValue` (`src/lib/reviews/reviewJsonLd.ts:38`). `ReviewCard` shows no average.
- Consent equal prominence: both buttons share the single `.consent-btn` class (`ConsentDialog.tsx:106,109`, `consent.css:32-47`). Order is Refuse then Accept. Min-height is 44px, and the actions stack under 400px.
- Consent focus handling: native `<dialog>.showModal()` provides the focus trap. Focus goes to the heading (`ConsentDialog.tsx:46`). Escape is blocked (`:88`). Mobile width is `100vw - 32px` (`consent.css:16-18`), a 16px gutter.
- Rating input: 44px targets (`reviewForm.css:27-30`), roving tabindex, arrow/Home/End keys, and `aria-checked` (`ReviewRatingInput.tsx:25-68`).

## Top 10 Prioritized Findings

1. **BLOCKER — Footer "Gérer les cookies" does nothing on /mentions-legales.**
   - Evidence: `ConsentDialog.tsx:27` sets `blocked = ... || pathname === '/mentions-legales'`. `:44` only opens when `!blocked`. `mentions-legales/page.tsx:189` renders the Footer, and its own text (`:140`) tells users to use that link. The consent link "En savoir plus" (`ConsentDialog.tsx:96`) sends users to exactly this page.
   - Impact: the withdrawal route promised by the legal text is broken on the page that documents it (CNIL "as easy to withdraw as to give").
   - Fix suggestion: allow `open` explicitly on /mentions-legales (block only the automatic first-visit prompt, not user-initiated `openConsent`), or render an inline "Modifier mon choix" control in the cookies section.

2. **BLOCKER — Thank-you state has two `h1` and a duplicate `id="pt-auth-title"`, and focus is lost.**
   - Evidence: `avis/[token]/page.tsx:59` always renders the server `h1`. After success, `ReviewForm.tsx:142` swaps in `ReviewThankYou`, which renders another `h1` with the same id (`ReviewThankYou.tsx:8`). The intro "Votre avis est publié tel que vous l'écrivez…" and the "Votre avis sur votre projet" heading stay above "Merci".
   - Impact: the form unmounts, so keyboard and screen-reader focus drops to `<body>`. The page announces two titles, and `aria-labelledby` is ambiguous.
   - Fix suggestion: lift the heading and intro into the form's pre-submit state, or let the thank-you replace the whole Shell content. Make the thank-you heading an `h1` only if the old one is unmounted. Move focus to the thank-you heading (tabIndex -1), as the consent dialog does.

3. **WARNING — Rate-limited token view shows "Ce lien n'est plus valide".**
   - Evidence: `avis/[token]/page.tsx:51-52` returns `InvalidLink` when throttled.
   - Impact: a valid customer who refreshes is told their one-time link is dead and is sent to email support.
   - Fix suggestion: a distinct "Trop de visites, réessayez dans quelques minutes" state, consistent with `RATE_LIMITED` in `ReviewForm.tsx:40`.

4. **WARNING — Contrast failures with `--ink-faint` (#5A5751 on #0A0B0C, about 2.6:1, below 4.5:1).**
   - Evidence: footer anchors `globals.css:350` (12px, `--ink-faint`) include the new "Avis" and "Politique des avis" links (`Footer.tsx:38-39`). The policy date uses `text-[var(--ink-faint)] text-sm` (`politique-des-avis/page.tsx:39`).
   - Impact: legal-transparency links are the least legible items. They are also visually weaker than the adjacent 14px `--ink-dim` cookie button (`globals.css:352`), so the footer row is inconsistent.
   - Fix suggestion: use `--ink-dim` (about 6.9:1) for footer links and the policy date. Align link and button size and weight.

5. **WARNING — Text links below the 44px target.**
   - Evidence: pagination links `avis/page.tsx:101-113` (`text-sm`, no min-height). Excerpt links `AvisExcerpt.tsx:35-47`. Policy `mailto` links. Footer anchors (12px, `globals.css:350`). "Retour au site" is already 44px (`client.css:119` pattern).
   - Fix suggestion: add `inline-flex items-center min-h-[44px]` to those links, and enlarge the footer anchors' hit area (padding).

6. **WARNING — Pagination order and semantics are confusing.**
   - Evidence: `avis/page.tsx:100-114`. "Avis précédents" (older) is on the left and "Avis plus récents" is on the right. "Précédent" conventionally means the previous page (newer).
   - Fix suggestion: rename to "Avis plus anciens" and "Avis plus récents". Put "plus récents" on the left. Add `rel="prev"/"next"`.

7. **WARNING — Home excerpt is client-fetched, causing layout shift and no SSR.**
   - Evidence: `AvisExcerpt.tsx:54-72` starts at `[]` (renders null, `:17`), then inserts a section after `fetch('/api/avis/recent')`. Errors silently hide the section. Compact cards clamp with `line-clamp-5` (`ReviewCard.tsx`) and have no link to the full review (no `#review-id` anchor).
   - Impact: CLS pushes the contact section and footer down. Review text is invisible to crawlers on the home page. Truncated critical reviews have no "Lire la suite".
   - Fix suggestion: fetch server-side (like `/avis`) and pass to `AvisExcerptView`. Link each card to `/avis#review-{id}`. Check ordering is recency-only (no rating-sorted selection), so it carries no filtering implication.

8. **WARNING — Visual and typographic inconsistency between sibling pages.**
   - Evidence: `/avis` h1 is 32px `font-medium`, left-aligned, with a mono eyebrow (`avis/page.tsx:57-60`). `/politique-des-avis` h1 is `text-4xl font-bold`, centered, with `h2 text-xl font-bold` (`politique-des-avis/page.tsx:16,34,38`). The form and consent use `font-medium` 24px (`portal.css:32-37`, `consent.css:23`). Body is `text-sm` (14px) for long legal prose (`:19`).
   - Impact: extra weight (700) and size (36, 20, 14px) beyond the contract's scale. The policy page looks like a different product.
   - Fix suggestion: align to the 18-UI-SPEC scale (medium weight, same header alignment). Use 16px body for the policy prose. The `Section` `id` prop is never used: add anchors or a short TOC, since the page has 11 sections.

9. **WARNING — Mobile gutter and inline-style drift.**
   - Evidence: `/avis` and the policy use `px-4` (16px, OK). The home excerpt sits in `.wrap` (`globals.css:358`, 20px under 900px), so it does not follow the 16px rule. `ReviewCard.tsx` and `avis/page.tsx:55,95` use inline `style` (padding 24, gap 32, maxWidth 800) mixed with Tailwind, and the 800px width is off the `max-w-3xl` (768px) used by the policy.
   - Fix suggestion: confirm 16px or 20px is the intended home gutter, and move card spacing to classes or tokens.

10. **WARNING — Copy and i18n polish.**
    - Evidence: "dont le projet a été livré et recette signée" (`avis/page.tsx:62`; elliptic, better "et la recette signée"). The policy link appears 3 times on /avis (intro `:64`, bottom box `:119-123`, footer). The rights/contact paragraph is duplicated (`politique-des-avis/page.tsx:116-122` and `:138-144`). Footer labels "Avis" and "Politique des avis" are hard-coded FR (`Footer.tsx:38-39`) while the consent dialog and the footer cookie button are translated (fr/en/th). The metadata description mixes the typographic ’ with the `&apos;` convention.
    - Fix suggestion: remove the redundant bottom box or the intro link. Merge the duplicated rights paragraph. Move the footer labels into `translations` or accept FR-only deliberately (the form and desinscription pages are explicitly FR-only, D-12).

## Quick Wins
- `--ink-faint` to `--ink-dim` in footer links and the policy date (finding 4).
- Add `min-h-[44px] inline-flex items-center` to pagination, excerpt and policy links (finding 5).
- Rename "Avis précédents" to "Avis plus anciens" (finding 6).
- Distinct throttled message in `avis/[token]/page.tsx:52` (finding 3).
- Add `aria-live` or `role="alert"` on first render for the consent failure message. A live region injected with its content is not reliably announced (`ConsentDialog.tsx:99-104`).
- Body-length helper: the counter uses `body.length` while the minimum uses `trim()` length (`ReviewForm.tsx:67,216`), and the "Encore N caractères" hint disappears on blur even when still below 20 (`:217`). Keep the hint after blur, or show the error.
- Initiale input: add `autoCapitalize="characters"` and an `aria-describedby` hint. Mark required fields (Prénom, Note, Votre avis) visibly (`ReviewForm.tsx:166-283`), since only "Facultatif" is labelled for Titre.
- Delete the dead `Section id` prop or use it for anchors.
- Empty `/avis` is indexable and in the sitemap (`sitemap.ts:21`). Consider `noindex` until at least one review is published.

## Detailed Notes by Pillar

**1. Copywriting (3/4).** Honest, specific CTAs ("Publier mon avis", "Publier aussi sur Google", "Confirmer la désinscription"). Errors are explanatory and recoverable (`ReviewForm.tsx:38-42`). The empty state offers next steps (`avis/page.tsx:70-85`). The desinscription copy clearly distinguishes transactional from informational email. Deductions: findings 10 and the redundant policy links.

**2. Visuals (2/4).** Clear hierarchy on `/avis` and the cards. Verified-review badge only on the full variant. Thank-you duplicate headings and focus loss (finding 2). Policy page visually diverges (finding 8). Desinscription reuses `AuthCard` consistently, with "Retour au site".

**3. Color (3/4).** Only tokens are used; no hardcoded hex in the review/policy files. The one literal is `--consent-border: #6F6B64` (`consent.css:2`), a deliberate contrast fix. Acid is used for links, stars and focus, consistent. Deduction: `--ink-faint` text (finding 4). Star stroke `--pt-border-strong` for empty stars is decorative, which is fine.

**4. Typography (2/4).** Extra weight and sizes on the policy page; 12px footer links; 14px legal prose (finding 8).

**5. Spacing (2/4).** Findings 5 and 9. Consent dialog and form rhythm (16px gap, 24px padding) are clean.

**6. Experience Design (2/4).** Strengths: error summary with focus (`ReviewForm.tsx:80,156-163`), `aria-invalid` plus `describedby`, double-submit guard (`:85`), non-JS POST on desinscription, GET with no side effects, throttling. Deductions: findings 1, 2, 3 and 7. No dev server checked, so real keyboard traversal order and focus return after consent close (native `dialog.close()` restores the trigger) were not exercised.

## Files Audited
- `src/app/avis/page.tsx`
- `src/app/avis/[token]/page.tsx`, `layout.tsx`, `ReviewForm.tsx`, `ReviewRatingInput.tsx`, `ReviewThankYou.tsx`, `reviewForm.css`
- `src/app/politique-des-avis/page.tsx`
- `src/app/desinscription/page.tsx`, `layout.tsx`
- `src/components/consent/ConsentDialog.tsx`, `consent.css`
- `src/components/sections/AvisExcerpt.tsx`
- `src/components/reviews/ReviewCard.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/portal/AuthCard.tsx`
- `src/lib/consent/text.ts`, `src/lib/privateRoutes.ts`
- `src/app/mentions-legales/page.tsx` (cookies section)
- `src/app/portal.css`, `src/app/globals.css` (tokens and footer styles)
