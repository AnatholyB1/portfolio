# v2.0 public UI/UX fixes (public pages + global styles)

Scope: `public-UI-REVIEW.md`, public/global items of `ux-critique.md` and `a11y-responsive-guidelines.md`. Worktree branch based on `38cfe07`. Commits are `fix(ui-public): ...`.

## Fixed

### Blockers
- **Cookie manager on /mentions-legales** (`ConsentDialog.tsx`): only the automatic first-visit prompt is suppressed there (`autoBlocked`); user-initiated `openConsent` (footer "Gérer les cookies") now opens on every non-private page. "En savoir plus" closes the modal before navigating so the legal text stays readable.
- **Consent save failure**: error region (`aria-live="polite"`, mounted empty), retry by pressing Accept/Refuse again, and a "Continuer sans enregistrer" control (`dismiss` string in fr/en/th) that closes the modal without storing. It is not a third `.consent-btn`, so Accept and Refuse keep equal prominence. A stale error is cleared on close.
- **Review thank-you**: single `h1` (`id="rv-heading"`, the form heading and intro moved into `ReviewForm` so they unmount with the form). `ReviewThankYou` focuses its heading (`tabIndex=-1`) on mount. The Google button is still identical for every rating (existing test green).

### Warnings
- **Throttled /avis/[token]**: distinct "Trop de tentatives" view with no statement about link validity; invalid, used and expired remain byte-identical (tests updated and extended).
- **Contrast**: `--ink-faint` `#5A5751` (2.60:1 on `--bg-2`) -> `#85817A` (5.08:1 on `--bg`, 4.84:1 on `--bg-2`, 4.59:1 on `--bg-3`; also above 3:1 for non-text). Computed from the hex values and guarded by a test. Footer anchors now use `--ink-dim`. The policy date uses `--ink-dim`.
- **Targets and spacing**: footer anchors (14px, 44px min-height), pagination, excerpt links, card "Lire l'avis complet", policy mailto links, review-form links, consent link, desinscription mailto links. Mobile gutter `.wrap`/`.nav` 16px below 900px instead of 20px (this also moves the home excerpt).
- **Policy typography** unified with /avis: left-aligned, 32px medium h1, 24px medium section titles, 16px body, `max-w-3xl`. Dead `Section id` prop removed. Rights paragraph merged (it appeared twice).
- **Pagination**: "← Plus récents" (left, `rel=prev`) and "Plus anciens →" (right, `rel=next`).
- **AvisExcerpt**: home `page.tsx` is now a server component (`revalidate = 300`, tiny `RevealsMount` client island for the scroll reveal). The excerpt reads `getPublishedReviews(3)` on the server, so there is no client fetch and no layout shift. A visible, error-free empty state replaces the vanishing section. Compact cards link to `/avis#review-<id>` (`scroll-mt` for the fixed nav). Inline styles in `ReviewCard`/excerpt/`/avis` replaced by classes. `linkAudit.test.ts` allow-list gained the new anchor template.
- **/avis**: noindex (`follow: true`) when the requested page has no published review, index otherwise. "recette signée" -> "la recette signée". The redundant bottom policy box is removed (intro link plus footer remain). `max-w-3xl` like the policy.
- **Footer labels** "Avis" / "Politique des avis" go through `translations` (fr/en/th, `landing.footer.reviews|reviewPolicy`). Pages themselves stay French only.
- **Review form**: required markers (visible `*` plus "obligatoires" note, `aria-required`), "Encore N caractères minimum" hint kept after blur, initial field gets `autoCapitalize="characters"` and a described hint, `aria-labelledby` on the rating group.
- **Simulator contact form** (`Wizard.tsx`): `htmlFor`/`id` on every label; phone stays `required` with a visible hint (fr/en/th) plus `inputMode="tel"`; email has `inputMode`/`autoCapitalize`/`spellCheck`; fields reference the send error through `aria-describedby`; error region is `aria-live` and mounted empty; a "Tous les champs sont obligatoires" note. Field labels 10px -> 12px.
- **Global a11y**: skip link (`SkipLink`, translated, focuses the page `<main>`), `color-scheme: dark` (CSS and `viewport.colorScheme`), `theme-color` meta, `text-wrap: balance` on h1-h3, `tabular-nums` (`.tabular`, `.num`, review score and counter), `main-content` ids on the public mains, `…` already used in loading labels (no `...` found in owned files), non-breaking spaces before `:` and `;`, in "n° N", "N caractères", "N jours", "N sur 5" where text is hard-coded in the pages.

### Tests
Updated: `avis/page.test.ts`, `avis/[token]/page.test.ts`, `ReviewThankYou.test.ts`, `AvisExcerpt.test.ts`, `politique-des-avis/page.test.ts` (NBSP normalised, wording still pinned), `consentContract.test.ts`, `linkAudit.test.ts`. Added: `src/app/publicUiFixes.test.ts` (contrast computed from tokens, skip link, footer i18n, wizard form, legal pages, home server component), `avis/[token]/reviewFormA11y.test.ts`.

## Not fixed (with reason)

- **Main landmark in the root layout**: every page already owns exactly one `<main>`. A second one in the root layout would nest or duplicate landmarks. The skip link targets the page's own `<main>` by script (with `#main-content` as no-JS fallback; `id="main-content"` added on the public mains in this scope). Mains outside this scope (`/services`, `/calculateur-roi`, `/demo`) still lack the id; the script path covers them.
- **Sitemap still lists /avis when empty**: `sitemap.ts` is outside the owned files and `sitemap.test.ts` pins it. The page is now `noindex` while empty.
- **`/api/avis/recent`** is no longer used by the home page; the route and its test are kept (still valid, cacheable).
- **Desinscription `AuthCard` / `.pt-*` classes** live in `src/components/portal` and `portal.css` (forbidden); only the page-level links were fixed.
- **Mentions légales typography** (centered bold h1, 14px body) was not in the audit findings and was not changed; only punctuation, anchor offset, main id.
- **TOC for the 11-section policy page**: not added (page is short enough once body text is 16px and titles are clear); the unused `id` prop was removed instead.
- **Real-browser check at 360/768/1280**: not run (code-level only); the `.nav.scrolled` rule still sets `padding: 14px 32px` on mobile after scroll (pre-existing, not in the audits).

## `--ink-faint` follow-up for the integrator
The token itself is now text-safe everywhere (global change in `globals.css`), so no per-file change is required for contrast. Files outside this scope that still reference it, to eyeball after the change:
- `src/app/portal.css:371` (text, now 4.6-5.1:1 depending on surface)
- `src/components/portal/project/project.css:44` (step-marker border, non-text, now above 3:1)
- `src/app/demo/page.tsx` (7 text usages, public demo page, not in the owned list)
- Admin: no direct `--ink-faint` usage found in `src/app/admin` or `src/components/admin` (only test expectations).
- The footer/`.label`/`.field label` text that used the old value gets the new contrast automatically; `--ink-faint` is now visually close to `--ink-dim` (`#9A9690`), so subtle hierarchy built on that gap is flatter.
