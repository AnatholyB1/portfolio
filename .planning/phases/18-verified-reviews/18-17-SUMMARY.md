---
phase: 18-verified-reviews
plan: 17
status: partial (Tasks 1-2 done; Task 3 pending owner decision)
requirements: [REV-01, REV-02]
---

# Phase 18 Plan 17: Google Business link (partial) Summary

Tasks 1-2 complete. Task 3 (lifting REVIEW_REQUESTS_ENABLED) is NOT run; it needs a separate explicit owner decision.

## Task 1: Google review link (2026-10-08)

Retrieved by the owner from the Google Business Profile "Sevalys" (account contact@sevalys.com, "Ask for reviews") via Chrome. The link is public, not a secret:

https://g.page/r/CQd1frhv230ZEBM/review

It redirects to Google's search.google.com/local/writereview for placeid ChIJ6z1-wFnX_EcRB3V-uG_bfRk.

## Task 2: REVIEW_GOOGLE_URL configured (2026-10-08)

- parseGoogleReviewUrl rule (https, no credentials, <= 2048 chars) one-off check: **valid**.
- `curl -L` on the link: HTTP **200**.
- `vercel env add REVIEW_GOOGLE_URL` (value piped) for Production and Preview. `vercel env ls` shows REVIEW_GOOGLE_URL for both Preview and Production (Secret, hidden). REVIEW_TOKEN_SECRET and REVIEW_REQUESTS_ENABLED remain listed for Preview and Production; REVIEW_REQUESTS_ENABLED was not touched (still created 2d ago).
- Production redeploy of portfolio-iy9j4ytlm (approved procedure of 18-16, owner pre-approved): https://portfolio-irey3pt1i-anatholyb1s-projects.vercel.app, **Ready** in 2m, aliased to https://sevalys.com.
- Production checks: GET /avis 200; GET /avis/<43 x "A"> 200 with "n'est plus valide", `X-Robots-Tag: noindex, nofollow`, meta robots `noindex, nofollow, nocache`.
- No review submitted.

## Deviations

None.

## Pending

Task 3: owner decision enable / keep-off for REVIEW_REQUESTS_ENABLED.
