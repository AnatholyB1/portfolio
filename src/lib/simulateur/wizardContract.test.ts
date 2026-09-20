// src/lib/simulateur/wizardContract.test.ts
//
// vitest.config.ts only collects `src/**/*.test.ts` — Wizard.tsx is a
// `.tsx` client component and this phase deliberately keeps JSX out of
// `.ts` files, so it is never collected as a test target itself. Rather
// than mounting React (which this phase's stack has no precedent or
// dependency for), this file asserts the wizard's structural invariants
// at source level: it reads Wizard.tsx as plain text and greps/inspects
// it. This is a deliberate tradeoff recorded in 07-VALIDATION.md, not an
// oversight.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WIZARD_PATH = join(process.cwd(), 'src/components/simulateur/Wizard.tsx');
const RAW_SOURCE = readFileSync(WIZARD_PATH, 'utf-8');

// Strip `//` line comments and `/* */` block comments so a comment
// mentioning a forbidden token can never fail (or satisfy) an assertion.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      // Naive `//` strip — sufficient here because Wizard.tsx contains no
      // string literal that itself embeds `//` (URLs are tel:/mailto:,
      // not http(s)://).
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

const SOURCE = stripComments(RAW_SOURCE);

// Mirrors and extends translations.test.ts's SIMU_PRICE_PATTERN shape —
// declared locally rather than imported, so this test never depends on
// translations.ts internals.
const SIMU_PRICE_PATTERN =
  /€|฿|\$|£|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|\bdevis\b|\bco[uû]te?\w*\b|\bgratuit\w*\b|\bfree\b|à partir de/i;

describe('Wizard.tsx source contract (SIMU-03/04/05/06/07)', () => {
  // SIMU-04: the contact step's position is computed by buildStepSequence,
  // never hardcoded — no literal step-order array, no hardcoded contact
  // index, and the branch itself is driven by the computed sequence.
  it('SIMU-04: drives step order from buildStepSequence, never a literal array or hardcoded contact index', () => {
    expect(SOURCE).toMatch(/buildStepSequence/);
    expect(SOURCE).toMatch(/kind === 'contact'/);
    // No literal WizardStep-shaped array (e.g. `[{ kind: 'question', ...`)
    // hardcoded in the component.
    expect(SOURCE).not.toMatch(/\[\s*\{\s*kind:\s*['"]question['"]/);
    // No hardcoded numeric contact-step index assignment.
    expect(SOURCE).not.toMatch(/contactStepIndex\s*=\s*\d/);
  });

  // SIMU-05: consent starts false, is never defaulted/forced true, and the
  // submit button's disabled expression delegates to canSubmit.
  it('SIMU-05: consent state is initialised false and never forced true', () => {
    expect(SOURCE).toMatch(/useState\(false\)/);
    expect(SOURCE).not.toMatch(/defaultChecked/);
    expect(SOURCE).not.toMatch(/checked=\{true\}/);
    expect(SOURCE).toMatch(/canSubmit\(/);
  });

  // SIMU-03/T-07-17: the purely-visual gauge score is computed only in the
  // result-render region, never inside handleSubmit — computeVisualScore
  // must not appear inside the handleSubmit function body, and no `score`/
  // `visualScore`/`gauge` key is assembled into the fetch body.
  it('SIMU-03: computeVisualScore is never referenced inside handleSubmit, and no score-shaped key reaches the fetch body', () => {
    const handleSubmitMatch = SOURCE.match(/const handleSubmit = async[\s\S]*?\n {2}\};/);
    expect(handleSubmitMatch).not.toBeNull();
    const handleSubmitBody = handleSubmitMatch![0];

    expect(handleSubmitBody).not.toMatch(/computeVisualScore/);
    expect(handleSubmitBody).not.toMatch(/\bscore\s*:/);
    expect(handleSubmitBody).not.toMatch(/\bvisualScore\s*:/);
    expect(handleSubmitBody).not.toMatch(/\bgauge\s*:/);

    // computeVisualScore is called exactly once (the import statement is a
    // separate, non-call reference) — that one call sits in the
    // result-render region, confirmed above by its absence from
    // handleSubmit's body.
    const callOccurrences = SOURCE.match(/computeVisualScore\(/g) ?? [];
    expect(callOccurrences.length).toBe(1);
  });

  // SIMU-07: one action, two channels — exactly one tel: link and one
  // mailto: link, and recommended-service cards are never links.
  it('SIMU-07: exactly one tel: link, one mailto: link, and no /services/ links on the result cards', () => {
    const telMatches = SOURCE.match(/href="tel:/g) ?? [];
    const mailtoMatches = SOURCE.match(/href="mailto:/g) ?? [];
    expect(telMatches.length).toBe(1);
    expect(mailtoMatches.length).toBe(1);
    expect(SOURCE).not.toMatch(/href="\/services\//);
  });

  // SIMU-06: no currency symbol, no guarded price/tariff word anywhere in
  // the component's source.
  it('SIMU-06: contains no currency symbol and no guarded price/tariff word', () => {
    expect(SOURCE).not.toMatch(SIMU_PRICE_PATTERN);
  });

  // Honeypot: the server's isSpamSubmission contract — exactly one
  // `name="website"` field, hidden from assistive tech via aria-hidden.
  it('Honeypot: exactly one name="website" field, marked aria-hidden', () => {
    const nameMatches = SOURCE.match(/name="website"/g) ?? [];
    expect(nameMatches.length).toBe(1);
    expect(SOURCE).toMatch(/aria-hidden/);
  });
});
