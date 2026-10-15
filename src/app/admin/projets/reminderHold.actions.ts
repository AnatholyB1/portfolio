'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { setReminderHoldCore } from '@/lib/server/admin/core/projects';

export type HoldActionState = { ok: boolean; message: string | null };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function setReminderHoldAction(
  _prev: HoldActionState,
  formData: FormData,
): Promise<HoldActionState> {
  const ctx = await requireAdmin();

  const projectId = str(formData, 'projectId');
  const res = await setReminderHoldCore(ctx, { projectId, action: str(formData, 'action') });
  if (res.ok) revalidatePath(`/admin/projets/${projectId}`);
  return { ok: res.ok, message: res.message };
}
