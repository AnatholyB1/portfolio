import 'server-only';
import { callRpc } from '@/lib/server/rpc';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripe, type StripeMode } from './client';

// Effets Stripe d'un avoir (D-14, Pitfall 6). Montants lus en base, jamais en paramètre.
// Ne lève jamais vers l'appelant ; logs en chaînes fixes.

export async function requestRefundForCreditNote(
  creditNoteId: string,
): Promise<{ ok: true } | { ok: false; code: 'not_eligible' | 'error' }> {
  try {
    const admin = createSupabaseAdminClient();
    const cn = await admin
      .from('sv_invoices')
      .select('id, kind, refund_requested, credits_invoice_id, total_incl_tax_cents')
      .eq('id', creditNoteId)
      .maybeSingle();
    const note = cn.data as {
      kind: string;
      refund_requested: boolean;
      credits_invoice_id: string | null;
      total_incl_tax_cents: number | string;
    } | null;
    if (cn.error || !note || note.kind !== 'credit_note' || note.refund_requested !== true || !note.credits_invoice_id) {
      return { ok: false, code: 'not_eligible' };
    }
    const paid = await admin
      .from('sv_invoice_payment_events')
      .select('payment_intent_id, livemode')
      .eq('invoice_id', note.credits_invoice_id)
      .eq('kind', 'paid')
      .order('id', { ascending: true })
      .limit(1);
    const row = ((paid.data ?? []) as { payment_intent_id: string | null; livemode: boolean }[])[0];
    if (paid.error || !row || !row.payment_intent_id) return { ok: false, code: 'not_eligible' };

    const mode: StripeMode = row.livemode ? 'live' : 'test';
    const amount = Number(note.total_incl_tax_cents);
    const refund = await getStripe(mode).refunds.create(
      { payment_intent: row.payment_intent_id, amount },
      { idempotencyKey: 'refund:' + creditNoteId },
    );
    const rec = await callRpc('stripe/refund', 'sv_record_refund_request', {
      p_credit_note_id: creditNoteId,
      p_refund_id: refund.id,
      p_amount_cents: amount,
      p_payment_intent_id: row.payment_intent_id,
      p_livemode: row.livemode,
    });
    if (!rec.ok) return { ok: false, code: 'error' };
    return { ok: true };
  } catch {
    console.error('[stripe/refund] request_failed');
    return { ok: false, code: 'error' };
  }
}

export async function expireOpenPayments(invoiceId: string): Promise<{ expired: number; cancelled: number }> {
  let expired = 0;
  let cancelled = 0;
  try {
    const admin = createSupabaseAdminClient();
    const sessions = await admin
      .from('sv_checkout_sessions')
      .select('id, livemode')
      .eq('invoice_id', invoiceId)
      .gt('expires_at', new Date().toISOString());
    for (const s of (sessions.data ?? []) as { id: string; livemode: boolean }[]) {
      try {
        await getStripe(s.livemode ? 'live' : 'test').checkout.sessions.expire(s.id);
        expired += 1;
      } catch {
        // déjà terminée ou expirée
      }
    }

    const ledger = await admin
      .from('sv_invoice_payment_events')
      .select('id, kind, payment_intent_id, livemode')
      .eq('invoice_id', invoiceId)
      .order('id', { ascending: true });
    const latest = new Map<string, { kind: string; livemode: boolean }>();
    for (const e of (ledger.data ?? []) as { kind: string; payment_intent_id: string | null; livemode: boolean }[]) {
      if (e.payment_intent_id) latest.set(e.payment_intent_id, { kind: e.kind, livemode: e.livemode });
    }
    for (const [pi, v] of latest) {
      if (v.kind !== 'processing') continue;
      try {
        await getStripe(v.livemode ? 'live' : 'test').paymentIntents.cancel(pi);
        cancelled += 1;
      } catch {
        console.error('[stripe/refund] cancel_failed');
      }
    }
  } catch {
    console.error('[stripe/refund] expire_failed');
  }
  return { expired, cancelled };
}
