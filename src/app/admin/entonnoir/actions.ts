'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { saveAcquisitionCostCore } from '@/lib/server/admin/core/costs';

export type CostActionState = { status: 'idle' | 'success' | 'error'; message?: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function saveCostAction(
  _prev: CostActionState,
  formData: FormData,
): Promise<CostActionState> {
  const ctx = await requireAdmin();
  const res = await saveAcquisitionCostCore(ctx, {
    source: str(formData, 'source'),
    campaign: str(formData, 'campaign'),
    month: str(formData, 'month'),
    amount: str(formData, 'amount'),
  });
  if (!res.ok) return { status: 'error', message: res.message };

  revalidatePath('/admin/entonnoir');
  return { status: 'success', message: res.message };
}
