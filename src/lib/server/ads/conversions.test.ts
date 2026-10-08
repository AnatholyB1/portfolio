import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { conversionLadder, loadLeadConversions, type LeadConversion } from './conversions';

function mockClient(result: { data: unknown; error: unknown }) {
  const calls: { select?: string; eq?: [string, string]; order: string[] } = { order: [] };
  const chain: Record<string, unknown> = {};
  chain.select = (s: string) => {
    calls.select = s;
    return chain;
  };
  chain.eq = (c: string, v: string) => {
    calls.eq = [c, v];
    return chain;
  };
  chain.order = (c: string) => {
    calls.order.push(c);
    return calls.order.length >= 2 ? Promise.resolve(result) : chain;
  };
  const supabase = { from: vi.fn(() => chain) };
  return { supabase: supabase as never, calls };
}

const row = (eventName: string, rank: number | null, extra: Partial<LeadConversion> = {}): LeadConversion => ({
  eventName,
  rank,
  eventId: `id-${eventName}`,
  occurredAt: '2026-01-01T10:00:00Z',
  valueCents: null,
  currency: null,
  ...extra,
});

describe('loadLeadConversions', () => {
  it('queries sv_conversion_events and maps to camelCase with Number()', async () => {
    const { supabase, calls } = mockClient({
      data: [
        { event_name: 'deal_signed', rank: 4, event_id: 'e1', occurred_at: 't', value_cents: '120000', currency: 'EUR' },
      ],
      error: null,
    });
    const out = await loadLeadConversions(supabase, 'lead-1');
    expect(calls.select).toBe('event_name, rank, event_id, occurred_at, value_cents, currency');
    expect(calls.eq).toEqual(['lead_id', 'lead-1']);
    expect(calls.order).toEqual(['occurred_at', 'id']);
    expect(out).toEqual([
      { eventName: 'deal_signed', rank: 4, eventId: 'e1', occurredAt: 't', valueCents: 120000, currency: 'EUR' },
    ]);
  });

  it('throws conversions_read_failed on error', async () => {
    const { supabase } = mockClient({ data: null, error: { message: 'x' } });
    await expect(loadLeadConversions(supabase, 'l')).rejects.toThrow('conversions_read_failed');
  });
});

describe('conversionLadder', () => {
  it('returns four ordered ranks with null rows when missing', () => {
    const l = conversionLadder([row('lead_submitted', 1)]);
    expect(l.ranks.map((r) => r.label)).toEqual(['Lead', 'Qualifié', 'RDV', 'Signé']);
    expect(l.ranks.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(l.ranks[0].row?.eventId).toBe('id-lead_submitted');
    expect(l.ranks[1].row).toBeNull();
    expect(l.tracking).toEqual([]);
  });

  it('lists tracking rows and ignores unknown events', () => {
    const l = conversionLadder([
      row('lead_lost', null, { eventId: 'a' }),
      row('quote_sent', null),
      row('lead_lost', null, { eventId: 'b' }),
      row('mystery', null),
    ]);
    expect(l.tracking.map((t) => `${t.label}:${t.row.eventId}`)).toEqual([
      'Devis envoyé:id-quote_sent',
      'Perdu:a',
      'Perdu:b',
    ]);
  });
});
