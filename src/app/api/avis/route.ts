import { getClientIp } from '@/lib/leads/ipHash';
import { reviewSubmissionSchema } from '@/lib/reviews/schema';
import { hashReviewToken, isWellFormedReviewToken } from '@/lib/reviews/token';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { callRpc } from '@/lib/server/rpc';
import { hashKey, hitThrottle } from '@/lib/throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Soumission d'avis (D-05, D-09) : publication immédiate, jeton consommé ici uniquement.
// Aucune branche sur la note ou le contenu. Réponses et logs : chaînes fixes, jamais de jeton.

type Submitted = { outcome?: string; outbox_ids?: unknown };

const BASE_HEADERS = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: BASE_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request.headers);
  const allowed = await hitThrottle(hashKey('review-ip', ip ?? 'unknown'), 600, 10);
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid_payload', fields: [] }, 400);
  }
  if (!raw || typeof raw !== 'object') return json({ error: 'invalid_payload', fields: [] }, 400);

  const parsed = reviewSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = Array.from(
      new Set(parsed.error.issues.map((i) => i.message).filter((m) => typeof m === 'string')),
    );
    return json({ error: 'invalid_payload', fields }, 400);
  }
  const v = parsed.data;

  if (!isWellFormedReviewToken(v.token)) return json({ error: 'link_invalid' }, 410);

  const rpc = await callRpc<Submitted>('reviews/submit', 'sv_submit_review', {
    p_token_hash: hashReviewToken(v.token),
    p_rating: v.rating,
    p_title: v.title ?? null,
    p_body: v.body,
    p_display_mode: v.displayMode,
    p_first_name: v.firstName ?? null,
    p_last_initial: v.lastInitial ? v.lastInitial : null,
    p_consent: true,
    p_admin_email: ADMIN_NOTIFY_EMAIL,
  });
  if (!rpc.ok) return json({ error: 'retry' }, 500);

  const data = rpc.data ?? {};
  if (data.outcome !== 'published') return json({ error: 'link_invalid' }, 410);

  const ids = Array.isArray(data.outbox_ids)
    ? data.outbox_ids.filter((x): x is string => typeof x === 'string')
    : [];
  if (ids.length > 0) {
    try {
      await Promise.all(ids.map((x) => sendOutboxRow(x)));
    } catch {
      console.error('[reviews/submit] mail_failed');
    }
  }
  return json({ ok: true }, 200);
}
