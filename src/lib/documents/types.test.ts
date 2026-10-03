import { describe, it, expect } from 'vitest';
import {
  DOC_TYPES,
  ISSUABLE_DOC_TYPES,
  DOC_LABELS,
  DOC_TITLES,
  DOC_REF_PREFIX,
  CURRENT_TEMPLATE_VERSION,
  STATUS_LABELS,
  QUOTE_FORM_LABELS,
  buildReference,
  buildFilename,
} from './types';
import { PROJECT_COPY } from '@/lib/projects/copy';

const PROJECT_ID = 'ab12cd34-0000-4000-8000-000000000000';

describe('buildReference', () => {
  it('builds a quote reference', () => {
    expect(buildReference('quote', PROJECT_ID, '2026-10-12', 2)).toBe('DEV-2026-AB12CD34-2');
  });
  it('builds references for the other issuable types', () => {
    expect(buildReference('spec', PROJECT_ID, '2026-01-02', 1)).toBe('CDC-2026-AB12CD34-1');
    expect(buildReference('contract', PROJECT_ID, '2026-01-02', 1)).toBe('CTR-2026-AB12CD34-1');
    expect(buildReference('acceptance', PROJECT_ID, '2026-01-02', 3)).toBe('PVR-2026-AB12CD34-3');
  });
  it('returns PROFORMA for an invoice', () => {
    expect(buildReference('invoice', PROJECT_ID, '2026-10-12', 1)).toBe('PROFORMA');
  });
});

describe('buildFilename', () => {
  it('builds an ASCII filename', () => {
    expect(buildFilename('spec', 'CDC-2026-AB12CD34-1')).toBe(
      'Cahier-des-charges-CDC-2026-AB12CD34-1.pdf',
    );
    expect(buildFilename('quote', 'DEV-2026-AB12CD34-1')).toBe('Devis-DEV-2026-AB12CD34-1.pdf');
    expect(buildFilename('contract', 'CTR-2026-AB12CD34-1')).toBe('Contrat-CTR-2026-AB12CD34-1.pdf');
    expect(buildFilename('acceptance', 'PVR-2026-AB12CD34-1')).toBe(
      'PV-de-recette-PVR-2026-AB12CD34-1.pdf',
    );
    expect(buildFilename('invoice', 'PROFORMA')).toBe('Facture-apercu-PROFORMA.pdf');
  });
  it('only produces safe characters', () => {
    for (const t of DOC_TYPES) {
      expect(buildFilename(t, buildReference(t, PROJECT_ID, '2026-10-12', 1))).toMatch(
        /^[A-Za-z0-9._-]+$/,
      );
    }
  });
});

describe('document constants', () => {
  it('ISSUABLE_DOC_TYPES is DOC_TYPES without invoice', () => {
    expect([...ISSUABLE_DOC_TYPES]).toEqual(DOC_TYPES.filter((t) => t !== 'invoice'));
    expect((ISSUABLE_DOC_TYPES as readonly string[]).includes('invoice')).toBe(false);
  });
  it('has labels, titles and prefixes for every type', () => {
    for (const t of DOC_TYPES) {
      expect(DOC_LABELS[t].length).toBeGreaterThan(0);
      expect(DOC_TITLES[t].length).toBeGreaterThan(0);
      expect(DOC_REF_PREFIX[t].length).toBeGreaterThan(0);
      expect(CURRENT_TEMPLATE_VERSION[t]).toMatch(/^v[0-9]+$/);
    }
  });
  it('has the status labels', () => {
    expect(STATUS_LABELS.to_sign).toBe('À signer');
    expect(STATUS_LABELS.replaced).toBe('Remplacé');
  });
  it('keeps the VAT line in the quote form labels', () => {
    expect(QUOTE_FORM_LABELS.vatLine).toContain('293 B du CGI');
  });
});

describe('PROJECT_COPY.documents', () => {
  it('is price-free', () => {
    const d = PROJECT_COPY.documents;
    const dump = JSON.stringify(d, (_k, v) => {
      if (typeof v === 'function') {
        const fn = v as (...a: unknown[]) => string;
        return fn(2, '12 octobre 2026', '1 Ko') ?? '';
      }
      return v;
    });
    expect(dump).not.toMatch(/€|\beuros?\b|\bprix\b/i);
    expect(d.portal.emptyHeading).toBe('Aucun document pour le moment');
    expect(d.admin.confirm).toBe("Confirmer l'émission");
  });
});
