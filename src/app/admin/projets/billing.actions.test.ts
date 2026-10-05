import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const getAccessibleProject = vi.fn();
vi.mock('@/lib/server/projects/access', () => ({
  getAccessibleProject: (...a: unknown[]) => getAccessibleProject(...a),
}));

vi.mock('@/lib/server/projects/content', () => ({ addProjectLink: vi.fn() }));
vi.mock('@/lib/server/projects/facts', () => ({ postProjectFact: vi.fn(), revokeProjectFact: vi.fn() }));
vi.mock('@/lib/server/projects/files', () => ({
  requestUpload: vi.fn(),
  confirmUpload: vi.fn(),
  createDownloadUrl: vi.fn(),
}));
vi.mock('@/lib/server/documents/prepare', () => ({ prepareDocument: vi.fn() }));
vi.mock('@/lib/server/documents/render', () => ({ renderDocument: vi.fn() }));
vi.mock('@/lib/server/documents/issue', () => ({ issueDocument: vi.fn() }));
vi.mock('@/lib/server/documents/read', () => ({ loadDocumentSnapshot: vi.fn() }));
vi.mock('@/lib/server/documents/download', () => ({
  createDocumentDownloadUrl: vi.fn(),
  verifyDocumentHash: vi.fn(),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/server/signature/chain', () => ({ exportSignatureChain: vi.fn(), verifySignatureChainInDb: vi.fn() }));
vi.mock('@/lib/server/signature/links', () => ({ createSealedDownloadUrl: vi.fn() }));
vi.mock('@/lib/server/signature/seal', () => ({ finalizeSignature: vi.fn() }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const loadInvoiceContext = vi.fn();
vi.mock('@/lib/server/invoices/context', () => ({ loadInvoiceContext: (...a: unknown[]) => loadInvoiceContext(...a) }));
const buildPeriodInput = vi.fn();
const buildCreditNoteInput = vi.fn();
vi.mock('@/lib/server/invoices/build', () => ({
  buildPeriodInput: (...a: unknown[]) => buildPeriodInput(...a),
  buildCreditNoteInput: (...a: unknown[]) => buildCreditNoteInput(...a),
}));
const issueInvoice = vi.fn();
const issueCreditNote = vi.fn();
vi.mock('@/lib/server/invoices/issue', () => ({
  issueInvoice: (...a: unknown[]) => issueInvoice(...a),
  issueCreditNote: (...a: unknown[]) => issueCreditNote(...a),
}));
const renderLedgerPdf = vi.fn();
vi.mock('@/lib/server/invoices/render', () => ({ renderLedgerPdf: (...a: unknown[]) => renderLedgerPdf(...a) }));
const createInvoiceDownloadUrl = vi.fn();
const verifyInvoiceHash = vi.fn();
vi.mock('@/lib/server/invoices/download', () => ({
  createInvoiceDownloadUrl: (...a: unknown[]) => createInvoiceDownloadUrl(...a),
  verifyInvoiceHash: (...a: unknown[]) => verifyInvoiceHash(...a),
}));
const requestRefundForCreditNote = vi.fn();
const expireOpenPayments = vi.fn();
vi.mock('@/lib/server/stripe/refund', () => ({
  requestRefundForCreditNote: (...a: unknown[]) => requestRefundForCreditNote(...a),
  expireOpenPayments: (...a: unknown[]) => expireOpenPayments(...a),
}));

type Res = { data?: unknown; error?: unknown };
/** File d'attente par table ; maybeSingle renvoie le premier élément d'un tableau. */
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

let rlsQueues: Record<string, Res[]> = {};
let adminQueues: Record<string, Res[]> = {};
let rls: ReturnType<typeof fakeDb>;
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => fakeDb(adminQueues) }));

const {
  previewPeriodInvoiceAction,
  issuePeriodInvoiceAction,
  previewCreditNoteAction,
  issueCreditNoteAction,
  adminInvoiceDownloadAction,
  verifyInvoiceHashAction,
  loadInvoiceDataAction,
} = await import('./actions');

const PID = '11111111-1111-4111-8111-111111111111';
const INV = '22222222-2222-4222-8222-222222222222';
const ORIGIN = '33333333-3333-4333-8333-333333333333';
const CN = '44444444-4444-4444-8444-444444444444';
const COPY = PROJECT_COPY.payments.admin;

const periodInput = {
  projectId: PID,
  invoiceId: INV,
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  lines: [{ designation: 'Développement', days: '10,5', dailyRate: '400' }],
};
const creditInput = {
  originInvoiceId: ORIGIN,
  creditNoteId: CN,
  scope: 'total' as const,
  reason: 'Erreur de facturation',
  refundRequested: true,
};

const ctx = {
  contractSigned: true,
  invoices: [
    { id: ORIGIN, kind: 'deposit', number: 'FA-2026-0001', issuedOn: '2026-10-01', totalInclTaxCents: 30000, netToPayCents: 30000, creditedCents: 0 },
  ],
};

function originQueues(opts: { paid: boolean; pi?: string | null }) {
  rlsQueues = {
    sv_invoices: [{ data: [{ id: ORIGIN, project_id: PID, kind: 'deposit' }] }],
    sv_invoice_payment_events: [
      { data: opts.paid ? [{ payment_intent_id: opts.pi === undefined ? 'pi_1' : opts.pi }] : [] },
    ],
  };
  adminQueues = { sv_invoices: [{ data: [{ snapshot: { docType: 'invoice' } }] }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  rlsQueues = {};
  adminQueues = {};
  rls = fakeDb(rlsQueues);
  requireAdmin.mockImplementation(async () => ({ user: { id: 'admin-1' }, supabase: fakeDb(rlsQueues) }));
  getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  loadInvoiceContext.mockResolvedValue(ctx);
  buildPeriodInput.mockReturnValue({ id: INV, header: { snapshot: { docType: 'invoice' } } });
  buildCreditNoteInput.mockReturnValue({ originInvoiceId: ORIGIN, snapshot: { docType: 'credit_note' } });
  renderLedgerPdf.mockResolvedValue({ buffer: Buffer.from('PDF'), sha256: 'x', size: 3 });
  issueInvoice.mockResolvedValue({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2026-0002', mail: 'sent', pdf: 'attached' });
  issueCreditNote.mockResolvedValue({ ok: true, outcome: 'issued', creditNoteId: CN, number: 'AV-2026-0001', fullyCredited: true, mail: 'sent', pdf: 'attached' });
  requestRefundForCreditNote.mockResolvedValue({ ok: true });
  expireOpenPayments.mockResolvedValue({ expired: 0, cancelled: 0 });
  createInvoiceDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/i' });
  verifyInvoiceHash.mockResolvedValue('match');
  void rls;
});

const modules = () => [
  loadInvoiceContext,
  buildPeriodInput,
  buildCreditNoteInput,
  issueInvoice,
  issueCreditNote,
  renderLedgerPdf,
  createInvoiceDownloadUrl,
  verifyInvoiceHash,
  requestRefundForCreditNote,
  expireOpenPayments,
];

describe('authorisation', () => {
  const guarded: [string, () => Promise<unknown>][] = [
    ['previewPeriodInvoiceAction', () => previewPeriodInvoiceAction(periodInput)],
    ['issuePeriodInvoiceAction', () => issuePeriodInvoiceAction(periodInput)],
    ['previewCreditNoteAction', () => previewCreditNoteAction(creditInput)],
    ['issueCreditNoteAction', () => issueCreditNoteAction(creditInput)],
    ['adminInvoiceDownloadAction', () => adminInvoiceDownloadAction(ORIGIN)],
    ['verifyInvoiceHashAction', () => verifyInvoiceHashAction(ORIGIN)],
    ['loadInvoiceDataAction', () => loadInvoiceDataAction(ORIGIN)],
  ];

  it.each(guarded)('%s rejects non admins before anything else', async (_n, run) => {
    requireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(run()).rejects.toThrow('NEXT_REDIRECT');
    for (const m of modules()) expect(m).not.toHaveBeenCalled();
  });

  it.each(guarded)('%s returns the generic message for an inaccessible project and calls no module', async (_n, run) => {
    getAccessibleProject.mockResolvedValue(null);
    rlsQueues.sv_invoices = [{ data: [{ id: ORIGIN, project_id: PID, kind: 'deposit' }] }];
    const res = (await run()) as { ok: boolean; message?: string };
    expect(res.ok).toBe(false);
    expect(res.message).toBe(
      _n === 'adminInvoiceDownloadAction' ? PROJECT_COPY.payments.portal.downloadFailed : PROJECT_COPY.errors.generic,
    );
    for (const m of modules()) expect(m).not.toHaveBeenCalled();
  });
});

describe('previewPeriodInvoiceAction', () => {
  it('refuses a period ending before it starts, with a field error', async () => {
    const res = await previewPeriodInvoiceAction({ ...periodInput, periodStart: '2026-10-31', periodEnd: '2026-10-01' });
    expect(res).toMatchObject({ ok: false, message: COPY.period.validationSummary });
    expect((res as { fieldErrors: Record<string, string> }).fieldErrors).toHaveProperty('periodEnd');
    expect(buildPeriodInput).not.toHaveBeenCalled();
  });

  it('refuses 0 lines, more than 30 lines, long designations and unparseable days or rates', async () => {
    const line = periodInput.lines[0];
    const cases = [
      { ...periodInput, lines: [] },
      { ...periodInput, lines: Array.from({ length: 31 }, () => line) },
      { ...periodInput, lines: [{ ...line, designation: 'x'.repeat(201) }] },
      { ...periodInput, lines: [{ ...line, days: '1,3' }] },
      { ...periodInput, lines: [{ ...line, days: '0' }] },
      { ...periodInput, lines: [{ ...line, dailyRate: 'abc' }] },
    ];
    for (const c of cases) {
      const res = await previewPeriodInvoiceAction(c);
      expect(res).toMatchObject({ ok: false, message: COPY.period.validationSummary });
      expect((res as { fieldErrors: object }).fieldErrors).toBeDefined();
    }
    expect(renderLedgerPdf).not.toHaveBeenCalled();
  });

  it('returns the contract guard when the contract is not signed', async () => {
    loadInvoiceContext.mockResolvedValue({ ...ctx, contractSigned: false });
    expect(await previewPeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.contractGuard });
    expect(buildPeriodInput).not.toHaveBeenCalled();
  });

  it('renders the null-number snapshot and returns base64', async () => {
    const res = await previewPeriodInvoiceAction(periodInput);
    expect(res).toEqual({ ok: true, pdfBase64: Buffer.from('PDF').toString('base64') });
    expect(renderLedgerPdf).toHaveBeenCalledWith({ docType: 'invoice' });
    const form = buildPeriodInput.mock.calls[0][1];
    expect(form.lines).toEqual([{ designation: 'Développement', quantityMilli: 10500, unitPriceCents: 40000 }]);
  });
});

describe('issuePeriodInvoiceAction', () => {
  it('requires a uuid invoiceId', async () => {
    const res = await issuePeriodInvoiceAction({ ...periodInput, invoiceId: 'nope' });
    expect(res.ok).toBe(false);
    expect(issueInvoice).not.toHaveBeenCalled();
  });

  it('maps an issued invoice to success and revalidates the portal payments page', async () => {
    const res = await issuePeriodInvoiceAction(periodInput);
    expect(res).toEqual({ ok: true, tone: 'success', message: COPY.period.success('FA-2026-0002'), number: 'FA-2026-0002' });
    expect(revalidatePath).toHaveBeenCalledWith('/espace-client/paiements');
    expect(buildPeriodInput.mock.calls[0][2]).toBe(INV);
  });

  it('warns when the mail failed or the PDF is pending', async () => {
    issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2', mail: 'failed', pdf: 'attached' });
    expect(await issuePeriodInvoiceAction(periodInput)).toMatchObject({ ok: true, tone: 'warning', message: COPY.period.mailFailed });
    issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'issued', invoiceId: INV, number: 'FA-2', mail: 'sent', pdf: 'pending' });
    expect(await issuePeriodInvoiceAction(periodInput)).toMatchObject({ ok: true, tone: 'warning', message: COPY.period.partialResume('FA-2') });
  });

  it('maps already issued, contract guard, nothing to pay and other failures', async () => {
    issueInvoice.mockResolvedValueOnce({ ok: true, outcome: 'already_issued', invoiceId: INV, number: 'FA-2', mail: 'none', pdf: 'attached' });
    expect(await issuePeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.alreadyIssued });
    issueInvoice.mockResolvedValueOnce({ ok: false, code: 'sv_invoice_contract_not_signed' });
    expect(await issuePeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.contractGuard });
    issueInvoice.mockResolvedValueOnce({ ok: false, code: 'sv_invoice_nothing_to_pay' });
    expect(await issuePeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.nothingToInvoice });
    issueInvoice.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    expect(await issuePeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.generic });
    buildPeriodInput.mockImplementationOnce(() => {
      throw new Error('nothing_to_invoice');
    });
    expect(await issuePeriodInvoiceAction(periodInput)).toEqual({ ok: false, message: COPY.period.nothingToInvoice });
  });
});

describe('credit note actions', () => {
  it('refuses a reason shorter than 3 or longer than 1000 characters', async () => {
    for (const reason of ['  a ', 'x'.repeat(1001)]) {
      const res = await issueCreditNoteAction({ ...creditInput, reason });
      expect(res.ok).toBe(false);
      expect((res as { fieldErrors?: object }).fieldErrors).toHaveProperty('reason');
    }
    expect(issueCreditNote).not.toHaveBeenCalled();
  });

  it('refuses a partial amount outside 0,01 and the credit maximum', async () => {
    for (const amount of ['0', '300,01', 'abc', '']) {
      originQueues({ paid: true });
      const res = await issueCreditNoteAction({ ...creditInput, scope: 'partial', amount });
      expect(res.ok).toBe(false);
      expect(res.message).toContain('Le montant doit être compris entre');
    }
    expect(issueCreditNote).not.toHaveBeenCalled();
  });

  it('requests the refund on a paid invoice when the box is checked, without expiring sessions', async () => {
    originQueues({ paid: true });
    const res = await issueCreditNoteAction(creditInput);
    expect(res).toMatchObject({ ok: true, tone: 'success', number: 'AV-2026-0001' });
    expect(buildCreditNoteInput.mock.calls[0][1]).toMatchObject({ refundRequested: true, createdBy: 'admin-1', scope: 'total' });
    expect(requestRefundForCreditNote).toHaveBeenCalledWith(CN);
    expect(expireOpenPayments).not.toHaveBeenCalled();
    expect(issueCreditNote.mock.calls[0][0]).toMatchObject({ id: CN, issueKey: 'credit:' + CN });
  });

  it('forces refundRequested to false when the origin is not refund eligible, and expires open payments when unpaid', async () => {
    originQueues({ paid: false });
    const res = await issueCreditNoteAction(creditInput);
    expect(res.ok).toBe(true);
    expect(buildCreditNoteInput.mock.calls[0][1].refundRequested).toBe(false);
    expect(requestRefundForCreditNote).not.toHaveBeenCalled();
    expect(expireOpenPayments).toHaveBeenCalledWith(ORIGIN);
  });

  it('keeps the success with a warning when the refund request fails', async () => {
    originQueues({ paid: true });
    requestRefundForCreditNote.mockResolvedValue({ ok: false, code: 'error' });
    const res = await issueCreditNoteAction(creditInput);
    expect(res).toMatchObject({ ok: true, tone: 'warning' });
    expect((res as { message: string }).message).toContain(COPY.credit.refundFailed);
  });

  it('maps sv_credit_exceeds_invoice and other failures', async () => {
    originQueues({ paid: true });
    issueCreditNote.mockResolvedValueOnce({ ok: false, code: 'sv_credit_exceeds_invoice' });
    expect(await issueCreditNoteAction(creditInput)).toEqual({ ok: false, message: COPY.credit.overCredit });
    originQueues({ paid: true });
    issueCreditNote.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    expect(await issueCreditNoteAction(creditInput)).toEqual({ ok: false, message: COPY.credit.error });
    expect(requestRefundForCreditNote).not.toHaveBeenCalled();
  });

  it('previews the credit note without issuing', async () => {
    originQueues({ paid: true });
    const res = await previewCreditNoteAction(creditInput);
    expect(res).toEqual({ ok: true, pdfBase64: Buffer.from('PDF').toString('base64') });
    expect(issueCreditNote).not.toHaveBeenCalled();
    expect(requestRefundForCreditNote).not.toHaveBeenCalled();
  });
});

describe('download, hash and frozen data', () => {
  beforeEach(() => {
    rlsQueues.sv_invoices = [{ data: [{ id: ORIGIN, project_id: PID }] }];
  });

  it('downloads through the invoice project check', async () => {
    expect(await adminInvoiceDownloadAction(ORIGIN)).toEqual({ ok: true, url: 'https://s/i' });
    expect(await adminInvoiceDownloadAction('bad')).toMatchObject({ ok: false });
  });

  it('verifies the hash and maps missing to an error', async () => {
    expect(await verifyInvoiceHashAction(ORIGIN)).toEqual({ ok: true, match: true });
    rlsQueues.sv_invoices = [{ data: [{ id: ORIGIN, project_id: PID }] }];
    verifyInvoiceHash.mockResolvedValue('mismatch');
    expect(await verifyInvoiceHashAction(ORIGIN)).toEqual({ ok: true, match: false });
    rlsQueues.sv_invoices = [{ data: [{ id: ORIGIN, project_id: PID }] }];
    verifyInvoiceHash.mockResolvedValue('missing');
    expect(await verifyInvoiceHashAction(ORIGIN)).toMatchObject({ ok: false });
  });

  it('reads the frozen snapshot and lines only after the access checks', async () => {
    adminQueues = {
      sv_invoices: [{ data: [{ snapshot: { docType: 'invoice' } }] }],
      sv_invoice_lines: [{ data: [{ position: 1, designation: 'x' }] }],
    };
    expect(await loadInvoiceDataAction(ORIGIN)).toEqual({
      ok: true,
      snapshot: { docType: 'invoice' },
      lines: [{ position: 1, designation: 'x' }],
    });
  });
});
