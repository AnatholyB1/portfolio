# v2.0 UI/UX audit — consolidated summary (2026-10-08)

Five read-only sub-agent audits, code-level only (no browser/screenshots; contrast figures from token hex values, a few items marked "verify"). Skills used: `critique`, `web-design-guidelines`, `audit`.

| Report | Score |
|---|---|
| portal-UI-REVIEW.md (client portal) | 16/24 |
| admin-UI-REVIEW.md (admin) | 16/24 |
| public-UI-REVIEW.md (new public pages) | 14/24 |
| ux-critique.md (journeys, Nielsen) | 29/40 |
| a11y-responsive-guidelines.md | 14/20 |

## Themes found by several audits (fix first)

1. **No `loading.tsx` / `error.tsx` anywhere in private routes** (portal, admin; also no portal-scoped `not-found`: signing page shows the public 404 with marketing nav). Raised by portal, admin, a11y.
2. **Admin nav overflows at 360px, last links unreachable** (`leads.css:3-9`). Raised by admin, a11y, UX.
3. **`--ink-faint` ~2.6–2.7:1 contrast** (policy date, footer links, step-marker border, countdown). Raised by public, portal, a11y.
4. **Review flow bugs:** duplicate `id="pt-auth-title"` / two `h1` in the thank-you view and lost focus (`page.tsx:59`, `ReviewThankYou.tsx:8`); throttled token says "Ce lien n'est plus valide" (`avis/[token]/page.tsx:52`) — misleading for a valid link. Raised by public, UX.
5. **Cookie manager broken on `/mentions-legales`:** footer "Gérer les cookies" does nothing there (`ConsentDialog.tsx:27,44`); also a consent save failure leaves the modal undismissable. Public, UX.
6. **Client-journey wording:** steps 2–3 say "Sèvalys is working" while the client must sign/pay (`src/lib/projects/steps.ts`, `WhoWaits.tsx` shows a button only for onboarding). UX high.
7. **Admin has no work queue** (`/admin` opens on the invite form). UX high.
8. **Inline forms reuse the absolutely-positioned `.pt-lead-panel`** (probably broken on desktop) and destructive actions use four different confirmation patterns. Admin.
9. **Live regions mounted with text already present** (not announced), no skip link. A11y.
10. **Money columns in pilotage lack right-aligned mono/tabular styling**; entonnoir swallows query errors as "no data". Admin.

## Blockers flagged (public review)

- Cookie manager no-op on `/mentions-legales`.
- Duplicate `h1` ids in the review thank-you view.

## What passed

Identical Google button for every rating, no prices, no AggregateRating, equal Accept/Refuse, native `<dialog>` with focus trap, 44px rating stars, accessible SVG chart, reduced-motion, status never by colour alone, 16px mobile gutters.

## Suggested next step

A small "UI polish" phase: group 1–5 and 8–10 (mostly CSS, boundaries and copy), then 6–7 as UX items. Run a real-browser pass at 360/768/1280 to confirm the items marked "verify" (not covered by these code-only audits).
