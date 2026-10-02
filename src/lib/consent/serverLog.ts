import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ConsentChoice } from './state';

export type LogConsentInput = {
  anonId: string;
  choice: ConsentChoice;
  version: string;
  locale: string;
  ipHash: string | null;
};

/** Journal serveur du choix de consentement (D-04). Jamais d'IP en clair. */
export async function logConsent(input: LogConsentInput): Promise<{ ok: boolean }> {
  try {
    const { error } = await createSupabaseAdminClient().rpc('sv_log_consent', {
      p_anon_id: input.anonId,
      p_choice: input.choice,
      p_version: input.version,
      p_locale: input.locale,
      p_ip_hash: input.ipHash,
    });
    if (error) {
      console.error('[consent/log] rpc failed', error.code ?? 'unknown');
      return { ok: false };
    }
    return { ok: true };
  } catch {
    console.error('[consent/log] unexpected failure');
    return { ok: false };
  }
}
