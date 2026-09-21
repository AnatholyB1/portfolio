import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read as source text — this is a 'use client' page driven by React state;
// a source-string audit is the established pattern (see src/data/services.test.ts).
// Do NOT import page.tsx directly.
const roiSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

// D-01: the calculator keeps the recovered-capacity and recovered-revenue
// figures denominated in euros — PRIX-02 forbids showing the price OF the
// solution, not value expressed in currency. 08-VALIDATION.md and
// 08-RESEARCH.md both suggested banning the euro currency symbol outright;
// that suggestion is superseded by D-01 and must NOT be re-added here.
const FORBIDDEN = [
  'prixMensuel',
  'setup',
  'Setup',
  'Prix mensuel',
  'coûte',
  'ratioSocle',
  'ratioTotal',
  'amortissementMois',
  'amortLabel',
  'amortNeg',
  'gainNetSocle',
  'fmtMult',
  'roi-mult',
  'roi-amort',
  'roi-claim',
  'Rentabilisé',
  'le coût de la solution',
];

// D-01 survivors: the pure value/capacity calculator keeps these.
const REQUIRED = [
  'capaciteRecuperee',
  'beneficeTotal',
  'caRecupere',
  'margeRecuperee',
  'facteurInterruption',
  'joursMois',
  'fmtEur',
  'fmtHours',
  'Capacité opérationnelle récupérée',
];

describe('calculateur-roi source audit (PRIX-02)', () => {
  for (const token of FORBIDDEN) {
    it(`PRIX-02: does not contain the forbidden token "${token}"`, () => {
      expect(roiSource).not.toContain(token);
    });
  }

  for (const token of REQUIRED) {
    it(`D-01: still contains the surviving identifier "${token}"`, () => {
      expect(roiSource).toContain(token);
    });
  }

  it('D-02: the results CTA still points to /services/agent-vocal-ia', () => {
    expect(roiSource).toContain('href="/services/agent-vocal-ia"');
  });

  it('D-01: the sole "roi-card roi-card-main" occurrence belongs to the promoted capacity card', () => {
    // Technique: count the "roi-card roi-card-main" class-string occurrences
    // (must be exactly 1 — the promoted capacity card, not the deleted
    // price-ratio card), then confirm the nearest preceding "roi-card" class
    // token before the "Capacité opérationnelle récupérée" label is that same
    // "-main" occurrence, i.e. the capacity card itself carries the styling.
    const mainOccurrences = roiSource.split('roi-card roi-card-main').length - 1;
    expect(mainOccurrences, 'exactly one "roi-card roi-card-main" occurrence').toBe(1);

    const labelIndex = roiSource.indexOf('Capacité opérationnelle récupérée');
    expect(labelIndex, 'capacity label must exist in source').toBeGreaterThan(-1);

    const precedingSource = roiSource.slice(0, labelIndex);
    const lastRoiCardClassIndex = precedingSource.lastIndexOf('roi-card');
    const lastRoiCardMainIndex = precedingSource.lastIndexOf('roi-card roi-card-main');
    expect(
      lastRoiCardClassIndex,
      'nearest preceding "roi-card" class before the capacity label must be the "-main" occurrence'
    ).toBe(lastRoiCardMainIndex);
  });
});
