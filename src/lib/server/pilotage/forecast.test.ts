import { describe, expect, it } from 'vitest';
import { cashProjection, globalMargin, projectMargin, realizedMargin, remainingToInvoice } from './forecast';
import type { CashBalanceRow, ProjectCostRow, RecurringRow } from './costs';
import type { UnpaidInvoice } from './billing';

const TODAY = '2026-10-07';

function inv(dueDate: string | null, amountCents = 40000, overdue = false): UnpaidInvoice {
  return { invoiceId: 'i', number: 'F1', projectId: 'p', dueDate, amountCents, overdue };
}
function rec(p: Partial<RecurringRow> & { id: number }): RecurringRow {
  return {
    seriesId: 's1',
    label: 'Outil',
    category: 'outils',
    amountCents: 10000,
    frequency: 'monthly',
    startsOn: '2026-01-01',
    endsOn: null,
    stopped: false,
    createdAt: '',
    ...p,
  };
}
function pc(p: Partial<ProjectCostRow> & { id: number; incurredOn: string }): ProjectCostRow {
  return {
    projectId: 'p',
    category: 'autre',
    label: 'c',
    amountCents: 5000,
    vatCents: null,
    voidsCostId: null,
    createdAt: '',
    ...p,
  };
}
const base = { today: TODAY, balance: null, unpaid: [], recurring: [], projectCosts: [], collectedItems: [] };

describe('marges', () => {
  it('projectMargin = max(signé, facturé) - coûts', () => {
    expect(projectMargin({ signedCents: 100000, invoicedCents: 120000, costsCents: 30000 })).toBe(90000);
    expect(projectMargin({ signedCents: 100000, invoicedCents: 40000, costsCents: 30000 })).toBe(70000);
  });
  it('remainingToInvoice jamais négatif', () => {
    expect(remainingToInvoice({ signedCents: 100000, invoicedCents: 40000 })).toBe(60000);
    expect(remainingToInvoice({ signedCents: 100000, invoicedCents: 150000 })).toBe(0);
  });
  it('globalMargin et realizedMargin', () => {
    expect(globalMargin([70000, -5000], 12000)).toBe(53000);
    expect(realizedMargin(50000, 20000)).toBe(30000);
  });
});

describe('cashProjection', () => {
  it('sans solde : départ à zéro et six mois chaînés', () => {
    const p = cashProjection({ ...base, recurring: [rec({ id: 1 })] });
    expect(p.hasBalance).toBe(false);
    expect(p.balanceAsOf).toBeNull();
    expect(p.startCents).toBe(0);
    expect(p.months.map((m) => m.month)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
    p.months.forEach((m, k) => {
      if (k > 0) expect(m.openingCents).toBe(p.months[k - 1].closingCents);
      expect(m.closingCents).toBe(m.openingCents + m.inflowCents - m.outflowCents);
    });
    expect(p.months[5].closingCents).toBe(-60000);
  });
  it('facture échue au mois d échéance', () => {
    const p = cashProjection({ ...base, unpaid: [inv('2026-11-15')] });
    expect(p.months[1].inflowCents).toBe(40000);
    expect(p.months[1].overdueInflowCents).toBe(0);
  });
  it('en retard : échéance passée ou nulle au mois courant', () => {
    const p = cashProjection({ ...base, unpaid: [inv('2026-09-30'), inv(null)] });
    expect(p.months[0].inflowCents).toBe(80000);
    expect(p.months[0].overdueInflowCents).toBe(80000);
  });
  it('hors horizon : absente', () => {
    const p = cashProjection({ ...base, unpaid: [inv('2027-05-01')] });
    expect(p.months.reduce((s, m) => s + m.inflowCents, 0)).toBe(0);
  });
  it('sorties : coûts projet futurs seulement', () => {
    const p = cashProjection({
      ...base,
      projectCosts: [
        pc({ id: 1, incurredOn: '2026-10-03' }),
        pc({ id: 2, incurredOn: '2026-10-20' }),
        pc({ id: 3, incurredOn: '2026-11-05', amountCents: 7000 }),
        pc({ id: 4, incurredOn: '2026-11-06', amountCents: 7000, voidsCostId: 3 }),
      ],
    });
    expect(p.months[0].outflowCents).toBe(5000);
    expect(p.months[1].outflowCents).toBe(0);
  });
  it('avec solde : applique les flux réalisés depuis la date du solde', () => {
    const balance: CashBalanceRow = { id: 1, asOf: '2026-09-15', amountCents: 500000, note: null, createdAt: '' };
    const p = cashProjection({
      ...base,
      balance,
      collectedItems: [
        { date: '2026-09-10', amountCents: 999 },
        { date: '2026-09-20', amountCents: 30000 },
        { date: '2026-10-05', amountCents: 20000 },
        { date: '2026-10-09', amountCents: 888 },
      ],
      projectCosts: [pc({ id: 1, incurredOn: '2026-09-25', amountCents: 4000 })],
    });
    expect(p.hasBalance).toBe(true);
    expect(p.balanceAsOf).toBe('2026-09-15');
    expect(p.startCents).toBe(500000 + 50000 - 4000);
    expect(p.months[0].openingCents).toBe(p.startCents);
  });
  it('solde ancien : retranche les récurrents des mois intermédiaires', () => {
    const balance: CashBalanceRow = { id: 1, asOf: '2026-07-20', amountCents: 500000, note: null, createdAt: '' };
    const p = cashProjection({ ...base, balance, recurring: [rec({ id: 1 })] });
    expect(p.startCents).toBe(500000 - 20000);
  });
  it('un solde négatif reste négatif', () => {
    const p = cashProjection({ ...base, recurring: [rec({ id: 1, amountCents: 1000 })] });
    expect(p.months[0].closingCents).toBe(-1000);
  });
});
