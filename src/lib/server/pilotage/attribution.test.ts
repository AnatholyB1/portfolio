import { describe, expect, it } from 'vitest';
import { DIRECT_NO_LEAD, signedBySource, type LeadSourceRow, type ProjectLeadRow } from './attribution';

const lead = (id: string, source: string, campaign: string | null, kind: LeadSourceRow['sourceKind'] = 'touch'): LeadSourceRow => ({
  id,
  sourceKind: kind,
  sourceSource: source,
  sourceMedium: 'cpc',
  sourceCampaign: campaign,
});
const proj = (projectId: string, leadId: string | null): ProjectLeadRow => ({ projectId, leadId });

describe('signedBySource', () => {
  const leads = [lead('l1', 'google', 'brand'), lead('l2', 'google', 'brand'), lead('l3', 'linkedin', null)];
  const projects = [proj('p1', 'l1'), proj('p2', 'l2'), proj('p3', 'l3')];

  it('groupe par source et campagne', () => {
    const r = signedBySource(
      [
        { projectId: 'p1', amountCents: 40000 },
        { projectId: 'p2', amountCents: 60000 },
        { projectId: 'p3', amountCents: 50000 },
      ],
      projects,
      leads,
    );
    expect(r.totalCents).toBe(150000);
    expect(r.rows.map((x) => [x.source, x.campaign, x.signedCents])).toEqual([
      ['google', 'brand', 100000],
      ['linkedin', null, 50000],
    ]);
  });

  it('ligne hors lead distincte de la source direct', () => {
    const r = signedBySource(
      [
        { projectId: 'p1', amountCents: 10000 },
        { projectId: 'p4', amountCents: 20000 },
      ],
      [proj('p1', 'ld'), proj('p4', null)],
      [lead('ld', 'direct', null, 'direct')],
    );
    const noLead = r.rows.find((x) => x.isNoLead)!;
    expect(noLead.source).toBe(DIRECT_NO_LEAD);
    expect(noLead.campaign).toBeNull();
    expect(r.rows.find((x) => !x.isNoLead)!.source).toBe('direct');
    expect(r.rows[r.rows.length - 1].isNoLead).toBe(true);
  });

  it('lead introuvable : jamais ignoré, juste avant la ligne hors lead', () => {
    const r = signedBySource(
      [
        { projectId: 'p1', amountCents: 10000 },
        { projectId: 'p5', amountCents: 5000 },
        { projectId: 'p4', amountCents: 20000 },
      ],
      [proj('p1', 'l1'), proj('p5', 'zzz'), proj('p4', null)],
      leads,
    );
    expect(r.rows.map((x) => x.source)).toEqual(['google', '(lead introuvable)', DIRECT_NO_LEAD]);
  });

  it('Σ lignes = total, avenants négatifs inclus, projets sommés', () => {
    const r = signedBySource(
      [
        { projectId: 'p1', amountCents: 100000 },
        { projectId: 'p1', amountCents: -20000 },
        { projectId: 'p3', amountCents: 33333 },
      ],
      projects,
      leads,
    );
    expect(r.rows.reduce((a, x) => a + x.signedCents, 0)).toBe(r.totalCents);
    expect(r.totalCents).toBe(113333);
    expect(r.rows[0].projectIds).toEqual(['p1']);
    expect(r.rows[0].signedCents).toBe(80000);
  });

  it('shareBp arrondi, 0 si total nul', () => {
    const r = signedBySource([{ projectId: 'p1', amountCents: 1 }, { projectId: 'p3', amountCents: 2 }], projects, leads);
    expect(r.rows.map((x) => x.shareBp)).toEqual([3333, 6667]);
    expect(signedBySource([], projects, leads).rows).toEqual([]);
    const z = signedBySource([{ projectId: 'p1', amountCents: 0 }], projects, leads);
    expect(z.rows[0].shareBp).toBe(0);
  });

  it('tri : source puis campagne, campagne nulle en premier', () => {
    const r = signedBySource(
      [
        { projectId: 'a', amountCents: 1 },
        { projectId: 'b', amountCents: 1 },
        { projectId: 'c', amountCents: 1 },
      ],
      [proj('a', 'x1'), proj('b', 'x2'), proj('c', 'x3')],
      [lead('x1', 'google', 'zeta'), lead('x2', 'google', null), lead('x3', 'bing', 'a')],
    );
    expect(r.rows.map((x) => `${x.source}/${x.campaign}`)).toEqual(['bing/a', 'google/null', 'google/zeta']);
  });

  it('une source corrigée déplace le montant', () => {
    const signed = [{ projectId: 'p1', amountCents: 40000 }];
    const before = signedBySource(signed, [proj('p1', 'l1')], [lead('l1', 'google', 'brand')]);
    const after = signedBySource(signed, [proj('p1', 'l1')], [lead('l1', 'linkedin', null)]);
    expect(before.rows[0].source).toBe('google');
    expect(after.rows[0].source).toBe('linkedin');
  });
});
