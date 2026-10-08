import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normaliseEmail, normalisePhone } from './normalise';
import type { RequestAttribution } from './requestAttribution';

export type IngestInput = {
  channel: 'simulateur' | 'contact';
  nom: string;
  email: string;
  telephone: string | null;
  payload: Record<string, unknown>;
  consentRgpd: boolean | null;
  attribution: RequestAttribution;
  ipHash: string | null;
};

export type IngestResult = { ok: true; leadId: string; isReturn: boolean } | { ok: false };

export async function ingestLead(input: IngestInput): Promise<IngestResult> {
  const a = input.attribution;
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_ingest_lead', {
      p_channel: input.channel,
      p_nom: input.nom,
      p_email: input.email,
      p_email_norm: normaliseEmail(input.email),
      p_phone: input.telephone,
      p_phone_norm: normalisePhone(input.telephone),
      p_payload: input.payload,
      p_consent_rgpd: input.consentRgpd,
      p_source: { ...a.source, nonconformity: a.utm.nonconformity, raw: a.utm.raw },
      p_first_touch: a.firstTouch,
      p_last_touch: a.lastTouch,
      p_ip_hash: input.ipHash,
      p_consent: a.consent
        ? { choice: a.consent.choice, version: a.consent.version, id: a.consent.id, at: a.consent.at }
        : null,
    });
    if (error) {
      // Code d'erreur seulement : jamais d'e-mail ni de téléphone dans les logs.
      console.error('[leads/ingest] rpc failed', error.code ?? 'unknown');
      return { ok: false };
    }
    const row = data as { lead_id?: string; is_return?: boolean } | null;
    if (!row || typeof row.lead_id !== 'string') {
      console.error('[leads/ingest] unexpected rpc result');
      return { ok: false };
    }
    return { ok: true, leadId: row.lead_id, isReturn: row.is_return === true };
  } catch {
    console.error('[leads/ingest] unexpected failure');
    return { ok: false };
  }
}
