---
phase: 14-electronic-signature
plan: 19
subsystem: deploy
tags: [vercel, release-gate, production, e2e]
requirements-completed: [SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05]
completed: 2026-10-04
---

# Plan 14-19 Summary: Release gate and deploy

## Task 1: local release gate
- `vitest run`: 130 files, 1533 tests passed.
- `tsc --noEmit`: clean.
- `eslint` on phase-14 files: 0 errors, 1 warning (`HASH` unused in `src/lib/server/signature/seal.test.ts`).
- `next build`: compiled; `/espace-client/documents/[id]/signer` listed as dynamic (ƒ).
- The owner's uncommitted `src/proxy.ts` and `.gitignore` were not committed.

## Task 2: deploy and end-to-end check
- Owner chose, 2026-10-04: "Preview puis prod (Recommended)".
- `git push origin HEAD:refs/heads/phase-14-preview` → preview `portfolio-bsdorie6l-…vercel.app`, Ready. Anonymous `/espace-client/documents` → 307 to `/connexion?next=…`, `X-Robots-Tag: noindex, nofollow`.
- The owner ran the real signature on the preview with the permanent fixture « Test E2E Sèvalys » (signature code by e-mail, sealed PDF, integrity check, trail export). Answer verbatim (2026-10-04): "Tout est bon".
- Not recorded: the sealed file SHA-256 and the iOS Safari observation (the owner gave only the global confirmation). Treat iOS as unverified.
- `git push origin master` (`c4b02c5..4c3c359`) → production deployment `portfolio-eutoks3ai-anatholyb1s-projects.vercel.app`, Ready in 53 s. Preview branch `phase-14-preview` deleted from origin.
- The fixture and its data were not deleted or renamed.

## Open risks
- Consent texts and evidence clause are provisional v1 (legal review pending; risk accepted 2026-10-03).
- Safari iOS PDF iframe not explicitly confirmed.
- `mailoutbox.rls.test.ts` is sensitive to many pending rows on a shared branch.
