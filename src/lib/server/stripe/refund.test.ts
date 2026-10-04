import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  sessionsExpire: vi.fn(),
  piCancel: vi.fn(),
  getStripe: vi.fn(),
  callRpc: vi.fn(),
  tables: {} as Record<string, { data: unknown; error?: unknown }>,
}));

function builder(table: string) {
  const res = () => ({ data: h.tables[table]?.data ?? null, error: h.tables[table]?.error ?? null });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'order', 'limit']) b[m] = () => b;
  b.maybeSingle = () => Promise.resolve(res());
  b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(res()).then(ok, ko);
  return b;
}

vi.mock('./client', () => ({ getStripe: (...a: unknown[]) => h.getStripe(...a) }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: (t: string) => builder(t) }) }));

import { expireOpenPayments, requestRefundForCreditNote } from './refund';

const CN = 'cn-1';

beforeEach(() => {
  vi.clearAllMocks();
  h.tables = {};
  h.refundsCreate.mockResolvedValue({ id: 're_1' });
  h.sessionsExpire.mockResolvedValue({});
  h.piCancel.mockResolvedValue({});
  h.getStripe.mockReturnValue({
    refunds: { create: h.refundsCreate },
    checkout: { sessions: { expire: h.sessionsExpire } },
    paymentIntents: { cancel: h.piCancel },
  });
  h.callRpc.mockResolvedValue({ ok: true, data: {} });
});

function eligible() {
  h.tables.sv_invoices = {
    data: { id: CN, kind: 'credit_note', refund_requested: true, credits_invoice_id: 'inv1', total_incl_tax_cents: 12000 },
  };
  h.tables.sv_invoice_payment_events = { data: [{ payment_intent_id: 'pi_1', livemode: false }] };
}

describe('requestRefundForCreditNote', () => {
  it('refund box unchecked -> not_eligible, Stripe untouched', async () => {
    eligible();
    h.tables.sv_invoices = {
      data: { id: CN, kind: 'credit_note', refund_requested: false, credits_invoice_id: 'inv1', total_incl_tax_cents: 1 },
    };
    expect(await requestRefundForCreditNote(CN)).toEqual({ ok: false, code: 'not_eligible' });
    expect(h.getStripe).not.toHaveBeenCalled();
  });

  it('origin without paid row -> not_eligible', async () => {
    eligible();
    h.tables.sv_invoice_payment_events = { data: [] };
    expect(await requestRefundForCreditNote(CN)).toEqual({ ok: false, code: 'not_eligible' });
    expect(h.refundsCreate).not.toHaveBeenCalled();
  });

  it('eligible: idempotent refund with DB amount then records it', async () => {
    eligible();
    expect(await requestRefundForCreditNote(CN)).toEqual({ ok: true });
    expect(h.getStripe).toHaveBeenCalledWith('test');
    expect(h.refundsCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', amount: 12000 },
      { idempotencyKey: 'refund:' + CN },
    );
    expect(h.callRpc).toHaveBeenCalledWith(
      'stripe/refund',
      'sv_record_refund_request',
      expect.objectContaining({ p_credit_note_id: CN, p_refund_id: 're_1', p_amount_cents: 12000, p_livemode: false }),
    );
  });

  it('RPC failure -> error', async () => {
    eligible();
    h.callRpc.mockResolvedValue({ ok: false, code: 'sv_refund_invalid' });
    expect(await requestRefundForCreditNote(CN)).toEqual({ ok: false, code: 'error' });
  });
});

describe('expireOpenPayments', () => {
  it('expires open sessions, tolerates Stripe errors, cancels processing intents', async () => {
    h.tables.sv_checkout_sessions = {
      data: [
        { id: 'cs_a', livemode: false },
        { id: 'cs_b', livemode: false },
      ],
    };
    h.sessionsExpire.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('already'));
    h.tables.sv_invoice_payment_events = {
      data: [
        { id: 1, kind: 'processing', payment_intent_id: 'pi_1', livemode: false },
        { id: 2, kind: 'processing', payment_intent_id: 'pi_2', livemode: false },
        { id: 3, kind: 'paid', payment_intent_id: 'pi_2', livemode: false },
      ],
    };
    expect(await expireOpenPayments('inv1')).toEqual({ expired: 1, cancelled: 1 });
    expect(h.piCancel).toHaveBeenCalledTimes(1);
    expect(h.piCancel).toHaveBeenCalledWith('pi_1');
  });
});
