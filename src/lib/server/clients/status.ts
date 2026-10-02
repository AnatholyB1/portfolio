import 'server-only';
import { formatDateFr } from '@/lib/admin/format';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Statut de connexion des clients (« Invité » / « Connecté le JJ/MM/AAAA »).
 *
 * PRÉCONDITION : l'appelant a déjà exécuté requireAdmin(). Utilise service_role
 * pour lire last_sign_in_at ; seul le libellé calculé est renvoyé, jamais l'objet utilisateur.
 * N est petit : lecture parallèle plafonnée à MAX_USERS.
 */
const MAX_USERS = 200;

export const STATUS_INVITED = 'Invité';

export async function getClientStatuses(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = Array.from(new Set(userIds.filter(Boolean))).slice(0, MAX_USERS);
  if (ids.length === 0) return out;

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    console.error('[admin/status] client unavailable');
    return out;
  }

  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await admin.auth.admin.getUserById(id);
        if (res.error) {
          console.error('[admin/status] lookup failed');
          return;
        }
        const last = res.data?.user?.last_sign_in_at;
        out.set(id, last ? `Connecté le ${formatDateFr(last)}` : STATUS_INVITED);
      } catch {
        console.error('[admin/status] lookup failed');
      }
    }),
  );
  return out;
}
