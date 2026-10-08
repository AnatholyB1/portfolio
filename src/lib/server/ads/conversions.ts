import 'server-only';
// Lecture admin du journal des conversions d'un lead (ADS-02, D-06).
// Lectures via le client RLS de l'admin appelant, jamais service_role.
// Zone prix : value_cents reste dans src/lib/server et src/components/admin (D-13).
import type { SupabaseClient } from '@supabase/supabase-js';
import { CONVERSION_RANKS, RANK_LABELS, TRACKING_LABELS, type ConversionEvent } from '@/lib/ads/events';

export type LeadConversion = {
  eventName: string;
  rank: number | null;
  eventId: string;
  occurredAt: string;
  valueCents: number | null;
  currency: string | null;
};

type Row = {
  event_name: string;
  rank: number | string | null;
  event_id: string;
  occurred_at: string;
  value_cents: number | string | null;
  currency: string | null;
};

export async function loadLeadConversions(
  supabase: SupabaseClient,
  leadId: string,
): Promise<LeadConversion[]> {
  const { data, error } = await supabase
    .from('sv_conversion_events')
    .select('event_name, rank, event_id, occurred_at, value_cents, currency')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error('conversions_read_failed');
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    eventName: r.event_name,
    rank: r.rank === null || r.rank === undefined ? null : Number(r.rank),
    eventId: r.event_id,
    occurredAt: r.occurred_at,
    valueCents: r.value_cents === null || r.value_cents === undefined ? null : Number(r.value_cents),
    currency: r.currency ?? null,
  }));
}

export type ConversionLadder = {
  ranks: { rank: 1 | 2 | 3 | 4; label: string; row: LeadConversion | null }[];
  tracking: { label: string; row: LeadConversion }[];
};

export function conversionLadder(rows: LeadConversion[]): ConversionLadder {
  const ranks = ([1, 2, 3, 4] as const).map((rank) => {
    const row = rows.find((r) => CONVERSION_RANKS[r.eventName as ConversionEvent] === rank) ?? null;
    return { rank, label: RANK_LABELS[rank], row };
  });
  const tracking: ConversionLadder['tracking'] = [];
  for (const name of ['quote_sent', 'lead_lost'] as const) {
    for (const row of rows) {
      if (row.eventName === name) tracking.push({ label: TRACKING_LABELS[name], row });
    }
  }
  return { ranks, tracking };
}
