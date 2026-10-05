/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  ctx: vi.fn(),
  dep: vi.fn(),
  fin: vi.fn(),
  issue: vi.fn(),
  attach: vi.fn(),
  sweepPdf: vi.fn(),
  tables: {} as Record<string, { data: any; error: any }>,
}));

vi.mock('server-only', () => ({}));
vi.mock('./context', () => ({ loadInvoiceContext: S.ctx }));
vi.mock('./build', () => ({ buildDepositInput: S.dep, buildFinalInput: S.fin }));
vi.mock('./issue', () => ({
  issueInvoice: S.issue,
  attachInvoicePdf: S.attach,
  sweepMissingPdfs: S.sweepPdf,
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (t: string) => {
      const b: any = {};
      for (const m of ['select', 'in']) b[m] = () => b;
      b.then = (res: any, rej: any) => Promise.resolve(S.tables[t] ?? { data: [], error: null }).then(res, rej);
      return b;
    },
  }),
}));

import { ensureDepositInvoice, ensureFinalInvoice, sweepInvoices } from './autoIssue';

const P = 'p1';
const ctx = (over: Record<string, unknown> = {}) => ({
  contractSigned: true,
  acceptanceSigned: true,
  invoices: [],
  ...over,
});

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  S.tables = {};
  S.ctx.mockResolvedValue(ctx());
  S.dep.mockReturnValue({ id: 'i', kind: 'deposit' });
  S.fin.mockReturnValue({ id: 'i', kind: 'final' });
  S.issue.mockResolvedValue({ ok: true, outcome: 'issued', invoiceId: 'x', number: 'F1', mail: 'sent', pdf: 'attached' });
  S.attach.mockResolvedValue('already');
  S.sweepPdf.mockResolvedValue({ attached: 1, failed: 0 });
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ensureDepositInvoice', () => {
  it('not_ready without context or signed contract', async () => {
    S.ctx.mockResolvedValueOnce(null);
    expect(await ensureDepositInvoice(P)).toBe('not_ready');
    S.ctx.mockResolvedValueOnce(ctx({ contractSigned: false }));
    expect(await ensureDepositInvoice(P)).toBe('not_ready');
    expect(S.issue).not.toHaveBeenCalled();
  });

  it('exists when a deposit is present, tries to attach the PDF', async () => {
    S.ctx.mockResolvedValueOnce(ctx({ invoices: [{ id: 'd1', kind: 'deposit' }] }));
    expect(await ensureDepositInvoice(P)).toBe('exists');
    expect(S.attach).toHaveBeenCalledWith('d1');
    expect(S.issue).not.toHaveBeenCalled();
  });

  it('issues the deposit', async () => {
    expect(await ensureDepositInvoice(P)).toBe('issued');
    expect(S.issue).toHaveBeenCalledTimes(1);
  });

  it('already_issued maps to exists', async () => {
    S.issue.mockResolvedValueOnce({ ok: true, outcome: 'already_issued' });
    expect(await ensureDepositInvoice(P)).toBe('exists');
  });

  it('builder throw or RPC failure -> failed', async () => {
    S.dep.mockImplementationOnce(() => {
      throw new Error('seller_not_configured');
    });
    expect(await ensureDepositInvoice(P)).toBe('failed');
    S.issue.mockResolvedValueOnce({ ok: false, code: 'x' });
    expect(await ensureDepositInvoice(P)).toBe('failed');
  });

  it('zero deposit -> nothing_to_invoice, no RPC', async () => {
    S.dep.mockImplementationOnce(() => {
      throw new Error('nothing_to_invoice');
    });
    expect(await ensureDepositInvoice(P)).toBe('nothing_to_invoice');
    expect(S.issue).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith('[invoices/auto] deposit_nothing_to_invoice');
  });
});

describe('ensureFinalInvoice', () => {
  it('not_ready without acceptance', async () => {
    S.ctx.mockResolvedValueOnce(ctx({ acceptanceSigned: false }));
    expect(await ensureFinalInvoice(P)).toBe('not_ready');
  });

  it('exists when final present', async () => {
    S.ctx.mockResolvedValueOnce(ctx({ invoices: [{ id: 'f1', kind: 'final' }] }));
    expect(await ensureFinalInvoice(P)).toBe('exists');
  });

  it('over_invoiced -> failed with fixed log', async () => {
    S.fin.mockImplementationOnce(() => {
      throw new Error('over_invoiced');
    });
    expect(await ensureFinalInvoice(P)).toBe('failed');
    expect(errSpy).toHaveBeenCalledWith('[invoices/auto] over_invoiced');
  });

  it('nothing_to_invoice: no RPC, no row, fixed admin alert', async () => {
    S.fin.mockImplementationOnce(() => {
      throw new Error('nothing_to_invoice');
    });
    expect(await ensureFinalInvoice(P)).toBe('nothing_to_invoice');
    expect(S.issue).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith('[invoices/auto] final_nothing_to_invoice: post balance_received manually');
  });

  it('issues the final invoice', async () => {
    expect(await ensureFinalInvoice(P)).toBe('issued');
  });
});

describe('sweepInvoices', () => {
  it('heals missing deposits/finals, counts nothing_to_invoice as skipped, then sweeps PDFs', async () => {
    S.tables.sv_project_facts = {
      data: [
        { id: 1, project_id: 'a', type: 'contract_signed', target_fact_id: null },
        { id: 2, project_id: 'b', type: 'contract_signed', target_fact_id: null },
        { id: 3, project_id: 'c', type: 'contract_signed', target_fact_id: null },
        { id: 4, project_id: 'c', type: 'fact_revoked', target_fact_id: 3 },
        { id: 5, project_id: 'a', type: 'acceptance_signed', target_fact_id: null },
      ],
      error: null,
    };
    S.tables.sv_invoices = { data: [{ project_id: 'b', kind: 'deposit' }], error: null };
    S.fin.mockImplementation(() => {
      throw new Error('nothing_to_invoice');
    });
    const r = await sweepInvoices(10);
    expect(r).toEqual({ deposits: 1, finals: 0, skipped: 1, pdfs: { attached: 1, failed: 0 }, failed: 0 });
    expect(S.issue).toHaveBeenCalledTimes(1);
    expect(S.sweepPdf).toHaveBeenCalledWith(10);
  });

  it('respects the limit', async () => {
    S.tables.sv_project_facts = {
      data: ['a', 'b', 'c'].map((p, i) => ({ id: i + 1, project_id: p, type: 'contract_signed', target_fact_id: null })),
      error: null,
    };
    const r = await sweepInvoices(2);
    expect(r.deposits).toBe(2);
  });

  it('never throws on read or pdf failure', async () => {
    S.tables.sv_project_facts = { data: null, error: { message: 'x' } };
    S.sweepPdf.mockRejectedValueOnce(new Error('boom'));
    const r = await sweepInvoices();
    expect(r.failed).toBe(1);
  });
});
