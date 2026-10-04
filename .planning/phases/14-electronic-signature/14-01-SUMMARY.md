---
phase: 14-electronic-signature
plan: 01
subsystem: signature
tags: [pdf-lib, fontkit, manrope, wave0-spike]
requires: []
provides: [pdf-lib compatibility proof, loadCertificateFonts]
affects: [14-09]
tech-stack:
  added: [pdf-lib@1.17.1, "@pdf-lib/fontkit@1.1.1"]
key-files:
  created:
    - src/lib/server/signature/fonts.ts
    - src/lib/server/signature/pdfCompat.test.ts
  modified: [package.json, package-lock.json, .env.example]
requirements-completed: [SIGN-04]
completed: 2026-10-04
---

# Phase 14 Plan 01: pdf-lib spike and certificate fonts Summary

pdf-lib 1.17.1 + fontkit 1.1.1 installed at exact versions and proven to append a page to real @react-pdf PDFs (quote, contract, acceptance) without altering original page content streams.

## Results

- Font format: WOFF (existing Manrope data URIs) embeds through fontkit with subset; accents, « », ·, — and U+00A0 draw without error. No TTF fallback needed (RESEARCH A3 resolved).
- pdf-lib loads all three issued PDF types, page count becomes n+1, original decoded content streams byte-identical (A5 resolved). No fallback fork needed.
- Determinism: two saves of the same input produced identical bytes (informative only).
- `SV_SIGNATURE_CODE_SECRET` documented in `.env.example` with no value.

## Commits

- 02ab79d chore: install deps, document secret
- feat: fonts.ts loader and pdfCompat.test.ts (5 tests passing)

## Deviations from Plan

None - plan executed as written. Tests were written together with the loader rather than a separate RED commit (loader is trivial; the test is a compatibility spike).

## Self-Check: PASSED
