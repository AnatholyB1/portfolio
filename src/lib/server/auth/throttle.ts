import 'server-only';
import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Limitation de débit adossée à la base (RPC sv_throttle_hit, service_role).
// Les clés ne contiennent que des empreintes SHA-256, jamais l'e-mail ni l'IP en clair.

export type ThrottleKind = 'login-email' | 'login-ip' | 'verify-email' | 'verify-ip';

export function hashKey(kind: ThrottleKind, value: string): string {
  return `${kind}:${createHash('sha256').update(value).digest('hex')}`;
}

/** true = requête autorisée. Échec fermé (false) en cas d'erreur RPC. */
export async function hitThrottle(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_throttle_hit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) {
      console.error('[auth/throttle] rpc failed');
      return false;
    }
    return data === true;
  } catch {
    console.error('[auth/throttle] unexpected failure');
    return false;
  }
}
