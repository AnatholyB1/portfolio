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

export type TokenResolution =
  | { kind: 'ok'; principal: McpPrincipal }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };

// Résout « Authorization: Bearer svmcp_… » en admin (schéma insensible à la casse, jeton strict).
// Fail-closed : jeton inconnu/expiré/révoqué = invalid (401) ; erreur de base de données =
// unavailable (503), pour ne pas faire passer une panne pour un jeton refusé.
export async function resolveToken(authorization: string | null): Promise<TokenResolution> {
  const m = /^[Bb][Ee][Aa][Rr][Ee][Rr] (svmcp_[A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (!m) return { kind: 'invalid' };
  try {
    const svc = createSupabaseAdminClient();
    const { data: row, error: rowErr } = await svc
      .from('sv_mcp_tokens')
      .select('id, user_id, revoked_at, expires_at')
      .eq('token_hash', hashToken(m[1]))
      .maybeSingle();
    if (rowErr) return { kind: 'unavailable' };
    if (!row || !isUsable(row)) return { kind: 'invalid' };
    // Le compte doit être toujours admin au moment de l'appel.
    const { data: admin, error: adminErr } = await svc
      .from('sv_admins')
      .select('user_id')
      .eq('user_id', row.user_id)
      .maybeSingle();
    if (adminErr) return { kind: 'unavailable' };
    if (!admin) return { kind: 'invalid' };
    // Meilleur effort : un échec de last_used_at ne doit pas refuser un jeton valide.
    await svc.from('sv_mcp_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
    return { kind: 'ok', principal: { tokenId: row.id, userId: row.user_id } };
  } catch {
    return { kind: 'unavailable' };
  }
}
