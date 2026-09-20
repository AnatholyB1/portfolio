---
phase: 07-diagnostic-simulator
reviewed: 2026-09-21T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/app/globals.css
  - src/app/simulateur/layout.test.ts
  - src/app/simulateur/layout.tsx
  - src/app/simulateur/page.tsx
  - src/components/simulateur/ScoreGauge.tsx
  - src/components/simulateur/Wizard.tsx
  - src/lib/simulateur/gauge.test.ts
  - src/lib/simulateur/gauge.ts
  - src/lib/simulateur/priorityOrder.ts
  - src/lib/simulateur/questions.test.ts
  - src/lib/simulateur/questions.ts
  - src/lib/simulateur/scoring.test.ts
  - src/lib/simulateur/scoring.ts
  - src/lib/simulateur/styles.test.ts
  - src/lib/simulateur/submit.test.ts
  - src/lib/simulateur/submit.ts
  - src/lib/simulateur/wizardContract.test.ts
  - src/lib/simulateur/wizardSteps.test.ts
  - src/lib/simulateur/wizardSteps.ts
  - src/lib/translations.test.ts
  - src/lib/translations.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The pure logic modules (`gauge.ts`, `priorityOrder.ts`, `questions.ts`, `scoring.ts`, `wizardSteps.ts`) are well-factored, side-effect-free, and thoroughly covered by their unit tests — I traced every branch (severity/weight separation, the `site-fiabilite` skip, the 2-4 clamp, the padding fallback) and found the implementation matches the documented contracts. All 150 tests across the reviewed files pass (`npx vitest run`).

However, the wizard's honeypot anti-spam mechanism is wired up cosmetically but not functionally: the DOM input's value is never read anywhere in the code path that builds the request body, so the server-side spam check that depends on it can never fire, regardless of what a bot fills into the field. This is a real security-relevant regression and is the headline finding below. I also found a UX gap (no way back from the contact step), a client/server validation mismatch that surfaces as a misleading generic error, a fragile test helper that got lucky, and two dead/unused exports.

## Critical Issues

### CR-01: Honeypot anti-spam field is decorative — its value is never sent to the server

**File:** `src/components/simulateur/Wizard.tsx:269-281`, `src/lib/simulateur/submit.ts:66-75`
**Issue:**
The server's spam filter (`isSpamSubmission` in `src/lib/prospects-schema.ts:53`) flags a submission as spam when the JSON body's `website` field is a non-empty string:
```ts
if (typeof body.website === 'string' && body.website.length > 0) {
  return true;
}
```
The wizard renders a honeypot `<input name="website" ... />` intended to bait bots (`Wizard.tsx:273-281`), and its own comment states "The server's isSpamSubmission reads this field plus formRenderedAt." But the input is fully uncontrolled — no `ref`, no `onChange`, no `FormData` read anywhere in `Wizard.tsx` (confirmed by grep: zero matches for `FormData`/`useRef`/`e.target.website` in the file). `handleSubmit` (`Wizard.tsx:76-102`) builds the request body exclusively via `buildProspectPayload`, which hardcodes the field:
```ts
// src/lib/simulateur/submit.ts:66-75
const payload = {
  ...
  website: '',
  ...
};
```
So no matter what a bot types into the honeypot field, the JSON body sent to `/api/simulateur` always contains `website: ''`. The honeypot layer of the anti-spam defense is completely inert for this endpoint — only the `formRenderedAt` timing check still functions. This is not merely undertested: `submit.test.ts:110-113` actively asserts the broken behavior ("website is the empty string") as if it were the intended contract, so the test suite will not catch a fix regression either way.
**Fix:** Read the honeypot input's actual value and thread it through to the payload, e.g.:
```tsx
// Wizard.tsx — make the honeypot a controlled field
const [honeypot, setHoneypot] = useState('');
...
<input
  type="text"
  name="website"
  className="sim-honeypot"
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
/>
```
```ts
// submit.ts — accept and forward it instead of hardcoding ''
export function buildProspectPayload(input: {
  contact: ContactDetails;
  consent: boolean;
  answers: Answer[];
  formRenderedAt: number;
  website: string; // forwarded honeypot value, not client-validated
}): ProspectSubmission {
  ...
  website: input.website,
  ...
}
```
and update `submit.test.ts` to assert the honeypot value is forwarded unchanged, rather than asserting it is always `''`.

## Warnings

### WR-01: Contact step has no way back to correct a previous answer

**File:** `src/components/simulateur/Wizard.tsx:229-318`
**Issue:** Every question step renders a "Précédent"/back button (`Wizard.tsx:189-200`) once `clampedStepIndex > 0`, but the contact-capture step's `<div className="sim-nav">` (`Wizard.tsx:303-307`) contains only the submit button. A visitor who reaches the contact form and wants to correct an earlier answer (e.g. they picked the wrong `secteur` or want to add a `frictions` option) has no in-wizard way to go back — the code comment at `Wizard.tsx:193-196` explicitly treats *browser* Back as "a separate, accepted gap," but that doesn't cover the missing in-component back control, which is inconsistent with every other step.
**Fix:** Add a back button to the contact step mirroring the question-step pattern:
```tsx
<div className="sim-nav">
  <button type="button" className="btn btn-ghost" onClick={() => setStepIndex(clampedStepIndex - 1)}>
    {t.simulateur.back}
  </button>
  <button type="submit" className="btn btn-primary" disabled={submitDisabled}>
    {isSending ? t.simulateur.contact.submitting : t.simulateur.contact.submit}
  </button>
</div>
```

### WR-02: Client-side `canSubmit` is weaker than server schema, so invalid-but-non-empty input surfaces as a misleading generic error

**File:** `src/lib/simulateur/submit.ts:31-44`, `src/lib/simulateur/submit.ts:54-81`, `src/components/simulateur/Wizard.tsx:79-101`
**Issue:** `canSubmit` (the predicate the submit button's `disabled` state binds to) only checks `contact.nom/email/telephone.trim().length > 0`. `prospectSchema` (`src/lib/prospects-schema.ts:9-11`) requires `email: z.email()` and `telephone: min(6)`. A user who types e.g. `"asdf"` for email or `"12"` for phone passes `canSubmit` and enables the submit button, but `buildProspectPayload`'s internal `prospectSchema.parse(payload)` (`submit.ts:80`) then throws. `Wizard.tsx`'s `handleSubmit` catches this with a blanket `catch { setStatus('error') }` (`Wizard.tsx:99-101`) and renders the generic copy "Une erreur est survenue… Réessayez" (`translations.ts` `contact.errorBody`), which reads like a network/server failure. The user has no way to know their email/phone format is the actual problem, and retrying the identical input will fail identically every time.
**Fix:** Either align `canSubmit` with the schema's format constraints (cheap regex checks for email/phone) so the button stays disabled until the input is actually valid, or catch the `ZodError` specifically in `handleSubmit` and show field-level feedback instead of the generic error state.

### WR-03: `layout.test.ts`'s comment-stripping regex is not string-literal-aware and already mangles a real code line

**File:** `src/app/simulateur/layout.test.ts:8-11`, `src/app/simulateur/layout.tsx:19`
**Issue:**
```ts
const layoutSource = readFileSync(...)
  .replace(/\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
```
This strips everything from the first `//` to end-of-line, without regard to whether that `//` sits inside a string literal. `layout.tsx:19` is:
```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";
```
The regex treats `//sevalys.com";` as a trailing comment and deletes it, leaving the (never-executed, text-only) `layoutSource` string with a truncated, unterminated-looking line. None of the current assertions (`.includes('application/ld+json')`, `.includes('buildJsonLdScript(')`, `.includes('useLanguage')`, `.includes('index: false')`) happen to sit on that line, so the test suite passes today — but this is fragile by luck, not by design. Contrast with `wizardContract.test.ts:26-31`, which uses the same naive technique but explicitly documents and relies on the invariant "Wizard.tsx contains no string literal that itself embeds `//`" — `layout.tsx` violates that exact invariant, silently.
**Fix:** Strip block comments first, then line comments using a per-line `indexOf('//')` guarded against being inside a string (or simply document the same reliance-on-no-`//`-in-strings invariant and verify it holds, as `wizardContract.test.ts` does), e.g.:
```ts
const layoutSource = readFileSync(...)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => {
    const idx = line.indexOf('//');
    return idx === -1 ? line : line.slice(0, idx);
  })
  .join('\n');
```
(this still doesn't fix the underlying string-literal blindness, but at minimum keeps the two test files' techniques — and their invariants — consistent and auditable.)

### WR-04: `nextQuestionId` and `contactStepIndex` are exported production API that only their own tests call

**File:** `src/lib/simulateur/questions.ts:236-245`, `src/lib/simulateur/wizardSteps.ts:42-44`
**Issue:** `Wizard.tsx` never calls `nextQuestionId` or `contactStepIndex`; it derives step position exclusively from `buildStepSequence`/`applicableQuestionIds` (`Wizard.tsx:9-13, 53, 124-126`). Both functions are exercised only by `questions.test.ts` and `wizardSteps.test.ts` respectively — confirmed by grep, the only non-test references are internal (`wizardSteps.ts`'s own `contactStepIndex` calling `buildStepSequence`). They are effectively dead production code: fully-tested logic that the actual UI does not exercise, which can drift from the real navigation behavior without any test failure signaling the divergence (as already nearly happened — `Wizard.tsx` reimplements "is this the step before contact" locally via `steps[clampedStepIndex + 1]?.kind === 'contact'` rather than using `contactStepIndex`).
**Fix:** Either wire `Wizard.tsx` to use `contactStepIndex`/`nextQuestionId` where equivalent logic is currently duplicated inline, or remove the unused exports (and their now-orphaned tests) if they were superseded during implementation.

## Info

### IN-01: Redundant `aria-hidden={false}` on the gauge SVG

**File:** `src/components/simulateur/ScoreGauge.tsx:56`
**Issue:** `<svg ... role="img" aria-hidden={false} aria-label={...}>` — `aria-hidden` already defaults to not-hidden; setting it to `false` explicitly adds noise without changing behavior.
**Fix:** Drop the prop: `<svg role="img" aria-label={...}>`.

### IN-02: Array index used as React key for static-but-editable content lists

**File:** `src/app/simulateur/page.tsx:40-49` (`s.intro.paragraphs.map`), `src/app/simulateur/page.tsx:64-74` (`s.faq.map`)
**Issue:** `key={i}` on both `.map` calls. These lists are currently static per locale, so this isn't causing a visible bug today, but it's the classic anti-pattern React key smell — if a paragraph or FAQ entry is ever inserted/removed/reordered in `translations.ts` without a full remount, React may misattribute DOM state (e.g. `<details>` open/closed state on FAQ items) across the wrong entries.
**Fix:** Key on content instead, e.g. `key={paragraph.slice(0, 24)}` is fragile too — better to key `faq` items by `item.q` (already unique per locale) and paragraphs by a stable index derived from content hash, or accept the index-key here explicitly with a comment noting the static-content assumption so a future editor doesn't add reordering logic without revisiting it.

---

_Reviewed: 2026-09-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
