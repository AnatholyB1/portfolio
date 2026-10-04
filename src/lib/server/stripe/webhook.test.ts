import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { LEDGER_KINDS, toApplyArgs, verifyStripeEvent } from './webhook';

const TEST_SECRET = 'whsec_test_aaaaaaaaaaaaaaaa';
const LIVE_SECRET = 'whsec_test_bbbbbbbbbbbbbbbb';
const secrets = [
  { mode: 'test' as const, secret: TEST_SECRET },
  { mode: 'live' as const, secret: LIVE_SECRET },
];
const INV = '123e4567-e89b-42d3-a456-426614174000';

function fixture(type: string, object: Record<string, unknown>, livemode = false) {
  return { id: 'evt_1', object: 'event', type, livemode, data: { object } };
}
function sign(payload: string, secret: string) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}
function ev(type: string, object: Record<string, unknown>) {
  return fixture(type, object) as unknown as Stripe.Event;
}

describe('verifyStripeEvent', () => {
  const payload = JSON.stringify(fixture('checkout.session.completed', { id: 'cs_1' }));

  it('vérifie avec le secret de test', () => {
    const r = verifyStripeEvent(payload, sign(payload, TEST_SECRET), secrets);
    expect(r?.mode).toBe('test');
    expect(r?.event.id).toBe('evt_1');
  });
  it('retourne null sans en-tête', () => {
    expect(verifyStripeEvent(payload, null, secrets)).toBeNull();
  });
  it('retourne null avec un autre secret', () => {
    expect(verifyStripeEvent(payload, sign(payload, 'whsec_other_cccccccc'), secrets)).toBeNull();
  });
  it('retourne null si le corps est modifié après signature', () => {
    const header = sign(payload, TEST_SECRET);
    expect(verifyStripeEvent(payload + ' ', header, secrets)).toBeNull();
  });
  it('rejette un événement live vérifié par le secret de test', () => {
    const live = JSON.stringify(fixture('checkout.session.completed', { id: 'cs_1' }, true));
    expect(verifyStripeEvent(live, sign(live, TEST_SECRET), [secrets[0]])).toBeNull();
  });
  it('accepte un événement live vérifié par le secret live', () => {
    const live = JSON.stringify(fixture('checkout.session.completed', { id: 'cs_1' }, true));
    expect(verifyStripeEvent(live, sign(live, LIVE_SECRET), secrets)?.mode).toBe('live');
  });
});

describe('toApplyArgs', () => {
  it('session payée -> paid', () => {
    const a = toApplyArgs(
      ev('checkout.session.completed', {
        id: 'cs_1', payment_status: 'paid', amount_total: 3000, currency: 'EUR',
        payment_intent: 'pi_1', customer: 'cus_1', metadata: { invoice_id: INV },
      }),
    );
    expect(a).toMatchObject({
      p_kind: 'paid', p_amount_cents: 3000, p_expected_cents: 3000, p_currency: 'eur',
      p_invoice_id: INV, p_payment_intent_id: 'pi_1', p_checkout_session_id: 'cs_1', p_customer_id: 'cus_1',
    });
  });
  it('session unpaid -> processing virement, jamais paid', () => {
    const a = toApplyArgs(
      ev('checkout.session.completed', { id: 'cs_1', payment_status: 'unpaid', amount_total: 3000 }),
    );
    expect(a?.p_kind).toBe('processing');
    expect(a?.p_method).toBe('bank_transfer');
  });
  it('no_payment_required -> null', () => {
    expect(
      toApplyArgs(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'no_payment_required' })),
    ).toBeNull();
  });
  it('async succeeded / failed / expired', () => {
    const o = { id: 'cs_1', amount_total: 500, payment_intent: 'pi_1' };
    expect(toApplyArgs(ev('checkout.session.async_payment_succeeded', o))).toMatchObject({
      p_kind: 'paid', p_method: 'bank_transfer',
    });
    expect(toApplyArgs(ev('checkout.session.async_payment_failed', o))?.p_kind).toBe('failed');
    expect(toApplyArgs(ev('checkout.session.expired', o))?.p_kind).toBe('expired');
  });
  it('partially_funded calcule le financé', () => {
    const a = toApplyArgs(
      ev('payment_intent.partially_funded', {
        id: 'pi_1', amount: 10000,
        next_action: { display_bank_transfer_instructions: { amount_remaining: 4000 } },
      }),
    );
    expect(a).toMatchObject({ p_kind: 'partially_funded', p_expected_cents: 10000, p_amount_cents: 6000, p_payment_intent_id: 'pi_1' });
  });
  it('charge.refunded et refund.failed', () => {
    expect(
      toApplyArgs(ev('charge.refunded', { id: 'ch_1', amount: 3000, amount_refunded: 1000, payment_intent: 'pi_1' })),
    ).toMatchObject({ p_kind: 'refunded', p_amount_cents: 1000, p_payment_intent_id: 'pi_1' });
    expect(
      toApplyArgs(ev('refund.failed', { id: 're_1', amount: 1000, payment_intent: 'pi_1' })),
    ).toMatchObject({ p_kind: 'refund_failed', p_refund_id: 're_1' });
  });
  it('cash_balance.funds_available -> anomaly', () => {
    const a = toApplyArgs(ev('cash_balance.funds_available', { object: 'cash_balance', customer: 'cus_9' }));
    expect(a).toMatchObject({ p_kind: 'anomaly', p_customer_id: 'cus_9', p_invoice_id: null });
  });
  it("n'accepte que des UUID pour invoice_id", () => {
    const a = toApplyArgs(
      ev('checkout.session.expired', { id: 'cs_1', metadata: { invoice_id: 'not-a-uuid' } }),
    );
    expect(a?.p_invoice_id).toBeNull();
  });
  it('montants non entiers -> null', () => {
    const a = toApplyArgs(
      ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', amount_total: 10.5 }),
    );
    expect(a?.p_amount_cents).toBeNull();
  });
  it('autre type -> null, et les kinds sont dans la liste fermée', () => {
    expect(toApplyArgs(ev('customer.created', { id: 'cus_1' }))).toBeNull();
    expect(LEDGER_KINDS).toHaveLength(9);
  });
});
