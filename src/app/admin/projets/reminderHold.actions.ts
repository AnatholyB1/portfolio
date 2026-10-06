'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth/dal';
import { callRpc } from '@/lib/server/rpc';

export type HoldActionState = { ok: boolean; message: string | null };

const GENERIC_MSG = 'Le changement a échoué. Réessayez dans un instant.';

const schema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(['suspend', 'resume']),
});

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function setReminderHoldAction(
  _prev: HoldActionState,
  formData: FormData,
): Promise<HoldActionState> {
  const { user } = await requireAdmin();

  const parsed = schema.safeParse({
    projectId: str(formData, 'projectId'),
    action: str(formData, 'action'),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_MSG };

  const res = await callRpc<{ outcome?: string }>('admin/projets', 'sv_set_reminder_hold', {
    p_project_id: parsed.data.projectId,
    p_action: parsed.data.action,
    p_actor_id: user.id,
  });
  if (!res.ok) return { ok: false, message: GENERIC_MSG };

  const outcome = res.data?.outcome;
  if (outcome === 'suspended' || outcome === 'resumed' || outcome === 'unchanged') {
    revalidatePath(`/admin/projets/${parsed.data.projectId}`);
    return {
      ok: true,
      message:
        outcome === 'suspended'
          ? 'Relances suspendues.'
          : outcome === 'resumed'
            ? 'Relances reprises.'
            : 'Aucun changement.',
    };
  }
  return { ok: false, message: GENERIC_MSG };
}
