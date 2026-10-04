import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { loadInvoicesForProjects, InvoicesLoadError } = await import('./read');

type Tables = Record<string, { data?: unknown[]; error?: unknown }>;

function rlsWith(tables: Tables) {
  const from = vi.fn((table: string) => {
    const t = tables[table] ?? { data: [] };
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'in', 'order', 'eq']) chain[m] = () => chain;
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: t.error ? null : (t.data ?? []), error: t.error ?? null });
    return chain;
  });
  return { from } as never;
}

const P = 'p1';
function inv(over: Record<string, unknown>) {
  return {
    id: 'i1',
    project_id: P,
    kind: 'deposit',
    number: 'FA-2026-0001',
    is_test: false,
    issued_on: '2026-10-01',
    due_date: null,
    service_period_start: null,
    service_period_end: null,
    total_incl_tax_cents: 10000,
    net_to_pay_cents: 10000,
    credits_invoice_id: null,
    ...over,
  };
}

describe('loadInvoicesForProjects', () => {
  it('returns [] without querying for no projects', async () => {
    const rls = rlsWith({});
    expect(await loadInvoicesForProjects(rls, [])).toEqual([]);
    expect((rls as unknown as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('throws InvoicesLoadError on a query error', async () => {
    const rls = rlsWith({ sv_invoices: { error: { message: 'x' } } });
    await expect(loadInvoicesForProjects(rls, [P])).rejects.toBeInstanceOf(InvoicesLoadError);
  });

  it('derives status, pdf presence and attaches credit notes', async () => {
    const rls = rlsWith({
      sv_invoices: {
        data: [
          inv({ id: 'i1' }),
          inv({
            id: 'n1',
            kind: 'credit_note',
            number: 'AV-2026-0001',
            total_incl_tax_cents: 2000,
            net_to_pay_cents: 0,
            credits_invoice_id: 'i1',
            issued_on: '2026-10-03',
          }),
          inv({ id: 'i2', kind: 'final', number: 'FA-2026-0002', issued_on: '2026-10-02' }),
        ],
      },
      sv_invoice_payment_events: {
        data: [{ id: 1, invoice_id: 'i1', kind: 'paid', amount_cents: 10000, occurred_at: '2026-10-02T10:00:00Z' }],
      },
      sv_invoice_pdfs: { data: [{ invoice_id: 'i1', sha256: 'a'.repeat(64) }] },
    });
    const out = await loadInvoicesForProjects(rls, [P]);
    expect(out.map((v) => v.id)).toEqual(['i2', 'i1']); // payable first
    const i1 = out[1];
    expect(i1.status).toBe('paid');
    expect(i1.paidAt).toBe('2026-10-02T10:00:00Z');
    expect(i1.partialCreditCents).toBe(2000);
    expect(i1.amountDueCents).toBe(8000);
    expect(i1.hasPdf).toBe(true);
    expect(i1.sha256).toBe('a'.repeat(64));
    expect(i1.creditNotes.map((n) => n.id)).toEqual(['n1']);
    expect(i1.creditNotes[0].kind).toBe('credit_note');
    expect(out[0].status).toBe('to_pay');
    expect(out[0].hasPdf).toBe(false);
  });

  it('flags refundFailed after the last refund request and lastFailedAt without later payment', async () => {
    const rls = rlsWith({
      sv_invoices: { data: [inv({ id: 'i1' }), inv({ id: 'i2', number: 'FA-2026-0002' })] },
      sv_invoice_payment_events: {
        data: [
          { id: 1, invoice_id: 'i1', kind: 'paid', amount_cents: 10000, occurred_at: '2026-10-02T10:00:00Z' },
          { id: 2, invoice_id: 'i1', kind: 'refund_requested', amount_cents: null, occurred_at: '2026-10-03T10:00:00Z' },
          { id: 3, invoice_id: 'i1', kind: 'refund_failed', amount_cents: null, occurred_at: '2026-10-04T10:00:00Z' },
          { id: 4, invoice_id: 'i2', kind: 'failed', amount_cents: null, occurred_at: '2026-10-02T09:00:00Z' },
        ],
      },
    });
    const out = await loadInvoicesForProjects(rls, [P]);
    const i1 = out.find((v) => v.id === 'i1')!;
    const i2 = out.find((v) => v.id === 'i2')!;
    expect(i1.refundFailed).toBe(true);
    expect(i1.refundPending).toBe(false);
    expect(i1.lastFailedAt).toBeNull();
    expect(i2.lastFailedAt).toBe('2026-10-02T09:00:00Z');
    expect(i2.refundFailed).toBe(false);
  });

  it('clears lastFailedAt when a later processing event exists', async () => {
    const rls = rlsWith({
      sv_invoices: { data: [inv({ id: 'i1' })] },
      sv_invoice_payment_events: {
        data: [
          { id: 1, invoice_id: 'i1', kind: 'failed', amount_cents: null, occurred_at: '2026-10-02T09:00:00Z' },
          { id: 2, invoice_id: 'i1', kind: 'processing', amount_cents: null, occurred_at: '2026-10-02T10:00:00Z' },
        ],
      },
    });
    const [v] = await loadInvoicesForProjects(rls, [P]);
    expect(v.lastFailedAt).toBeNull();
    expect(v.status).toBe('processing');
  });
});
