import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type AdminRpcResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string };

type RpcOut = PromiseLike<{
  data: unknown;
  error: { message?: string } | null;
}>;

async function call(fn: string, run: () => RpcOut): Promise<AdminRpcResult> {
  try {
    const { data, error } = await run();
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : '';
      const code = msg.startsWith('sv_') ? msg.split(/[\s:]/)[0] : 'unknown';
      // Code seulement : jamais de données personnelles dans les logs.
      console.error(`[admin/leads] ${fn} ${code}`);
      return { ok: false, code };
    }
    return { ok: true, data };
  } catch {
    console.error(`[admin/leads] ${fn} threw`);
    return { ok: false, code: 'unknown' };
  }
}

export function setLeadStatus(a: {
  leadId: string;
  status: string;
  actor: string;
  lostReason?: string | null;
  note?: string | null;
}) {
  return call('sv_set_lead_status', () =>
    createSupabaseAdminClient().rpc('sv_set_lead_status', {
      p_lead_id: a.leadId,
      p_status: a.status,
      p_actor: a.actor,
      p_lost_reason: a.lostReason ?? null,
      p_note: a.note ?? null,
    }),
  );
}

export function correctLeadSource(a: {
  leadId: string;
  actor: string;
  source: string;
  medium: string;
  campaign: string;
  reason: string;
}) {
  return call('sv_correct_lead_source', () =>
    createSupabaseAdminClient().rpc('sv_correct_lead_source', {
      p_lead_id: a.leadId,
      p_actor: a.actor,
      p_source: a.source,
      p_medium: a.medium,
      p_campaign: a.campaign,
      p_reason: a.reason,
    }),
  );
}

export function eraseLead(leadId: string, actor: string, reason: string) {
  return call('sv_erase_lead', () =>
    createSupabaseAdminClient().rpc('sv_erase_lead', {
      p_lead_id: leadId,
      p_actor: actor,
      p_reason_code: reason,
    }),
  );
}

export function markReturnSeen(leadId: string, actor: string) {
  return call('sv_mark_return_seen', () =>
    createSupabaseAdminClient().rpc('sv_mark_return_seen', {
      p_lead_id: leadId,
      p_actor: actor,
    }),
  );
}

export function upsertAcquisitionCost(
  source: string,
  campaign: string,
  month: string,
  cents: number,
  actor: string,
) {
  return call('sv_upsert_acquisition_cost', () =>
    createSupabaseAdminClient().rpc('sv_upsert_acquisition_cost', {
      p_source: source,
      p_campaign: campaign,
      p_month: month,
      p_cents: cents,
      p_actor: actor,
    }),
  );
}
