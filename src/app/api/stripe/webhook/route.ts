import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { afterFactPosted } from '@/lib/server/projects/facts';
import { callRpc } from '@/lib/server/rpc';
import { toApplyArgs, verifyStripeEvent } from '@/lib/server/stripe/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Seule entrée qui peut rendre une facture payée (PAY-02). Corps brut obligatoire pour la signature.
// Réponses et logs : chaînes fixes, aucune donnée d'évènement.

type Applied = {
  outcome?: string;
  project_id?: string | null;
  fact_id?: number | string | null;
  outbox_ids?: string[] | null;
};

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return text('missing signature', 400);
  const raw = await request.text();

  const verified = verifyStripeEvent(raw, signature);
  if (!verified) return text('invalid signature', 400);

  const args = toApplyArgs(verified.event);
  if (!args) return text('ignored', 200);

  const rpc = await callRpc<Applied>('stripe/webhook', 'sv_apply_stripe_event', {
    ...args,
    p_admin_email: ADMIN_NOTIFY_EMAIL,
  });
  if (!rpc.ok) return text('retry', 500);

  const data = rpc.data ?? {};
  if (data.outcome === 'ignored_unresolved') return text('ok', 200);

  const ids = Array.isArray(data.outbox_ids) ? data.outbox_ids.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length > 0) {
    try {
      await Promise.all(ids.map((id) => sendOutboxRow(id)));
    } catch {
      console.error('[stripe/webhook] mail_failed');
    }
  }
  if (data.fact_id !== null && data.fact_id !== undefined && data.project_id) {
    try {
      await afterFactPosted(data.project_id, Number(data.fact_id));
    } catch {
      console.error('[stripe/webhook] notify_failed');
    }
  }
  return text('ok', 200);
}
