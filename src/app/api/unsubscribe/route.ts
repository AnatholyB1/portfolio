import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { unsubscribeSecret, verifyUnsubscribeToken } from '@/lib/server/mail/unsubscribeToken';
import { callRpc } from '@/lib/server/rpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Désinscription marketing : POST one-click (RFC 8058) ou formulaire de confirmation (D-11).
// GET n'écrit jamais (les scanneurs de liens ne désinscrivent personne).
// Réponses et logs : chaînes fixes, jamais d'adresse ni de jeton.

type Recorded = { outcome?: string; outbox_ids?: unknown };

const BASE_HEADERS = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

function text(body: string, status: number, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain', ...BASE_HEADERS, ...extra },
  });
}

export async function GET(): Promise<Response> {
  return text('method not allowed', 405, { allow: 'POST' });
}

export async function POST(request: Request): Promise<Response> {
  const secret = unsubscribeSecret();
  if (!secret) return text('not_configured', 500);

  const url = new URL(request.url);
  const token = url.searchParams.get('t');
  const email = token ? verifyUnsubscribeToken(token, secret) : null;
  if (!email) return text('invalid', 400);

  let source: 'one_click' | 'link' = 'one_click';
  try {
    const form = await request.formData();
    if (form.get('source') === 'link') source = 'link';
  } catch {
    // corps vide ou non-formulaire : one-click
  }

  const rpc = await callRpc<Recorded>('mail/unsubscribe', 'sv_record_unsubscribe', {
    p_email: email,
    p_source: source,
    p_admin_email: ADMIN_NOTIFY_EMAIL,
  });
  if (!rpc.ok) return text('retry', 500);

  const raws = (rpc.data ?? {}).outbox_ids;
  const ids = Array.isArray(raws) ? raws.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length > 0) {
    try {
      await Promise.all(ids.map((x) => sendOutboxRow(x)));
    } catch {
      console.error('[mail/unsubscribe] mail_failed');
    }
  }

  if (source === 'link') {
    return new Response(null, {
      status: 303,
      headers: { location: new URL('/desinscription?ok=1', url.origin).toString(), ...BASE_HEADERS },
    });
  }
  return text('ok', 200);
}
