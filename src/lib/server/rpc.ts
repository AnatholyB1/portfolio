import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type RpcResult<T = unknown> = { ok: true; data: T } | { ok: false; code: string };

/** service_role RPC wrapper: returns sv_* error codes only, never PII in logs. */
export async function callRpc<T = unknown>(
  scope: string,
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc(fn, args);
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : '';
      const code = msg.startsWith('sv_') ? msg.split(/[\s:]/)[0] : 'unknown';
      console.error(`[${scope}] ${fn} ${code}`);
      return { ok: false, code };
    }
    return { ok: true, data: data as T };
  } catch {
    console.error(`[${scope}] ${fn} threw`);
    return { ok: false, code: 'unknown' };
  }
}
