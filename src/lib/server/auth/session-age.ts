import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// D-08 : plafond de 30 jours pour tous (admins et clients). Chemin retenu
// (spike A2 de 10-07 = OUI) : RPC public.sv_session_age_ok sur auth.sessions.
// Le time-box projet de Supabase (Pro uniquement) n'est PAS utilisé.
export const SESSION_MAX_DAYS = 30;

// Fail-closed : session_id absent ou erreur RPC => session considérée périmée.
export async function isSessionFresh(sessionId: string | undefined | null): Promise<boolean> {
  if (!sessionId) return false;
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_session_age_ok', {
      p_session_id: sessionId,
      p_max_days: SESSION_MAX_DAYS,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
