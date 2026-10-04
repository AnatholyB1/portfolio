import { describe, expect, it } from 'vitest';
import { buildCertificateData, pdfSafe } from './certificate';

const H1 = 'a'.repeat(32) + 'b'.repeat(32);
const H2 = 'c'.repeat(32) + 'd'.repeat(32);

const base = {
  document: {
    docType: 'quote' as const,
    reference: 'DEV-2026-001',
    revision: 2,
    templateVersion: 'v1',
    issuedAt: '2026-10-10',
    sha256: H1,
  },
  signature: {
    signerName: 'Jeanne Martin',
    signerRole: 'Gérante',
    signerEmail: 'jeanne@exemple.fr',
    signedAt: '2026-10-12T12:05:03.123456Z',
    signedAtUtc: '2026-10-12 12:05:03 UTC',
    ip: null as string | null,
    consentVersion: 'v1',
    signedEventSeq: 7,
    signedLinkHash: H2,
  },
  acceptance: null,
};

describe('buildCertificateData', () => {
  it('formate Paris, UTC stocké, chaîne et hashes', () => {
    const d = buildCertificateData(base);
    expect(d.signedAtParis).toBe('12 octobre 2026 à 14:05');
    expect(d.signedAtUtc).toBe('2026-10-12 12:05:03 UTC');
    expect(d.chainLength).toBe(7);
    expect(d.originalSha256Lines).toEqual(['a'.repeat(32), 'b'.repeat(32)]);
    expect(d.lastLinkHashLines).toEqual(['c'.repeat(32), 'd'.repeat(32)]);
    expect(d.ip).toBe('—');
    expect(d.docTypeLabel).toBe('Devis');
    expect(d.footerLeft).toBe('Sèvalys · DEV-2026-001');
    expect(d.acceptance).toBeNull();
  });

  it('PV avec réserves', () => {
    const d = buildCertificateData({
      ...base,
      document: { ...base.document, docType: 'acceptance' },
      acceptance: [
        { index: 1, status: 'delivered', note: null },
        { index: 2, status: 'reserved', note: 'Logo flou' },
      ],
    });
    expect(d.acceptance).toEqual({ allDelivered: false, reserved: [{ index: 2, note: 'Logo flou' }] });
  });

  it('PV sans réserve', () => {
    const d = buildCertificateData({
      ...base,
      document: { ...base.document, docType: 'acceptance' },
      acceptance: [{ index: 1, status: 'delivered', note: null }],
    });
    expect(d.acceptance).toEqual({ allDelivered: true, reserved: [] });
  });

  it('pas de U+202F et déterministe', () => {
    const a = buildCertificateData(base);
    expect(JSON.stringify(a)).not.toContain(' ');
    expect(buildCertificateData(base)).toEqual(a);
  });
});

describe('pdfSafe', () => {
  it('remplace les espaces fines et retire les caractères hors sous-ensemble', () => {
    expect(pdfSafe('a b c')).toBe('a b c');
    expect(pdfSafe('é « x » · — – ’ … €')).toBe('é « x » · — – ’ … €');
    expect(pdfSafe('ok\u{1F600}中')).toBe('ok');
  });
});
