'use server';

import { revalidatePath } from 'next/cache';
import { ADMIN_COPY } from '@/lib/admin/leadLabels';
import { costSchema } from '@/lib/admin/leadSchemas';
import { requireAdmin } from '@/lib/server/auth/dal';
import { upsertAcquisitionCost } from '@/lib/server/leads/admin';

export type CostActionState = { status: 'idle' | 'success' | 'error'; message?: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function saveCostAction(
  _prev: CostActionState,
  formData: FormData,
): Promise<CostActionState> {
  const { user } = await requireAdmin();
  const parsed = costSchema.safeParse({
    source: str(formData, 'source'),
    campaign: str(formData, 'campaign'),
    month: str(formData, 'month'),
    amount: str(formData, 'amount'),
  });
  if (!parsed.success) return { status: 'error', message: ADMIN_COPY.costInvalid };

  const { source, campaign, month, cents } = parsed.data;
  const res = await upsertAcquisitionCost(source, campaign, month, cents, user.id);
  if (!res.ok) return { status: 'error', message: ADMIN_COPY.genericError };

  revalidatePath('/admin/entonnoir');
  return {
    status: 'success',
    message: ADMIN_COPY.costSuccess(source, campaign, month.slice(0, 7)),
  };
}
