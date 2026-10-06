import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { resendWebhookSecret, toApplyArgs, verifyResendEvent } from '@/lib/server/resend/webhook';
import { callRpc } from '@/lib/server/rpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook Resend signé (Svix) : rebonds permanents et plaintes -> liste de suppression (MAIL-04).
// Corps brut obligatoire pour la signature. Réponses et logs : chaînes fixes uniquement.

type Applied = { outcome?: string; outbox_ids?: unknown };

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

export async function POST(request: Request): Promise<Response> {
  const secret = resendWebhookSecret();
  if (!secret) return text('not_configured', 500);

  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return text('missing signature', 400);

  const raw = await request.text();
  const event = verifyResendEvent(raw, { id, timestamp, signature }, secret);
  if (!event) return text('invalid signature', 400);

  const args = toApplyArgs(id, event);
  if (!args) return text('ignored', 200);

  const rpc = await callRpc<Applied>('resend/webhook', 'sv_apply_resend_event', {
    ...args,
    p_admin_email: ADMIN_NOTIFY_EMAIL,
  });
  if (!rpc.ok) return text('retry', 500);

  const raws = (rpc.data ?? {}).outbox_ids;
  const ids = Array.isArray(raws) ? raws.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length > 0) {
    try {
      await Promise.all(ids.map((x) => sendOutboxRow(x)));
    } catch {
      console.error('[resend/webhook] mail_failed');
    }
  }
  return text('ok', 200);
}
