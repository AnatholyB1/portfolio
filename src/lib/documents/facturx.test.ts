import { describe, expect, it } from 'vitest';
import { toEn16931 } from './facturx';
import {
  sampleCreditNote,
  sampleDepositInvoiceV2,
  sampleFinalInvoiceV2,
  samplePeriodInvoiceV2,
} from './invoiceFixtures';

describe('toEn16931', () => {
  it('facture finale : termes obligatoires et acompte en BG-3', () => {
    const inv = sampleFinalInvoiceV2();
    const m = toEn16931(inv);
    expect(m['BT-1']).toBe('FA-2026-0004');
    expect(m['BT-2']).toBe(inv.issuedOn);
    expect(m['BT-3']).toBe('380');
    expect(m['BT-5']).toBe('EUR');
    expect(m['BT-9']).toBe(inv.dueDate);
    expect(m['BT-13']).toBe(inv.quote?.reference);
    expect(m['BG-3']).toEqual([{ 'BT-25': 'FA-2026-0001', 'BT-26': '2026-10-15' }]);
    expect(m['BG-14']).toBeNull();
    expect(m['BT-113']).toBe(inv.prepaidCents);
    expect(m['BT-115']).toBe(inv.netToPayCents);
    expect(m['BG-23']).toEqual([
      {
        'BT-118': 'E',
        'BT-120': inv.vatExemptionText,
        'BT-121': 'VATEX-FR-FRANCHISE',
        'BT-116': inv.totalExclTaxCents,
        'BT-117': 0,
      },
    ]);
    expect(m['BG-16']).toEqual({ 'BT-81': '58', 'BT-84': inv.seller.iban });
  });

  it('la somme des lignes égale BT-106', () => {
    const inv = sampleFinalInvoiceV2();
    const m = toEn16931(inv);
    expect(inv.lines.reduce((s, l) => s + l.totalCents, 0)).toBe(m['BT-106']);
    expect(m['BT-109']).toBe(inv.totalExclTaxCents);
  });

  it('facture d\'acompte : code 386', () => {
    const m = toEn16931(sampleDepositInvoiceV2());
    expect(m['BT-3']).toBe('386');
    expect(m['BG-3']).toEqual([]);
  });

  it('facture de période : BG-14', () => {
    const m = toEn16931(samplePeriodInvoiceV2());
    expect(m['BG-14']).toEqual({ 'BT-73': '2026-11-01', 'BT-74': '2026-11-30' });
  });

  it('avoir : code 381, montants positifs, BG-3 = facture d\'origine', () => {
    const cn = sampleCreditNote();
    const m = toEn16931(cn);
    expect(m['BT-1']).toBe('AV-2026-0001');
    expect(m['BT-3']).toBe('381');
    expect(m['BT-106']).toBeGreaterThan(0);
    expect(m['BT-115']).toBe(cn.totalInclTaxCents);
    expect(m['BG-3']).toEqual([{ 'BT-25': 'FA-2026-0001', 'BT-26': '2026-10-15' }]);
  });
});
