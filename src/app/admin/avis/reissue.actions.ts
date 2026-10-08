'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { deriveReviewToken, hashReviewToken, reviewSecret } from '@/lib/reviews/token';
import { requireAdmin } from '@/lib/server/auth/dal';
import { buildReviewUrl } from '@/lib/server/mail/urls';
import { callRpc } from '@/lib/server/rpc';

// D-09 : réémission d'un lien d'avis. L'URL est renvoyée une seule fois à l'admin,
// jamais stockée, jamais journalisée, jamais envoyée par e-mail.
export type ReissueState = { ok: boolean; message: string | null; url: string | null };

const GENERIC_MSG = 'La réémission a échoué. Réessayez dans un instant.';

const schema = z.object({
  projectId: z.string().uuid(),
  detail: z.string().trim().min(3).max(500),
});

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

export async function reissueReviewLinkAction(
  _prev: ReissueState,
  formData: FormData,
): Promise<ReissueState> {
  const { user } = await requireAdmin();

  const parsed = schema.safeParse({
    projectId: str(formData, 'projectId'),
    detail: str(formData, 'detail'),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_MSG, url: null };

  const secret = reviewSecret();
  if (!secret) {
    return {
      ok: false,
      message: "Réémission impossible : la configuration des liens d'avis est incomplète.",
      url: null,
    };
  }

  const linkId = randomUUID();
  const token = deriveReviewToken(linkId, secret);

  const res = await callRpc<{ outcome?: string }>('admin/avis', 'sv_reissue_review_link', {
    p_project_id: parsed.data.projectId,
    p_link_id: linkId,
    p_token_hash: hashReviewToken(token),
    p_actor_id: user.id,
    p_detail: parsed.data.detail,
  });
  if (!res.ok) return { ok: false, message: GENERIC_MSG, url: null };

  const outcome = res.data?.outcome;
  if (outcome === 'reissued') {
    revalidatePath('/admin/avis');
    revalidatePath(`/admin/projets/${parsed.data.projectId}`);
    return {
      ok: true,
      message: "Nouveau lien d'avis (affiché une seule fois)",
      url: buildReviewUrl(token),
    };
  }
  if (outcome === 'reviewed') {
    return { ok: false, message: 'Un avis a déjà été déposé pour ce projet.', url: null };
  }
  if (outcome === 'not_signed') {
    return { ok: false, message: "Le PV de ce projet n'est pas signé.", url: null };
  }
  return { ok: false, message: GENERIC_MSG, url: null };
}
