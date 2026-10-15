import { describe, expect, it } from 'vitest';
import { LEGAL_FORMS, legalFormLabel } from './legalForm';

describe('legalFormLabel', () => {
  it('maps common INSEE codes', () => {
    expect(legalFormLabel('1000')).toBe('Entrepreneur individuel');
    expect(legalFormLabel('5499')).toBe('Société à responsabilité limitée (sans autre indication)');
    expect(legalFormLabel('5710')).toBe('SAS, société par actions simplifiée');
    expect(legalFormLabel('5202')).toBe('Société en nom collectif');
    expect(legalFormLabel('9220')).toBe('Association déclarée');
  });

  it('keeps legacy EURL/SASU codes readable', () => {
    expect(legalFormLabel('5498')).toContain('EURL');
    expect(legalFormLabel('5720')).toContain('SASU');
  });

  it('falls back explicitly for unknown codes, never the bare code', () => {
    expect(legalFormLabel('9999')).toBe('Forme juridique (code 9999)');
  });

  it('handles null, undefined and empty input', () => {
    expect(legalFormLabel(null)).toBe('Non renseignée');
    expect(legalFormLabel(undefined)).toBe('Non renseignée');
    expect(legalFormLabel('   ')).toBe('Non renseignée');
  });

  it('trims whitespace and accepts numbers', () => {
    expect(legalFormLabel(' 5710 ')).toBe('SAS, société par actions simplifiée');
    expect(legalFormLabel(1000)).toBe('Entrepreneur individuel');
  });

  it('ships the full level III table', () => {
    expect(Object.keys(LEGAL_FORMS).length).toBeGreaterThan(250);
  });
});
