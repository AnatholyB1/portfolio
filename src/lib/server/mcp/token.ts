import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export function generateToken(): string {
  return `svmcp_${randomBytes(32).toString('base64url')}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isUsable(
  row: { revoked_at: string | null; expires_at: string },
  now: Date = new Date(),
): boolean {
  return row.revoked_at === null && new Date(row.expires_at).getTime() > now.getTime();
}

export type McpPrincipal = { tokenId: string; userId: string };

// Résout « Authorization: Bearer svmcp_… » en admin. Fail-closed : tout échec = null.
export async function resolveToken(authorization: string | null): Promise<McpPrincipal | null> {
  const m = /^Bearer (svmcp_[A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (!m) return null;
  const svc = createSupabaseAdminClient();
  const { data: row } = await svc
    .from('sv_mcp_tokens')
    .select('id, user_id, revoked_at, expires_at')
    .eq('token_hash', hashToken(m[1]))
    .maybeSingle();
  if (!row || !isUsable(row)) return null;
  // Le compte doit être toujours admin au moment de l'appel.
  const { data: admin } = await svc
    .from('sv_admins')
    .select('user_id')
    .eq('user_id', row.user_id)
    .maybeSingle();
  if (!admin) return null;
  await svc.from('sv_mcp_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
  return { tokenId: row.id, userId: row.user_id };
}
