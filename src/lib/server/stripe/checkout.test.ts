import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  create: vi.fn(),
  expire: vi.fn(),
  getStripe: vi.fn(),
  callRpc: vi.fn(),
  tables: {} as Record<string, { data: unknown; error?: unknown }>,
  adminTables: {} as Record<string, { data: unknown; error?: unknown }>,
}));

function builder(source: Record<string, { data: unknown; error?: unknown }>, table: string) {
  const res = () => ({ data: source[table]?.data ?? null, error: source[table]?.error ?? null });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'order', 'limit']) b[m] = () => b;
  b.maybeSingle = () => Promise.resolve(res());
  b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(res()).then(ok, ko);
  return b;
}

vi.mock('./client', () => ({
  getStripe: (...a: unknown[]) => h.getStripe(...a),
  stripeModeForClient: (isTest: boolean) => (isTest ? 'test' : 'live'),
}));
vi.mock('./customers', () => ({ getOrCreateStripeCustomer: async () => 'cus_1' }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: (t: string) => builder(h.adminTables, t) }),
}));
vi.mock('@/lib/supabase/env', () => ({ getSiteUrl: () => 'https://site.test' }));

import { createCheckoutForInvoice } from './checkout';

const INV = '123e4567-e89b-42d3-a456-426614174000';
const rls = { from: (t: string) => builder(h.tables, t) } as never;

function invoice(over: Record<string, unknown> = {}) {
  return {
    id: INV,
    project_id: 'p1',
    client_id: 'c1',
    kind: 'final',
    number: 'FA-2026-0001',
    is_test: false,
    net_to_pay_cents: 50000,
    total_incl_tax_cents: 50000,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.tables = {
    sv_invoices: { data: invoice() },
    sv_invoice_payment_events: { data: [] },
  };
  h.adminTables = { sv_checkout_sessions: { data: [] } };
  h.create.mockResolvedValue({ id: 'cs_1', url: 'https://pay.test/cs_1', expires_at: Math.floor(Date.now() / 1000) + 82800 });
  h.expire.mockResolvedValue({});
  h.getStripe.mockReturnValue({ checkout: { sessions: { create: h.create, expire: h.expire } } });
  h.callRpc.mockResolvedValue({ ok: true, data: {} });
});

// Le mock RLS renvoie la même ligne pour la requête d'avoirs : on la rend vide via un tableau.
function withNotes(notes: unknown[]) {
  const base = h.tables.sv_invoices.data;
  let call = 0;
  return {
    from: (t: string) => {
      if (t === 'sv_invoices') {
        call += 1;
        return builder({ sv_invoices: { data: call === 1 ? base : notes } }, 'sv_invoices');
      }
      return builder(h.tables, t);
    },
  } as never;
}

describe('createCheckoutForInvoice', () => {
  it('creates a hosted session with DB amounts only', async () => {
    const r = await createCheckoutForInvoice(withNotes([]), INV);
    expect(r).toEqual({ ok: true, url: 'https://pay.test/cs_1' });
    const [params, opts] = h.create.mock.calls[0];
    expect(params.mode).toBe('payment');
    expect(params.customer).toBe('cus_1');
    expect(params.allowed_payment_method_types).toEqual(['card', 'customer_balance']);
    expect(params.payment_method_options.customer_balance).toEqual({
      funding_type: 'bank_transfer',
      bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'FR' } },
    });
    expect(params.line_items[0].price_data.currency).toBe('eur');
    expect(params.line_items[0].price_data.unit_amount).toBe(50000);
    expect(params.metadata).toEqual({ invoice_id: INV, project_id: 'p1' });
    expect(params.payment_intent_data.metadata).toEqual({ invoice_id: INV, project_id: 'p1' });
    expect(params.locale).toBe('fr');
    expect(params.expires_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 24 * 3600);
    expect(params.success_url).toBe(`https://site.test/espace-client/paiements?facture=${INV}&retour=succes`);
    expect(params.cancel_url).toBe(`https://site.test/espace-client/paiements?facture=${INV}&retour=annule`);
    expect('receipt_email' in params).toBe(false);
    expect(opts.idempotencyKey.startsWith(`checkout:${INV}:`)).toBe(true);
    expect(h.callRpc).toHaveBeenCalledWith(
      'stripe/checkout',
      'sv_record_checkout_session',
      expect.objectContaining({ p_invoice_id: INV, p_session_id: 'cs_1', p_amount_cents: 50000, p_livemode: true }),
    );
  });

  it('subtracts partial credits from the amount', async () => {
    await createCheckoutForInvoice(withNotes([{ total_incl_tax_cents: 10000 }]), INV);
    expect(h.create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(40000);
  });

  it('not visible through RLS -> not_found, Stripe untouched', async () => {
    h.tables.sv_invoices = { data: null };
    expect(await createCheckoutForInvoice(rls, INV)).toEqual({ ok: false, code: 'not_found' });
    expect(h.getStripe).not.toHaveBeenCalled();
  });

  it('paid, processing, credited or credit note -> not_payable', async () => {
    const t = '2026-10-01T00:00:00Z';
    for (const kind of ['paid', 'processing']) {
      h.tables.sv_invoice_payment_events = { data: [{ kind, occurred_at: t, amount_cents: 1 }] };
      expect(await createCheckoutForInvoice(withNotes([]), INV)).toEqual({ ok: false, code: 'not_payable' });
    }
    h.tables.sv_invoice_payment_events = { data: [] };
    expect(await createCheckoutForInvoice(withNotes([{ total_incl_tax_cents: 50000 }]), INV)).toEqual({
      ok: false,
      code: 'not_payable',
    });
    h.tables.sv_invoices = { data: invoice({ kind: 'credit_note' }) };
    expect(await createCheckoutForInvoice(withNotes([]), INV)).toEqual({ ok: false, code: 'not_payable' });
    expect(h.getStripe).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });

  it('reuses an open recorded session', async () => {
    h.adminTables.sv_checkout_sessions = { data: [{ url: 'https://pay.test/old', amount_cents: 50000 }] };
    expect(await createCheckoutForInvoice(withNotes([]), INV)).toEqual({ ok: true, url: 'https://pay.test/old' });
    expect(h.create).not.toHaveBeenCalled();
  });

  it('in-progress RPC error expires the new session', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'sv_client_payment_in_progress' });
    expect(await createCheckoutForInvoice(withNotes([]), INV)).toEqual({ ok: false, code: 'in_progress' });
    expect(h.expire).toHaveBeenCalledWith('cs_1');
  });

  it('other RPC failure expires and returns error', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'sv_checkout_amount_mismatch' });
    expect(await createCheckoutForInvoice(withNotes([]), INV)).toEqual({ ok: false, code: 'error' });
    expect(h.expire).toHaveBeenCalledWith('cs_1');
  });

  it('is_test client uses the test mode', async () => {
    h.tables.sv_invoices = { data: invoice({ is_test: true }) };
    await createCheckoutForInvoice(withNotes([]), INV);
    expect(h.getStripe).toHaveBeenCalledWith('test');
  });
});
