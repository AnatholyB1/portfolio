import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabasePublicKey, getSupabaseUrl } from '@/lib/supabase/env';

export type AdminCtx = { supabase: SupabaseClient; user: User };

export async function buildAdminContext(userId: string): Promise<AdminCtx> {
  const svc = createSupabaseAdminClient();
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
  if (vErr || !accessToken) throw new Error('mcp_session_failed');

  const supabase = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return { supabase, user: u.user };
}
