---
phase: 11-lead-attribution-pipeline-consent
plan: 08
subsystem: ui
tags: [consent, dialog, footer, i18n, vitest]

requires:
  - phase: 11-03
    provides: consent state, constants, CONSENT_TEXT
provides:
  - Native dialog consent modal (ConsentDialog) with equal Refuser/Accepter buttons
  - src/lib/consent/store.ts (openConsent, closeConsent, markIntroDone, useConsentStore)
  - Footer "Gérer les cookies" button (fr/en/th)
  - Source-guard contract test
affects: [11-12, 11-18]

key-files:
  created:
    - src/lib/consent/store.ts
    - src/components/consent/ConsentDialog.tsx
    - src/components/consent/consent.css
    - src/components/consent/consentContract.test.ts
  modified:
    - src/app/layout.tsx
    - src/components/ui/ClientProviders.tsx
    - src/components/layout/Footer.tsx
    - src/lib/translations.ts
    - src/app/globals.css

key-decisions:
  - "Dialog opens after CinemaIntro onDone, with a 2500 ms fallback if the intro never signals"
  - "Reload after accept only when a click id is in the URL and the accepted cookie is now present"

requirements-completed: [LEAD-09]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 08: Consent modal and footer link Summary

Blocking native `<dialog>` consent modal with strictly identical Refuser/Accepter buttons, reopenable from a footer "Gérer les cookies" button, sequenced after the cinema intro.

## Tasks

1. Store, ConsentDialog, consent.css and contract test: e5927e7
2. Mount in layout, intro sequencing, footer button, translations, CSS: 357b97f

## Verification

- vitest (consent, layout, translations, privateShells, priceScope): 96 passed
- tsc clean; lint 0 errors (2 pre-existing warnings: CinemaIntro onDone deps, attribution/params.ts unused directive)

## Deviations from Plan

None. Note: ConsentDialog is rendered inside LanguageProvider after children, as specified.

## Notes

- EN and TH strings (modal copy, `manageCookies`) must be proofread before launch (UI-SPEC).
- `/api/consent` is implemented in 11-12; until then the modal shows its error state on click.
- Manual keyboard/LCP checks are deferred to 11-18.

## Self-Check: PASSED
