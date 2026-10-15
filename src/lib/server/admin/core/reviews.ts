import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { deriveReviewToken, hashReviewToken, reviewSecret } from '@/lib/reviews/token';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { buildReviewUrl } from '@/lib/server/mail/urls';
import { callRpc } from '@/lib/server/rpc';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { rec, str } from './shared';

const ERROR_MSG = 'Action impossible. Vérifiez le motif et le détail puis réessayez.';
const UNCHANGED_MSG = "Aucun changement : l'avis est déjà dans cet état.";
const REISSUE_GENERIC_MSG = 'La réémission a échoué. Réessayez dans un instant.';

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

const reissueSchema = z.object({
  projectId: z.string().uuid(),
  detail: z.string().trim().min(3).max(500),
});

type ModerateResult = { outcome?: string; outbox_ids?: unknown };

function fail(message: string): CoreResult {
  return { ok: false, message };
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

export async function hideReviewCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = hideSchema.safeParse({
    reviewId: str(i.reviewId),
    reason: str(i.reason),
    detail: str(i.detail),
  });
  if (!parsed.success) return fail(ERROR_MSG);

  const res = await callRpc<ModerateResult>('admin/avis', 'sv_moderate_review', {
    p_review_id: parsed.data.reviewId,
    p_action: 'hide',
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail,
    p_actor_id: ctx.user.id,
  });
  if (!res.ok) return fail(ERROR_MSG);

  const outcome = res.data?.outcome;
  if (outcome === 'hidden') {
    await sendNotices(res.data?.outbox_ids);
    return { ok: true, message: 'Avis masqué. Son auteur est prévenu par e-mail.' };
  }
  if (outcome === 'unchanged') return fail(UNCHANGED_MSG);
  return fail(ERROR_MSG);
}

export async function unhideReviewCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = unhideSchema.safeParse({
    reviewId: str(i.reviewId),
    detail: str(i.detail),
  });
  if (!parsed.success) return fail(ERROR_MSG);

  const res = await callRpc<ModerateResult>('admin/avis', 'sv_moderate_review', {
    p_review_id: parsed.data.reviewId,
    p_action: 'unhide',
    p_reason: null,
    p_detail: parsed.data.detail,
    p_actor_id: ctx.user.id,
  });
  if (!res.ok) return fail(ERROR_MSG);

  const outcome = res.data?.outcome;
  if (outcome === 'unhidden') {
    await sendNotices(res.data?.outbox_ids);
    return { ok: true, message: 'Masquage levé.' };
  }
  if (outcome === 'unchanged') return fail(UNCHANGED_MSG);
  return fail(ERROR_MSG);
}

// D-09 : réémission d'un lien d'avis. L'URL est renvoyée une seule fois à l'appelant,
// jamais stockée, jamais journalisée, jamais envoyée par e-mail.
export async function reissueReviewLinkCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ url: string }>> {
  const i = rec(input);
  const parsed = reissueSchema.safeParse({
    projectId: str(i.projectId),
    detail: str(i.detail),
  });
  if (!parsed.success) return fail(REISSUE_GENERIC_MSG);

  const secret = reviewSecret();
  if (!secret) {
    return fail("Réémission impossible : la configuration des liens d'avis est incomplète.");
  }

  const linkId = randomUUID();
  const token = deriveReviewToken(linkId, secret);

  const res = await callRpc<{ outcome?: string }>('admin/avis', 'sv_reissue_review_link', {
    p_project_id: parsed.data.projectId,
    p_link_id: linkId,
    p_token_hash: hashReviewToken(token),
    p_actor_id: ctx.user.id,
    p_detail: parsed.data.detail,
  });
  if (!res.ok) return fail(REISSUE_GENERIC_MSG);

  const outcome = res.data?.outcome;
  if (outcome === 'reissued') {
    return {
      ok: true,
      message: "Nouveau lien d'avis (affiché une seule fois)",
      data: { url: buildReviewUrl(token) },
    };
  }
  if (outcome === 'reviewed') return fail('Un avis a déjà été déposé pour ce projet.');
  if (outcome === 'not_signed') return fail("Le PV de ce projet n'est pas signé.");
  return fail(REISSUE_GENERIC_MSG);
}
