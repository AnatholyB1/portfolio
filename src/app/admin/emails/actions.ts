'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth/dal';
import { callRpc } from '@/lib/server/rpc';

export type LiftState = { ok: boolean; message: string | null };

const REASON_MSG = 'Indiquez un motif (3 à 300 caractères).';
const GENERIC_MSG = 'La réactivation a échoué. Réessayez dans un instant.';

const schema = z.object({
  id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function liftSuppressionAction(
  _prev: LiftState,
  formData: FormData,
): Promise<LiftState> {
  const { user } = await requireAdmin();

  const rawId = str(formData, 'suppressionId').trim();
  if (!/^\d{1,15}$/.test(rawId)) return { ok: false, message: GENERIC_MSG };

  const parsed = schema.safeParse({ id: rawId, reason: str(formData, 'reason') });
  if (!parsed.success) return { ok: false, message: REASON_MSG };

  const res = await callRpc<{ outcome?: string }>('admin/emails', 'sv_lift_suppression', {
    p_suppression_id: parsed.data.id,
    p_reason: parsed.data.reason,
    p_actor_id: user.id,
  });
  if (!res.ok) return { ok: false, message: GENERIC_MSG };

  const outcome = res.data?.outcome;
  if (outcome === 'lifted') {
    revalidatePath('/admin/emails');
    return { ok: true, message: 'Adresse réactivée.' };
  }
  if (outcome === 'already_lifted') {
    revalidatePath('/admin/emails');
    return { ok: true, message: 'Adresse déjà réactivée.' };
  }
  return { ok: false, message: GENERIC_MSG };
}
