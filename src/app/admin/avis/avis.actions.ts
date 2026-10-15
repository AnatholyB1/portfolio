'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { hideReviewCore, unhideReviewCore } from '@/lib/server/admin/core/reviews';

export type ModerationState = { ok: boolean; message: string | null };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function hideReviewAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const ctx = await requireAdmin();

  const res = await hideReviewCore(ctx, {
    reviewId: str(formData, 'reviewId'),
    reason: str(formData, 'reason'),
    detail: str(formData, 'detail'),
  });
  if (res.ok) revalidatePath('/admin/avis');
  return { ok: res.ok, message: res.message };
}

export async function unhideReviewAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const ctx = await requireAdmin();

  const res = await unhideReviewCore(ctx, {
    reviewId: str(formData, 'reviewId'),
    detail: str(formData, 'detail'),
  });
  if (res.ok) revalidatePath('/admin/avis');
  return { ok: res.ok, message: res.message };
}
