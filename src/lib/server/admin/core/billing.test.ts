import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const ictx = vi.hoisted(() => ({ loadInvoiceContext: vi.fn() }));
const build = vi.hoisted(() => ({ buildPeriodInput: vi.fn(), buildCreditNoteInput: vi.fn() }));
const issue = vi.hoisted(() => ({ issueInvoice: vi.fn(), issueCreditNote: vi.fn() }));
const render = vi.hoisted(() => ({ renderLedgerPdf: vi.fn() }));
const download = vi.hoisted(() => ({ createInvoiceDownloadUrl: vi.fn(), verifyInvoiceHash: vi.fn() }));
const refund = vi.hoisted(() => ({ requestRefundForCreditNote: vi.fn(), expireOpenPayments: vi.fn() }));
const state = vi.hoisted(() => ({ adminQueues: {} as Record<string, { data?: unknown; error?: unknown }[]> }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/invoices/context', () => ictx);
vi.mock('@/lib/server/invoices/build', () => build);
vi.mock('@/lib/server/invoices/issue', () => issue);
vi.mock('@/lib/server/invoices/render', () => render);
vi.mock('@/lib/server/invoices/download', () => download);
vi.mock('@/lib/server/stripe/refund', () => refund);

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

import {
  downloadInvoiceCore,
  findIssuedCreditNoteCore,
  findIssuedInvoiceCore,
  issueCreditNoteCore,
  issuePeriodInvoiceCore,
  loadInvoiceDataCore,
  prepareCreditNoteCore,
  preparePeriodInvoiceCore,
  previewCreditNoteCore,
  previewPeriodInvoiceCore,
  verifyInvoiceHashCore,
} from './billing';

const PID = '11111111-1111-4111-8111-111111111111';
const INV = '22222222-2222-4222-8222-222222222222';
const ORIGIN = '33333333-3333-4333-8333-333333333333';
const CN = '44444444-4444-4444-8444-444444444444';
const COPY = PROJECT_COPY.payments.admin;
const GENERIC = PROJECT_COPY.errors.generic;

let rlsQueues: Record<string, Res[]> = {};
const mkCtx = () => ({ supabase: fakeDb(rlsQueues) as never, user: { id: 'admin-1' } as never });
let ctx = mkCtx();

const period = {
  projectId: PID,
  invoiceId: INV,
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  lines: [{ designation: 'Développement', days: '10,5', dailyRate: '400' }],
};
const credit = { originInvoiceId: ORIGIN, creditNoteId: CN, scope: 'total', reason: 'Erreur de facturation', refundRequested: true };
const invoiceCtx = {
  contractSigned: true,
  invoices: [{ id: ORIGIN, kind: 'deposit', number: 'FA-2026-0001', issuedOn: '2026-10-01', totalInclTaxCents: 30000, netToPayCents: 30000, creditedCents: 0 }],
};
const periodSnapshot = { docType: 'invoice', totalExclTaxCents: 420000, vatTotalCents: 0, totalInclTaxCents: 420000, netToPayCents: 400000 };

function originQueues(opts: { paid: boolean; pi?: string | null }) {
  rlsQueues = { sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID, kind: 'deposit' }] }] };
  state.adminQueues = {
    sv_invoices: [{ data: [{ snapshot: { docType: 'invoice' } }] }],
    sv_invoice_payment_events: [{ data: opts.paid ? [{ payment_intent_id: opts.pi === undefined ? 'pi_1' : opts.pi }] : [] }],
  };
  ctx = mkCtx();
}

beforeEach(() => {
  for (const f of [
    ...Object.values(access),
    ...Object.values(ictx),
    ...Object.values(build),
    ...Object.values(issue),
    ...Object.values(render),
    ...Object.values(download),
    ...Object.values(refund),
  ]) f.mockReset();
  rlsQueues = {};
  state.adminQueues = {};
  ctx = mkCtx();
  access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  ictx.loadInvoiceContext.mockResolvedValue(invoiceCtx);
  build.buildPeriodInput.mockReturnValue({ id: INV, header: { snapshot: periodSnapshot } });
  build.buildCreditNoteInput.mockReturnValue({ originInvoiceId: ORIGIN, snapshot: { docType: 'credit_note', totalInclTaxCents: 30000 } });
  render.renderLedgerPdf.mockResolvedValue({ buffer: Buffer.from('PDF') });
  issue.issueInvoice.mockResolvedValue({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2026-0002', mail: 'sent', pdf: 'attached' });
  issue.issueCreditNote.mockResolvedValue({ ok: true, outcome: 'issued', creditNoteId: CN, number: 'AV-2026-0001', fullyCredited: true, mail: 'sent', pdf: 'attached' });
  refund.requestRefundForCreditNote.mockResolvedValue({ ok: true });
  refund.expireOpenPayments.mockResolvedValue({ expired: 0, cancelled: 0 });
  download.createInvoiceDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/i' });
  download.verifyInvoiceHash.mockResolvedValue('match');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('preparePeriodInvoiceCore', () => {
  it('returns field errors and never reads the project when validation fails', async () => {
    const r = await preparePeriodInvoiceCore(ctx, { ...period, periodEnd: '2026-09-01' }, 'issue');
    expect(r).toMatchObject({ ok: false, message: COPY.period.validationSummary });
    expect(r.ok === false && r.fieldErrors?.periodEnd).toBeTruthy();
    expect(access.getAccessibleProject).not.toHaveBeenCalled();
  });
  it('issue mode requires the invoiceId (idempotency key), preview mode generates one', async () => {
    const { invoiceId: _i, ...noId } = period;
    void _i;
    expect(await preparePeriodInvoiceCore(ctx, noId, 'issue')).toEqual({ ok: false, message: COPY.period.generic });
    const r = await preparePeriodInvoiceCore(ctx, noId, 'preview');
    expect(r.ok).toBe(true);
    expect(r.ok && r.invoiceId).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('guards on access, context and contract', async () => {
    access.getAccessibleProject.mockResolvedValue(null);
    expect(await preparePeriodInvoiceCore(ctx, period, 'issue')).toEqual({ ok: false, message: GENERIC });
    access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
    ictx.loadInvoiceContext.mockResolvedValue(null);
    expect(await preparePeriodInvoiceCore(ctx, period, 'issue')).toEqual({ ok: false, message: COPY.period.generic });
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, contractSigned: false });
    expect(await preparePeriodInvoiceCore(ctx, period, 'issue')).toEqual({ ok: false, message: COPY.period.contractGuard });
  });
  it('builds with the parsed lines in milli-days and cents and exposes the snapshot', async () => {
    const r = await preparePeriodInvoiceCore(ctx, period, 'issue');
    expect(build.buildPeriodInput.mock.calls[0][1].lines).toEqual([{ designation: 'Développement', quantityMilli: 10500, unitPriceCents: 40000 }]);
    expect(build.buildPeriodInput.mock.calls[0][2]).toBe(INV);
    expect(r).toMatchObject({ ok: true, invoiceId: INV, snapshot: periodSnapshot });
  });
  it('maps build errors per mode (issue: generic fallback; preview: previewFailed)', async () => {
    build.buildPeriodInput.mockImplementation(() => {
      throw new Error('nothing_to_invoice');
    });
    expect(await preparePeriodInvoiceCore(ctx, period, 'issue')).toEqual({ ok: false, message: COPY.period.nothingToInvoice });
    expect(await preparePeriodInvoiceCore(ctx, period, 'preview')).toEqual({ ok: false, message: COPY.period.nothingToInvoice });
    build.buildPeriodInput.mockImplementation(() => {
      throw new Error('seller_not_configured');
    });
    expect(await preparePeriodInvoiceCore(ctx, period, 'issue')).toEqual({ ok: false, message: COPY.period.generic });
    expect(await preparePeriodInvoiceCore(ctx, period, 'preview')).toEqual({ ok: false, message: PROJECT_COPY.documents.admin.previewFailed });
  });
});

describe('previewPeriodInvoiceCore', () => {
  it('renders the null-number snapshot', async () => {
    expect(await previewPeriodInvoiceCore(ctx, period)).toMatchObject({ ok: true, pdfBase64: Buffer.from('PDF').toString('base64'), snapshot: periodSnapshot });
    expect(render.renderLedgerPdf).toHaveBeenCalledWith(periodSnapshot);
  });
  it('maps a render failure to previewFailed', async () => {
    render.renderLedgerPdf.mockRejectedValue(new Error('x'));
    expect(await previewPeriodInvoiceCore(ctx, period)).toEqual({ ok: false, message: PROJECT_COPY.documents.admin.previewFailed });
  });
});

describe('issuePeriodInvoiceCore', () => {
  it('issues and returns number, ids and tone', async () => {
    expect(await issuePeriodInvoiceCore(ctx, period)).toEqual({
      ok: true,
      tone: 'success',
      message: COPY.period.success('FA-2026-0002'),
      number: 'FA-2026-0002',
      invoiceId: INV,
      projectId: PID,
      mail: 'sent',
      pdf: 'attached',
      totals: { exclTaxCents: 420000, vatCents: 0, inclTaxCents: 420000, netToPayCents: 400000 },
    });
    expect(issue.issueInvoice).toHaveBeenCalledWith({ id: INV, header: { snapshot: periodSnapshot } });
  });
  it('warns on pending pdf and failed mail', async () => {
    issue.issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2', mail: 'sent', pdf: 'pending' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toMatchObject({ ok: true, tone: 'warning', message: COPY.period.partialResume('FA-2') });
    issue.issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2', mail: 'failed', pdf: 'attached' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toMatchObject({ ok: true, tone: 'warning', message: COPY.period.mailFailed });
  });
  it('already issued is a refusal that carries the number and asks for a refresh', async () => {
    issue.issueInvoice.mockResolvedValue({ ok: true, outcome: 'already_issued', invoiceId: INV, number: 'FA-2', mail: 'none', pdf: 'attached' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toEqual({
      ok: false,
      message: COPY.period.alreadyIssued,
      alreadyIssued: { number: 'FA-2', invoiceId: INV },
      refreshProjectId: PID,
    });
  });
  it('maps rpc failures and never issues when preparation fails', async () => {
    issue.issueInvoice.mockResolvedValueOnce({ ok: false, code: 'sv_invoice_contract_not_signed' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toEqual({ ok: false, message: COPY.period.contractGuard });
    issue.issueInvoice.mockResolvedValueOnce({ ok: false, code: 'sv_invoice_nothing_to_pay' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toEqual({ ok: false, message: COPY.period.nothingToInvoice });
    issue.issueInvoice.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    expect(await issuePeriodInvoiceCore(ctx, period)).toEqual({ ok: false, message: COPY.period.generic });
    issue.issueInvoice.mockClear();
    expect((await issuePeriodInvoiceCore(ctx, { ...period, invoiceId: 'nope' })).ok).toBe(false);
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, contractSigned: false });
    expect((await issuePeriodInvoiceCore(ctx, period)).ok).toBe(false);
    expect(issue.issueInvoice).not.toHaveBeenCalled();
  });
});

describe('credit notes', () => {
  it('refuses short and long reasons with a reason field error', async () => {
    for (const reason of ['  a ', 'x'.repeat(1001)]) {
      const r = await prepareCreditNoteCore(ctx, { ...credit, reason });
      expect(r.ok).toBe(false);
      expect(r.ok === false && r.fieldErrors).toHaveProperty('reason');
    }
  });
  it('refuses a partial amount outside 0,01 and the maximum', async () => {
    for (const amount of ['0', '300,01', 'abc', '']) {
      originQueues({ paid: true });
      const r = await prepareCreditNoteCore(ctx, { ...credit, scope: 'partial', amount });
      expect(r.ok).toBe(false);
      expect(r.ok === false && r.message).toContain('Le montant doit être compris entre');
    }
  });
  it('refuses an over-credited origin and a credit note as origin', async () => {
    originQueues({ paid: true });
    ictx.loadInvoiceContext.mockResolvedValue({
      ...invoiceCtx,
      invoices: [{ ...invoiceCtx.invoices[0], creditedCents: 30000 }],
    });
    expect(await prepareCreditNoteCore(ctx, credit)).toEqual({ ok: false, message: COPY.credit.overCredit });
    rlsQueues = { sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID, kind: 'credit_note' }] }] };
    ctx = mkCtx();
    expect(await prepareCreditNoteCore(ctx, credit)).toEqual({ ok: false, message: GENERIC });
  });
  it('forces the refund off when the origin is not refund eligible', async () => {
    originQueues({ paid: false });
    const r = await prepareCreditNoteCore(ctx, credit);
    expect(r).toMatchObject({ ok: true, refund: false, id: CN });
    expect(build.buildCreditNoteInput.mock.calls[0][1]).toMatchObject({ refundRequested: false, createdBy: 'admin-1', scope: 'total' });
  });
  it('previews without issuing', async () => {
    originQueues({ paid: true });
    expect(await previewCreditNoteCore(ctx, credit)).toMatchObject({ ok: true, pdfBase64: Buffer.from('PDF').toString('base64') });
    expect(issue.issueCreditNote).not.toHaveBeenCalled();
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
  });
  it('issues, requests the refund on a paid invoice and does not expire sessions', async () => {
    originQueues({ paid: true });
    const r = await issueCreditNoteCore(ctx, credit);
    expect(r).toMatchObject({ ok: true, tone: 'success', number: 'AV-2026-0001', creditNoteId: CN, projectId: PID, refundRequested: true, totals: { inclTaxCents: 30000 } });
    expect(r.ok && r.message).toBe(`${COPY.credit.success('AV-2026-0001', 'FA-2026-0001')} ${COPY.credit.refundRequested}`);
    expect(refund.requestRefundForCreditNote).toHaveBeenCalledWith(CN);
    expect(refund.expireOpenPayments).not.toHaveBeenCalled();
    expect(issue.issueCreditNote.mock.calls[0][0]).toMatchObject({ id: CN, issueKey: 'credit:' + CN });
  });
  it('expires open payments when the origin is unpaid', async () => {
    originQueues({ paid: false });
    await issueCreditNoteCore(ctx, credit);
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(refund.expireOpenPayments).toHaveBeenCalledWith(ORIGIN);
  });
  it('keeps the success with a warning when the refund request fails', async () => {
    originQueues({ paid: true });
    refund.requestRefundForCreditNote.mockResolvedValue({ ok: false, code: 'error' });
    const r = await issueCreditNoteCore(ctx, credit);
    expect(r).toMatchObject({ ok: true, tone: 'warning' });
    expect(r.ok && r.message).toContain(COPY.credit.refundFailed);
  });
  it('maps rpc failures without any Stripe effect', async () => {
    originQueues({ paid: true });
    issue.issueCreditNote.mockResolvedValueOnce({ ok: false, code: 'sv_credit_exceeds_invoice' });
    expect(await issueCreditNoteCore(ctx, credit)).toEqual({ ok: false, message: COPY.credit.overCredit });
    originQueues({ paid: true });
    issue.issueCreditNote.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    expect(await issueCreditNoteCore(ctx, credit)).toEqual({ ok: false, message: COPY.credit.error });
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(refund.expireOpenPayments).not.toHaveBeenCalled();
  });
});

describe('invoice download, hash and frozen data', () => {
  const rowQ = () => {
    rlsQueues = { sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID }] }] };
    ctx = mkCtx();
  };
  it('downloads after the access check', async () => {
    rowQ();
    expect(await downloadInvoiceCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: true, message: '', data: { url: 'https://s/i' } });
    rowQ();
    access.getAccessibleProject.mockResolvedValue(null);
    expect(await downloadInvoiceCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: false, message: PROJECT_COPY.payments.portal.downloadFailed });
    expect(await downloadInvoiceCore(ctx, { invoiceId: 'x' })).toEqual({ ok: false, message: PROJECT_COPY.payments.portal.downloadFailed });
  });
  it('verifies the hash and maps missing to an error', async () => {
    rowQ();
    expect(await verifyInvoiceHashCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: true, message: '', data: { match: true } });
    rowQ();
    download.verifyInvoiceHash.mockResolvedValue('missing');
    expect(await verifyInvoiceHashCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: false, message: GENERIC });
    rowQ();
    download.verifyInvoiceHash.mockResolvedValue('mismatch');
    expect(await verifyInvoiceHashCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: true, message: '', data: { match: false } });
  });
  it('reads the frozen snapshot and lines only after the access checks', async () => {
    rowQ();
    state.adminQueues = {
      sv_invoices: [{ data: [{ snapshot: { docType: 'invoice' } }] }],
      sv_invoice_lines: [{ data: [{ position: 1 }] }],
    };
    expect(await loadInvoiceDataCore(ctx, { invoiceId: ORIGIN })).toEqual({
      ok: true,
      message: '',
      data: { snapshot: { docType: 'invoice' }, lines: [{ position: 1 }] },
    });
    rowQ();
    access.getAccessibleProject.mockResolvedValue(null);
    state.adminQueues = { sv_invoices: [{ data: [{ snapshot: {} }] }] };
    expect(await loadInvoiceDataCore(ctx, { invoiceId: ORIGIN })).toEqual({ ok: false, message: GENERIC });
    expect(state.adminQueues.sv_invoices).toHaveLength(1);
  });
});

describe('credit note replays (review I-1)', () => {
  const existing = { id: CN, number: 'AV-2026-0001', kind: 'credit_note', credits_invoice_id: ORIGIN, project_id: PID };
  it('findIssuedCreditNoteCore recognises a credit note already issued under the same id for the same origin', async () => {
    rlsQueues = { sv_invoices: [{ data: [existing] }, { data: [{ number: 'FA-2026-0001' }] }] };
    ctx = mkCtx();
    expect(await findIssuedCreditNoteCore(ctx, credit)).toEqual({ number: 'AV-2026-0001', creditNoteId: CN, originNumber: 'FA-2026-0001', projectId: PID });
  });
  it('ignores an unknown id, a non credit-note row, another origin and a missing creditNoteId', async () => {
    rlsQueues = { sv_invoices: [{ data: [] }] };
    ctx = mkCtx();
    expect(await findIssuedCreditNoteCore(ctx, credit)).toBeNull();
    rlsQueues = { sv_invoices: [{ data: [{ ...existing, kind: 'deposit' }] }] };
    ctx = mkCtx();
    expect(await findIssuedCreditNoteCore(ctx, credit)).toBeNull();
    rlsQueues = { sv_invoices: [{ data: [{ ...existing, credits_invoice_id: INV }] }] };
    ctx = mkCtx();
    expect(await findIssuedCreditNoteCore(ctx, credit)).toBeNull();
    const { creditNoteId: _c, ...noId } = credit;
    void _c;
    expect(await findIssuedCreditNoteCore(ctx, noId)).toBeNull();
  });
  it('a replay of a successful total credit returns the existing number instead of over-credit, with no Stripe effect and no new issuance', async () => {
    originQueues({ paid: true });
    rlsQueues.sv_invoices.push({ data: [existing] }, { data: [{ number: 'FA-2026-0001' }] });
    ctx = mkCtx();
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, invoices: [{ ...invoiceCtx.invoices[0], creditedCents: 30000 }] });
    const r = await issueCreditNoteCore(ctx, credit);
    expect(r).toMatchObject({ ok: true, outcome: 'already_issued', number: 'AV-2026-0001', creditNoteId: CN, originNumber: 'FA-2026-0001', projectId: PID });
    expect(r.ok && r.message).toBe(COPY.credit.success('AV-2026-0001', 'FA-2026-0001'));
    expect(issue.issueCreditNote).not.toHaveBeenCalled();
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(refund.expireOpenPayments).not.toHaveBeenCalled();
  });
  it('an over-credit with an unknown creditNoteId is still the over-credit refusal', async () => {
    originQueues({ paid: true });
    ictx.loadInvoiceContext.mockResolvedValue({ ...invoiceCtx, invoices: [{ ...invoiceCtx.invoices[0], creditedCents: 30000 }] });
    expect(await issueCreditNoteCore(ctx, credit)).toEqual({ ok: false, message: COPY.credit.overCredit });
  });
  it('a race where the rpc reports already_issued skips the Stripe effects too', async () => {
    originQueues({ paid: true });
    issue.issueCreditNote.mockResolvedValue({ ok: true, outcome: 'already_issued', creditNoteId: CN, number: 'AV-2026-0001', fullyCredited: true, mail: 'none', pdf: 'attached' });
    const r = await issueCreditNoteCore(ctx, credit);
    expect(r).toMatchObject({ ok: true, outcome: 'already_issued', number: 'AV-2026-0001' });
    expect(refund.requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(refund.expireOpenPayments).not.toHaveBeenCalled();
  });
  it('a fresh issuance reports outcome issued', async () => {
    originQueues({ paid: true });
    expect(await issueCreditNoteCore(ctx, credit)).toMatchObject({ ok: true, outcome: 'issued' });
  });
  it('findIssuedInvoiceCore recognises an invoice already issued under the id', async () => {
    rlsQueues = { sv_invoices: [{ data: [{ id: INV, number: 'FA-2026-0002', kind: 'period', project_id: PID }] }] };
    ctx = mkCtx();
    expect(await findIssuedInvoiceCore(ctx, { invoiceId: INV })).toEqual({ number: 'FA-2026-0002', invoiceId: INV, projectId: PID });
    rlsQueues = { sv_invoices: [{ data: [] }] };
    ctx = mkCtx();
    expect(await findIssuedInvoiceCore(ctx, { invoiceId: INV })).toBeNull();
    expect(await findIssuedInvoiceCore(ctx, { invoiceId: 'nope' })).toBeNull();
  });
});
