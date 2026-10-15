'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { liftSuppressionCore } from '@/lib/server/admin/core/emails';

export type LiftState = { ok: boolean; message: string | null };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function liftSuppressionAction(
  _prev: LiftState,
  formData: FormData,
): Promise<LiftState> {
  const ctx = await requireAdmin();

  const res = await liftSuppressionCore(ctx, {
    suppressionId: str(formData, 'suppressionId'),
    reason: str(formData, 'reason'),
  });
  if (res.ok) revalidatePath('/admin/emails');
  return { ok: res.ok, message: res.message };
}
