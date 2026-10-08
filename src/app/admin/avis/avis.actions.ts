'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth/dal';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';

export type ModerationState = { ok: boolean; message: string | null };

const ERROR_MSG = 'Action impossible. Vérifiez le motif et le détail puis réessayez.';
const UNCHANGED_MSG = "Aucun changement : l'avis est déjà dans cet état.";

// D-06 : liste fermée des motifs légaux, aucun motif lié à la note ou à l'opinion.
const hideSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum([
    'defamation_or_insult',
    'third_party_personal_data',
    'illegal_content',
    'inauthentic',
  ]),
  detail: z.string().trim().min(3).max(500),
});

const unhideSchema = z.object({
  reviewId: z.string().uuid(),
  detail: z.string().trim().min(3).max(500),
});

type ModerateResult = { outcome?: string; outbox_ids?: unknown };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

async function sendNotices(raw: unknown): Promise<void> {
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length === 0) return;
  try {
    await Promise.all(ids.map((id) => sendOutboxRow(id)));
  } catch {
    console.error('[admin/avis] mail_failed');
  }
}

export async function hideReviewAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const { user } = await requireAdmin();

  const parsed = hideSchema.safeParse({
    reviewId: str(formData, 'reviewId'),
    reason: str(formData, 'reason'),
    detail: str(formData, 'detail'),
  });
  if (!parsed.success) return { ok: false, message: ERROR_MSG };

  const res = await callRpc<ModerateResult>('admin/avis', 'sv_moderate_review', {
    p_review_id: parsed.data.reviewId,
    p_action: 'hide',
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail,
    p_actor_id: user.id,
  });
  if (!res.ok) return { ok: false, message: ERROR_MSG };

  const outcome = res.data?.outcome;
  if (outcome === 'hidden') {
    await sendNotices(res.data?.outbox_ids);
    revalidatePath('/admin/avis');
    return { ok: true, message: 'Avis masqué. Son auteur est prévenu par e-mail.' };
  }
  if (outcome === 'unchanged') return { ok: false, message: UNCHANGED_MSG };
  return { ok: false, message: ERROR_MSG };
}

export async function unhideReviewAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const { user } = await requireAdmin();

  const parsed = unhideSchema.safeParse({
    reviewId: str(formData, 'reviewId'),
    detail: str(formData, 'detail'),
  });
  if (!parsed.success) return { ok: false, message: ERROR_MSG };

  const res = await callRpc<ModerateResult>('admin/avis', 'sv_moderate_review', {
    p_review_id: parsed.data.reviewId,
    p_action: 'unhide',
    p_reason: null,
    p_detail: parsed.data.detail,
    p_actor_id: user.id,
  });
  if (!res.ok) return { ok: false, message: ERROR_MSG };

  const outcome = res.data?.outcome;
  if (outcome === 'unhidden') {
    await sendNotices(res.data?.outbox_ids);
    revalidatePath('/admin/avis');
    return { ok: true, message: 'Masquage levé.' };
  }
  if (outcome === 'unchanged') return { ok: false, message: UNCHANGED_MSG };
  return { ok: false, message: ERROR_MSG };
}
