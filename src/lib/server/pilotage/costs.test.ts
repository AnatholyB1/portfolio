import { describe, expect, it } from 'vitest';
import {
  currentBalance,
  effectiveProjectCosts,
  projectCostRegister,
  projectCostsInRange,
  recurringForMonth,
  recurringInRange,
  recurringRegister,
  type CashBalanceRow,
  type ProjectCostRow,
  type RecurringRow,
} from './costs';

function rec(p: Partial<RecurringRow> & { id: number; startsOn: string }): RecurringRow {
  return {
    seriesId: 's1',
    label: 'Outil',
    category: 'outils',
    amountCents: 2900,
    frequency: 'monthly',
    endsOn: null,
    stopped: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...p,
  };
}
function pc(p: Partial<ProjectCostRow> & { id: number }): ProjectCostRow {
  return {
    projectId: 'p1',
    incurredOn: '2026-10-01',
    category: 'autre',
    label: 'Coût',
    amountCents: 1000,
    vatCents: null,
    voidsCostId: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...p,
  };
}

describe('recurringForMonth', () => {
  it('mensuel : compte chaque mois dès le début', () => {
    const rows = [rec({ id: 1, startsOn: '2026-03-15' })];
    expect(recurringForMonth(rows, '2026-02').totalCents).toBe(0);
    expect(recurringForMonth(rows, '2026-03').totalCents).toBe(2900);
    expect(recurringForMonth(rows, '2030-01').totalCents).toBe(2900);
  });
  it('mensuel avec fin : inclut le mois de fin', () => {
    const rows = [rec({ id: 1, startsOn: '2026-03-15', endsOn: '2026-06-10' })];
    expect(recurringForMonth(rows, '2026-06').totalCents).toBe(2900);
    expect(recurringForMonth(rows, '2026-07').totalCents).toBe(0);
  });
  it('annuel : une fois dans le mois anniversaire', () => {
    const rows = [rec({ id: 1, startsOn: '2026-03-15', frequency: 'yearly', amountCents: 12000 })];
    expect(recurringForMonth(rows, '2026-03').totalCents).toBe(12000);
    expect(recurringForMonth(rows, '2026-04').totalCents).toBe(0);
    expect(recurringForMonth(rows, '2027-03').totalCents).toBe(12000);
  });
  it('version : la plus récente applicable remplace la précédente', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-01-01' }),
      rec({ id: 2, startsOn: '2026-05-01', amountCents: 3500 }),
    ];
    expect(recurringForMonth(rows, '2026-04').totalCents).toBe(2900);
    expect(recurringForMonth(rows, '2026-05').totalCents).toBe(3500);
  });
  it('version : correction datée plus tôt dans le mois', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-05-20', amountCents: 3000 }),
      rec({ id: 2, startsOn: '2026-05-01', amountCents: 3200 }),
    ];
    expect(recurringForMonth(rows, '2026-05').totalCents).toBe(3200);
    expect(recurringForMonth(rows, '2026-09').totalCents).toBe(3200);
  });
  it('arrêt dans le mois de début avec début en milieu de mois', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-08-15' }),
      rec({ id: 2, startsOn: '2026-08-01', stopped: true }),
    ];
    expect(recurringForMonth(rows, '2026-08').totalCents).toBe(0);
    expect(recurringForMonth(rows, '2026-12').totalCents).toBe(0);
    const reg = recurringRegister(rows, '2026-10-07');
    const v = reg[0].versions;
    expect(v.find((x) => x.id === 1)?.status).toBe('Remplacée');
    expect(v.find((x) => x.id === 2)?.status).toBe('Arrêtée');
  });
  it('arrêt : ligne stopped termine la série, une version ultérieure la reprend', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-01-01' }),
      rec({ id: 2, startsOn: '2026-08-01', stopped: true }),
      rec({ id: 3, startsOn: '2026-10-01', amountCents: 4000 }),
    ];
    expect(recurringForMonth(rows, '2026-07').totalCents).toBe(2900);
    expect(recurringForMonth(rows, '2026-08').totalCents).toBe(0);
    expect(recurringForMonth(rows, '2026-09').totalCents).toBe(0);
    expect(recurringForMonth(rows, '2026-10').totalCents).toBe(4000);
  });
  it('plusieurs séries s additionnent', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-01-01' }),
      rec({ id: 2, seriesId: 's2', startsOn: '2026-01-01', amountCents: 100 }),
    ];
    expect(recurringForMonth(rows, '2026-02').totalCents).toBe(3000);
  });
  it('rejette un montant non entier sûr', () => {
    expect(() => recurringForMonth([rec({ id: 1, startsOn: '2026-01-01', amountCents: 1.5 })], '2026-02')).toThrow();
  });
});

describe('recurringInRange', () => {
  const rows = [rec({ id: 1, startsOn: '2026-01-01' })];
  const q4 = { from: '2026-10-01', to: '2026-12-31' };
  it('somme les trois mois avec un item par série et mois', () => {
    const r = recurringInRange(rows, q4);
    expect(r.totalCents).toBe(8700);
    expect(r.items.map((i) => i.date)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
    expect(r.items[0].source).toBe('recurrent');
  });
  it('maxMonth limite aux mois échus', () => {
    const r = recurringInRange(rows, q4, '2026-10');
    expect(r.totalCents).toBe(2900);
    expect(r.items).toHaveLength(1);
  });
});

describe('coûts projet : annulation', () => {
  const rows = [
    pc({ id: 1, incurredOn: '2026-10-02', amountCents: 5000 }),
    pc({ id: 2, incurredOn: '2026-10-03', amountCents: 7000 }),
    pc({ id: 3, incurredOn: '2026-10-04', amountCents: 5000, voidsCostId: 1 }),
  ];
  it('effectiveProjectCosts retire la ligne d annulation et sa cible', () => {
    expect(effectiveProjectCosts(rows).map((r) => r.id)).toEqual([2]);
  });
  it('projectCostsInRange filtre sur incurredOn', () => {
    expect(projectCostsInRange(rows, { from: '2026-10-01', to: '2026-10-31' }).totalCents).toBe(7000);
    expect(projectCostsInRange(rows, { from: '2026-11-01', to: '2026-11-30' }).totalCents).toBe(0);
  });
  it('projectCostRegister omet les annulations et marque les cibles', () => {
    const reg = projectCostRegister(rows);
    expect(reg.map((r) => [r.id, r.status])).toEqual([
      [1, 'Annulé'],
      [2, 'Valide'],
    ]);
  });
});

describe('currentBalance', () => {
  it('prend la ligne au plus grand id', () => {
    const rows: CashBalanceRow[] = [
      { id: 1, asOf: '2026-09-30', amountCents: 1, note: null, createdAt: '' },
      { id: 2, asOf: '2026-01-01', amountCents: 2, note: null, createdAt: '' },
    ];
    expect(currentBalance(rows)?.id).toBe(2);
    expect(currentBalance([])).toBeNull();
  });
});

describe('recurringRegister', () => {
  it('Active, Arrêtée par date de fin, Remplacée', () => {
    const rows = [
      rec({ id: 1, startsOn: '2026-01-01' }),
      rec({ id: 2, startsOn: '2026-05-01', amountCents: 3500 }),
      rec({ id: 3, seriesId: 's2', startsOn: '2026-01-01', endsOn: '2026-06-30' }),
    ];
    const reg = recurringRegister(rows, '2026-10-07');
    const s1 = reg.find((s) => s.seriesId === 's1')!;
    expect(s1.versions.map((v) => [v.id, v.status])).toEqual([
      [2, 'Active'],
      [1, 'Remplacée'],
    ]);
    expect(reg.find((s) => s.seriesId === 's2')!.versions[0].status).toBe('Arrêtée');
  });
});
