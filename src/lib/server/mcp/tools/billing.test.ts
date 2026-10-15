import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { runTool } from '../registry';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const ictx = vi.hoisted(() => ({ loadInvoiceContext: vi.fn() }));
const build = vi.hoisted(() => ({ buildPeriodInput: vi.fn(), buildCreditNoteInput: vi.fn() }));
const issue = vi.hoisted(() => ({ issueInvoice: vi.fn(), issueCreditNote: vi.fn() }));
const render = vi.hoisted(() => ({ renderLedgerPdf: vi.fn() }));
const download = vi.hoisted(() => ({ createInvoiceDownloadUrl: vi.fn(), verifyInvoiceHash: vi.fn() }));
const refund = vi.hoisted(() => ({ requestRefundForCreditNote: vi.fn(), expireOpenPayments: vi.fn() }));
const projects = vi.hoisted(() => ({ loadProjectBundle: vi.fn() }));
const billView = vi.hoisted(() => ({ loadAdminBillingView: vi.fn() }));
const state = vi.hoisted(() => ({ adminQueues: {} as Record<string, { data?: unknown; error?: unknown }[]> }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/invoices/context', () => ictx);
vi.mock('@/lib/server/invoices/build', () => build);
vi.mock('@/lib/server/invoices/issue', () => issue);
vi.mock('@/lib/server/invoices/render', () => render);
vi.mock('@/lib/server/invoices/download', () => download);
vi.mock('@/lib/server/stripe/refund', () => refund);
vi.mock('@/lib/server/projects/read', () => projects);
vi.mock('@/lib/server/invoices/adminView', () => billView);

type Res = { data?: unknown; error?: unknown };
function fakeDb(queues: Record<string, Res[]>) {
  return {
    from: vi.fn((table: string) => {
      const next = (queues[table] ?? []).shift() ?? { data: [] };
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'limit']) chain[m] = () => chain;
      chain.maybeSingle = () =>
        Promise.resolve({
          data: Array.isArray(next.data) ? (next.data[0] ?? null) : (next.data ?? null),
          error: next.error ?? null,
        });
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: next.data ?? [], error: next.error ?? null });
      return chain;
    }),
  };
}
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => fakeDb(state.adminQueues) }));

import { billingTools } from './billing';

const PID = '11111111-1111-4111-8111-111111111111';
const INV = '22222222-2222-4222-8222-222222222222';
const ORIGIN = '33333333-3333-4333-8333-333333333333';
const CN = '44444444-4444-4444-8444-444444444444';
const COPY = PROJECT_COPY.payments.admin;
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();

let rlsQueues: Record<string, Res[]> = {};
const mkCtx = () => ({ supabase: fakeDb(rlsQueues) as never, user: { id: 'admin-1' } as never });
let ctx = mkCtx();
const tool = (name: string) => {
  const t = billingTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

const period = {
  projectId: PID,
  invoiceId: INV,
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  lines: [{ designation: 'Développement', days: '10,5', dailyRate: '400' }],
  orderNumber: 'BC-42',
};
const periodSnapshot = {
  docType: 'invoice',
  kind: 'period',
  number: null,
  seller: { iban: 'FR76SECRET' },
  client: { name: 'ACME SAS', siret: '12345678901234' },
  project: { id: PID, title: 'Refonte', offerLabel: 'x' },
  lines: [{ designation: 'Développement', quantityMilli: 10500, unitCode: 'DAY', unitPriceCents: 40000, totalCents: 420000 }],
  totalExclTaxCents: 420000,
  vatTotalCents: 0,
  totalInclTaxCents: 420000,
  deductions: [],
  prepaidCents: 0,
  netToPayCents: 420000,
  servicePeriod: { start: '2026-10-01', end: '2026-10-31' },
  dueDate: '2026-11-30',
  orderNumber: 'BC-42',
  vatRegime: 'franchise',
};
const creditSnapshot = {
  docType: 'credit_note',
  number: null,
  scope: 'partial',
  reason: 'Erreur de facturation',
  origin: { invoiceId: ORIGIN, number: 'FA-2026-0001', issuedOn: '2026-10-01', totalInclTaxCents: 30000 },
  client: { name: 'ACME SAS' },
  project: { title: 'Refonte' },
  totalExclTaxCents: 10000,
  vatTotalCents: 0,
  totalInclTaxCents: 10000,
};
const invoiceCtx = {
  contractSigned: true,
  invoices: [{ id: ORIGIN, kind: 'deposit', number: 'FA-2026-0001', issuedOn: '2026-10-01', totalInclTaxCents: 30000, netToPayCents: 30000, creditedCents: 0 }],
};
const credit = { originInvoiceId: ORIGIN, creditNoteId: CN, scope: 'partial', amount: '100', reason: 'Erreur de facturation', refundRequested: true };

function originQueues(opts: { paid: boolean }) {
  rlsQueues = { sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID, kind: 'deposit' }] }] };
  state.adminQueues = {
    sv_invoices: [{ data: [{ snapshot: { docType: 'invoice' } }] }],
    sv_invoice_payment_events: [{ data: opts.paid ? [{ payment_intent_id: 'pi_1' }] : [] }],
  };
  ctx = mkCtx();
}

beforeEach(() => {
  audit.mockReset();
  for (const f of [
    ...Object.values(access),
    ...Object.values(ictx),
    ...Object.values(build),
    ...Object.values(issue),
    ...Object.values(render),
    ...Object.values(download),
    ...Object.values(refund),
    ...Object.values(projects),
    ...Object.values(billView),
  ]) f.mockReset();
  rlsQueues = {};
  state.adminQueues = {};
  ctx = mkCtx();
  access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  ictx.loadInvoiceContext.mockResolvedValue(invoiceCtx);
  build.buildPeriodInput.mockReturnValue({ id: INV, header: { snapshot: periodSnapshot } });
  build.buildCreditNoteInput.mockReturnValue({ originInvoiceId: ORIGIN, snapshot: creditSnapshot });
  render.renderLedgerPdf.mockResolvedValue({ buffer: Buffer.from('PDF-BYTES') });
  issue.issueInvoice.mockResolvedValue({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2026-0002', mail: 'sent', pdf: 'attached' });
  issue.issueCreditNote.mockResolvedValue({ ok: true, outcome: 'issued', creditNoteId: CN, number: 'AV-2026-0001', fullyCredited: false, mail: 'sent', pdf: 'attached' });
  refund.requestRefundForCreditNote.mockResolvedValue({ ok: true });
  refund.expireOpenPayments.mockResolvedValue({ expired: 0, cancelled: 0 });
  download.createInvoiceDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/i' });
  download.verifyInvoiceHash.mockResolvedValue('match');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('billingTools metadata', () => {
  it('declares exact names and covers', () => {
    expect(Object.fromEntries(billingTools.map((t) => [t.name, t.covers]))).toEqual({
      preview_period_invoice: ['previewPeriodInvoiceAction'],
      issue_period_invoice: ['issuePeriodInvoiceAction'],
      preview_credit_note: ['previewCreditNoteAction'],
      issue_credit_note: ['issueCreditNoteAction'],
      get_invoice_url: ['adminInvoiceDownloadAction'],
      verify_invoice_hash: ['verifyInvoiceHashAction'],
      get_invoice_data: ['loadInvoiceDataAction'],
      list_project_invoices: [],
    });
    expect(billingTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual(['issue_credit_note', 'issue_period_invoice']);
  });
});

describe('preview_period_invoice', () => {
  it('returns the exact amounts and period without the pdf by default, and never the seller', async () => {
    const r = await runTool(tool('preview_period_invoice'), period, ctx, principal, audit);
    expect(r).toMatchObject({
      ok: true,
      data: {
        summary: {
          client: 'ACME SAS',
          project: 'Refonte',
          servicePeriod: { start: '2026-10-01', end: '2026-10-31' },
          totals: { exclTaxCents: 420000, vatCents: 0, inclTaxCents: 420000, netToPayCents: 420000 },
          dueDate: '2026-11-30',
          orderNumber: 'BC-42',
        },
      },
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain(Buffer.from('PDF-BYTES').toString('base64'));
    expect(json).not.toContain('FR76SECRET');
    expect(json).not.toContain('12345678901234');
    expect(json).toMatch(/attribu/);
  });
  it('returns the pdf only when asked and refusals are audited errors', async () => {
    const r = await runTool(tool('preview_period_invoice'), { ...period, includePdf: true }, ctx, principal, audit);
    expect(JSON.stringify(r)).toContain(Buffer.from('PDF-BYTES').toString('base64'));
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, contractSigned: false });
    expect(await runTool(tool('preview_period_invoice'), period, ctx, principal, audit)).toEqual({ ok: false, error: COPY.period.contractGuard });
  });
});

describe('issue_period_invoice', () => {
  it('requires the invoiceId idempotency key at the schema level', async () => {
    const { invoiceId: _i, ...noId } = period;
    void _i;
    expect(await runTool(tool('issue_period_invoice'), { ...noId, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    expect(issue.issueInvoice).not.toHaveBeenCalled();
  });
  it('without confirm never issues and previews exactly the amounts the issuance would use', async () => {
    const r = await runTool(tool('issue_period_invoice'), period, ctx, principal, audit);
    expect(issue.issueInvoice).not.toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: {
        wouldIssue: true,
        invoiceId: INV,
        summary: { client: 'ACME SAS', totals: { exclTaxCents: 420000, vatCents: 0, inclTaxCents: 420000 }, servicePeriod: { start: '2026-10-01', end: '2026-10-31' } },
      },
    });
    expect(JSON.stringify(r)).toMatch(/numéro/);
    expect(JSON.stringify(r)).not.toContain('FR76SECRET');
  });
  it('the preview and the confirmed call build the same input', async () => {
    await runTool(tool('issue_period_invoice'), period, ctx, principal, audit);
    await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit);
    expect(build.buildPeriodInput.mock.calls[0][1]).toEqual(build.buildPeriodInput.mock.calls[1][1]);
    expect(build.buildPeriodInput.mock.calls[0][2]).toBe(INV);
    expect(build.buildPeriodInput.mock.calls[1][2]).toBe(INV);
  });
  it('the preview reports a blocking check instead of pretending it would issue', async () => {
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, contractSigned: false });
    const r = await runTool(tool('issue_period_invoice'), period, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldIssue: false, message: COPY.period.contractGuard } });
  });
  it('with confirm issues and returns the number, id, totals and delivery status', async () => {
    const r = await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit);
    expect(issue.issueInvoice).toHaveBeenCalledWith({ id: INV, header: { snapshot: periodSnapshot } });
    expect(r).toMatchObject({
      ok: true,
      data: {
        issued: true,
        number: 'FA-2026-0002',
        invoiceId: INV,
        tone: 'success',
        mail: 'sent',
        pdf: 'attached',
        totals: { exclTaxCents: 420000, vatCents: 0, inclTaxCents: 420000 },
      },
    });
  });
  it('confirm never skips a check: contract guard, validation and nothing-to-invoice still block', async () => {
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, contractSigned: false });
    expect(await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: COPY.period.contractGuard });
    ictx.loadInvoiceContext.mockResolvedValue(invoiceCtx);
    expect((await runTool(tool('issue_period_invoice'), { ...period, periodEnd: '2026-09-01', confirm: true }, ctx, principal, audit)).ok).toBe(false);
    build.buildPeriodInput.mockImplementationOnce(() => {
      throw new Error('nothing_to_invoice');
    });
    expect(await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: COPY.period.nothingToInvoice });
    expect(issue.issueInvoice).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'issue_period_invoice', outcome: 'error' }));
  });
  it('warns when the mail failed or the pdf is pending, with the number still returned', async () => {
    issue.issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2', mail: 'failed', pdf: 'attached' });
    expect(await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit)).toMatchObject({
      ok: true,
      data: { issued: true, number: 'FA-2', tone: 'warning', message: COPY.period.mailFailed },
    });
  });
  it('a replay of the same invoiceId reports the existing number instead of an opaque error', async () => {
    issue.issueInvoice.mockResolvedValue({ ok: true, outcome: 'already_issued', invoiceId: INV, number: 'FA-2', mail: 'none', pdf: 'attached' });
    const r = await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { issued: false, alreadyIssued: true, number: 'FA-2', invoiceId: INV, message: COPY.period.alreadyIssued } });
  });
  it('maps rpc failures to web messages', async () => {
    issue.issueInvoice.mockResolvedValueOnce({ ok: false, code: 'sv_invoice_nothing_to_pay' });
    expect(await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: COPY.period.nothingToInvoice });
    issue.issueInvoice.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    expect(await runTool(tool('issue_period_invoice'), { ...period, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: COPY.period.generic });
  });
});

describe('credit notes', () => {
  it('preview_credit_note returns the exact amounts, scope and refund decision without the pdf', async () => {
    originQueues({ paid: true });
    const r = await runTool(tool('preview_credit_note'), credit, ctx, principal, audit);
    expect(r).toMatchObject({
      ok: true,
      data: {
        summary: {
          originNumber: 'FA-2026-0001',
          scope: 'partial',
          totals: { exclTaxCents: 10000, vatCents: 0, inclTaxCents: 10000 },
          refundWillBeRequested: true,
          refundEligible: true,
        },
      },
    });
    expect(JSON.stringify(r)).not.toContain(Buffer.from('PDF-BYTES').toString('base64'));
  });
  it('issue_credit_note requires the creditNoteId idempotency key', async () => {
    const { creditNoteId: _c, ...noId } = credit;
    void _c;
    expect(await runTool(tool('issue_credit_note'), { ...noId, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('without confirm never issues and previews amounts, refund and the e-mail effect', async () => {
    originQueues({ paid: true });
    const r = await runTool(tool('issue_credit_note'), credit, ctx, principal, audit);
    expect(issue.issueCreditNote).not.toHaveBeenCalled();
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { wouldIssue: true, creditNoteId: CN, summary: { originNumber: 'FA-2026-0001', totals: { inclTaxCents: 10000 }, refundWillBeRequested: true } },
    });
    expect(JSON.stringify(r)).toMatch(/e-mail/);
  });
  it('the preview states when open payment sessions will be expired (unpaid origin)', async () => {
    originQueues({ paid: false });
    const r = await runTool(tool('issue_credit_note'), credit, ctx, principal, audit);
    expect(r).toMatchObject({ preview: { summary: { refundWillBeRequested: false, openPaymentsWillBeExpired: true } } });
  });
  it('the preview reports blocking checks (over-credit, bad amount)', async () => {
    originQueues({ paid: true });
    const r = await runTool(tool('issue_credit_note'), { ...credit, amount: '999' }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldIssue: false } });
    expect(issue.issueCreditNote).not.toHaveBeenCalled();
  });
  it('with confirm issues, applies the Stripe effects and returns number, id and totals', async () => {
    originQueues({ paid: true });
    const r = await runTool(tool('issue_credit_note'), { ...credit, confirm: true }, ctx, principal, audit);
    expect(issue.issueCreditNote.mock.calls[0][0]).toMatchObject({ id: CN, issueKey: 'credit:' + CN });
    expect(refund.requestRefundForCreditNote).toHaveBeenCalledWith(CN);
    expect(r).toMatchObject({
      ok: true,
      data: { issued: true, number: 'AV-2026-0001', creditNoteId: CN, originNumber: 'FA-2026-0001', refundRequested: true, totals: { inclTaxCents: 10000 } },
    });
  });
  it('confirm never skips a check: over-credit and bad amount block without any effect', async () => {
    originQueues({ paid: true });
    const r = await runTool(tool('issue_credit_note'), { ...credit, amount: '999', confirm: true }, ctx, principal, audit);
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain('Le montant doit être compris entre');
    expect(issue.issueCreditNote).not.toHaveBeenCalled();
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(refund.expireOpenPayments).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
  it('maps sv_credit_exceeds_invoice', async () => {
    originQueues({ paid: true });
    issue.issueCreditNote.mockResolvedValueOnce({ ok: false, code: 'sv_credit_exceeds_invoice' });
    expect(await runTool(tool('issue_credit_note'), { ...credit, confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: COPY.credit.overCredit });
  });
});

describe('invoice urls, hash and data', () => {
  const rowQ = () => {
    rlsQueues = { sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID }] }] };
    ctx = mkCtx();
  };
  it('get_invoice_url returns the url only', async () => {
    rowQ();
    expect(await runTool(tool('get_invoice_url'), { invoiceId: ORIGIN }, ctx, principal, audit)).toMatchObject({ ok: true, data: { data: { url: 'https://s/i' } } });
  });
  it('verify_invoice_hash', async () => {
    rowQ();
    expect(await runTool(tool('verify_invoice_hash'), { invoiceId: ORIGIN }, ctx, principal, audit)).toMatchObject({ ok: true, data: { data: { match: true } } });
  });
  it('get_invoice_data returns the frozen snapshot without the seller and without raw line rows', async () => {
    rowQ();
    state.adminQueues = {
      sv_invoices: [{ data: [{ snapshot: { docType: 'invoice', number: 'FA-1', seller: { iban: 'FR76SECRET' }, totalInclTaxCents: 100 } }] }],
      sv_invoice_lines: [{ data: [{ position: 1, internal: 'x' }] }],
    };
    const r = await runTool(tool('get_invoice_data'), { invoiceId: ORIGIN }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { snapshot: { number: 'FA-1', totalInclTaxCents: 100 } } });
    const json = JSON.stringify(r);
    expect(json).not.toContain('FR76SECRET');
    expect(json).not.toContain('internal');
  });
  it('rejects non-uuid ids as invalid_input', async () => {
    expect(await runTool(tool('get_invoice_url'), { invoiceId: 'x' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('list_project_invoices', () => {
  it('returns what the billing section shows without Stripe identifiers', async () => {
    projects.loadProjectBundle.mockResolvedValue({ project: { id: PID } });
    billView.loadAdminBillingView.mockResolvedValue({
      isTest: false,
      summary: { quoteTotalCents: 300000, depositPercent: 30, invoicedCents: 90000, collectedCents: 90000, remainingToInvoiceCents: 210000 },
      depositPaidViaStripeAt: '2026-10-02',
      stripeFactsExist: { deposit: true, balance: false },
      auto: { deposit: { state: 'issued', number: 'FA-1' }, final: { state: 'waiting_acceptance', number: null } },
      contractSigned: true,
      invoices: [
        {
          id: ORIGIN,
          number: 'FA-1',
          kind: 'deposit',
          totalInclTaxCents: 90000,
          status: 'paid',
          sha256: 'abc',
          creditNotes: [],
          stripe: { paymentIntentId: 'pi_SECRET', livemode: true, confirmedAt: 'c' },
          refundEligible: true,
          creditMaxCents: 90000,
          creditedCents: 0,
        },
      ],
      pending: [{ invoiceNumber: 'FA-2', receivedAt: 'r', expectedCents: 1, receivedCents: 1, status: 'amount_gap', stripeRef: 'pi_REF_SECRET', livemode: true, olderThan14Days: false }],
    });
    const r = await runTool(tool('list_project_invoices'), { projectId: PID }, ctx, principal, audit);
    expect(billView.loadAdminBillingView).toHaveBeenCalledWith(ctx.supabase, expect.anything(), expect.any(Date));
    expect(r).toMatchObject({
      ok: true,
      data: {
        summary: { invoicedCents: 90000 },
        auto: { deposit: { number: 'FA-1' } },
        invoices: [{ id: ORIGIN, number: 'FA-1', status: 'paid', refundEligible: true, creditMaxCents: 90000 }],
        pending: [{ invoiceNumber: 'FA-2', status: 'amount_gap' }],
      },
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain('pi_SECRET');
    expect(json).not.toContain('pi_REF_SECRET');
  });
  it('fails when the project does not exist', async () => {
    projects.loadProjectBundle.mockResolvedValue(null);
    expect(await runTool(tool('list_project_invoices'), { projectId: PID }, ctx, principal, audit)).toMatchObject({ ok: false });
  });
});
