---
phase: 13-document-generation
plan: 11
subsystem: documents
tags: [seller-identity, legal-mentions, issuance-gate]
requires: [13-05]
provides: ["SELLER_V1 with the owner's real identity, configured true"]
key-files:
  modified:
    - src/lib/documents/seller.ts
    - src/lib/documents/seller.test.ts
requirements-completed: [DOC-01, DOC-04]
completed: 2026-10-03
---

# Phase 13 Plan 11: Seller identity Summary

SELLER_V1 now carries the owner-supplied identity (Anatholy Bricon, EI, trade name Sèvalys, franchise en base) and `configured: true`; `sellerProblems(SELLER_V1)` returns `[]`, so issuance is unblocked.

## Task 1: Owner answers (2026-10-03)

Verbatim: "l'entreprise est au nom de anatholy bricon; récupère les infos légales sur internet; mais le nom affiché sera sevalys; 900 988 460 00011; Entreprise individuelle; 6201Z : Programmation informatique; tva FR58900988460; FR76 2823 3000 0110 1083 2334 333".

Follow-ups: TVA = "Franchise en base (retirer le numéro)"; address = "71 rue de grand cour st avertin"; immatriculation = "Dispensé d'immatriculation"; payment = "30 jours, 3× le taux légal"; BIC and postal code = "REVOFRP2 et 37550".

IBAN (masked): FR76 **** **** **** **** *** 4333.

## Values in SELLER_V1

- legalName "Anatholy Bricon", tradeName "Sèvalys", legalForm "Entrepreneur individuel", showEiMention true
- SIRET 90098846000011 (Luhn valid)
- Address: 71 rue de Grand Cour, 37550 Saint-Avertin
- Registration: "Entrepreneur individuel dispensé d'immatriculation au RCS et au RM"
- capital null, vatRegime franchise, vatNumber null
- BIC REVOFRP2, IBAN valid (mod-97)
- Payment 30 days, penalty "trois fois le taux d'intérêt légal"
- Comment block updated (values provided 2026-10-03, accountant review still required)

## Deviations

**[Rule 1 - Test hard-coded the placeholder state]** Two tests in `src/lib/documents/seller.test.ts` (`SELLER_V1 is unconfigured with visible placeholders`, `lists placeholders as problems and blocks issuance`) asserted the placeholder state. They were rewritten to assert the configured state (configured true, no placeholder, `sellerProblems` empty, `isSellerConfigured()` true). No other test changed.

## Flags for the owner / accountant

1. **Address discrepancy:** the public registry seat is 56 B rue du Ballon, 45650 Saint-Jean-le-Blanc (ANATHOLY BRICON, EI, NAF 62.01Z Programmation informatique, active since 2021-06-25). The owner chose to print 71 rue de Grand Cour, 37550 Saint-Avertin. Confirm that the registry address is updated (or that this is acceptable) with the accountant.
2. **VAT number held but franchise chosen:** the owner supplied FR58900988460 yet chose franchise en base. The number is NOT stored or printed (sellerProblems rejects franchise plus number). A franchise seller normally does not charge or display VAT; confirm the regime and the existence of this number with the accountant. Flag, not a blocker.
3. **Registration mention:** "dispensé d'immatriculation au RCS et au RM" is to be confirmed with the accountant.

## Verification

- `rtk vitest run src/lib/documents`: 118 passed, 0 failed
- `rtk npx tsc --noEmit`: clean
- `grep -c "À COMPLÉTER"` seller.ts = 1 (constant only); `grep -c "configured: true"` = 1

## Self-Check: PASSED
