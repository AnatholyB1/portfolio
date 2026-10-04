import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deriveProjectState, type Fact } from '@/lib/projects/steps';
import {
  addMember,
  anonClient,
  applyTestEvent,
  cleanup,
  dbQuery,
  issueTestCreditNote,
  issueTestInvoice,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  reachAcceptanceSigned,
  reachContractSigned,
  recordTestSession,
  setClientTest,
  svc,
  type TestUser,
} from './helpers';

let clientA: { id: string };
let clientB: { id: string };
let clientT: { id: string };
let clientP: { id: string };
let clientR: { id: string };
let memberA: TestUser;
let memberA2: TestUser;
let memberB: TestUser;
let plain: TestUser;
let gecko: TestUser;
let admin: TestUser;

const CUSTOMER_A = `cus_test_${randomUUID().replace(/-/g, '')}`;
const evt = () => `evt_test_${randomUUID().replace(/-/g, '')}`;
const pi = () => `pi_test_${randomUUID().replace(/-/g, '')}`;

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

async function factRows(projectId: string, type?: string) {
  let q = svc().from('sv_project_facts').select('*').eq('project_id', projectId).order('id', { ascending: true });
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

async function ledger(filter: { invoiceId?: string; eventId?: string }) {
  let q = svc().from('sv_invoice_payment_events').select('*').order('id', { ascending: true });
  if (filter.invoiceId) q = q.eq('invoice_id', filter.invoiceId);
  if (filter.eventId) q = q.eq('stripe_event_id', filter.eventId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

async function mailsByKey(prefix: string) {
  const { data, error } = await svc().from('sv_mail_outbox').select('dedupe_key,status,template').like('dedupe_key', `${prefix}%`);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

/** Reminder rows of an invoice (client d3/d7 and admin d14). */
async function reminders(invoiceId: string) {
  const { data, error } = await svc()
    .from('sv_mail_outbox')
    .select('dedupe_key,status')
    .like('dedupe_key', `%${invoiceId}%`);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, any>[]).filter((r) => String(r.dedupe_key).startsWith('payment_reminder'));
}

async function countRows(table: string): Promise<number> {
  const { count, error } = await svc().from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function storedEvent(eventId: string) {
  const { data, error } = await svc().from('sv_stripe_events').select('*').eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

/** New project at contract_signed with a deposit invoice (and optionally a recorded test session). */
async function newDeposit(clientId: string, opts: { session?: boolean } = {}) {
  const projectId = await makeProject(clientId);
  await reachContractSigned(projectId);
  const inv = await issueTestInvoice(projectId, { kind: 'deposit' });
  const session = opts.session === false ? null : await recordTestSession(inv.invoice_id);
  return { projectId, inv, sessionId: session?.sessionId ?? null };
}

function lineOf(total: number) {
  return { designation: 'Prestation', quantity_milli: 1000, unit_code: 'C62', unit_price_cents: total, line_total_cents: total };
}

function toFacts(rows: Record<string, any>[]): Fact[] {
  return rows.map((r) => ({
    id: Number(r.id),
    type: r.type,
    targetFactId: r.target_fact_id === null ? null : Number(r.target_fact_id),
    actorKind: r.actor_kind,
    createdAt: r.created_at,
  }));
}

/** Assert one anomaly ledger row, no deposit fact, one deduped admin mail. */
async function expectAnomaly(eventId: string, detail: string, projectId: string | null, kind = 'anomaly') {
  const rows = await ledger({ eventId });
  expect(rows).toHaveLength(1);
  expect(rows[0].kind).toBe(kind);
  expect(rows[0].detail).toBe(detail);
  if (projectId) {
    expect(await factRows(projectId, 'deposit_received')).toHaveLength(0);
    expect(await factRows(projectId, 'balance_received')).toHaveLength(0);
  }
  const mails = await mailsByKey(`payment_anomaly_admin:${eventId}`);
  expect(mails).toHaveLength(1);
  expect(mails[0].template).toBe('payment_anomaly_admin');
  // replay stays deduped
  const again = await applyTestEvent({ eventId, type: 'x', kind: 'anomaly', invoiceId: null });
  expect(again.replay).toBe(true);
  expect(await mailsByKey(`payment_anomaly_admin:${eventId}`)).toHaveLength(1);
}

beforeAll(async () => {
  clientA = await makeClient('RLS Pay A');
  clientB = await makeClient('RLS Pay B');
  clientT = await makeClient('RLS Pay Test');
  clientP = await makeClient('RLS Pay Processing');
  clientR = await makeClient('RLS Pay Refund');
  await setClientTest(clientT.id, true);
  memberA = await makeUser('paya');
  memberA2 = await makeUser('paya2');
  memberB = await makeUser('payb');
  plain = await makeUser('payplain');
  gecko = await makeUser('paygecko');
  admin = await makeUser('payadmin');
  await addMember(clientA.id, memberA);
  await addMember(clientA.id, memberA2);
  await addMember(clientB.id, memberB);
  await makeGeckoAdmin(gecko);
  await makeAdmin(admin);
  const { error } = await svc()
    .from('sv_stripe_customers')
    .insert({ client_id: clientA.id, livemode: false, stripe_customer_id: CUSTOMER_A });
  if (error) throw new Error(`customer insert failed: ${error.message}`);
}, 240_000);

afterAll(async () => {
  // Payment mails must not starve sv_claim_due_mail in mailoutbox.rls.test.ts on the shared branch.
  const ids = [clientA, clientB, clientT, clientP, clientR].filter(Boolean).map((c) => c.id);
  if (ids.length > 0) {
    await svc().from('sv_mail_outbox').update({ status: 'skipped' }).in('client_id', ids).eq('status', 'pending');
  }
  await cleanup();
});

// ---------------------------------------------------------------------------
// Task 1: apply-event
// ---------------------------------------------------------------------------

describe('sv_apply_stripe_event: paid deposit, replay, crash retry', { timeout: 120_000 }, () => {
  let dep: Awaited<ReturnType<typeof newDeposit>>;
  const eventId = evt();

  it('deposit paid by card posts deposit_received, unlocks step 4, receipts and skips reminders', async () => {
    dep = await newDeposit(clientA.id);
    expect((await reminders(dep.inv.invoice_id)).some((r) => r.status === 'pending')).toBe(true);

    const res = await applyTestEvent({
      eventId,
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: dep.inv.invoice_id,
      checkoutSessionId: dep.sessionId,
      paymentIntentId: pi(),
      amountCents: 50000,
      currency: 'eur',
      method: 'card',
    });
    expect(res.replay).toBe(false);
    expect(res.outcome).toBe('paid');
    expect(res.fact_changed).toBe(true);

    const rows = await ledger({ invoiceId: dep.inv.invoice_id });
    expect(rows.filter((r) => r.kind === 'paid')).toHaveLength(1);

    const facts = await factRows(dep.projectId, 'deposit_received');
    expect(facts).toHaveLength(1);
    expect(facts[0].actor_kind).toBe('system');
    const note = await svc().from('sv_project_fact_notes').select('body').eq('fact_id', facts[0].id).single();
    expect(note.data?.body).toBe(`Paiement Stripe ${dep.inv.number}`);

    const state = deriveProjectState(toFacts(await factRows(dep.projectId)), '1970-01-01T00:00:00Z');
    expect(state.currentStep).toBe(4);

    expect(await mailsByKey(`payment_received:${dep.inv.invoice_id}:`)).toHaveLength(2);
    expect((await reminders(dep.inv.invoice_id)).filter((r) => r.status === 'pending')).toHaveLength(0);
  });

  it('replay of the same event id changes nothing', async () => {
    const res = await applyTestEvent({
      eventId,
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: dep.inv.invoice_id,
      checkoutSessionId: dep.sessionId,
      amountCents: 50000,
      method: 'card',
    });
    expect(res.replay).toBe(true);
    expect(res.fact_changed).toBe(false);
    expect((await ledger({ invoiceId: dep.inv.invoice_id })).filter((r) => r.kind === 'paid')).toHaveLength(1);
    expect(await factRows(dep.projectId, 'deposit_received')).toHaveLength(1);
    expect(await mailsByKey(`payment_received:${dep.inv.invoice_id}:`)).toHaveLength(2);
  });

  it('an event recorded but not processed is processed exactly once on retry; stored events are frozen', async () => {
    const d = await newDeposit(clientA.id);
    const id = evt();
    dbQuery(
      `insert into public.sv_stripe_events (event_id, type, livemode, object_id) values ('${id}', 'checkout.session.completed', false, '${d.sessionId}')`,
    );
    expect((await storedEvent(id))[0].processed_at).toBeNull();

    const res = await applyTestEvent({
      eventId: id,
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: d.inv.invoice_id,
      checkoutSessionId: d.sessionId,
      amountCents: 50000,
      method: 'card',
    });
    expect(res.replay).toBe(false);
    expect(await ledger({ eventId: id })).toHaveLength(1);
    expect((await storedEvent(id))[0].processed_at).not.toBeNull();

    const second = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id });
    expect(second.replay).toBe(true);
    expect(await ledger({ eventId: id })).toHaveLength(1);

    const upd = dbQuery(`update public.sv_stripe_events set processed_at = now() where event_id = '${id}'`);
    expect(upd).toContain('sv_stripe_event_immutable');
    const typ = dbQuery(`update public.sv_stripe_events set type = 'other' where event_id = '${id}'`);
    expect(typ).toContain('sv_stripe_event_immutable');
    expect((await storedEvent(id))[0].type).toBe('checkout.session.completed');
  });
});

describe('sv_apply_stripe_event: bank transfer, final and period', { timeout: 180_000 }, () => {
  it('processing unlocks nothing and skips reminders; async success posts the fact once', async () => {
    const d = await newDeposit(clientA.id);
    const sessionPi = pi();
    const processing = await applyTestEvent({
      type: 'checkout.session.completed',
      kind: 'processing',
      invoiceId: d.inv.invoice_id,
      checkoutSessionId: d.sessionId,
      paymentIntentId: sessionPi,
      amountCents: 50000,
      method: 'bank_transfer',
    });
    expect(processing.outcome).toBe('processing');
    expect(processing.fact_changed).toBe(false);
    expect(await factRows(d.projectId, 'deposit_received')).toHaveLength(0);
    expect((await reminders(d.inv.invoice_id)).filter((r) => r.status === 'pending')).toHaveLength(0);
    expect((await ledger({ invoiceId: d.inv.invoice_id })).map((r) => r.kind)).toEqual(['processing']);

    const paid = await applyTestEvent({
      type: 'checkout.session.async_payment_succeeded',
      kind: 'paid',
      invoiceId: d.inv.invoice_id,
      checkoutSessionId: d.sessionId,
      paymentIntentId: sessionPi,
      amountCents: 50000,
      method: 'bank_transfer',
    });
    expect(paid.outcome).toBe('paid');
    expect(paid.fact_changed).toBe(true);
    expect(await factRows(d.projectId, 'deposit_received')).toHaveLength(1);
    expect(await mailsByKey(`payment_received:${d.inv.invoice_id}:`)).toHaveLength(2);
  });

  it('a processing then failed payment posts no fact', async () => {
    const d = await newDeposit(clientA.id);
    await applyTestEvent({ type: 'checkout.session.completed', kind: 'processing', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, method: 'bank_transfer' });
    const failed = await applyTestEvent({ type: 'checkout.session.async_payment_failed', kind: 'failed', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, method: 'bank_transfer' });
    expect(failed.outcome).toBe('failed');
    expect(await factRows(d.projectId, 'deposit_received')).toHaveLength(0);
    expect((await ledger({ invoiceId: d.inv.invoice_id })).map((r) => r.kind)).toEqual(['processing', 'failed']);
  });

  it('a paid final invoice posts balance_received; a paid period invoice posts no fact but still sends the receipt', async () => {
    const projectId = await makeProject(clientA.id);
    await reachAcceptanceSigned(projectId);
    const dep = await issueTestInvoice(projectId, { kind: 'deposit' });
    const final = await issueTestInvoice(projectId, {
      kind: 'final',
      lines: [lineOf(150000)],
      deductions: [
        { label: 'Acompte', ref_invoice_id: dep.invoice_id, ref_number: dep.number, ref_date: dep.issued_on, amount_cents: 50000 },
      ],
    });
    const fs = await recordTestSession(final.invoice_id);
    const paid = await applyTestEvent({
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: final.invoice_id,
      checkoutSessionId: fs.sessionId,
      amountCents: 100000,
      method: 'card',
    });
    expect(paid.outcome).toBe('paid');
    const balance = await factRows(projectId, 'balance_received');
    expect(balance).toHaveLength(1);
    expect(balance[0].actor_kind).toBe('system');

    const period = await issueTestInvoice(projectId, { kind: 'period', lines: [lineOf(20000)] });
    const ps = await recordTestSession(period.invoice_id);
    const before = (await factRows(projectId)).length;
    const pp = await applyTestEvent({
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: period.invoice_id,
      checkoutSessionId: ps.sessionId,
      amountCents: 20000,
      method: 'card',
    });
    expect(pp.outcome).toBe('paid');
    expect(pp.fact_id).toBeNull();
    expect((await factRows(projectId)).length).toBe(before);
    expect(await mailsByKey(`payment_received:${period.invoice_id}:`)).toHaveLength(2);
  });
});

describe('sv_apply_stripe_event: anomalies', { timeout: 180_000 }, () => {
  it('amount_mismatch', async () => {
    const d = await newDeposit(clientA.id);
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 49999, method: 'card' });
    expect(r.outcome).toBe('anomaly/amount_mismatch');
    await expectAnomaly(id, 'amount_mismatch', d.projectId);
  });

  it('currency_mismatch', async () => {
    const d = await newDeposit(clientA.id);
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, currency: 'usd', method: 'card' });
    expect(r.outcome).toBe('anomaly/currency_mismatch');
    await expectAnomaly(id, 'currency_mismatch', d.projectId);
  });

  it('livemode_mismatch: a live event on a test client invoice whose session is test', async () => {
    const d = await newDeposit(clientT.id);
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, livemode: true, method: 'card' });
    expect(r.outcome).toBe('anomaly/livemode_mismatch');
    await expectAnomaly(id, 'livemode_mismatch', d.projectId);
  });

  it('unknown_invoice with a known customer keeps the client', async () => {
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: randomUUID(), customerId: CUSTOMER_A, amountCents: 50000, method: 'card' });
    expect(r.outcome).toBe('anomaly/unknown_invoice');
    const rows = await ledger({ eventId: id });
    expect(rows[0].client_id).toBe(clientA.id);
    expect(rows[0].invoice_id).toBeNull();
    await expectAnomaly(id, 'unknown_invoice', null);
  });

  it('credited_invoice: payment on a fully credited invoice', async () => {
    const d = await newDeposit(clientA.id);
    await issueTestCreditNote(d.inv.invoice_id, { scope: 'total', amountCents: 50000 });
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, method: 'card' });
    expect(r.outcome).toBe('anomaly/credited_invoice');
    await expectAnomaly(id, 'credited_invoice', d.projectId);
  });

  it('duplicate_payment: second paid event on a paid invoice', async () => {
    const d = await newDeposit(clientA.id);
    await applyTestEvent({ type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, method: 'card' });
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'checkout.session.completed', kind: 'paid', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 50000, method: 'card' });
    expect(r.outcome).toBe('anomaly/duplicate_payment');
    const rows = await ledger({ invoiceId: d.inv.invoice_id });
    expect(rows.filter((x) => x.kind === 'paid')).toHaveLength(1);
    expect(await factRows(d.projectId, 'deposit_received')).toHaveLength(1);
    const mails = await mailsByKey(`payment_anomaly_admin:${id}`);
    expect(mails).toHaveLength(1);
    const ev = (await ledger({ eventId: id }))[0];
    expect(ev.kind).toBe('anomaly');
    expect(ev.detail).toBe('duplicate_payment');
  });

  it('partially_funded', async () => {
    const d = await newDeposit(clientA.id);
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'payment_intent.partially_funded', kind: 'partially_funded', invoiceId: d.inv.invoice_id, checkoutSessionId: d.sessionId, amountCents: 20000, method: 'bank_transfer' });
    expect(r.outcome).toBe('partially_funded');
    await expectAnomaly(id, 'partially_funded', d.projectId, 'partially_funded');
  });

  it('unreconciled_funds: anomaly with only a customer id', async () => {
    const id = evt();
    const r = await applyTestEvent({ eventId: id, type: 'customer_cash_balance_transaction.created', kind: 'anomaly', customerId: CUSTOMER_A, amountCents: 12345 });
    expect(r.outcome).toBe('anomaly/unreconciled_funds');
    const rows = await ledger({ eventId: id });
    expect(rows[0].client_id).toBe(clientA.id);
    await expectAnomaly(id, 'unreconciled_funds', null);
  });
});

describe('sv_apply_stripe_event: unresolved events', { timeout: 120_000 }, () => {
  for (const kind of ['anomaly', 'paid']) {
    it(`kind ${kind} with no invoice and no known customer is ignored without error`, async () => {
      const id = evt();
      const facts0 = await countRows('sv_project_facts');
      const ledger0 = await countRows('sv_invoice_payment_events');
      const res = await applyTestEvent({
        eventId: id,
        type: 'payment_intent.succeeded',
        kind,
        invoiceId: null,
        customerId: kind === 'paid' ? `cus_test_${randomUUID().replace(/-/g, '')}` : null,
        amountCents: 777,
      });
      expect(res.outcome).toBe('ignored_unresolved');
      expect(res.replay).toBe(false);
      const stored = await storedEvent(id);
      expect(stored).toHaveLength(1);
      expect(stored[0].outcome).toBe('ignored_unresolved');
      expect(stored[0].processed_at).not.toBeNull();
      expect(await ledger({ eventId: id })).toHaveLength(0);
      expect(await mailsByKey(`payment_anomaly_admin:${id}`)).toHaveLength(0);
      expect(await countRows('sv_project_facts')).toBe(facts0);
      expect(await countRows('sv_invoice_payment_events')).toBe(ledger0);
      const again = await applyTestEvent({ eventId: id, type: 'payment_intent.succeeded', kind, invoiceId: null });
      expect(again.replay).toBe(true);
    });
  }
});
