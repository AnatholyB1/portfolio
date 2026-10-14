import { describe, expect, it } from 'vitest';
import { buildQueueTiles, QUEUE_ORDER, type QueueCounts } from './workQueue';

const zero: QueueCounts = {
  projectsToPrepare: 0,
  overdueInvoices: 0,
  documentsToSign: 0,
  newLeads: 0,
  returningLeads: 0,
  suppressionAnomalies: 0,
  recentReviews: 0,
};

describe('buildQueueTiles', () => {
  it('is empty ("Rien à traiter") only when every read succeeded with zero', () => {
    expect(buildQueueTiles(zero)).toEqual({ tiles: [], empty: true });
  });

  it('keeps priority order and pluralises the label', () => {
    const { tiles, empty } = buildQueueTiles({ ...zero, recentReviews: 2, newLeads: 1, overdueInvoices: 3 });
    expect(empty).toBe(false);
    expect(tiles.map((t) => t.key)).toEqual(['overdueInvoices', 'newLeads', 'recentReviews']);
    expect(tiles[0].label).toBe('factures en retard de paiement');
    expect(tiles[1].label).toBe('nouveau lead à qualifier');
    expect(tiles[1].href).toBe('/admin/leads?statut=new');
  });

  it('shows a failed read as unavailable instead of hiding it or counting zero', () => {
    const { tiles, empty } = buildQueueTiles({ ...zero, documentsToSign: null });
    expect(empty).toBe(false);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].count).toBeNull();
    expect(tiles[0].label).toContain('lecture impossible');
  });

  it('lists the projects waiting for Sèvalys first, linking to the blocage=admin filter', () => {
    const { tiles } = buildQueueTiles({ ...zero, projectsToPrepare: 2, overdueInvoices: 1 });
    expect(tiles.map((t) => t.key)).toEqual(['projectsToPrepare', 'overdueInvoices']);
    expect(tiles[0].href).toBe('/admin/projets?blocage=admin');
  });

  it('covers every key in the declared order', () => {
    expect(QUEUE_ORDER).toHaveLength(7);
    expect(new Set(QUEUE_ORDER).size).toBe(7);
  });
});
