'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { reissueReviewLinkCore } from '@/lib/server/admin/core/reviews';

// D-09 : réémission d'un lien d'avis. L'URL est renvoyée une seule fois à l'admin,
// jamais stockée, jamais journalisée, jamais envoyée par e-mail.
export type ReissueState = { ok: boolean; message: string | null; url: string | null };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function reissueReviewLinkAction(
  _prev: ReissueState,
  formData: FormData,
): Promise<ReissueState> {
  const ctx = await requireAdmin();

  const projectId = str(formData, 'projectId');
  const res = await reissueReviewLinkCore(ctx, { projectId, detail: str(formData, 'detail') });
  if (!res.ok || !res.data) return { ok: false, message: res.message, url: null };

  revalidatePath('/admin/avis');
  revalidatePath(`/admin/projets/${projectId}`);
  return { ok: true, message: res.message, url: res.data.url };
}
