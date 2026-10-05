import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const loadInvoicesForProjects = vi.fn();
vi.mock('./read', async () => {
  const actual = await vi.importActual<typeof import('./read')>('./read');
  return { ...actual, loadInvoicesForProjects: (...a: unknown[]) => loadInvoicesForProjects(...a) };
});
const loadActiveSnapshot = vi.fn();
vi.mock('@/lib/server/documents/read', () => ({
  loadActiveSnapshot: (...a: unknown[]) => loadActiveSnapshot(...a),
}));

const { loadAdminBillingView } = await import('./adminView');

type Res = { data?: unknown[]; error?: unknown };

/** File d'attente par table : un résultat par requête, dans l'ordre d'appel. */
function rlsWith(queues: Record<string, Res[]>) {
  const from = vi.fn((table: string) => {
    const next = (queues[table] ?? []).shift() ?? { data: [] };
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'in', 'order', 'eq', 'is']) chain[m] = () => chain;
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: next.error ? null : (next.data ?? []), error: next.error ?? null });
    return chain;
  });
  return { from } as never;
}

const NOW = new Date('2026-10-20T10:00:00Z');

function view(over: Record<string, unknown>) {
  return {
    id: 'i1',
    projectId: 'p1',
    kind: 'deposit',
    number: 'FA-2026-0001',
    isTest: false,
    issuedOn: '2026-10-01',
    dueDate: null,
    periodStart: null,
    periodEnd: null,
    totalInclTaxCents: 30000,
    netToPayCents: 30000,
    amountDueCents: 30000,
    creditsInvoiceId: null,
    status: 'to_pay',
    paidAt: null,
    partialCreditCents: 0,
    refundPending: false,
    refundFailed: false,
    lastFailedAt: null,
    hasPdf: true,
    sha256: 'abc',
    creditNotes: [],
    ...over,
  };
}

const contract = {
  snapshot: {
    docType: 'contract',
    quote: {
      reference: 'DEV-1',
      revision: 1,
      lines: [{ designation: 'Site', quantity: 1, unitPriceCents: 100000 }],
      totalCents: 100000,
      depositPercent: 30,
      depositCents: 30000,
      balanceCents: 70000,
    },
  },
};

function bundle(facts: { id: number; type: string; targetFactId: number | null }[] = []) {
  return { project: { id: 'p1' }, client: { id: 'c1' }, facts } as never;
}
const signedContract = [{ id: 1, type: 'contract_signed', targetFactId: null }];
const signedBoth = [...signedContract, { id: 2, type: 'acceptance_signed', targetFactId: null }];

beforeEach(() => {
  vi.clearAllMocks();
  loadInvoicesForProjects.mockResolvedValue([]);
  loadActiveSnapshot.mockResolvedValue(contract);
});

describe('loadAdminBillingView', () => {
  it('has null quote summary without a contract and waits for the contract', async () => {
    loadActiveSnapshot.mockResolvedValue(null);
    const out = await loadAdminBillingView(rlsWith({ sv_clients: [{ data: [{ is_test: true }] }] }), bundle(), NOW);
    expect(out.isTest).toBe(true);
    expect(out.summary.quoteTotalCents).toBeNull();
    expect(out.summary.remainingToInvoiceCents).toBeNull();
    expect(out.auto.deposit).toEqual({ state: 'waiting_contract', number: null });
    expect(out.auto.final.state).toBe('waiting_acceptance');
    expect(out.contractSigned).toBe(false);
  });

  it('summarises invoiced, collected and remaining from the contract quote', async () => {
    loadInvoicesForProjects.mockResolvedValue([view({ status: 'paid', paidAt: '2026-10-02T00:00:00Z' })]);
    const out = await loadAdminBillingView(
      rlsWith({
        sv_invoice_payment_events: [
          { data: [{ id: 1, invoice_id: 'i1', kind: 'paid', livemode: false, payment_intent_id: 'pi_1', occurred_at: '2026-10-02T00:00:00Z' }] },
          { data: [] },
        ],
      }),
      bundle(signedContract),
      NOW,
    );
    expect(out.summary).toEqual({
      quoteTotalCents: 100000,
      depositPercent: 30,
      invoicedCents: 30000,
      collectedCents: 30000,
      remainingToInvoiceCents: 70000,
    });
    expect(out.auto.deposit).toEqual({ state: 'issued', number: 'FA-2026-0001' });
    expect(out.stripeFactsExist).toEqual({ deposit: true, balance: false });
    expect(out.depositPaidViaStripeAt).toBe('2026-10-02T00:00:00Z');
    expect(out.invoices[0].stripe).toEqual({
      paymentIntentId: 'pi_1',
      livemode: false,
      confirmedAt: '2026-10-02T00:00:00Z',
    });
    expect(out.invoices[0].refundEligible).toBe(true);
    expect(out.invoices[0].creditMaxCents).toBe(30000);
  });

  it('marks the deposit failed when the contract is signed and no invoice exists', async () => {
    const out = await loadAdminBillingView(rlsWith({}), bundle(signedContract), NOW);
    expect(out.auto.deposit.state).toBe('failed');
  });

  it('is not refund eligible without a payment intent and subtracts credits from the maximum', async () => {
    loadInvoicesForProjects.mockResolvedValue([
      view({
        status: 'paid',
        creditNotes: [view({ id: 'c1', kind: 'credit_note', totalInclTaxCents: 5000 })],
      }),
    ]);
    const out = await loadAdminBillingView(
      rlsWith({
        sv_invoice_payment_events: [
          { data: [{ id: 1, invoice_id: 'i1', kind: 'paid', livemode: false, payment_intent_id: null, occurred_at: '2026-10-02T00:00:00Z' }] },
          { data: [] },
        ],
      }),
      bundle(signedContract),
      NOW,
    );
    expect(out.invoices[0].refundEligible).toBe(false);
    expect(out.invoices[0].creditedCents).toBe(5000);
    expect(out.invoices[0].creditMaxCents).toBe(25000);
  });

  it('reports over_invoiced and nothing_to_invoice for the final invoice', async () => {
    const deposit = view({ status: 'paid' });
    loadInvoicesForProjects.mockResolvedValue([
      deposit,
      view({ id: 'i2', kind: 'period', number: 'FA-2026-0002', totalInclTaxCents: 80000, netToPayCents: 80000, status: 'paid' }),
    ]);
    const over = await loadAdminBillingView(rlsWith({}), bundle(signedBoth), NOW);
    expect(over.auto.final.state).toBe('over_invoiced');

    loadInvoicesForProjects.mockResolvedValue([
      deposit,
      view({ id: 'i2', kind: 'period', number: 'FA-2026-0002', totalInclTaxCents: 70000, netToPayCents: 70000, status: 'paid' }),
    ]);
    const none = await loadAdminBillingView(rlsWith({}), bundle(signedBoth), NOW);
    expect(none.auto.final.state).toBe('nothing_to_invoice');
  });

  it('lists transfer, gap, unknown and failed payments with the 14 day flag', async () => {
    loadInvoicesForProjects.mockResolvedValue([
      view({ id: 'i1', number: 'FA-1', status: 'processing', amountDueCents: 30000 }),
      view({ id: 'i2', number: 'FA-2', kind: 'period' }),
      view({ id: 'i3', number: 'FA-3', kind: 'period', lastFailedAt: '2026-10-19T00:00:00Z' }),
    ]);
    const out = await loadAdminBillingView(
      rlsWith({
        sv_invoice_payment_events: [
          {
            data: [
              { id: 1, invoice_id: 'i1', kind: 'processing', amount_cents: 30000, livemode: false, payment_intent_id: 'pi_a', occurred_at: '2026-10-01T00:00:00Z' },
              { id: 2, invoice_id: 'i2', kind: 'anomaly', detail: 'amount_mismatch', amount_cents: 9000, expected_cents: 10000, livemode: true, payment_intent_id: 'pi_b', occurred_at: '2026-10-19T00:00:00Z' },
              { id: 3, invoice_id: 'i3', kind: 'failed', livemode: false, payment_intent_id: 'pi_c', occurred_at: '2026-10-19T00:00:00Z' },
            ],
          },
          { data: [{ id: 4, client_id: 'c1', kind: 'anomaly', detail: 'unknown_invoice', amount_cents: 500, livemode: false, checkout_session_id: 'cs_x', occurred_at: '2026-10-10T00:00:00Z' }] },
        ],
      }),
      bundle(signedContract),
      NOW,
    );
    const by = (s: string) => out.pending.filter((p) => p.status === s);
    expect(by('transfer_waiting')).toEqual([
      expect.objectContaining({ invoiceNumber: 'FA-1', expectedCents: 30000, receivedCents: 30000, stripeRef: 'pi_a', olderThan14Days: true }),
    ]);
    expect(by('amount_gap')).toEqual([
      expect.objectContaining({ invoiceNumber: 'FA-2', expectedCents: 10000, receivedCents: 9000, livemode: true, olderThan14Days: false }),
    ]);
    expect(by('failed')).toEqual([expect.objectContaining({ invoiceNumber: 'FA-3', stripeRef: 'pi_c' })]);
    expect(by('unknown_invoice')).toEqual([
      expect.objectContaining({ invoiceNumber: null, receivedCents: 500, stripeRef: 'cs_x', olderThan14Days: false }),
    ]);
  });

  it('throws when a ledger read fails instead of returning an empty view', async () => {
    loadInvoicesForProjects.mockResolvedValue([view({})]);
    await expect(
      loadAdminBillingView(rlsWith({ sv_invoice_payment_events: [{ error: { message: 'x' } }] }), bundle(), NOW),
    ).rejects.toThrow('invoices_load_failed');
  });
});
