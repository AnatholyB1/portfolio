import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabasePublicKey, getSupabaseUrl } from '@/lib/supabase/env';

export type AdminCtx = { supabase: SupabaseClient; user: User };

const CACHE_TTL_MS = 10 * 60_000;
const EXPIRY_MARGIN_MS = 60_000;
const cache = new Map<string, { ctx: AdminCtx; expires: number }>();
const inflight = new Map<string, Promise<AdminCtx>>();

// Durée de cache : 10 min au plus, et jamais au-delà de l'expiration du JWT moins 60 s.
// Durée inconnue ou <= 0 : pas de cache (fail-safe).
function cacheTtlMs(session: { expires_at?: number; expires_in?: number }): number {
  let remaining: number | null = null;
  if (typeof session.expires_at === 'number') remaining = session.expires_at * 1000 - Date.now();
  else if (typeof session.expires_in === 'number') remaining = session.expires_in * 1000;
  if (remaining === null) return 0;
  return Math.min(CACHE_TTL_MS, remaining - EXPIRY_MARGIN_MS);
}

/** Tests uniquement. */
export function __resetSessionCache(): void {
  cache.clear();
  inflight.clear();
}

async function createAdminContext(userId: string): Promise<{ ctx: AdminCtx; ttlMs: number }> {
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
  return { ctx: { supabase, user: u.user }, ttlMs: cacheTtlMs(sess.session ?? {}) };
}

// Une session auth par requête serait coûteuse : dédoublonnage des appels concurrents
// et cache mémoire (10 min max, borné par l'expiration de la session) par admin. Les échecs ne sont jamais mis en cache.
export function buildAdminContext(userId: string): Promise<AdminCtx> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.ctx);
  const pending = inflight.get(userId);
  if (pending) return pending;
  const p = createAdminContext(userId)
    .then(({ ctx, ttlMs }) => {
      if (ttlMs > 0) cache.set(userId, { ctx, expires: Date.now() + ttlMs });
      return ctx;
    })
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}
