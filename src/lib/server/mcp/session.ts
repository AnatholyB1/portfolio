import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabasePublicKey, getSupabaseUrl } from '@/lib/supabase/env';

export type AdminCtx = { supabase: SupabaseClient; user: User };

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { ctx: AdminCtx; expires: number }>();
const inflight = new Map<string, Promise<AdminCtx>>();

/** Tests uniquement. */
export function __resetSessionCache(): void {
  cache.clear();
  inflight.clear();
}

async function createAdminContext(userId: string): Promise<AdminCtx> {
  const svc = createSupabaseAdminClient();
  // Le compte doit être admin au moment de l'appel (un token peut survivre à la révocation).
  const { data: admin } = await svc.from('sv_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (!admin) throw new Error('mcp_session_failed');

  const { data: u, error: uErr } = await svc.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (uErr || !u?.user || !email) throw new Error('mcp_session_failed');

  const { data: link, error: lErr } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const hashed = link?.properties?.hashed_token;
  if (lErr || !hashed) throw new Error('mcp_session_failed');

  const anon = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sess, error: vErr } = await anon.auth.verifyOtp({ token_hash: hashed, type: 'magiclink' });
  const accessToken = sess?.session?.access_token;
  if (vErr || !accessToken || sess.session?.user?.id !== userId) throw new Error('mcp_session_failed');

  const supabase = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return { supabase, user: u.user };
}

// Une session auth par requête serait coûteuse : dédoublonnage des appels concurrents
// et cache mémoire de 10 min par admin. Les échecs ne sont jamais mis en cache.
export function buildAdminContext(userId: string): Promise<AdminCtx> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.ctx);
  const pending = inflight.get(userId);
  if (pending) return pending;
  const p = createAdminContext(userId)
    .then((ctx) => {
      cache.set(userId, { ctx, expires: Date.now() + CACHE_TTL_MS });
      return ctx;
    })
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}
