import 'server-only';
import { z } from 'zod';
import { callRpc } from '@/lib/server/rpc';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';

const REASON_MSG = 'Indiquez un motif (3 à 300 caractères).';
const GENERIC_MSG = 'La réactivation a échoué. Réessayez dans un instant.';

const schema = z.object({
  id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

function rec(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

function fail(message: string): CoreResult {
  return { ok: false, message };
}

// Réactivation d'une adresse de la liste de suppression (RPC service_role, tracée avec l'acteur).
export async function liftSuppressionCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const idRaw = typeof i.suppressionId === 'number' ? String(i.suppressionId) : i.suppressionId;
  const rawId = (typeof idRaw === 'string' ? idRaw : '').trim();
  if (!/^\d{1,15}$/.test(rawId)) return fail(GENERIC_MSG);

  const parsed = schema.safeParse({ id: rawId, reason: typeof i.reason === 'string' ? i.reason : '' });
  if (!parsed.success) return fail(REASON_MSG);

  const res = await callRpc<{ outcome?: string }>('admin/emails', 'sv_lift_suppression', {
    p_suppression_id: parsed.data.id,
    p_reason: parsed.data.reason,
    p_actor_id: ctx.user.id,
  });
  if (!res.ok) return fail(GENERIC_MSG);

  const outcome = res.data?.outcome;
  if (outcome === 'lifted') return { ok: true, message: 'Adresse réactivée.' };
  if (outcome === 'already_lifted') return { ok: true, message: 'Adresse déjà réactivée.' };
  return fail(GENERIC_MSG);
}
