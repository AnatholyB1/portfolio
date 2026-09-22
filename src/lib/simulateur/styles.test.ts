import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
const rawCss = readFileSync(cssPath, 'utf-8');
// Strip CSS comments so a comment mentioning a selector can never satisfy
// an assertion below.
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

// 07-UI-SPEC.md "Component & Layout Patterns" + 07-02-PLAN.md Task 3 lock
// every selector below as required for the wizard/contact/result/pillar
// screens. Driven from an array so adding one is a one-line change.
const REQUIRED_SELECTORS = [
  '.sim-wizard',
  '.sim-progress-track',
  '.sim-progress-fill',
  '.sim-q-text',
  '.sim-options',
  '.sim-option',
  '.sim-option:hover',
  '.sim-option.selected',
  '.sim-option:focus-visible',
  '.sim-option-icon',
  '.sim-mood-row',
  '.sim-mood-option',
  '.sim-mood-option.selected',
  '.sim-mood-option:focus-visible',
  '.sim-mood-icon',
  '.sim-range-wrap',
  '.sim-range-value',
  '.sim-range-input',
  '.sim-nav',
  '.sim-nav .btn',
  '.sim-contact-sub',
  '.sim-consent',
  '.sim-consent input[type="checkbox"]',
  '.sim-consent-label',
  '.sim-rgpd',
  '.sim-rgpd .row',
  '.sim-rgpd .k',
  '.sim-error',
  '.sim-error h3',
  '.sim-honeypot',
  '.sim-result',
  '.sim-gauge',
  '.sim-gauge-num',
  '.sim-gauge-caption',
  '.sim-gauge-framing',
  '.sim-services',
  '.sim-service-card',
  '.sim-service-card h3',
  '.sim-service-card p',
  '.sim-cta',
  '.sim-cta-row',
  '.sim-cta-row .btn',
  '.sim-intro',
  '.sim-section-gap',
];

describe('globals.css simulateur layer', () => {
  // 07-02-PLAN.md Task 3: every required selector must exist so plan 07-05
  // (the Wizard component) can compose against a locked class contract.
  it.each(REQUIRED_SELECTORS)('declares the %s selector', (selector) => {
    expect(css).toContain(selector);
  });

  // 07-UI-SPEC.md Spacing Scale "44px minimum touch target" exception —
  // must be literally present inside .sim-option's own rule block.
  it('gives .sim-option a 44px minimum tap target', () => {
    const match = css.match(/\.sim-option\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match?.[0]).toContain('min-height: 44px');
  });

  // 07-UI-SPEC.md Color section: --warm is reserved for the error state
  // only; D-10 locks the gauge to a single acid-green accent at every
  // score, so no .sim-gauge* rule may reference --warm.
  it('scopes --warm to .sim-error and keeps it out of the gauge', () => {
    const errorMatch = css.match(/\.sim-error\s*\{[^}]*\}/);
    expect(errorMatch).not.toBeNull();
    expect(errorMatch?.[0]).toContain('--warm');

    const gaugeBlocks = css.match(/\.sim-gauge[\w-]*(?:\s+[\w-]+)?\s*\{[^}]*\}/g) ?? [];
    expect(gaugeBlocks.length).toBeGreaterThan(0);
    for (const block of gaugeBlocks) {
      expect(block).not.toContain('--warm');
    }
  });

  // Mobile overflow fix (2026-09-22): .sim-rgpd .row must collapse to a
  // single column under 480px instead of forcing a fixed 180px key column
  // that pushes long values off-screen.
  it('collapses .sim-rgpd .row to one column under 480px', () => {
    const mediaBlocks = css.match(/@media \(max-width:\s*480px\)\s*\{[\s\S]*?\n\}/g) ?? [];
    const hasRowFix = mediaBlocks.some(
      (block) => block.includes('.sim-rgpd .row') && block.includes('grid-template-columns: 1fr')
    );
    expect(hasRowFix).toBe(true);
  });

  // Mobile overflow fix (2026-09-22): .sim-q-text must scale down instead
  // of staying fixed at 32px, which overflowed narrow viewports.
  it('scales .sim-q-text with clamp() instead of a fixed font-size', () => {
    const match = css.match(/\.sim-q-text\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match?.[0]).toMatch(/font-size:\s*clamp\(/);
  });
});
