// PRECONDITION: caller is an authenticated client whose RLS client is passed; amounts are never accepted from callers (D-05)
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { amountDueCents, invoiceStatus, isPayable, type LedgerEvent } from '@/lib/documents/invoiceStatus';
import { callRpc } from '@/lib/server/rpc';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/supabase/env';
import { getStripe, stripeModeForClient } from './client';
import { getOrCreateStripeCustomer } from './customers';

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: 'not_found' | 'not_payable' | 'in_progress' | 'error' };

const REUSE_MARGIN_MS = 10 * 60 * 1000;
const WINDOW_MS = 30 * 60 * 1000;

export async function createCheckoutForInvoice(rls: SupabaseClient, invoiceId: string): Promise<CheckoutResult> {
  try {
    const inv = await rls
      .from('sv_invoices')
      .select('id, project_id, client_id, kind, number, is_test, net_to_pay_cents, total_incl_tax_cents')
      .eq('id', invoiceId)
      .maybeSingle();
    if (inv.error || !inv.data) return { ok: false, code: 'not_found' };
    const row = inv.data as {
      id: string;
      project_id: string;
      client_id: string;
      kind: string;
      number: string;
      is_test: boolean;
      net_to_pay_cents: number | string;
      total_incl_tax_cents: number | string;
    };
    if (row.kind === 'credit_note') return { ok: false, code: 'not_payable' };

    const ledger = await rls
      .from('sv_invoice_payment_events')
      .select('kind, occurred_at, amount_cents')
      .eq('invoice_id', invoiceId);
    const notes = await rls.from('sv_invoices').select('total_incl_tax_cents').eq('credits_invoice_id', invoiceId);
    if (ledger.error || notes.error) return { ok: false, code: 'error' };

    const events: LedgerEvent[] = (
      (ledger.data ?? []) as { kind: LedgerEvent['kind']; occurred_at: string; amount_cents: number | string | null }[]
    ).map((e) => ({
      kind: e.kind,
      occurredAt: e.occurred_at,
      amountCents: e.amount_cents === null ? null : Number(e.amount_cents),
    }));
    const credited = ((notes.data ?? []) as { total_incl_tax_cents: number | string }[]).reduce(
      (s, n) => s + Number(n.total_incl_tax_cents),
      0,
    );
    const { status } = invoiceStatus({
      totalInclTaxCents: Number(row.total_incl_tax_cents),
      creditedCents: credited,
      events,
    });
    const amount = amountDueCents(Number(row.net_to_pay_cents), credited);
    if (!isPayable(status) || amount <= 0) return { ok: false, code: 'not_payable' };

    const mode = stripeModeForClient(row.is_test);
    const livemode = mode === 'live';
    const admin = createSupabaseAdminClient();
    const now = Date.now();

    const reuse = await admin
      .from('sv_checkout_sessions')
      .select('url, amount_cents, expires_at')
      .eq('invoice_id', invoiceId)
      .eq('livemode', livemode)
      .eq('amount_cents', amount)
      .gt('expires_at', new Date(now + REUSE_MARGIN_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    const hit = ((reuse.data ?? []) as { url: string | null }[])[0];
    if (!reuse.error && hit?.url) return { ok: true, url: hit.url };

    const customer = await getOrCreateStripeCustomer(row.client_id, mode);
    const stripe = getStripe(mode);
    const base = `${getSiteUrl()}/espace-client/paiements?facture=${row.id}`;
    const metadata = { invoice_id: row.id, project_id: row.project_id };
    const description = `Facture ${row.number}`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer,
        locale: 'fr',
        allowed_payment_method_types: ['card', 'customer_balance'],
        payment_method_options: {
          customer_balance: {
            funding_type: 'bank_transfer',
            bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'FR' } },
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: { currency: 'eur', unit_amount: amount, product_data: { name: description } },
          },
        ],
        metadata,
        payment_intent_data: { metadata, description },
        expires_at: Math.floor(now / 1000) + 23 * 3600,
        success_url: `${base}&retour=succes`,
        cancel_url: `${base}&retour=annule`,
      },
      { idempotencyKey: `checkout:${row.id}:${Math.floor(now / WINDOW_MS)}` },
    );

    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
    const rec = await callRpc('stripe/checkout', 'sv_record_checkout_session', {
      p_invoice_id: row.id,
      p_session_id: session.id,
      p_livemode: livemode,
      p_url: session.url,
      p_amount_cents: amount,
      p_expires_at: expiresAt,
    });
    if (!rec.ok || !session.url) {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        console.error('[stripe/checkout] expire_failed');
      }
      return { ok: false, code: !rec.ok && rec.code === 'sv_client_payment_in_progress' ? 'in_progress' : 'error' };
    }
    return { ok: true, url: session.url };
  } catch {
    console.error('[stripe/checkout] create_failed');
    return { ok: false, code: 'error' };
  }
}
