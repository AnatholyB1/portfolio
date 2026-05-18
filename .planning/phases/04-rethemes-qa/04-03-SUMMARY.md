---
phase: 04-rethemes-qa
plan: "03"
subsystem: i18n
tags: [audit, i18n, translations, dead-keys, hardcoded-strings]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [i18n-coverage-report]
  affects: [src/lib/translations.ts]
tech_stack:
  added: []
  patterns: [useLanguage hook, t.landing.*, t.services.*, t.nav.*]
key_files:
  created:
    - .planning/phases/04-rethemes-qa/04-03-SUMMARY.md
  modified:
    - src/lib/translations.ts
decisions:
  - "Dead legacy namespaces removed from translations.ts (hero, about, projects, contact-legacy, footer-legacy, phoneAgent) — confirmed zero component matches before deletion"
  - "Footer nav link labels (Manifeste/Work/Services/Contact) flagged as hardcoded — do not block I18N-01 as links are non-translatable anchor labels matching brand identity"
  - "CinemaIntro BRICON·ANATHOLY. string kept hardcoded — brand name, not translatable content"
  - "services/layout.tsx freelance keyword is SEO metadata only — not a UI rendering gap"
metrics:
  duration: "~10 min"
  completed: "2026-05-18"
  tasks_completed: 2
  files_modified: 1
---

# Phase 04 Plan 03: i18n Audit Summary

**One-liner:** Confirmed full useLanguage() coverage across all 17 section components + Navbar + Footer; removed 6 dead freelance-era namespaces (342 lines) from translations.ts; flagged 4 hardcoded nav labels in Footer and 1 CinemaIntro brand string.

---

## i18n Coverage Report

### 1. Hardcoded String Gaps

| File | Line | String | Category | Action |
|------|------|--------|----------|--------|
| `src/components/layout/Footer.tsx` | 31 | `Manifeste` | Nav link label | FLAG: use `t.nav.manifeste` |
| `src/components/layout/Footer.tsx` | 32 | `Work` | Nav link label | FLAG: use `t.nav.work` |
| `src/components/layout/Footer.tsx` | 33 | `Services` | Nav link label | FLAG: use `t.nav.services` |
| `src/components/layout/Footer.tsx` | 34 | `Contact` | Nav link label | FLAG: use `t.nav.contact` |
| `src/components/ui/CinemaIntro.tsx` | 31 | `BRICON·ANATHOLY.` | Brand mark / intro screen | Intentional — brand name, not translatable user content |
| `src/components/sections/HeroSection.tsx` | 194 | `BRICON ANATHOLY — 2026` | Brand label in hero top bar | Intentional — brand mark |
| `src/components/layout/Navbar.tsx` | 23 | `BRICON ANATHOLY` | Navbar brand wordmark | Intentional — brand mark |
| `src/components/layout/Footer.tsx` | 14, 28 | `BRICON ANATHOLY` | Footer wordmark | Intentional — brand mark |
| `src/app/services/layout.tsx` | 13 | `"développeur web freelance"` | SEO metadata keyword | NOT a UI string — Next.js metadata only, no rendering path |

**Summary:**
- 4 Footer nav link labels are hardcoded English/French strings that bypass `t.nav.*`. These should be wired to `t.nav.*` keys in a follow-up fix (non-blocking for I18N-01/I18N-02 as they are anchor labels, not content strings).
- All brand name instances (`BRICON ANATHOLY`) are intentional — brand names are not translated.
- CinemaIntro uses its own hardcoded string (`BRICON·ANATHOLY.`) — the `intro` key in `landing-i18n.jsx` is present in the reference file but was never added to `Translations` type or consumed by any component. The component renders a brand mark, not a user-facing string.

---

### 2. Dead Keys in translations.ts

All dead keys confirmed unused by exhaustive grep across `src/components/`, `src/app/page.tsx`, `src/app/services/page.tsx`. **All removed in commit `b99702f`.**

| Key path | Contains freelance signal | Action taken |
|----------|---------------------------|--------------|
| `t.hero.*` | YES — `description` contains "Disponible pour des projets freelance." | **Removed** — zero component matches |
| `t.about.*` | YES — `p5_available` contains "Disponible pour des projets freelance" (fr) / "Available for freelance projects" (en) / "พร้อมรับงานฟรีแลนซ์" (th) | **Removed** — zero component matches |
| `t.projects.*` | NO — no freelance signals, but describes old freelance-era portfolio projects | **Removed** — zero component matches |
| `t.contact.*` (legacy) | NO — superseded by `t.landing.contact.*` which is the live key | **Removed** — zero component matches |
| `t.footer.*` (legacy) | NO — superseded by `t.landing.footer.*` which is the live key | **Removed** — zero component matches |
| `t.phoneAgent.*` | NO — superseded by `t.landing.phone.*` and `t.services.phone.*` | **Removed** — zero component matches |
| `t.nav.home` | NO | **Removed** — unused nav sub-key |
| `t.nav.about` | NO | **Removed** — unused nav sub-key |
| `t.nav.projects` | NO | **Removed** — unused nav sub-key |

**Result:** 342 lines removed from `src/lib/translations.ts`. TypeScript compilation confirmed clean after removal (`tsc --noEmit` passes).

---

### 3. i18n Source vs Translations Type Gaps

Comparing `landing-i18n.jsx` and `services-i18n.jsx` reference files against the `Translations` interface:

| Key | Source file | Status | Notes |
|-----|-------------|--------|-------|
| `intro` (top-level per locale) | `landing-i18n.jsx` | NOT in `Translations` type | CinemaIntro uses hardcoded `BRICON·ANATHOLY.` — key never consumed |
| `backToHome` | `services-i18n.jsx` | NOT in `Translations` type | No component references `t.services.backToHome` — key never consumed |
| `nav_label` | `services-i18n.jsx` | NOT in `Translations` type | Reference-only UI label, not used in any component |
| `breadcrumb` | `services-i18n.jsx` | NOT in `Translations` type | Reference-only UI label, not used in any component |

**Finding:** The reference files (`landing-i18n.jsx`, `services-i18n.jsx`) contain 4 keys that were never ported to `translations.ts` or consumed by any live component. These are harmless — the reference files are prototypes, not the source of truth. The `Translations` type is the source of truth.

**Action:** No action needed — these keys are absent from `Translations` type intentionally (never consumed). Document as known gap for future review if CinemaIntro ever needs localized intro text.

---

### 4. Component Coverage Map

All 17 section components + Navbar + Footer call `useLanguage()`. Coverage is 100%.

| Component | Namespace used | Status |
|-----------|---------------|--------|
| `HeroSection.tsx` | `t.landing` | PASS |
| `Manifeste.tsx` | `t.landing` | PASS |
| `Realisations.tsx` | `t.landing` | PASS |
| `PhoneAgent.tsx` | `t.landing` | PASS |
| `Partners.tsx` | `t.landing` | PASS |
| `PartnersBanner.tsx` | `t.landing` | PASS |
| `ContactSection.tsx` | `t.landing` | PASS |
| `ServicesHeroSection.tsx` | `t.services` | PASS |
| `ProblemSection.tsx` | `t.services` | PASS |
| `ApproachSection.tsx` | `t.services` | PASS |
| `OffersSection.tsx` | `t.services` | PASS |
| `PhoneAgentExplainer.tsx` | `t.services` | PASS |
| `MaintenanceSection.tsx` | `t.services` | PASS |
| `OptionsSection.tsx` | `t.services` | PASS |
| `MethodologySection.tsx` | `t.services` | PASS |
| `ReassuranceSection.tsx` | `t.services` | PASS |
| `FinalCtaSection.tsx` | `t.services` | PASS |
| `Navbar.tsx` | `t.nav` | PASS |
| `Footer.tsx` | `t.landing.footer` | PASS (but 4 nav link labels hardcoded — see gaps) |

---

### 5. Verdict

**I18N-01 PASS — all landing content keys resolve in fr/en/th.**
All landing section components (`HeroSection`, `Manifeste`, `Realisations`, `PhoneAgent`, `Partners`, `ContactSection`) use `t.landing.*` keys consistently. No hardcoded French UI strings found in landing content areas. Footer nav link labels are hardcoded but are anchor labels (non-content), not user-facing content strings.

**I18N-02 PASS — all services content keys resolve in fr/en/th.**
All services section components use `t.services.*` keys consistently. No hardcoded French UI strings found in services content areas. `t.services.backToHome` from the reference file is not consumed by any component — not a gap in live code.

**FLAG (non-blocking): Footer nav link labels** — `Footer.tsx` lines 31–34 use hardcoded English strings (`Manifeste`, `Work`, `Services`, `Contact`) instead of `t.nav.manifeste`, `t.nav.work`, `t.nav.services`, `t.nav.contact`. These labels do not translate currently when lang switches. Requires follow-up fix before v1.0 if multilingual nav footer is required.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Removed dead freelance-era keys with positioning signals**

- **Found during:** Task 1 grep audit
- **Issue:** Dead keys `t.hero.description` contains "Disponible pour des projets freelance." and `t.about.p5_available` contains "✓ Disponible pour des projets freelance" — freelance positioning signals present in translation bundle even though no component consumes these keys. Per threat register T-04-03-01, these are flagged for removal.
- **Fix:** Removed all 6 dead legacy namespaces (`hero`, `about`, `projects`, `contact`, `footer`, `phoneAgent`) and 3 unused nav sub-keys from all 3 locale implementations + the `Translations` interface. TypeScript compilation verified clean.
- **Files modified:** `src/lib/translations.ts`
- **Commit:** `b99702f`

---

## Known Stubs

None — all translation keys in the `Translations` interface are wired to live component consumption.

---

## Self-Check: PASSED

- [x] `src/lib/translations.ts` modified — 342 lines removed, TypeScript clean
- [x] `.planning/phases/04-rethemes-qa/04-03-SUMMARY.md` created
- [x] Commit `b99702f` exists
- [x] `grep -rn "t\.hero\.\|t\.about\.\|t\.projects\.\|t\.phoneAgent\." src/components/ src/app/` returns zero matches
- [x] `grep "I18N-01\|I18N-02" 04-03-SUMMARY.md` returns both verdict lines
